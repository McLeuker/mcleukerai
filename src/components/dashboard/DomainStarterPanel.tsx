import { useSector } from "@/contexts/SectorContext";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { DomainHeader } from "./DomainHeader";
import ReactMarkdown from "react-markdown";

interface DomainStarterPanelProps {
  onSelectPrompt: (prompt: string) => void;
  snapshot?: string | null;
  snapshotLoading?: boolean;
  className?: string;
}

export function DomainStarterPanel({
  onSelectPrompt,
  snapshot,
  snapshotLoading,
  className,
}: DomainStarterPanelProps) {
  const { currentSector, getSectorConfig, getStarters } = useSector();
  const config = getSectorConfig();
  const starters = getStarters();

  return (
    <div className={cn("flex flex-col animate-fade-in", className)}>
      {/* Domain Header with Visual */}
      <DomainHeader showImage={currentSector !== "all"} />

      {/* Content Area */}
      <div className="px-6 py-6 max-w-3xl mx-auto w-full">
        {/* Snapshot Section */}
        {(snapshotLoading || snapshot) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                What's Happening Now
              </h2>
            </div>
            
            {snapshotLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading {config.label} insights...</span>
              </div>
            ) : snapshot ? (
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="text-[15px] text-foreground/90 leading-relaxed mb-3">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 my-3">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-[15px] text-foreground/90 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground">
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                  }}
                >
                  {snapshot}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        )}

        {/* Starter Questions */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Explore {config.label}
          </h3>
          
          <div className="grid gap-2">
            {starters.map((question, index) => (
              <button
                key={index}
                onClick={() => onSelectPrompt(question)}
                className={cn(
                  "group flex items-center justify-between gap-4 p-4 rounded-lg",
                  "bg-card border border-border",
                  "hover:border-foreground/20 hover:bg-accent/50",
                  "transition-all duration-200",
                  "text-left"
                )}
              >
                <span className="text-[15px] text-foreground">
                  {question}
                </span>
                <ArrowRight className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0",
                  "group-hover:text-foreground group-hover:translate-x-0.5",
                  "transition-all duration-200"
                )} />
              </button>
            ))}
          </div>
        </div>

        {/* Minimal branding */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Powered by McLeuker AI • {config.label} Intelligence Mode
          </p>
        </div>
      </div>
    </div>
  );
}
