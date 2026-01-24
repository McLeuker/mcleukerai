import { Task } from "@/hooks/useTasks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Plus, FileText, Clock, CheckCircle, Loader2, 
  History, Search, X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface MobileTaskSidebarProps {
  tasks: Task[];
  currentTask: Task | null;
  onSelectTask: (task: Task) => void;
  onNewTask: () => void;
}

export function MobileTaskSidebar({ tasks, currentTask, onSelectTask, onNewTask }: MobileTaskSidebarProps) {
  const [open, setOpen] = useState(false);
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

  const handleSelectTask = (task: Task) => {
    onSelectTask(task);
    setOpen(false);
  };

  const handleNewTask = () => {
    onNewTask();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 bg-card border-border"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
          {tasks.length > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-semibold">
              {tasks.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] p-0 bg-sidebar">
        <SheetHeader className="p-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
            <History className="h-4 w-4" />
            Task History
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* New Task Button */}
          <Button
            onClick={handleNewTask}
            variant="outline"
            className="w-full gap-2 justify-start h-10 bg-card border-border"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 text-sm bg-card border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
          <div className="px-4 pb-4 space-y-1">
            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center">
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
                  onClick={() => handleSelectTask(task)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all duration-200",
                    "border border-transparent",
                    "hover:bg-sidebar-accent hover:border-sidebar-border",
                    currentTask?.id === task.id && "bg-sidebar-accent border-sidebar-border"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1 flex-shrink-0">{getStatusIcon(task.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground line-clamp-2 leading-relaxed">
                        {task.prompt.slice(0, 80)}
                        {task.prompt.length > 80 && "..."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
