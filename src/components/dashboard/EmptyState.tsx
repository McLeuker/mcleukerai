import { Sparkles, FileText, TrendingUp, Globe, Leaf, Cpu } from "lucide-react";
import { useSector } from "@/contexts/SectorContext";

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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-5 w-5 text-foreground" />
        </div>

        {/* Heading */}
        <h2 className="font-editorial text-3xl text-foreground mb-2">
          What would you like to research?
        </h2>
        <p className="text-muted-foreground mb-2">
          Describe your task in natural language. Fashion AI will research,
          analyze, and generate professional deliverables.
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          Current context: <span className="font-medium text-foreground">{sectorConfig.label}</span>
        </p>

        {/* Suggestions */}
        <div className="grid gap-3 text-left">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(suggestion.prompt)}
              className="p-4 rounded-lg bg-card border border-border hover:bg-accent hover:border-accent transition-colors group text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 group-hover:bg-background transition-colors">
                  <suggestion.icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">
                    {suggestion.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{suggestion.prompt}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
