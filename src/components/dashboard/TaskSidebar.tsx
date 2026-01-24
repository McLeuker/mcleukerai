import { Task } from "@/hooks/useTasks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, FileText, Clock, CheckCircle, Loader2, 
  Search, X, PanelLeftClose, PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface TaskSidebarProps {
  tasks: Task[];
  currentTask: Task | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectTask: (task: Task) => void;
  onNewTask: () => void;
}

export function TaskSidebar({ 
  tasks, 
  currentTask, 
  isOpen, 
  onToggle,
  onSelectTask, 
  onNewTask 
}: TaskSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = tasks.filter((task) =>
    task.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Collapsed state
  if (!isOpen) {
    return (
      <aside className="hidden lg:flex w-14 border-r border-border bg-sidebar flex-col h-screen fixed left-0 top-0 z-40">
        <div className="p-2 border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={onToggle}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={onNewTask}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-72 border-r border-border bg-sidebar flex-col h-screen fixed left-0 top-0 z-40">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-background font-semibold text-xs">M</span>
            </div>
            <span className="font-medium text-sm text-sidebar-foreground">McLeuker AI</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewTask}
          variant="default"
          className="w-full gap-2 justify-center h-10"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm bg-sidebar-accent border-sidebar-border placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Task History Label */}
      <div className="px-4 pb-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Task History ({filteredTasks.length})
        </p>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {filteredTasks.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No matching tasks" : "No tasks yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search" : "Start by creating a new task"}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-lg transition-all duration-200",
                  "border border-transparent",
                  "hover:bg-sidebar-accent hover:border-sidebar-border",
                  currentTask?.id === task.id && "bg-sidebar-accent border-sidebar-border"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 flex-shrink-0">{getStatusIcon(task.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground line-clamp-2 leading-relaxed">
                      {task.prompt.slice(0, 60)}
                      {task.prompt.length > 60 && "..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
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
