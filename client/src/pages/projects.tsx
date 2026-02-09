import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useProjects } from "@/hooks/use-projects";
import { insertProjectSchema } from "@shared/schema";
import type { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Plus, Folder, Calendar, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";

export default function ProjectsPage() {
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProject, setDeletingProject] = useState<any>(null);

  // Fetch all org tasks for progress calculation
  const { data: allTasks } = useQuery({
    queryKey: ["/api/organization/tasks"],
    queryFn: async () => {
      const res = await authFetch("/api/organization/tasks");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const getProjectProgress = (projectId: number) => {
    const projectTasks = allTasks?.filter((t: any) => t.projectId === projectId) || [];
    if (projectTasks.length === 0) return { percent: 0, done: 0, total: 0 };
    const done = projectTasks.filter((t: any) => t.status === "done").length;
    return { percent: Math.round((done / projectTasks.length) * 100), done, total: projectTasks.length };
  };

  const form = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: { name: "", description: "" }
  });

  const editForm = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: { name: "", description: "" }
  });

  const onSubmit = (data: any) => {
    createProject.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const onEditSubmit = (data: any) => {
    if (!editingProject) return;
    updateProject.mutate(
      { id: editingProject.id, ...data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingProject(null);
          editForm.reset();
        }
      }
    );
  };

  const handleEdit = (project: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    editForm.reset({ name: project.name, description: project.description || "" });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (project: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingProject(project);
  };

  const confirmDelete = () => {
    if (deletingProject) {
      deleteProject.mutate(deletingProject.id, {
        onSuccess: () => setDeletingProject(null)
      });
    }
  };

  return (
    <LayoutShell>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage and track your ongoing initiatives.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
              <DialogTitle id="create-project-title">Create Project</DialogTitle>
              <DialogDescription id="create-project-description">
                Create a new workspace for your team to collaborate.
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" {...form.register("name")} placeholder="Website Redesign" />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    {...form.register("description")} 
                    placeholder="Brief details about the project goals..."
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createProject.isPending}>
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project: Project) => {
              const progress = getProjectProgress(project.id);
              return (
              <div key={project.id} className="relative group">
                <Link href={`/projects/${project.id}/tasks`}>
                <Card className="h-full flex flex-col hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Folder className="w-5 h-5" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEdit(project, e as any)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDelete(project, e as any)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="mt-4 text-xl">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress.done}/{progress.total} tasks done</span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${progress.percent}%` }} 
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-4 text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {project.createdAt && format(new Date(project.createdAt), 'MMM d, yyyy')}
                  </CardFooter>
                </Card>
              </Link>
              </div>
              );
            })}
            
            {projects?.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-muted/5">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Folder className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  Get started by creating your first project to organize tasks and collaborate with your team.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>Create Project</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input id="edit-name" {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" {...editForm.register("description")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProject?.name}"? All tasks in this project will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutShell>
  );
}
