import { Task, TaskStep, TaskFile } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Search,
  LayoutList,
  FileOutput,
  CheckCircle,
  Loader2,
  Download,
  FileText,
  Table,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface TaskExecutionProps {
  task: Task;
  streamingContent: string;
  isLoading: boolean;
}

const stepConfig = {
  understanding: {
    icon: Brain,
    label: "Understanding Request",
    description: "Analyzing your requirements",
  },
  researching: {
    icon: Search,
    label: "Researching",
    description: "Gathering fashion industry data",
  },
  structuring: {
    icon: LayoutList,
    label: "Structuring Insights",
    description: "Organizing findings",
  },
  generating: {
    icon: FileOutput,
    label: "Generating Deliverables",
    description: "Creating your files",
  },
};

const fileIcons = {
  pdf: FileText,
  excel: Table,
  ppt: Presentation,
};

export function TaskExecution({ task, streamingContent, isLoading }: TaskExecutionProps) {
  const content = streamingContent || task.result?.content || "";
  const steps = task.steps.length > 0 ? task.steps : getDefaultSteps(task.status);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Task Prompt */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your request</p>
          <p className="text-lg font-medium text-foreground">{task.prompt}</p>
        </div>

        {/* Execution Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-1">
            {Object.entries(stepConfig).map(([key, config], index) => {
              const step = steps.find((s) => s.step === key);
              const status = step?.status || "pending";
              const Icon = config.icon;

              return (
                <div key={key} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
                      status === "completed" && "bg-secondary",
                      status === "running" && "bg-accent",
                      status === "pending" && "opacity-50"
                    )}
                  >
                    {status === "running" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : status === "completed" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium hidden sm:inline">{config.label}</span>
                  </div>
                  {index < Object.keys(stepConfig).length - 1 && (
                    <div className="w-4 h-px bg-border mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Content */}
        {content && (
          <div className="prose prose-sm max-w-none text-foreground mb-8">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-semibold text-foreground mt-8 mb-4 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-foreground leading-relaxed mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-foreground">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isLoading && (
              <span className="inline-block w-2 h-4 bg-foreground animate-pulse-subtle ml-0.5" />
            )}
          </div>
        )}

        {/* Loading state when no content yet */}
        {!content && isLoading && (
          <div className="flex items-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Processing your request...</p>
          </div>
        )}

        {/* Generated Files */}
        {task.files && task.files.length > 0 && task.status === "completed" && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-foreground mb-4">Generated Deliverables</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {task.files.map((file, index) => {
                const Icon = fileIcons[file.type as keyof typeof fileIcons] || FileText;
                return (
                  <Card key={index} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{file.description}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function getDefaultSteps(status: Task["status"]): TaskStep[] {
  const allSteps = ["understanding", "researching", "structuring", "generating"];
  const statusIndex = {
    pending: -1,
    understanding: 0,
    researching: 1,
    structuring: 2,
    generating: 3,
    completed: 4,
    failed: -1,
  };

  const currentIndex = statusIndex[status];

  return allSteps.map((step, index) => ({
    step,
    status: index < currentIndex ? "completed" : index === currentIndex ? "running" : "pending",
    message: "",
  }));
}
