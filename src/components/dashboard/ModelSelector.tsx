import { cn } from "@/lib/utils";
import { ChevronDown, Cpu, Zap, Gauge } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type GrokModel = "grok-4-latest" | "grok-4-mini" | "grok-4-fast";

interface ModelOption {
  id: GrokModel;
  name: string;
  description: string;
  icon: React.ReactNode;
  creditMultiplier?: number;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "grok-4-latest",
    name: "Grok-4",
    description: "Most capable • Complex analysis",
    icon: <Cpu className="h-3.5 w-3.5" />,
    creditMultiplier: 1,
  },
  {
    id: "grok-4-fast",
    name: "Grok-4 Fast",
    description: "Optimized speed • Standard tasks",
    icon: <Zap className="h-3.5 w-3.5" />,
    creditMultiplier: 0.8,
  },
  {
    id: "grok-4-mini",
    name: "Grok-4 Mini",
    description: "Efficient • Quick queries",
    icon: <Gauge className="h-3.5 w-3.5" />,
    creditMultiplier: 0.5,
  },
];

interface ModelSelectorProps {
  model: GrokModel;
  onModelChange: (model: GrokModel) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ModelSelector({
  model,
  onModelChange,
  disabled = false,
  compact = false,
}: ModelSelectorProps) {
  const selectedModel = MODEL_OPTIONS.find((m) => m.id === model) || MODEL_OPTIONS[0];

  if (compact) {
    return (
      <TooltipProvider delayDuration={300}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className={cn(
                    "h-7 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {selectedModel.icon}
                  <span className="hidden sm:inline">{selectedModel.name}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{selectedModel.description}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-56">
            {MODEL_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => onModelChange(option.id)}
                className={cn(
                  "flex items-start gap-3 py-2.5",
                  model === option.id && "bg-muted"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">{option.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{option.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 gap-2 text-xs font-medium",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {selectedModel.icon}
          {selectedModel.name}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {MODEL_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onModelChange(option.id)}
            className={cn(
              "flex items-start gap-3 py-2.5",
              model === option.id && "bg-muted"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">{option.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{option.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {option.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { MODEL_OPTIONS };
