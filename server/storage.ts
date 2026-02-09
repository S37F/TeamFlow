import { db } from "./db";
import { 
  users, organizations, projects, tasks,
  type User, type InsertUser, 
  type Organization, type InsertOrganization,
  type Project, type InsertProject,
  type Task, type InsertTask
} from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface IStorage {
  // Auth & Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { organizationId: number }): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  softDeleteUser(id: number): Promise<void>;
  
  // Organization
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationMembers(orgId: number): Promise<User[]>;
  updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization>;
  getOrganizationOwner(orgId: number): Promise<User | undefined>;

  // Projects
  createProject(project: InsertProject & { organizationId: number }): Promise<Project>;
  getProjects(orgId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  softDeleteProject(id: number): Promise<void>;

  // Tasks
  createTask(task: InsertTask & { projectId: number; organizationId: number }): Promise<Task>;
  getTasks(projectId: number): Promise<Task[]>;
  getTasksByOrganization(orgId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  softDeleteTask(id: number): Promise<void>;
  deleteTasksByProject(projectId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === Users ===
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.id, id), isNull(users.deletedAt))
    );
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.username, username), isNull(users.deletedAt))
    );
    return user;
  }

  async createUser(insertUser: InsertUser & { organizationId: number }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async softDeleteUser(id: number): Promise<void> {
    await db.update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // === Organizations ===
  
  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(insertOrg).returning();
    return org;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationMembers(orgId: number): Promise<User[]> {
    return await db.select().from(users).where(
      and(eq(users.organizationId, orgId), isNull(users.deletedAt))
    );
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization> {
    const [org] = await db.update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async getOrganizationOwner(orgId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.organizationId, orgId), 
        eq(users.role, "owner"),
        isNull(users.deletedAt)
      )
    );
    return user;
  }

  // === Projects ===
  
  async createProject(insertProject: InsertProject & { organizationId: number }): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async getProjects(orgId: number): Promise<Project[]> {
    return await db.select().from(projects).where(
      and(eq(projects.organizationId, orgId), isNull(projects.deletedAt))
    );
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(
      and(eq(projects.id, id), isNull(projects.deletedAt))
    );
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [project] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async softDeleteProject(id: number): Promise<void> {
    const now = new Date();
    // Soft delete all tasks in the project
    await db.update(tasks)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(tasks.projectId, id), isNull(tasks.deletedAt)));
    // Soft delete the project
    await db.update(projects)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(projects.id, id));
  }

  // === Tasks ===
  
  async createTask(insertTask: InsertTask & { projectId: number; organizationId: number }): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async getTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(
      and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt))
    );
  }

  async getTasksByOrganization(orgId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(
      and(eq(tasks.organizationId, orgId), isNull(tasks.deletedAt))
    );
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(
      and(eq(tasks.id, id), isNull(tasks.deletedAt))
    );
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [task] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async softDeleteTask(id: number): Promise<void> {
    await db.update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasks.id, id));
  }

  async deleteTasksByProject(projectId: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
  }
}

export const storage = new DatabaseStorage();
