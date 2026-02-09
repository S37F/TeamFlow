import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertTask } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api";

export function useTasks(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = [`/api/projects/${projectId}/tasks`];

  const { data: tasks, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const url = buildUrl(api.tasks.list.path, { projectId });
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (data: Omit<InsertTask, "projectId">) => {
      const url = buildUrl(api.tasks.create.path, { projectId });
      const res = await authFetch(url, {
        method: api.tasks.create.method,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/tasks"] });
      toast({ title: "Task added" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertTask>) => {
      const url = buildUrl(api.tasks.update.path, { id });
      const res = await authFetch(url, {
        method: api.tasks.update.method,
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/tasks"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tasks.delete.path, { id });
      const res = await authFetch(url, {
        method: api.tasks.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });

  return { tasks, isLoading, createTask, updateTask, deleteTask };
}
