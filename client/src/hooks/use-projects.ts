import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertProject } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api";

export function useProjects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async () => {
      const res = await authFetch(api.projects.list.path);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await authFetch(api.projects.create.path, {
        method: api.projects.create.method,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Project created successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertProject>) => {
      const res = await authFetch(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Project updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to delete project" }));
        throw new Error(error.error || error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Project deleted" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return { projects, isLoading, createProject, updateProject, deleteProject };
}

export function useProject(id: number) {
  return useQuery({
    queryKey: [`/api/projects/${id}`],
    queryFn: async () => {
      const url = buildUrl(api.projects.get.path, { id });
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!id,
  });
}
