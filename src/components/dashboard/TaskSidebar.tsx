import { Task } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Clock, CheckCircle, Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface TaskSidebarProps {
  tasks: Task[];
  currentTask: Task | null;
  isOpen: boolean;
  onSelectTask: (task: Task) => void;
  onNewTask: () => void;
}

export function TaskSidebar({ tasks, currentTask, isOpen, onSelectTask, onNewTask }: TaskSidebarProps) {
  if (!isOpen) return null;

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-success" />;
      case "failed":
        return <Clock className="h-3 w-3 text-destructive" />;
      case "pending":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Loader2 className="h-3 w-3 text-foreground animate-spin" />;
    }
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col h-screen fixed left-0 top-0 z-40 lg:relative">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <span className="text-background font-semibold text-[10px]">F</span>
            </div>
            <span className="font-medium text-sm text-sidebar-foreground">Fashion AI</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewTask}
          variant="outline"
          className="w-full gap-2 justify-start h-9 text-sm"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Task History */}
      <div className="px-4 py-3">
        <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Task History
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {tasks.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No tasks yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Start by describing a task
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md transition-colors",
                  "hover:bg-sidebar-accent",
                  currentTask?.id === task.id && "bg-sidebar-accent"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1">{getStatusIcon(task.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground line-clamp-2 leading-relaxed">
                      {task.prompt.slice(0, 60)}
                      {task.prompt.length > 60 && "..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
