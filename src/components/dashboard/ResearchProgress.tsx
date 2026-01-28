import { cn } from "@/lib/utils";
import { Check, Search, Globe, Shield, Sparkles, Brain, Loader2, Zap, Bot, Clock, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ResearchPhase = 
  | "planning" 
  | "searching" 
  | "browsing" 
  | "extracting" 
  | "validating" 
  | "generating" 
  | "completed" 
  | "failed"
  | "budget_confirmation"
  | "queued";

export type QueryType = "supplier" | "trend" | "market" | "sustainability" | "general";

interface ResearchProgressProps {
  phase: ResearchPhase;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
  queryType?: QueryType;
  creditsUsed?: number;
  isAgentMode?: boolean;
  onCancel?: () => void;
}

const phases = [
  { key: "planning", label: "Deconstruct", icon: Brain, description: "Analyzing query intent and research objectives" },
  { key: "searching", label: "Search", icon: Search, description: "Multi-source real-time search in progress" },
  { key: "browsing", label: "Extract", icon: Globe, description: "Extracting signals from industry sources" },
  { key: "validating", label: "Validate", icon: Shield, description: "Cross-referencing findings across sources" },
  { key: "generating", label: "Synthesize", icon: Sparkles, description: "Transforming signals into intelligence" },
] as const;

function getPhaseIndex(phase: ResearchPhase): number {
  const index = phases.findIndex(p => p.key === phase);
  if (phase === "extracting") return 2; // Same as browsing
  if (phase === "queued") return 0;
  if (phase === "completed") return phases.length;
  if (phase === "failed") return -1;
  if (phase === "budget_confirmation") return -1;
  return index;
}

function getQueryTypeLabel(type?: QueryType): { label: string; color: string } {
  switch (type) {
    case "supplier":
      return { label: "Supplier Research", color: "bg-blue-500/10 text-blue-600" };
    case "trend":
      return { label: "Trend Analysis", color: "bg-purple-500/10 text-purple-600" };
    case "market":
      return { label: "Market Intelligence", color: "bg-green-500/10 text-green-600" };
    case "sustainability":
      return { label: "Sustainability Audit", color: "bg-emerald-500/10 text-emerald-600" };
    default:
      return { label: "General Research", color: "bg-muted text-muted-foreground" };
  }
}

export function ResearchProgress({ 
  phase, 
  currentStep, 
  totalSteps, 
  message,
  queryType,
  creditsUsed,
  isAgentMode,
  onCancel
}: ResearchProgressProps) {
  const currentPhaseIndex = getPhaseIndex(phase);
  const queryTypeInfo = getQueryTypeLabel(queryType);

  if (phase === "failed") {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-destructive">
          <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
            <span className="text-xs text-destructive-foreground font-bold">!</span>
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
    <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-4 space-y-4 border border-border/50">
      {/* Header with query type and agent badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAgentMode ? (
            <>
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Deep Research Mode</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Professional Intelligence Engine</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {queryType && (
            <Badge variant="secondary" className={cn("text-xs", queryTypeInfo.color)}>
              {queryTypeInfo.label}
            </Badge>
          )}
          {isAgentMode && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              Long-running
            </Badge>
          )}
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10" />
        
        {phases.map((p, idx) => {
          const Icon = p.icon;
          const isActive = p.key === phase || (phase === "extracting" && p.key === "browsing") || (phase === "queued" && p.key === "planning");
          const isCompleted = idx < currentPhaseIndex;
          const isPending = idx > currentPhaseIndex;

          return (
            <div key={p.key} className="flex flex-col items-center gap-1.5 flex-1 relative">
              {/* Connection line segment */}
              {idx > 0 && (
                <div 
                  className={cn(
                    "absolute h-0.5 right-1/2 top-4 w-full -z-10",
                    isCompleted || isActive ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              
              {/* Icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
                  isCompleted && "bg-primary text-primary-foreground shadow-sm",
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
                  "text-xs font-medium text-center",
                  isActive && "text-primary",
                  isCompleted && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
          style={{ width: `${Math.min((currentPhaseIndex + 1) / phases.length * 100, 100)}%` }}
        />
      </div>

      {/* Current status message */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {phase !== "completed" && (
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
          <span className="text-muted-foreground">
            {message || phases.find(p => p.key === phase)?.description || "Processing..."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {creditsUsed !== undefined && creditsUsed > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {creditsUsed} credits
            </span>
          )}
          {currentStep && totalSteps && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Step {currentStep} of {totalSteps}
            </span>
          )}
        </div>
      </div>

      {/* Cancel button for long-running tasks */}
      {isAgentMode && onCancel && phase !== "completed" && (
        <div className="flex justify-end pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive"
          >
            Stop Research
          </Button>
        </div>
      )}
    </div>
  );
}
