import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, Task } from "@/hooks/useTasks";
import { TaskSidebar } from "@/components/dashboard/TaskSidebar";
import { TaskInput } from "@/components/dashboard/TaskInput";
import { TaskExecution } from "@/components/dashboard/TaskExecution";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, currentTask, loading, streamingContent, createTask, selectTask } = useTasks();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const initialPrompt = location.state?.initialPrompt;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Handle initial prompt from landing page
  useEffect(() => {
    if (initialPrompt && user && !authLoading) {
      createTask(initialPrompt);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [initialPrompt, user, authLoading]);

  const handleNewTask = async (prompt: string) => {
    await createTask(prompt);
  };

  const handleSelectTask = (task: Task) => {
    selectTask(task);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <TaskSidebar
        tasks={tasks}
        currentTask={currentTask}
        isOpen={sidebarOpen}
        onSelectTask={handleSelectTask}
        onNewTask={() => selectTask(null as any)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-foreground rounded-sm flex items-center justify-center">
                <span className="text-background font-semibold text-xs">F</span>
              </div>
              <span className="font-medium text-sm">Fashion AI</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col">
          {currentTask ? (
            <TaskExecution
              task={currentTask}
              streamingContent={streamingContent}
              isLoading={loading}
            />
          ) : (
            <EmptyState />
          )}

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <TaskInput onSubmit={handleNewTask} isLoading={loading} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
