import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReasoningDisplayProps {
  reasoning: string;
  defaultOpen?: boolean;
}

export function ReasoningDisplay({ reasoning, defaultOpen = false }: ReasoningDisplayProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!reasoning) return null;

  // Split reasoning into lines for better display
  const lines = reasoning.split('\n').filter(line => line.trim());

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4 rounded-lg border border-border bg-muted/30"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors rounded-t-lg">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">AI Reasoning</span>
          <span className="text-xs text-muted-foreground">
            {lines.length} step{lines.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 space-y-2">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "text-sm text-muted-foreground pl-3 border-l-2 border-border",
                line.startsWith('-') || line.startsWith('•') 
                  ? "ml-2" 
                  : ""
              )}
            >
              {line}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
