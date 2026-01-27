import { cn } from "@/lib/utils";
import { ChevronDown, Cpu, Zap, Gauge, Bot, Brain } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ModelId = 
  | "grok-4-latest" 
  | "grok-4-mini" 
  | "grok-4-fast"
  | "manus-1-5"
  | "manus-1-5-light";

// Legacy type for backward compatibility
export type GrokModel = "grok-4-latest" | "grok-4-mini" | "grok-4-fast";

interface ModelOption {
  id: ModelId;
  name: string;
  description: string;
  icon: React.ReactNode;
  creditRange: string;
  isAgent?: boolean;
}

const MODEL_OPTIONS: ModelOption[] = [
  // Grok models (Quick Search)
  {
    id: "grok-4-latest",
    name: "Grok-4",
    description: "Most capable • Complex analysis",
    icon: <Cpu className="h-3.5 w-3.5" />,
    creditRange: "4-10",
  },
  {
    id: "grok-4-fast",
    name: "Grok-4 Fast",
    description: "Optimized speed • Standard tasks",
    icon: <Zap className="h-3.5 w-3.5" />,
    creditRange: "4-8",
  },
  {
    id: "grok-4-mini",
    name: "Grok-4 Mini",
    description: "Efficient • Quick queries",
    icon: <Gauge className="h-3.5 w-3.5" />,
    creditRange: "2-5",
  },
  // Manus Agent models (Deep Research)
  {
    id: "manus-1-5",
    name: "Manus Full",
    description: "Deep autonomous research • 5-30 min",
    icon: <Brain className="h-3.5 w-3.5" />,
    creditRange: "15-40",
    isAgent: true,
  },
  {
    id: "manus-1-5-light",
    name: "Manus Light",
    description: "Faster agent research • 2-15 min",
    icon: <Bot className="h-3.5 w-3.5" />,
    creditRange: "8-20",
    isAgent: true,
  },
];

export function isManusModel(model: ModelId): boolean {
  return model === "manus-1-5" || model === "manus-1-5-light";
}

export function isGrokModel(model: ModelId): boolean {
  return model === "grok-4-latest" || model === "grok-4-fast" || model === "grok-4-mini";
}

interface ModelSelectorProps {
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  disabled?: boolean;
  compact?: boolean;
  showAgentModels?: boolean;
}

export function ModelSelector({
  model,
  onModelChange,
  disabled = false,
  compact = false,
  showAgentModels = true,
}: ModelSelectorProps) {
  const selectedModel = MODEL_OPTIONS.find((m) => m.id === model) || MODEL_OPTIONS[0];
  const displayOptions = showAgentModels 
    ? MODEL_OPTIONS 
    : MODEL_OPTIONS.filter(m => !m.isAgent);

  const grokModels = displayOptions.filter(m => !m.isAgent);
  const agentModels = displayOptions.filter(m => m.isAgent);

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
                  {selectedModel.isAgent && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] ml-1">
                      Agent
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{selectedModel.description}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-64">
            {/* Grok Models */}
            {grokModels.map((option) => (
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
                    <span className="text-[10px] text-muted-foreground">
                      {option.creditRange} cr
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}

            {/* Agent Models Section */}
            {agentModels.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Agent Models (Long-running)
                  </span>
                </div>
                {agentModels.map((option) => (
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm flex items-center gap-1.5">
                          {option.name}
                          <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                            Agent
                          </Badge>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {option.creditRange} cr
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
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
          {selectedModel.isAgent && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              Agent
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {grokModels.map((option) => (
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
                <span className="text-[10px] text-muted-foreground">
                  {option.creditRange} cr
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {option.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}

        {agentModels.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Agent Models
              </span>
            </div>
            {agentModels.map((option) => (
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm flex items-center gap-1.5">
                      {option.name}
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                        Agent
                      </Badge>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {option.creditRange} cr
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { MODEL_OPTIONS };
