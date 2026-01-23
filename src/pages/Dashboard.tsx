import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, Task } from "@/hooks/useTasks";
import { useSector } from "@/contexts/SectorContext";
import { TaskSidebar } from "@/components/dashboard/TaskSidebar";
import { TaskInput } from "@/components/dashboard/TaskInput";
import { TaskExecution } from "@/components/dashboard/TaskExecution";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, currentTask, loading, streamingContent, createTask, selectTask } = useTasks();
  const { getSectorConfig } = useSector();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const initialPrompt = location.state?.initialPrompt;
  const sectorConfig = getSectorConfig();

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
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
        {/* Top Navigation */}
        <TopNavigation showSectorTabs={true} showCredits={true} />

        {/* Header with sidebar toggle */}
        <div className="h-14 lg:h-[72px]" /> {/* Spacer for fixed nav */}

        <div className="flex items-center px-4 py-2 lg:hidden border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Area */}
        <main className="flex-1 flex flex-col">
          {currentTask ? (
            <TaskExecution
              task={currentTask}
              streamingContent={streamingContent}
              isLoading={loading}
            />
          ) : (
            <EmptyState onSelectPrompt={(prompt) => handleNewTask(prompt)} />
          )}

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <TaskInput
              onSubmit={handleNewTask}
              isLoading={loading}
              placeholder={sectorConfig.placeholder}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
