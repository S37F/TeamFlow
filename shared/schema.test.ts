import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  insertProjectSchema,
  insertTaskSchema,
  insertOrganizationSchema,
  userRoles,
  taskStatuses,
  taskPriorities,
} from "@shared/schema";

describe("Schema Validation", () => {
  describe("signupSchema", () => {
    it("should accept valid signup data", () => {
      const result = signupSchema.safeParse({
        username: "john",
        password: "password123",
        organizationName: "TestCorp",
      });
      expect(result.success).toBe(true);
    });

    it("should reject username shorter than 3 characters", () => {
      const result = signupSchema.safeParse({
        username: "ab",
        password: "password123",
        organizationName: "TestCorp",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password shorter than 6 characters", () => {
      const result = signupSchema.safeParse({
        username: "john",
        password: "12345",
        organizationName: "TestCorp",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty organization name", () => {
      const result = signupSchema.safeParse({
        username: "john",
        password: "password123",
        organizationName: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject username longer than 100 characters", () => {
      const result = signupSchema.safeParse({
        username: "a".repeat(101),
        password: "password123",
        organizationName: "Corp",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password longer than 128 characters", () => {
      const result = signupSchema.safeParse({
        username: "john",
        password: "a".repeat(129),
        organizationName: "Corp",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login data", () => {
      const result = loginSchema.safeParse({
        username: "john",
        password: "pass",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty username", () => {
      const result = loginSchema.safeParse({
        username: "",
        password: "password",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        username: "john",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("insertProjectSchema", () => {
    it("should accept valid project data", () => {
      const result = insertProjectSchema.safeParse({
        name: "My Project",
        description: "A cool project",
      });
      expect(result.success).toBe(true);
    });

    it("should accept project without description", () => {
      const result = insertProjectSchema.safeParse({
        name: "My Project",
      });
      expect(result.success).toBe(true);
    });

    it("should reject project without name", () => {
      const result = insertProjectSchema.safeParse({
        description: "No name given",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("insertTaskSchema", () => {
    it("should accept valid task data", () => {
      const result = insertTaskSchema.safeParse({
        title: "Fix bug",
        status: "todo",
        projectId: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept task with priority", () => {
      const result = insertTaskSchema.safeParse({
        title: "Fix bug",
        priority: "high",
        projectId: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should reject task without title", () => {
      const result = insertTaskSchema.safeParse({
        status: "todo",
        projectId: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Enums", () => {
    it("should have correct user roles", () => {
      expect(userRoles).toEqual(["owner", "admin", "member"]);
    });

    it("should have correct task statuses", () => {
      expect(taskStatuses).toEqual(["todo", "in_progress", "done"]);
    });

    it("should have correct task priorities", () => {
      expect(taskPriorities).toEqual(["low", "medium", "high"]);
    });
  });
});
