import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertTaskSchema, insertProjectSchema } from "@shared/schema";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import logger from "./logger";
import { getMetrics } from "./middleware/performance";
import {
  authenticateToken,
  requireRole,
  generateAccessToken,
  generateRefreshTokenValue,
  storeRefreshToken,
  validateRefreshToken,
  revokeUserRefreshTokens,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  getAccessSecret,
  type AuthenticatedRequest,
} from "./middleware/auth";
import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
  emitProjectCreated,
  emitProjectUpdated,
  emitProjectDeleted,
  emitMemberJoined,
  emitMemberRemoved,
} from "./socket";

const scryptAsync = promisify(scrypt);

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

  // === AUTH ROUTES ===

  app.post(api.auth.signup.path, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = api.auth.signup.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists", code: "USERNAME_TAKEN" });
      }

      const hashedPassword = await hashPassword(data.password);
      
      const org = await storage.createOrganization({ name: data.organizationName });
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        role: "owner",
        organizationId: org.id,
      });

      const { password, ...safeUser } = user;
      
      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshTokenValue();
      await storeRefreshToken(user.id, refreshToken);
      setRefreshCookie(res, refreshToken);
      
      logger.info("User registered", { userId: user.id, organizationId: org.id });
      
      res.status(201).json({ user: safeUser, accessToken });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(data.username);
      
      if (!user) {
        logger.warn("Login attempt with invalid username", { username: data.username });
        return res.status(401).json({ error: "Invalid username or password", code: "INVALID_CREDENTIALS" });
      }

      const isValid = await comparePasswords(data.password, user.password);
      if (!isValid) {
        logger.warn("Login attempt with invalid password", { username: data.username });
        return res.status(401).json({ error: "Invalid username or password", code: "INVALID_CREDENTIALS" });
      }

      const { password, ...safeUser } = user;
      
      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshTokenValue();
      await storeRefreshToken(user.id, refreshToken);
      setRefreshCookie(res, refreshToken);

      logger.info("Successful login", { userId: user.id, username: user.username });
      
      res.status(200).json({ user: safeUser, accessToken });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!token) {
        return res.status(401).json({ error: "Refresh token required", code: "REFRESH_MISSING" });
      }

      const userId = await validateRefreshToken(token);
      if (!userId) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: "Invalid or expired refresh token", code: "REFRESH_INVALID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: "User not found", code: "USER_NOT_FOUND" });
      }

      // Rotate refresh token
      const accessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshTokenValue();
      await storeRefreshToken(user.id, newRefreshToken);
      setRefreshCookie(res, newRefreshToken);

      const { password, ...safeUser } = user;
      res.json({ user: safeUser, accessToken });
    } catch (err) {
      next(err);
    }
  });

  app.post(api.auth.logout.path, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If authenticated, revoke all refresh tokens for user
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const jwt = await import("jsonwebtoken");
          const payload = jwt.default.verify(authHeader.slice(7), getAccessSecret()) as any;
          if (payload?.userId) {
            await revokeUserRefreshTokens(payload.userId);
          }
        } catch {
          // Ignore decode errors on logout
        }
      }
      
      clearRefreshCookie(res);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.userId);
      if (!user) return res.sendStatus(401);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      next(err);
    }
  });

  // === PROJECT ROUTES ===

  app.get(api.projects.list.path, authenticateToken, async (req: Request, res: Response) => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const projects = await storage.getProjects(organizationId);
    res.json(projects);
  });

  app.post(api.projects.create.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject({
        ...input,
        organizationId,
      });
      emitProjectCreated(organizationId, project);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.get(api.projects.get.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const id = z.coerce.number().parse(req.params.id);
      const project = await storage.getProject(id);
      if (!project || project.organizationId !== organizationId) {
        return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
      }
      res.json(project);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/projects/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const id = z.coerce.number().parse(req.params.id);
      
      const existingProject = await storage.getProject(id);
      if (!existingProject || existingProject.organizationId !== organizationId) {
        return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
      }
      
      const validUpdate = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validUpdate);
      emitProjectUpdated(organizationId, project);
      res.json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.delete("/api/projects/:id", authenticateToken, requireRole("owner", "admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const id = z.coerce.number().parse(req.params.id);
      
      const existingProject = await storage.getProject(id);
      if (!existingProject || existingProject.organizationId !== organizationId) {
        return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
      }
      
      await storage.softDeleteProject(id);
      emitProjectDeleted(organizationId, id);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // === TASK ROUTES ===

  app.get(api.tasks.list.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const projectId = z.coerce.number().parse(req.params.projectId);
      
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== organizationId) {
        return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
      }
      
      const tasks = await storage.getTasks(projectId);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  });

  app.post(api.tasks.create.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const projectId = z.coerce.number().parse(req.params.projectId);
      
      const project = await storage.getProject(projectId);
      if (!project || project.organizationId !== organizationId) {
        return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
      }
      
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask({
        ...input,
        projectId,
        organizationId,
      });
      emitTaskCreated(organizationId, task);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.patch(api.tasks.update.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const id = z.coerce.number().parse(req.params.id);
      
      const existingTask = await storage.getTask(id);
      if (!existingTask || existingTask.organizationId !== organizationId) {
        return res.status(404).json({ error: "Task not found", code: "NOT_FOUND" });
      }
      
      const validUpdate = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, validUpdate);
      emitTaskUpdated(organizationId, task);
      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.delete(api.tasks.delete.path, authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const id = z.coerce.number().parse(req.params.id);
      
      const existingTask = await storage.getTask(id);
      if (!existingTask || existingTask.organizationId !== organizationId) {
        return res.status(404).json({ error: "Task not found", code: "NOT_FOUND" });
      }
      
      await storage.softDeleteTask(id);
      emitTaskDeleted(organizationId, id);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // === USER PROFILE ===

  app.patch("/api/user/profile", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = (req as AuthenticatedRequest).user;
      const { username, currentPassword, newPassword } = z.object({
        username: z.string().min(3).max(100).optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).max(128).optional(),
      }).parse(req.body);

      const fullUser = await storage.getUser(userId);
      if (!fullUser) return res.status(404).json({ error: "User not found", code: "NOT_FOUND" });

      const updates: Partial<typeof fullUser> = {};

      if (username && username !== fullUser.username) {
        const existing = await storage.getUserByUsername(username);
        if (existing) {
          return res.status(400).json({ error: "Username already taken", code: "USERNAME_TAKEN" });
        }
        updates.username = username;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Current password is required to set a new password", code: "PASSWORD_REQUIRED" });
        }
        const isValid = await comparePasswords(currentPassword, fullUser.password);
        if (!isValid) {
          return res.status(400).json({ error: "Current password is incorrect", code: "WRONG_PASSWORD" });
        }
        updates.password = await hashPassword(newPassword);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No changes provided", code: "NO_CHANGES" });
      }

      const updatedUser = await storage.updateUser(userId, updates);
      const { password: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  // === ORGANIZATION ===

  app.get(api.organization.get.path, authenticateToken, async (req: Request, res: Response) => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const org = await storage.getOrganization(organizationId);
    if (!org) return res.status(404).json({ error: "Organization not found", code: "NOT_FOUND" });
    res.json(org);
  });

  app.patch("/api/organization", authenticateToken, requireRole("owner"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const { name } = z.object({
        name: z.string().min(1).max(255),
      }).parse(req.body);
      
      const org = await storage.updateOrganization(organizationId, { name });
      res.json(org);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  app.get(api.organization.members.path, authenticateToken, async (req: Request, res: Response) => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const members = await storage.getOrganizationMembers(organizationId);
    const safeMembers = members.map(({ password, ...member }) => member);
    res.json(safeMembers);
  });

  // All organization tasks
  app.get("/api/organization/tasks", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthenticatedRequest).user;
      const allTasks = await storage.getTasksByOrganization(organizationId);
      res.json(allTasks);
    } catch (err) {
      next(err);
    }
  });

  // Remove team member (soft delete)
  app.delete("/api/organization/members/:id", authenticateToken, requireRole("owner", "admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const memberId = z.coerce.number().parse(req.params.id);
      
      if (memberId === authUser.userId) {
        return res.status(400).json({ error: "Cannot remove yourself from the organization", code: "SELF_REMOVAL" });
      }
      
      const member = await storage.getUser(memberId);
      if (!member || member.organizationId !== authUser.organizationId) {
        return res.status(404).json({ error: "Member not found", code: "NOT_FOUND" });
      }
      
      if (member.role === "owner") {
        return res.status(403).json({ error: "Cannot remove the organization owner", code: "CANNOT_REMOVE_OWNER" });
      }
      
      if (member.role === "admin" && authUser.role !== "owner") {
        return res.status(403).json({ error: "Only the owner can remove admins", code: "INSUFFICIENT_ROLE" });
      }
      
      await storage.softDeleteUser(memberId);
      await revokeUserRefreshTokens(memberId);
      emitMemberRemoved(authUser.organizationId, memberId);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  // Update member role
  app.patch("/api/organization/members/:id/role", authenticateToken, requireRole("owner"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const memberId = z.coerce.number().parse(req.params.id);
      
      if (memberId === authUser.userId) {
        return res.status(400).json({ error: "Cannot change your own role", code: "SELF_ROLE_CHANGE" });
      }
      
      const { role } = z.object({
        role: z.enum(["member", "admin"]),
      }).parse(req.body);
      
      const member = await storage.getUser(memberId);
      if (!member || member.organizationId !== authUser.organizationId) {
        return res.status(404).json({ error: "Member not found", code: "NOT_FOUND" });
      }
      
      const updated = await storage.updateUser(memberId, { role });
      const { password: _, ...safeMember } = updated;
      res.json(safeMember);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  // Invite new team member
  app.post("/api/organization/invite", authenticateToken, requireRole("owner", "admin"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as AuthenticatedRequest).user;

      const { username, password, role } = z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(6).max(128),
        role: z.enum(["member", "admin"]).default("member"),
      }).parse(req.body);

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists", code: "USERNAME_TAKEN" });
      }

      const hashedPassword = await hashPassword(password);
      const newMember = await storage.createUser({
        username,
        password: hashedPassword,
        role,
        organizationId: authUser.organizationId,
      });

      const { password: _, ...safeMember } = newMember;

      logger.info("Team member invited", {
        invitedBy: authUser.userId,
        newMemberId: newMember.id,
        organizationId: authUser.organizationId,
      });

      emitMemberJoined(authUser.organizationId, safeMember);
      res.status(201).json(safeMember);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message, code: "VALIDATION_ERROR" });
      }
      next(err);
    }
  });

  // Performance metrics endpoint (owner only)
  app.get("/api/metrics", authenticateToken, requireRole("owner"), (_req: Request, res: Response) => {
    res.json(getMetrics());
  });

  return httpServer;
}

// Seed function — only runs in development
async function seedDatabase() {
  if (process.env.NODE_ENV === "production") return;
  
  const existingUser = await storage.getUserByUsername("admin");
  if (!existingUser) {
    const org = await storage.createOrganization({ name: "Demo Corp" });
    const password = await hashPassword("admin123!Dev");
    const user = await storage.createUser({
      username: "admin",
      password,
      role: "owner",
      organizationId: org.id,
    });
    
    const project = await storage.createProject({
      name: "Website Redesign",
      description: "Q1 Goal",
      organizationId: org.id,
    });
    
    await storage.createTask({
      title: "Design Mockups",
      status: "in_progress",
      projectId: project.id,
      organizationId: org.id,
      assigneeId: user.id,
    });
    
    logger.info("Development seed data created");
  }
}

const enableDevSeed = process.env.ENABLE_DEV_SEED === "true";

if (process.env.NODE_ENV !== "production" && enableDevSeed) {
  seedDatabase().catch(console.error);
}
