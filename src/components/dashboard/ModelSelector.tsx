import { cn } from "@/lib/utils";
import { ChevronDown, Sparkles, Zap, Brain } from "lucide-react";
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

export type ModelId = "auto" | "grok-4-latest" | "gpt-4.1";

interface ModelOption {
  id: ModelId;
  name: string;
  description: string;
  icon: React.ReactNode;
  creditRange: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Automatically selects the best model for your query",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    creditRange: "4-18",
  },
  {
    id: "grok-4-latest",
    name: "Grok-4",
    description: "Real-time intelligence • Fashion expertise",
    icon: <Zap className="h-3.5 w-3.5" />,
    creditRange: "4-12",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "Advanced reasoning • Complex analysis",
    icon: <Brain className="h-3.5 w-3.5" />,
    creditRange: "6-18",
  },
];

// Helper to check if auto mode should use GPT for complex queries
export function selectModelForQuery(query: string, selectedModel: ModelId): "grok-4-latest" | "gpt-4.1" {
  if (selectedModel !== "auto") {
    return selectedModel === "gpt-4.1" ? "gpt-4.1" : "grok-4-latest";
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Use GPT-4.1 for complex analysis, multi-step reasoning, or detailed reports
  const complexPatterns = [
    /market analysis/i,
    /comprehensive report/i,
    /deep dive/i,
    /strategic analysis/i,
    /compare and contrast/i,
    /trend forecast/i,
    /sustainability audit/i,
    /supply chain analysis/i,
    /competitive landscape/i,
    /investment thesis/i,
  ];
  
  if (complexPatterns.some(pattern => pattern.test(lowerQuery))) {
    return "gpt-4.1";
  }
  
  // Default to Grok for real-time, quick queries
  return "grok-4-latest";
}

interface ModelSelectorProps {
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  disabled?: boolean;
  compact?: boolean;
  showAgentModels?: boolean; // Kept for backward compatibility, no longer used
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
          <DropdownMenuContent align="start" className="w-64">
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
      <DropdownMenuContent align="start" className="w-64">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { MODEL_OPTIONS };
