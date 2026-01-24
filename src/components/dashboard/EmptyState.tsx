import { Sparkles, FileText, TrendingUp, Globe, Leaf, Cpu, ChevronRight } from "lucide-react";
import { useSector } from "@/contexts/SectorContext";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const sectorSuggestions = {
  all: [
    {
      icon: FileText,
      title: "Supplier Research",
      prompt: "Find sustainable denim suppliers in Europe with MOQ under 500 units",
    },
    {
      icon: TrendingUp,
      title: "Trend Analysis",
      prompt: "Analyze emerging streetwear trends for Spring/Summer 2026",
    },
    {
      icon: Globe,
      title: "Market Intelligence",
      prompt: "Compare luxury handbag pricing across US, EU, and Asian markets",
    },
  ],
  fashion: [
    {
      icon: TrendingUp,
      title: "Catwalk Analysis",
      prompt: "Analyze SS26 womenswear trends from Milan and Paris Fashion Week",
    },
    {
      icon: FileText,
      title: "Collection Planning",
      prompt: "Research color palettes for Resort 2026 women's ready-to-wear",
    },
    {
      icon: Globe,
      title: "Brand Positioning",
      prompt: "Map luxury brand positioning strategies in emerging markets",
    },
  ],
  beauty: [
    {
      icon: FileText,
      title: "Ingredient Analysis",
      prompt: "Research trending skincare ingredients for 2025 product development",
    },
    {
      icon: Globe,
      title: "Market Mapping",
      prompt: "Map clean beauty brands gaining market share in North America",
    },
    {
      icon: TrendingUp,
      title: "Consumer Trends",
      prompt: "Analyze Gen Z beauty purchasing patterns and preferences",
    },
  ],
  skincare: [
    {
      icon: FileText,
      title: "Regulatory Research",
      prompt: "Map skincare ingredient regulations across EU, US, and Asia",
    },
    {
      icon: Leaf,
      title: "Clean Beauty",
      prompt: "Research clean skincare certification requirements",
    },
    {
      icon: TrendingUp,
      title: "Trend Forecasting",
      prompt: "Analyze emerging skincare technology trends for 2026",
    },
  ],
  sustainability: [
    {
      icon: Leaf,
      title: "Certification Audit",
      prompt: "Map sustainability certifications for European fashion brands",
    },
    {
      icon: Globe,
      title: "Supply Chain",
      prompt: "Research supply chain transparency practices in luxury fashion",
    },
    {
      icon: FileText,
      title: "Impact Assessment",
      prompt: "Analyze environmental impact metrics for denim production",
    },
  ],
  "fashion-tech": [
    {
      icon: Cpu,
      title: "AI Adoption",
      prompt: "Research AI adoption in fashion supply chains",
    },
    {
      icon: TrendingUp,
      title: "Technology Trends",
      prompt: "Analyze emerging fashion tech startups and their solutions",
    },
    {
      icon: Globe,
      title: "Digital Innovation",
      prompt: "Map digital fashion and virtual try-on technologies",
    },
  ],
  catwalks: [
    {
      icon: TrendingUp,
      title: "Runway Analysis",
      prompt: "Analyze color and silhouette trends from Paris Fashion Week FW25",
    },
    {
      icon: FileText,
      title: "Designer Report",
      prompt: "Create a comprehensive report on emerging designers at Milan Fashion Week",
    },
    {
      icon: Globe,
      title: "Global Shows",
      prompt: "Compare styling trends across major fashion weeks",
    },
  ],
  culture: [
    {
      icon: Globe,
      title: "Cultural Influence",
      prompt: "Research cultural influences on luxury brand positioning in Asia",
    },
    {
      icon: TrendingUp,
      title: "Consumer Behavior",
      prompt: "Analyze cultural shifts in fashion consumption patterns",
    },
    {
      icon: FileText,
      title: "Heritage Brands",
      prompt: "Map heritage brand strategies and cultural storytelling",
    },
  ],
};

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const { currentSector, getSectorConfig } = useSector();
  const sectorConfig = getSectorConfig();
  const suggestions = sectorSuggestions[currentSector] || sectorSuggestions.all;

  return (
    <div className="flex flex-col items-center justify-center px-4 animate-fade-in">
      <div className="text-center max-w-2xl">
        {/* Icon with luxury treatment */}
        <div className="relative w-16 h-16 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/20 to-transparent" />
          <div className="absolute inset-1 rounded-full bg-card border border-border flex items-center justify-center shadow-premium">
            <Sparkles className="h-6 w-6 text-gold" />
          </div>
        </div>

        {/* Heading with editorial typography */}
        <h2 className="font-editorial text-3xl sm:text-4xl text-foreground mb-3 tracking-tight">
          What would you like to research?
        </h2>
        <p className="text-muted-foreground mb-2 text-sm sm:text-base max-w-md mx-auto">
          Describe your task in natural language. McLeuker AI will research,
          analyze, and generate professional deliverables.
        </p>
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="px-3 py-1 rounded-full bg-accent text-xs font-medium text-foreground border border-border">
            {sectorConfig.label}
          </span>
        </div>

        {/* Luxury Suggestion Cards */}
        <div className="grid gap-3 text-left max-w-xl mx-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(suggestion.prompt)}
              className={cn(
                "group p-4 rounded-xl transition-all duration-300",
                "bg-card border border-border",
                "hover:border-foreground/15 hover:shadow-premium",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  "bg-secondary group-hover:bg-accent transition-colors duration-300"
                )}>
                  <suggestion.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {suggestion.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {suggestion.prompt}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "h-5 w-5 text-muted-foreground shrink-0 mt-2.5",
                  "group-hover:text-foreground group-hover:translate-x-0.5",
                  "transition-all duration-200"
                )} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
