import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { useSector } from "@/contexts/SectorContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  onNewChat?: () => void;
}

const EXAMPLE_PROMPTS = [
  "Analyze SS26 womenswear trends from Milan Fashion Week",
  "Find sustainable denim suppliers in Europe with low MOQ",
  "Compare luxury handbag pricing across global markets",
  "Map sustainability certifications for European brands",
  "Research AI adoption in fashion supply chains",
  "Create a trend forecast report for Resort 2026"
];

const TIPS = [
  "Be specific about timeframes, regions, and market segments for better results",
  "You can request outputs in different formats: reports, spreadsheets, presentations",
  "Use domain tabs to focus the AI on specific industry knowledge"
];

export function EmptyState({ onSelectPrompt, onNewChat }: EmptyStateProps) {
  const { getSectorConfig } = useSector();
  const sectorConfig = getSectorConfig();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 animate-fade-in max-w-[800px] mx-auto">
      <div className="text-center w-full">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mx-auto mb-8">
          <Sparkles className="h-6 w-6 text-white/70" />
        </div>

        {/* Heading */}
        <h2 className="font-luxury text-3xl sm:text-4xl text-white mb-4">
          Start a new conversation
        </h2>
        <p className="text-white/60 mb-2 text-base max-w-lg mx-auto leading-relaxed">
          Ask McLeuker AI anything about fashion, beauty, sustainability, or market intelligence. 
          Get structured insights in seconds.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 mb-10">
          Currently in: <span className="text-white/70">{sectorConfig.label}</span>
        </div>

        {/* Example Prompts */}
        <div className="mb-12">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Try an example</p>
          <div className="grid gap-2 max-w-xl mx-auto">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onSelectPrompt(prompt)}
                className={cn(
                  "group p-4 rounded-xl text-left transition-all duration-200",
                  "bg-[#0D0D0D] border border-white/[0.06]",
                  "hover:border-white/[0.12] hover:bg-[#101010]",
                  "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#070707]"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                    {prompt}
                  </p>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-[#0A0A0A] rounded-xl border border-white/[0.05] p-6 max-w-xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-4 w-4 text-white/40" />
            <p className="text-white/50 text-xs uppercase tracking-wider">Quick tips</p>
          </div>
          <div className="space-y-3">
            {TIPS.map((tip, index) => (
              <p key={index} className="text-sm text-white/50 leading-relaxed">
                {tip}
              </p>
            ))}
          </div>
        </div>

        {/* CTA */}
        {onNewChat && (
          <div className="mt-10">
            <Button
              onClick={onNewChat}
              className="bg-white text-black hover:bg-white/90 px-6 py-5"
            >
              Start a new chat
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
