import { cn } from "@/lib/utils";
import { Check, Search, Globe, Shield, Sparkles, Brain, Loader2 } from "lucide-react";

export type ResearchPhase = 
  | "planning" 
  | "searching" 
  | "browsing" 
  | "extracting" 
  | "validating" 
  | "generating" 
  | "completed" 
  | "failed";

interface ResearchProgressProps {
  phase: ResearchPhase;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}

const phases = [
  { key: "planning", label: "Planning", icon: Brain },
  { key: "searching", label: "Searching", icon: Search },
  { key: "browsing", label: "Browsing", icon: Globe },
  { key: "validating", label: "Validating", icon: Shield },
  { key: "generating", label: "Generating", icon: Sparkles },
] as const;

function getPhaseIndex(phase: ResearchPhase): number {
  const index = phases.findIndex(p => p.key === phase);
  if (phase === "extracting") return 2; // Same as browsing
  if (phase === "completed") return phases.length;
  if (phase === "failed") return -1;
  return index;
}

export function ResearchProgress({ 
  phase, 
  currentStep, 
  totalSteps, 
  message 
}: ResearchProgressProps) {
  const currentPhaseIndex = getPhaseIndex(phase);

  if (phase === "failed") {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-destructive">
          <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
            <span className="text-xs text-destructive-foreground">!</span>
          </div>
          <span className="font-medium">Research failed</span>
        </div>
        {message && (
          <p className="text-sm text-destructive/80 mt-2 ml-7">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
      {/* Phase Timeline */}
      <div className="flex items-center justify-between">
        {phases.map((p, idx) => {
          const Icon = p.icon;
          const isActive = p.key === phase || (phase === "extracting" && p.key === "browsing");
          const isCompleted = idx < currentPhaseIndex;
          const isPending = idx > currentPhaseIndex;

          return (
            <div key={p.key} className="flex flex-col items-center gap-1.5 flex-1">
              {/* Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "text-primary",
                  isCompleted && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {p.label}
              </span>

              {/* Connector line (not on last item) */}
              {idx < phases.length - 1 && (
                <div
                  className={cn(
                    "absolute h-0.5 w-full top-4 left-1/2",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                  style={{ display: "none" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${Math.min((currentPhaseIndex + 1) / phases.length * 100, 100)}%` }}
        />
      </div>

      {/* Current status message */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {message || "Processing..."}
        </span>
        {currentStep && totalSteps && (
          <span className="text-xs text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
        )}
      </div>
    </div>
  );
}
