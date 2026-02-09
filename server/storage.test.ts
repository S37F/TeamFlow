import { describe, it, expect, vi } from "vitest";

vi.mock("./db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
  pool: { query: vi.fn(), end: vi.fn() },
}));

vi.mock("./logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("./socket", () => ({
  setupSocketIO: vi.fn(),
  getIO: vi.fn(),
  emitToOrg: vi.fn(),
  emitTaskCreated: vi.fn(),
  emitTaskUpdated: vi.fn(),
  emitTaskDeleted: vi.fn(),
  emitProjectCreated: vi.fn(),
  emitProjectUpdated: vi.fn(),
  emitProjectDeleted: vi.fn(),
  emitMemberJoined: vi.fn(),
  emitMemberRemoved: vi.fn(),
}));

import { storage } from "./storage";

describe("Storage Interface", () => {
  it("should have all required methods", () => {
    // User methods
    expect(storage.getUser).toBeDefined();
    expect(storage.getUserByUsername).toBeDefined();
    expect(storage.createUser).toBeDefined();
    expect(storage.updateUser).toBeDefined();
    expect(storage.deleteUser).toBeDefined();
    expect(storage.softDeleteUser).toBeDefined();

    // Organization methods
    expect(storage.createOrganization).toBeDefined();
    expect(storage.getOrganization).toBeDefined();
    expect(storage.getOrganizationMembers).toBeDefined();
    expect(storage.updateOrganization).toBeDefined();

    // Project methods
    expect(storage.createProject).toBeDefined();
    expect(storage.getProjects).toBeDefined();
    expect(storage.getProject).toBeDefined();
    expect(storage.updateProject).toBeDefined();
    expect(storage.deleteProject).toBeDefined();
    expect(storage.softDeleteProject).toBeDefined();

    // Task methods
    expect(storage.createTask).toBeDefined();
    expect(storage.getTasks).toBeDefined();
    expect(storage.getTasksByOrganization).toBeDefined();
    expect(storage.getTask).toBeDefined();
    expect(storage.updateTask).toBeDefined();
    expect(storage.deleteTask).toBeDefined();
    expect(storage.softDeleteTask).toBeDefined();
  });
});
