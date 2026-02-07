import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";

const scryptAsync = promisify(scrypt);
const SessionStore = MemoryStore(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === AUTH SETUP ===
  app.use(
    session({
      store: new SessionStore({ checkPeriod: 86400000 }),
      secret: process.env.SESSION_SECRET || "dev_secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: app.get("env") === "production" },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const { password, ...safeUser } = user;
        done(null, safeUser);
      } else {
        done(null, null);
      }
    } catch (err) {
      done(err);
    }
  });

  // === AUTH ROUTES ===
  app.post(api.auth.signup.path, async (req, res, next) => {
    try {
      const data = api.auth.signup.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(data.password);
      
      // Transaction-like sequence (simplified)
      const org = await storage.createOrganization({ name: data.organizationName, subscriptionTier: "free" });
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        role: "owner",
        organizationId: org.id
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        next(err);
      }
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).send("Logout failed");
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // === MIDDLEWARE ===
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  };

  // === APP ROUTES ===
  app.get(api.projects.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const projects = await storage.getProjects(user.organizationId);
    res.json(projects);
  });

  app.post(api.projects.create.path, requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject({
        ...input,
        organizationId: user.organizationId
      });
      res.status(201).json(project);
    } catch (err) {
      res.status(400).json({ message: "Validation failed" });
    }
  });

  app.get(api.projects.get.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const id = z.coerce.number().parse(req.params.id);
    const project = await storage.getProject(id);
    if (!project || project.organizationId !== user.organizationId) {
      return res.sendStatus(404);
    }
    res.json(project);
  });

  app.get(api.tasks.list.path, requireAuth, async (req, res) => {
    const projectId = z.coerce.number().parse(req.params.projectId);
    const tasks = await storage.getTasks(projectId);
    res.json(tasks);
  });

  app.post(api.tasks.create.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const projectId = z.coerce.number().parse(req.params.projectId);
    const input = api.tasks.create.input.parse(req.body);
    const task = await storage.createTask({
      ...input,
      projectId: projectId,
      organizationId: user.organizationId
    });
    res.status(201).json(task);
  });

  app.patch(api.tasks.update.path, requireAuth, async (req, res) => {
    const id = z.coerce.number().parse(req.params.id);
    const task = await storage.updateTask(id, req.body);
    res.json(task);
  });

  app.get(api.organization.get.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const org = await storage.getOrganization(user.organizationId);
    res.json(org);
  });

  app.get(api.organization.members.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const members = await storage.getOrganizationMembers(user.organizationId);
    res.json(members);
  });

  return httpServer;
}

// Seed function
async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("admin");
  if (!existingUser) {
    const org = await storage.createOrganization({ name: "Demo Corp", subscriptionTier: "pro" });
    const password = await hashPassword("password123");
    const user = await storage.createUser({
      username: "admin",
      password,
      role: "owner",
      organizationId: org.id
    });
    
    const project = await storage.createProject({
      name: "Website Redesign",
      description: "Q1 Goal",
      organizationId: org.id
    });
    
    await storage.createTask({
      title: "Design Mockups",
      status: "in_progress",
      projectId: project.id,
      organizationId: org.id,
      assigneeId: user.id
    });
  }
}

// Invoke seed immediately (simple approach for this simulation)
// In a real app we might run this conditionally
seedDatabase().catch(console.error);
