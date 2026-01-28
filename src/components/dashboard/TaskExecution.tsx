import { useMemo } from "react";
import { Task, TaskStep, TaskFile } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Search,
  LayoutList,
  FileOutput,
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
      <div className="max-w-2xl mx-auto py-6 sm:py-8 px-4">
        {/* Task Prompt - Minimal, clean style */}
        <div className="mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            {task.model_used && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {task.model_used}
              </span>
            )}
            {task.credits_used && task.status === "completed" && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {task.credits_used} credits
                </span>
              </>
            )}
          </div>
          <p className="text-base text-foreground leading-relaxed">{task.prompt}</p>
        </div>

        {/* Execution Pipeline - Minimal progress indicator */}
        {task.status !== "completed" && (
          <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
            {Object.entries(stepConfig).map(([key, config], index) => {
              const step = steps.find((s) => s.step === key);
              const status = step?.status || "pending";
              const isLast = index === Object.keys(stepConfig).length - 1;

              return (
                <div key={key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "transition-colors",
                      status === "completed" && "text-foreground",
                      status === "running" && "text-foreground font-medium",
                      status === "pending" && "text-muted-foreground/50"
                    )}
                  >
                    {status === "running" && (
                      <Loader2 className="h-3 w-3 animate-spin inline mr-1.5" />
                    )}
                    {config.label}
                  </span>
                  {!isLast && <span className="text-border">→</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Status indicator for running tasks - minimal */}
        {isLoading && !content && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Failed status */}
        {task.status === "failed" && (
          <div className="flex items-center gap-2 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Something went wrong. Please try again.</span>
          </div>
        )}

        {/* Content - Clean ChatGPT/Perplexity-style output */}
        {content && (
          <div className="ai-output mb-8">
            <ReactMarkdown
              components={{
                // H1: Main title - clean, prominent
                h1: ({ children }) => (
                  <h1 className="text-xl sm:text-2xl font-semibold text-foreground mt-0 mb-2 leading-tight tracking-tight">
                    {children}
                  </h1>
                ),
                // H2: Section headers - clear hierarchy
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-foreground mt-8 mb-3 pb-2 border-b border-border first:mt-0">
                    {children}
                  </h2>
                ),
                // H3: Subsection - subtle emphasis
                h3: ({ children }) => (
                  <h3 className="text-base font-medium text-foreground mt-5 mb-2">
                    {children}
                  </h3>
                ),
                // Paragraphs - comfortable reading
                p: ({ children }) => (
                  <p className="text-[15px] leading-relaxed text-foreground mb-4 last:mb-0">
                    {children}
                  </p>
                ),
                // Unordered lists - clean bullets
                ul: ({ children }) => (
                  <ul className="my-4 space-y-2">{children}</ul>
                ),
                // Ordered lists
                ol: ({ children }) => (
                  <ol className="my-4 space-y-2 list-decimal list-outside pl-5">{children}</ol>
                ),
                // List items - minimal
                li: ({ children }) => (
                  <li className="text-[15px] leading-relaxed text-foreground pl-1 relative before:content-['•'] before:absolute before:-left-4 before:text-muted-foreground [ol_&]:before:content-none">
                    {children}
                  </li>
                ),
                // Strong text
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                // Emphasis
                em: ({ children }) => (
                  <em className="italic text-foreground">{children}</em>
                ),
                // Blockquotes - elegant
                blockquote: ({ children }) => (
                  <blockquote className="my-4 pl-4 border-l-2 border-muted-foreground/30 text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                // Tables - clean, minimal
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50 border-b border-border">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-border">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left font-medium text-foreground whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-foreground">{children}</td>
                ),
                // Code blocks
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="block p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-4">{children}</pre>
                ),
                // Horizontal rule
                hr: () => (
                  <hr className="my-6 border-t border-border" />
                ),
                // Links
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isLoading && (
              <span className="inline-block w-0.5 h-5 bg-foreground animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {/* Generated Files - Clean list style */}
        {task.files && task.files.length > 0 && task.status === "completed" && (
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">Downloads</p>
            <div className="space-y-2">
              {task.files.map((file, index) => {
                const Icon = fileIcons[file.type as keyof typeof fileIcons] || FileText;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      {file.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {file.description}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </Button>
                  </div>
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
