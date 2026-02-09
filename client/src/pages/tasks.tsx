import { useState } from "react";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LayoutShell } from "@/components/layout-shell";
import { useProject } from "@/hooks/use-projects";
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
import { Label } from "@/components/ui/label";
import { Plus, LayoutList, Kanban, Search } from "lucide-react";
import { KanbanCard } from "@/components/ui/kanban-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function ProjectTasksPage() {
  const [match, params] = useRoute("/projects/:id/tasks");
  const projectId = params?.id ? parseInt(params.id) : 0;
  
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { tasks, isLoading: isTasksLoading, createTask, updateTask, deleteTask } = useTasks(projectId);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const createForm = useForm({
    resolver: zodResolver(insertTaskSchema.omit({ projectId: true })),
    defaultValues: { title: "", status: "todo" as const }
  });

  const editForm = useForm({
    resolver: zodResolver(insertTaskSchema.omit({ projectId: true })),
  });

  const onCreateSubmit = (data: any) => {
    createTask.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        createForm.reset();
      }
    });
  };

  const onEditSubmit = (data: any) => {
    if (!editingTask) return;
    updateTask.mutate(
      { id: editingTask.id, ...data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setEditingTask(null);
          editForm.reset();
        }
      }
    );
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      title: task.title,
      status: task.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (task: Task) => {
    setDeletingTask(task);
  };

  const confirmDelete = () => {
    if (deletingTask) {
      deleteTask.mutate(deletingTask.id, {
        onSuccess: () => {
          setDeletingTask(null);
        }
      });
    }
  };

  const handleStatusChange = (task: Task, newStatus: "todo" | "in_progress" | "done") => {
    updateTask.mutate({ id: task.id, status: newStatus });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as number;
    const task = tasks?.find((t: Task) => t.id === taskId);
    
    if (!task) {
      setActiveId(null);
      return;
    }

    // Determine new status based on where it was dropped
    const overId = over.id as string;
    let newStatus: "todo" | "in_progress" | "done" | null = null;

    if (overId === 'todo-column' || overId.toString().startsWith('todo-')) {
      newStatus = 'todo';
    } else if (overId === 'in_progress-column' || overId.toString().startsWith('in_progress-')) {
      newStatus = 'in_progress';
    } else if (overId === 'done-column' || overId.toString().startsWith('done-')) {
      newStatus = 'done';
    }

    if (newStatus && newStatus !== task.status) {
      updateTask.mutate({ id: taskId, status: newStatus });
    }

    setActiveId(null);
  };

  const filteredTasks = tasks?.filter((t: Task) => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todoTasks = filteredTasks?.filter((t: Task) => t.status === 'todo') || [];
  const inProgressTasks = filteredTasks?.filter((t: Task) => t.status === 'in_progress') || [];
  const doneTasks = filteredTasks?.filter((t: Task) => t.status === 'done') || [];

  const activeTask = tasks?.find((t: Task) => t.id === activeId);

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

  if (!project) {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <LayoutList className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Project Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </LayoutShell>
    );
  }

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
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search tasks..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search tasks"
              />
            </div>
            
            <div className="flex bg-muted rounded-lg p-1" role="tablist" aria-label="View mode">
              <Button 
                variant={viewMode === "board" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setViewMode("board")}
                role="tab"
                aria-selected={viewMode === "board"}
                aria-label="Board view"
              >
                <Kanban className="w-4 h-4 mr-2" aria-hidden="true" /> Board
              </Button>
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
                role="tab"
                aria-selected={viewMode === "list"}
                aria-label="List view"
              >
                <LayoutList className="w-4 h-4 mr-2" aria-hidden="true" /> List
              </Button>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby="add-task-description">
                <DialogHeader>
                  <DialogTitle id="add-task-title">Add New Task</DialogTitle>
                  <DialogDescription id="add-task-description">
                    Fill in the details below to create a new task for this project.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-title">Task Title</Label>
                    <Input 
                      id="create-title" 
                      {...createForm.register("title")} 
                      placeholder="What needs to be done?"
                      aria-required="true" 
                    />
                    {createForm.formState.errors.title && (
                      <p className="text-sm text-destructive" role="alert">
                        {createForm.formState.errors.title.message}
                      </p>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid md:grid-cols-3 gap-6 flex-1 overflow-x-auto pb-4" role="main">
              {/* TODO Column */}
              <div 
                id="todo-column"
                className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4 border border-border/50 h-full"
                role="region"
                aria-label="To Do tasks"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" />
                    <span className="font-semibold text-sm">To Do</span>
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs" aria-label={`${todoTasks.length} tasks`}>
                      {todoTasks.length}
                    </span>
                  </div>
                </div>
                <SortableContext items={todoTasks.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                    {todoTasks.map((task: Task) => (
                      <KanbanCard 
                        key={task.id} 
                        task={task}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onStatusChange={(status) => handleStatusChange(task, status)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {/* IN PROGRESS Column */}
              <div 
                id="in_progress-column"
                className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4 border border-border/50 h-full"
                role="region"
                aria-label="In Progress tasks"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true" />
                    <span className="font-semibold text-sm">In Progress</span>
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs" aria-label={`${inProgressTasks.length} tasks`}>
                      {inProgressTasks.length}
                    </span>
                  </div>
                </div>
                <SortableContext items={inProgressTasks.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                    {inProgressTasks.map((task: Task) => (
                      <KanbanCard 
                        key={task.id} 
                        task={task}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onStatusChange={(status) => handleStatusChange(task, status)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>

              {/* DONE Column */}
              <div 
                id="done-column"
                className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4 border border-border/50 h-full"
                role="region"
                aria-label="Done tasks"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                    <span className="font-semibold text-sm">Done</span>
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs" aria-label={`${doneTasks.length} tasks`}>
                      {doneTasks.length}
                    </span>
                  </div>
                </div>
                <SortableContext items={doneTasks.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
                    {doneTasks.map((task: Task) => (
                      <KanbanCard 
                        key={task.id} 
                        task={task}
                        onEdit={() => handleEdit(task)}
                        onDelete={() => handleDelete(task)}
                        onStatusChange={(status) => handleStatusChange(task, status)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </div>

            <DragOverlay>
              {activeTask && (
                <KanbanCard task={activeTask} />
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="flex flex-col gap-2" role="main">
            {filteredTasks?.map((task: Task) => (
              <div 
                key={task.id} 
                className="p-4 border border-border rounded-lg flex items-center justify-between bg-card hover:border-primary/20 transition-colors"
                role="article"
                aria-label={`Task: ${task.title}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-3 h-3 rounded-full ${
                    task.status === 'done' ? 'bg-green-500' : 
                    task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                  }`} aria-hidden="true" />
                  <span className="font-medium flex-1">{task.title}</span>
                  <span className="text-sm text-muted-foreground capitalize">{task.status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit(task)}
                    aria-label={`Edit ${task.title}`}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(task)}
                    className="text-destructive hover:text-destructive"
                    aria-label={`Delete ${task.title}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {(!filteredTasks || filteredTasks.length === 0) && (
              <div className="py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No tasks found. Create your first one!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent aria-describedby="edit-task-description">
          <DialogHeader>
            <DialogTitle id="edit-task-title">Edit Task</DialogTitle>
            <DialogDescription id="edit-task-description">
              Update the task details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Task Title</Label>
              <Input 
                id="edit-title" 
                {...editForm.register("title")} 
                placeholder="What needs to be done?"
                aria-required="true"
              />
              {editForm.formState.errors.title && (
                <p className="text-sm text-destructive" role="alert">
                  {editForm.formState.errors.title.message as string}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={() => setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the task "{deletingTask?.title}". This action cannot be undone.
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
