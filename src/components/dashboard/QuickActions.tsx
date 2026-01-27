import { Search, TrendingUp, BarChart3, Users, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
  credits: number;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Search,
    label: "Supplier Search",
    prompt: "Find sustainable fabric suppliers for luxury fashion brands in Europe with certifications",
    credits: 8,
  },
  {
    icon: TrendingUp,
    label: "Trend Analysis",
    prompt: "Analyze the latest fashion trends for the upcoming season including colors, materials, and silhouettes",
    credits: 18,
  },
  {
    icon: BarChart3,
    label: "Market Intel",
    prompt: "Provide market analysis for the luxury fashion sector including key players and growth opportunities",
    credits: 10,
  },
  {
    icon: Sparkles,
    label: "AI Research",
    prompt: "Research the impact of AI on fashion design and manufacturing processes",
    credits: 4,
  },
];

interface QuickActionsProps {
  onAction: (prompt: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function QuickActions({ onAction, isLoading, className }: QuickActionsProps) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        {QUICK_ACTIONS.map((action, index) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => onAction(action.prompt)}
            className={cn(
              "h-auto py-2 px-2.5 flex items-center gap-1.5 w-full justify-start",
              "bg-card hover:bg-accent border-border hover:border-foreground/20",
              "transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <action.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-medium truncate">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
