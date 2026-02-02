import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Check, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ActivityStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "done" | "error";
  detail?: string;
}

interface BackgroundActivityPanelProps {
  steps: ActivityStep[];
  isActive: boolean;
  defaultExpanded?: boolean;
}

const DEFAULT_STEPS: ActivityStep[] = [
  { id: "understanding", label: "Understanding request", status: "pending" },
  { id: "planning", label: "Planning approach", status: "pending" },
  { id: "gathering", label: "Gathering information", status: "pending" },
  { id: "generating", label: "Generating answer", status: "pending" },
  { id: "finalizing", label: "Finalizing output", status: "pending" },
];

function getStatusIcon(status: ActivityStep["status"]) {
  switch (status) {
    case "in_progress":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />;
    case "done":
      return <Check className="h-3.5 w-3.5 text-emerald-400" />;
    case "error":
      return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-white/30" />;
  }
}

function getOverallStatus(steps: ActivityStep[], isActive: boolean): string {
  if (!isActive) {
    const hasError = steps.some(s => s.status === "error");
    if (hasError) return "Failed";
    return "Complete";
  }
  
  const inProgress = steps.find(s => s.status === "in_progress");
  if (inProgress) return inProgress.label + "...";
  
  return "Running...";
}

export function BackgroundActivityPanel({
  steps = DEFAULT_STEPS,
  isActive,
  defaultExpanded = true,
}: BackgroundActivityPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  const displaySteps = steps.length > 0 ? steps : DEFAULT_STEPS;
  const completedCount = displaySteps.filter(s => s.status === "done").length;
  const overallStatus = getOverallStatus(displaySteps, isActive);

  // Collapsed summary line
  if (!isActive && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors mb-3"
      >
        <Check className="h-3 w-3 text-emerald-400" />
        <span>Background activity complete</span>
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            {isActive ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span className="text-sm font-medium text-white/90">Background activity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">
              {isActive ? overallStatus : `${completedCount}/${displaySteps.length} steps`}
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-white/50" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/50" />
            )}
          </div>
        </CollapsibleTrigger>

        {/* Step List */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {displaySteps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 py-1.5",
                  step.status === "pending" && "opacity-50"
                )}
              >
                {getStatusIcon(step.status)}
                <span
                  className={cn(
                    "text-sm",
                    step.status === "in_progress"
                      ? "text-white"
                      : step.status === "done"
                      ? "text-white/70"
                      : step.status === "error"
                      ? "text-red-400"
                      : "text-white/40"
                  )}
                >
                  {step.label}
                </span>
                {step.detail && (
                  <span className="text-xs text-white/40 ml-auto">{step.detail}</span>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Map research phase to activity steps
 * Used by ChatMessage to derive steps from ResearchState
 */
export function mapPhaseToSteps(
  phase?: string,
  isResearching?: boolean
): ActivityStep[] {
  const steps: ActivityStep[] = [
    { id: "understanding", label: "Understanding request", status: "pending" },
    { id: "planning", label: "Planning approach", status: "pending" },
    { id: "gathering", label: "Gathering information", status: "pending" },
    { id: "generating", label: "Generating answer", status: "pending" },
    { id: "finalizing", label: "Finalizing output", status: "pending" },
  ];

  if (!isResearching && !phase) {
    // Completed - all done
    return steps.map(s => ({ ...s, status: "done" as const }));
  }

  // Map research phases to step progress
  const phaseMap: Record<string, number> = {
    planning: 1,
    searching: 2,
    browsing: 2,
    extracting: 2,
    validating: 3,
    generating: 3,
    researching: 2,
    completed: 5,
  };

  const currentStepIndex = phaseMap[phase || ""] || 0;

  return steps.map((step, index) => {
    if (index < currentStepIndex) {
      return { ...step, status: "done" as const };
    }
    if (index === currentStepIndex) {
      return { ...step, status: "in_progress" as const };
    }
    return step;
  });
}
