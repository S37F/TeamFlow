import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Task } from "@shared/schema";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Avatar, AvatarFallback } from "./avatar";
import { Calendar, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "./button";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useOrganization } from "@/hooks/use-organization";

interface KanbanCardProps {
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: "todo" | "in_progress" | "done") => void;
}

export function KanbanCard({ task, onEdit, onDelete, onStatusChange }: KanbanCardProps) {
  const { members } = useOrganization();
  const assignee = task.assigneeId ? members?.find((m: { id: number }) => m.id === task.assigneeId) : null;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700';
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-100 hover:text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="group cursor-grab active:cursor-grabbing transform transition-all duration-200 hover:-translate-y-1"
      role="article"
      aria-label={`Task: ${task.title}`}
    >
      <Card className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div {...listeners} className="flex-1 cursor-grab active:cursor-grabbing">
              <Badge variant="outline" className={`capitalize rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
                  aria-label="Task options"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onStatusChange?.('todo')} 
                  disabled={task.status === 'todo'}
                  className="cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-400 mr-2" />
                  Move to To Do
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onStatusChange?.('in_progress')} 
                  disabled={task.status === 'in_progress'}
                  className="cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                  Move to In Progress
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onStatusChange?.('done')} 
                  disabled={task.status === 'done'}
                  className="cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  Move to Done
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
              {task.title}
            </h4>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
              <time dateTime={task.createdAt?.toString()}>
                {task.createdAt && format(new Date(task.createdAt), 'MMM d')}
              </time>
            </div>
            
            {task.assigneeId && (
              <Avatar className="h-6 w-6 border border-background">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {assignee ? assignee.username.substring(0, 2).toUpperCase() : '??'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
