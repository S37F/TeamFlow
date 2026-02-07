import { useState } from "react";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LayoutShell } from "@/components/layout-shell";
import { useProject, useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { insertTaskSchema, type Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, LayoutList, Kanban, Search, Filter } from "lucide-react";
import { KanbanCard } from "@/components/ui/kanban-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectTasksPage() {
  const [match, params] = useRoute("/projects/:id/tasks");
  const projectId = params?.id ? parseInt(params.id) : 0;
  
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { tasks, isLoading: isTasksLoading, createTask, updateTask } = useTasks(projectId);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("board");
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm({
    resolver: zodResolver(insertTaskSchema.omit({ projectId: true })),
    defaultValues: { title: "", status: "todo" as const }
  });

  const onSubmit = (data: any) => {
    createTask.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const filteredTasks = tasks?.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todoTasks = filteredTasks?.filter(t => t.status === 'todo') || [];
  const inProgressTasks = filteredTasks?.filter(t => t.status === 'in_progress') || [];
  const doneTasks = filteredTasks?.filter(t => t.status === 'done') || [];

  const handleStatusChange = (task: Task, newStatus: "todo" | "in_progress" | "done") => {
    updateTask.mutate({ id: task.id, status: newStatus });
  };

  if (isProjectLoading || isTasksLoading) {
    return (
      <LayoutShell>
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </LayoutShell>
    );
  }

  if (!project) return null;

  return (
    <LayoutShell>
      <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display">{project.name}</h1>
            <p className="text-muted-foreground text-sm max-w-xl">{project.description}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex bg-muted rounded-lg p-1">
              <Button 
                variant={viewMode === "board" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setViewMode("board")}
              >
                <Kanban className="w-4 h-4 mr-2" /> Board
              </Button>
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="w-4 h-4 mr-2" /> List
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle id="add-task-title">Add New Task</DialogTitle>
                  <DialogDescription id="add-task-description">
                    Fill in the details below to create a new task for this project.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title</Label>
                    <Input id="title" {...form.register("title")} placeholder="What needs to be done?" />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createTask.isPending}>
                      {createTask.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Board View */}
        {viewMode === "board" && (
          <div className="grid md:grid-cols-3 gap-6 flex-1 overflow-x-auto pb-4">
            {/* TODO Column */}
            <div className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4 border border-border/50 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="font-semibold text-sm">To Do</span>
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                    {todoTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                {todoTasks.map(task => (
                  <KanbanCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* IN PROGRESS Column */}
            <div className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4 border border-border/50 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-semibold text-sm">In Progress</span>
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                    {inProgressTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                {inProgressTasks.map(task => (
                  <KanbanCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => handleStatusChange(task, 'done')} // Simple click to complete demo
                  />
                ))}
              </div>
            </div>

            {/* DONE Column */}
            <div className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4 border border-border/50 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-semibold text-sm">Done</span>
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                    {doneTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                {doneTasks.map(task => (
                  <KanbanCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List View placeholder */}
        {viewMode === "list" && (
          <div className="flex flex-col gap-2">
             {filteredTasks?.map(task => (
               <div key={task.id} className="p-4 border border-border rounded-lg flex items-center justify-between bg-card">
                 <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      task.status === 'done' ? 'bg-green-500' : 
                      task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                    }`} />
                    <span className="font-medium">{task.title}</span>
                 </div>
                 <span className="text-sm text-muted-foreground capitalize">{task.status.replace('_', ' ')}</span>
               </div>
             ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
