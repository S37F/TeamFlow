import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === ENUMS ===
export const userRoles = ["owner", "admin", "member"] as const;
export const subscriptionTiers = ["free", "pro", "enterprise"] as const;
export const taskStatuses = ["todo", "in_progress", "done"] as const;

// === TABLE DEFINITIONS ===

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subscriptionTier: text("subscription_tier", { enum: subscriptionTiers }).default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).default("member").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status", { enum: taskStatuses }).default("todo").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  assigneeId: integer("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  tasks: many(tasks),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  assignedTasks: many(tasks),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
}));

// === SCHEMAS ===

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ 
  id: true, 
  createdAt: true,
  stripeCustomerId: true // managed by backend
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  organizationId: true // managed via context or signup flow
});

export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true,
  organizationId: true // managed via context
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true, 
  createdAt: true,
  organizationId: true // managed via context
});

// === TYPES ===

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// === API SPECIFIC TYPES ===

export const signupSchema = insertUserSchema.extend({
  organizationName: z.string().min(1, "Organization name is required"),
});
export type SignupRequest = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginSchema>;
