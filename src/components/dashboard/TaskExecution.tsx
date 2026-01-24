import { useMemo } from "react";
import { Task, TaskStep, TaskFile } from "@/hooks/useTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";

interface TaskExecutionProps {
  task: Task;
  streamingContent: string;
  isLoading: boolean;
}

const stepConfig = {
  understanding: {
    icon: Brain,
    label: "Understanding",
    description: "Analyzing your request",
  },
  researching: {
    icon: Search,
    label: "Researching",
    description: "Gathering industry data",
  },
  structuring: {
    icon: LayoutList,
    label: "Structuring",
    description: "Organizing insights",
  },
  generating: {
    icon: FileOutput,
    label: "Generating",
    description: "Creating deliverables",
  },
};

const fileIcons = {
  pdf: FileText,
  excel: Table,
  ppt: Presentation,
};

export function TaskExecution({ task, streamingContent, isLoading }: TaskExecutionProps) {
  const rawContent = streamingContent || task.result?.content || "";
  
  // Sanitize AI-generated content to prevent XSS attacks
  const content = useMemo(() => {
    if (!rawContent) return "";
    // DOMPurify sanitizes any potentially malicious HTML/scripts
    // This provides defense-in-depth alongside ReactMarkdown's built-in escaping
    return DOMPurify.sanitize(rawContent, {
      ALLOWED_TAGS: [], // Strip all HTML tags - we only want plain markdown
      ALLOWED_ATTR: [], // Strip all attributes
    });
  }, [rawContent]);
  
  const steps = task.steps.length > 0 ? task.steps : getDefaultSteps(task.status);

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Task Prompt */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">
            Your request
          </p>
          <p className="text-lg text-foreground leading-relaxed">{task.prompt}</p>
        </div>

        {/* Execution Pipeline */}
        <div className="mb-8">
          <div className="flex items-center gap-0">
            {Object.entries(stepConfig).map(([key, config], index) => {
              const step = steps.find((s) => s.step === key);
              const status = step?.status || "pending";
              const Icon = config.icon;
              const isLast = index === Object.keys(stepConfig).length - 1;

              return (
                <div key={key} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
                      status === "completed" && "bg-secondary",
                      status === "running" && "bg-accent",
                      status === "pending" && "opacity-40"
                    )}
                  >
                    {status === "running" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
                    ) : status === "completed" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium hidden md:inline">
                      {config.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        "w-6 h-px mx-1",
                        status === "completed" ? "bg-border" : "bg-border/50"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status indicator for running tasks */}
        {isLoading && !content && (
          <div className="flex items-center gap-3 py-6 mb-6 border-y border-border">
            <div className="status-dot status-dot-running" />
            <p className="text-sm text-muted-foreground">Processing your request...</p>
          </div>
        )}

        {/* Failed status */}
        {task.status === "failed" && (
          <div className="flex items-center gap-3 py-4 px-4 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">
              Task execution failed. Please try again.
            </p>
          </div>
        )}

        {/* Content */}
        {content && (
          <div className="prose prose-sm max-w-none mb-8">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="font-editorial text-2xl text-foreground mt-8 mb-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-editorial text-xl text-foreground mt-6 mb-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-foreground mt-5 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-foreground leading-relaxed mb-4 text-[15px]">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-4 space-y-1.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-4 space-y-1.5">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground text-[15px]">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isLoading && (
              <span className="inline-block w-1.5 h-5 bg-foreground animate-pulse-subtle ml-0.5 align-middle" />
            )}
          </div>
        )}

        {/* Generated Files */}
        {task.files && task.files.length > 0 && task.status === "completed" && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Generated Deliverables
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {task.files.map((file, index) => {
                const Icon = fileIcons[file.type as keyof typeof fileIcons] || FileText;
                return (
                  <Card key={index} className="shadow-premium hover:shadow-elevated transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {file.description}
                          </p>
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
