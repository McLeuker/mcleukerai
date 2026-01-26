import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: string;
  className?: string;
  showIcon?: boolean;
}

export function TrendIndicator({
  direction,
  value,
  className,
  showIcon = true,
}: TrendIndicatorProps) {
  const getIndicator = () => {
    switch (direction) {
      case "up":
        return {
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          symbol: "↑",
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
        };
      case "down":
        return {
          icon: <TrendingDown className="h-3.5 w-3.5" />,
          symbol: "↓",
          color: "text-rose-500",
          bgColor: "bg-rose-500/10",
        };
      case "neutral":
      default:
        return {
          icon: <Minus className="h-3.5 w-3.5" />,
          symbol: "→",
          color: "text-muted-foreground",
          bgColor: "bg-muted",
        };
    }
  };

  const indicator = getIndicator();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        indicator.color,
        indicator.bgColor,
        className
      )}
    >
      {showIcon && indicator.icon}
      {!showIcon && <span>{indicator.symbol}</span>}
      {value && <span>{value}</span>}
    </span>
  );
}

// Helper function to parse trend indicators from text
export function parseTrendFromText(text: string): TrendDirection {
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("↑") ||
    lowerText.includes("increase") ||
    lowerText.includes("growth") ||
    lowerText.includes("positive") ||
    lowerText.includes("rising")
  ) {
    return "up";
  }
  if (
    lowerText.includes("↓") ||
    lowerText.includes("decrease") ||
    lowerText.includes("decline") ||
    lowerText.includes("negative") ||
    lowerText.includes("falling")
  ) {
    return "down";
  }
  return "neutral";
}
