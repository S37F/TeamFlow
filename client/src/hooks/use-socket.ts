import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/api";
import { api } from "@shared/routes";

export interface Notification {
  id: string;
  message: string;
  type: "task" | "project" | "member";
  timestamp: Date;
  read: boolean;
}

export function useSocket(isAuthenticated: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<Set<number>>(new Set());

  const addNotification = useCallback((message: string, type: Notification["type"]) => {
    const notif: Notification = {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Task events
    socket.on("task:created", (task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/tasks"] });
      if (task.projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.projectId}/tasks`] });
      }
      addNotification(`New task: "${task.title}"`, "task");
    });

    socket.on("task:updated", (task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/tasks"] });
      if (task.projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${task.projectId}/tasks`] });
      }
    });

    socket.on("task:deleted", ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/tasks"] });
      // Invalidate all task lists since we don't know which project
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0] as string;
        return typeof key === "string" && key.includes("/tasks");
      }});
    });

    // Project events
    socket.on("project:created", (project) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      addNotification(`New project: "${project.name}"`, "project");
    });

    socket.on("project:updated", (project) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
    });

    socket.on("project:deleted", () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
    });

    // Member events
    socket.on("member:joined", (member) => {
      queryClient.invalidateQueries({ queryKey: [api.organization.members.path] });
      addNotification(`${member.username} joined the team`, "member");
    });

    socket.on("member:removed", () => {
      queryClient.invalidateQueries({ queryKey: [api.organization.members.path] });
    });

    socket.on("member:online", ({ userId }: { userId: number }) => {
      setOnlineMembers((prev) => new Set(prev).add(userId));
    });

    socket.on("member:offline", ({ userId }: { userId: number }) => {
      setOnlineMembers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, queryClient, addNotification]);

  return {
    socket: socketRef.current,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    onlineMembers,
    markNotificationRead,
    clearNotifications,
  };
}
