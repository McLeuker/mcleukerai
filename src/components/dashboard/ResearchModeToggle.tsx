import { cn } from "@/lib/utils";
import { Zap, Brain, Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ResearchMode = "quick" | "deep";

interface ResearchModeToggleProps {
  mode: ResearchMode;
  onModeChange: (mode: ResearchMode) => void;
  disabled?: boolean;
}

export function ResearchModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: ResearchModeToggleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="inline-flex items-center rounded-full bg-white/10 p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onModeChange("quick")}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                mode === "quick"
                  ? "bg-white text-black shadow-sm"
                  : "text-white/60 hover:text-white",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick
              <span className={cn(
                "flex items-center gap-0.5",
                mode === "quick" ? "text-black/50" : "text-white/40"
              )}>
                <Coins className="h-3 w-3" />5
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-center">
              <p className="font-medium">Quick Chat</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fast AI response • 5 credits
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onModeChange("deep")}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                mode === "deep"
                  ? "bg-white text-black shadow-sm"
                  : "text-white/60 hover:text-white",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Brain className="h-3.5 w-3.5" />
              Deep
              <span className={cn(
                "flex items-center gap-0.5",
                mode === "deep" ? "text-black/50" : "text-white/40"
              )}>
                <Coins className="h-3 w-3" />50
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-center">
              <p className="font-medium">Deep Reasoning</p>
              <p className="text-xs text-muted-foreground mt-1">
                Multi-step reasoning + sources • 50 credits
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Comprehensive analysis with web research
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
