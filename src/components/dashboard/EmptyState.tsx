import { Sparkles, FileText, TrendingUp, Globe } from "lucide-react";

export function EmptyState() {
  const suggestions = [
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
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-6 w-6 text-foreground" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          What would you like to research?
        </h2>
        <p className="text-muted-foreground mb-8">
          Describe your task in natural language. Fashion AI will research, analyze, and generate professional deliverables.
        </p>

        {/* Suggestions */}
        <div className="grid gap-3 text-left">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-card border border-border hover:bg-accent transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 group-hover:bg-background transition-colors">
                  <suggestion.icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">{suggestion.title}</p>
                  <p className="text-sm text-muted-foreground">{suggestion.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
