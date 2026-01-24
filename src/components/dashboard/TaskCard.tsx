import { Task } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Clock, Loader2, FileText, ChevronRight, Cpu } from "lucide-react";

interface TaskCardProps {
  task: Task;
  isActive: boolean;
  onClick: () => void;
}

export function TaskCard({ task, isActive, onClick }: TaskCardProps) {
  const getStatusBadge = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium">
            <CheckCircle className="h-2.5 w-2.5" />
            Done
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">
            <Clock className="h-2.5 w-2.5" />
            Failed
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
            <Clock className="h-2.5 w-2.5" />
            Pending
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/10 text-foreground text-[10px] font-medium">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Processing
          </span>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl transition-all duration-300",
        "border bg-card hover:shadow-premium group",
        isActive
          ? "border-foreground/20 shadow-premium"
          : "border-border hover:border-foreground/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {getStatusBadge(task.status)}
          </div>
          <p className="text-sm font-medium line-clamp-2 leading-relaxed">
            {task.prompt}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
            {task.model_used && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-2.5 w-2.5" />
                  {task.model_used.split("-")[0]}
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
          "group-hover:translate-x-0.5",
          isActive && "text-foreground"
        )} />
      </div>
    </button>
  );
}
