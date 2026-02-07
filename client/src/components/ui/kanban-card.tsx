import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Task } from "@shared/schema";
import { Card, CardHeader, CardContent, CardFooter } from "./card";
import { Badge } from "./badge";
import { Avatar, AvatarFallback } from "./avatar";
import { Calendar, MoreHorizontal } from "lucide-react";
import { Button } from "./button";
import { format } from "date-fns";

interface KanbanCardProps {
  task: Task;
  onClick?: () => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  // Determine badge color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-100 hover:text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer transform transition-all duration-200 hover:-translate-y-1"
    >
      <Card className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <Badge variant="outline" className={`capitalize rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
          
          <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
            {task.title}
          </h4>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 mr-1" />
              {task.createdAt && format(new Date(task.createdAt), 'MMM d')}
            </div>
            
            {task.assigneeId && (
              <Avatar className="h-6 w-6 border border-background">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  ID
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
