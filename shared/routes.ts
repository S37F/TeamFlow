import { z } from "zod";
import { 
  insertProjectSchema, 
  insertTaskSchema, 
  signupSchema,
  loginSchema
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    error: z.string(),
    code: z.string(),
  }),
  notFound: z.object({
    error: z.string(),
    code: z.string(),
  }),
  unauthorized: z.object({
    error: z.string(),
    code: z.string(),
  }),
  internal: z.object({
    error: z.string(),
    code: z.string(),
  }),
};

export const api = {
  auth: {
    signup: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      input: signupSchema,
      responses: {
        201: z.object({ user: z.any(), accessToken: z.string() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: loginSchema,
      responses: {
        200: z.object({ user: z.any(), accessToken: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    refresh: {
      method: "POST" as const,
      path: "/api/auth/refresh" as const,
      responses: {
        200: z.object({ user: z.any(), accessToken: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/user" as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  projects: {
    list: {
      method: "GET" as const,
      path: "/api/projects" as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/projects" as const,
      input: insertProjectSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/projects/:id" as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  tasks: {
    list: {
      method: "GET" as const,
      path: "/api/projects/:projectId/tasks" as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/projects/:projectId/tasks" as const,
      input: insertTaskSchema.omit({ projectId: true }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/tasks/:id" as const,
      input: insertTaskSchema.partial(),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/tasks/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  organization: {
    get: {
      method: "GET" as const,
      path: "/api/organization" as const,
      responses: {
        200: z.any(),
      },
    },
    members: {
      method: "GET" as const,
      path: "/api/organization/members" as const,
      responses: {
        200: z.array(z.any()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
