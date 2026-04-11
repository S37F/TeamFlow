import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "./middleware/auth";
import logger from "./logger";

let io: SocketServer | null = null;

interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

function socketCorsOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw?.trim()) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return process.env.NODE_ENV !== "production"
    ? ["http://localhost:5000", "http://localhost:3000"]
    : [];
}

export function setupSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: socketCorsOrigins(),
      credentials: true,
    },
    path: "/socket.io",
  });

  // JWT Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) {
        return next(new Error("Server configuration error"));
      }
      
      const payload = jwt.verify(token, secret) as JwtPayload;
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, organizationId, username } = authSocket.user;
    
    // Join organization room for multi-tenant isolation
    const orgRoom = `org-${organizationId}`;
    socket.join(orgRoom);
    
    logger.debug("Socket connected", { userId, username, orgRoom });

    // Notify others in org about the connection
    socket.to(orgRoom).emit("member:online", { userId, username });

    socket.on("disconnect", () => {
      logger.debug("Socket disconnected", { userId, username });
      socket.to(orgRoom).emit("member:offline", { userId, username });
    });
  });

  logger.info("Socket.io server initialized");
  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

// === Event Emitters ===
// Call these from route handlers after CRUD operations

export function emitToOrg(organizationId: number, event: string, data: any): void {
  if (!io) return;
  io.to(`org-${organizationId}`).emit(event, data);
}

export function emitTaskCreated(organizationId: number, task: any): void {
  emitToOrg(organizationId, "task:created", task);
}

export function emitTaskUpdated(organizationId: number, task: any): void {
  emitToOrg(organizationId, "task:updated", task);
}

export function emitTaskDeleted(organizationId: number, taskId: number): void {
  emitToOrg(organizationId, "task:deleted", { id: taskId });
}

export function emitProjectCreated(organizationId: number, project: any): void {
  emitToOrg(organizationId, "project:created", project);
}

export function emitProjectUpdated(organizationId: number, project: any): void {
  emitToOrg(organizationId, "project:updated", project);
}

export function emitProjectDeleted(organizationId: number, projectId: number): void {
  emitToOrg(organizationId, "project:deleted", { id: projectId });
}

export function emitMemberJoined(organizationId: number, member: any): void {
  emitToOrg(organizationId, "member:joined", member);
}

export function emitMemberRemoved(organizationId: number, memberId: number): void {
  emitToOrg(organizationId, "member:removed", { id: memberId });
}
