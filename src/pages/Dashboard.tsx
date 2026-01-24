import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, Task } from "@/hooks/useTasks";
import { useSector } from "@/contexts/SectorContext";
import { TaskSidebar } from "@/components/dashboard/TaskSidebar";
import { MobileTaskSidebar } from "@/components/dashboard/MobileTaskSidebar";
import { TaskInput } from "@/components/dashboard/TaskInput";
import { TaskExecution } from "@/components/dashboard/TaskExecution";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DomainSelector } from "@/components/dashboard/DomainSelector";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { CreditDisplay } from "@/components/dashboard/CreditDisplay";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { tasks, currentTask, loading, streamingContent, createTask, selectTask } = useTasks();
  const { getSectorConfig } = useSector();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const initialPrompt = location.state?.initialPrompt;
  const sectorConfig = getSectorConfig();

  // Handle initial prompt from landing page
  useEffect(() => {
    if (initialPrompt && user) {
      createTask(initialPrompt);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [initialPrompt, user]);

  const handleNewTask = async (prompt: string) => {
    await createTask(prompt);
  };

  const handleSelectTask = (task: Task) => {
    selectTask(task);
  };

  const handleClearTask = () => {
    selectTask(null as any);
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <TaskSidebar
        tasks={tasks}
        currentTask={currentTask}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectTask={handleSelectTask}
        onNewTask={handleClearTask}
      />

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        sidebarOpen ? "lg:ml-72" : "lg:ml-14"
      )}>
        {/* Top Navigation */}
        <TopNavigation showSectorTabs={false} showCredits={true} />

        {/* Header Spacer */}
        <div className="h-14 lg:h-[72px]" />

        {/* Mobile Header */}
        <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-sm sticky top-14 z-30">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <MobileTaskSidebar
              tasks={tasks}
              currentTask={currentTask}
              onSelectTask={handleSelectTask}
              onNewTask={handleClearTask}
            />
            <div className="flex-1">
              <DomainSelector variant="dropdown" />
            </div>
            <CreditDisplay variant="compact" />
          </div>
        </div>

        {/* Desktop Domain Bar */}
        <div className="hidden lg:block border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <DomainSelector variant="pills" className="flex-1" />
            <CreditDisplay variant="compact" />
          </div>
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
            <div className="flex-1 flex flex-col justify-center px-4 py-8">
              <EmptyState onSelectPrompt={(prompt) => handleNewTask(prompt)} />
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4 lg:p-6 sticky bottom-0">
            <div className="max-w-3xl mx-auto space-y-4">
              {!currentTask && (
                <QuickActions onAction={handleNewTask} isLoading={loading} />
              )}
              <TaskInput
                onSubmit={handleNewTask}
                isLoading={loading}
                placeholder={sectorConfig.placeholder}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
