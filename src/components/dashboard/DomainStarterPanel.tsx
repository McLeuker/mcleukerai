import { useSector } from "@/contexts/SectorContext";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { DomainHeader } from "./DomainHeader";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ResearchModeToggle, ResearchMode } from "./ResearchModeToggle";
import { ModelSelector, ModelId } from "./ModelSelector";

interface DomainStarterPanelProps {
  onSelectPrompt: (prompt: string, mode?: ResearchMode, model?: ModelId) => void;
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
  const [searchValue, setSearchValue] = useState("");
  const [researchMode, setResearchMode] = useState<ResearchMode>("quick");
  const [selectedModel, setSelectedModel] = useState<ModelId>("auto");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSelectPrompt(searchValue.trim(), researchMode, selectedModel);
      setSearchValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (searchValue.trim()) {
        onSelectPrompt(searchValue.trim(), researchMode, selectedModel);
        setSearchValue("");
      }
    }
  };

  // All Domains - Hero style centered interface (centers within black area only)
  if (currentSector === "all") {
    return (
      <div className={cn("flex flex-col h-full min-h-[calc(100vh-180px)] bg-black", className)}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-3 text-center">
            Where is my mind?
          </h1>
          
          {/* Subtitle */}
          <p className="text-white/60 text-sm mb-8 text-center">
            Powered by McLeuker AI • All Domains Intelligence Mode
          </p>

          {/* Mode Toggles and Model Selector */}
          <div className="flex items-center gap-4 mb-6">
            <ResearchModeToggle
              mode={researchMode}
              onModeChange={setResearchMode}
            />
            <div className="h-6 w-px bg-white/20" />
            <div className="[&_button]:text-white [&_button]:hover:text-white [&_button]:hover:bg-white/10">
              <ModelSelector
                model={selectedModel}
                onModelChange={setSelectedModel}
                compact
              />
            </div>
          </div>

          {/* Search Bubble */}
          <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-4">
            <div className="relative">
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything across all domains..."
                className={cn(
                  "w-full h-14 px-6 rounded-full",
                  "bg-white/10 border-white/20",
                  "text-white placeholder:text-white/40",
                  "focus:bg-white/15 focus:border-white/30",
                  "transition-all duration-200"
                )}
              />
            </div>
          </form>

          {/* Credit Hint */}
          <div className="text-center mb-8">
            <p className="text-white/50 text-xs">
              {researchMode === "quick" ? "4-12" : "50"} credits • Press Enter to send
            </p>
            <p className="text-white/40 text-xs mt-1 hidden sm:block">
              Shift + Enter for new line
            </p>
          </div>

          {/* Trending Topics */}
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
            {starters.map((topic, index) => (
              <button
                key={index}
                onClick={() => onSelectPrompt(topic, researchMode, selectedModel)}
                className={cn(
                  "px-4 py-2 rounded-full",
                  "border border-white/30",
                  "text-white/80 text-sm",
                  "hover:bg-white/10 hover:border-white/50",
                  "transition-all duration-200"
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Standard domain view
  return (
    <div className={cn("flex flex-col animate-fade-in", className)}>
      {/* Domain Header with Visual */}
      <DomainHeader showImage={true} />

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
