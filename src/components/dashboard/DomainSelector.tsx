import { useNavigate, useLocation } from "react-router-dom";
import { useSector, SECTORS, Sector } from "@/contexts/SectorContext";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DomainSelectorProps {
  variant?: "pills" | "dropdown";
  className?: string;
  onDomainChange?: (sector: Sector) => void;
  navigateOnClick?: boolean;
}

export function DomainSelector({ 
  variant = "pills", 
  className, 
  onDomainChange,
  navigateOnClick = true,
}: DomainSelectorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSector, setSector } = useSector();

  const handleSectorChange = (sector: Sector) => {
    setSector(sector);
    onDomainChange?.(sector);
    
    // Navigate to domain landing page (except for "all" which stays in dashboard)
    if (navigateOnClick && sector !== "all") {
      navigate(`/domain/${sector}`);
    } else if (navigateOnClick && sector === "all") {
      // If clicking "All Domains", go to dashboard
      if (location.pathname.startsWith("/domain/")) {
        navigate("/dashboard");
      }
    }
  };

  if (variant === "dropdown") {
    return (
      <Select value={currentSector} onValueChange={(v) => handleSectorChange(v as Sector)}>
        <SelectTrigger className="w-40 h-9 text-xs bg-card border-border">
          <SelectValue placeholder="Select domain" />
        </SelectTrigger>
        <SelectContent>
          {SECTORS.map((sector) => (
            <SelectItem key={sector.id} value={sector.id} className="text-xs">
              {sector.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <ScrollArea className={cn("w-full", className)}>
      <div className="flex gap-1.5 pb-2">
        {SECTORS.map((sector) => (
          <button
            key={sector.id}
            onClick={() => handleSectorChange(sector.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
              "border hover:border-foreground/30",
              currentSector === sector.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            {sector.label}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="h-1.5" />
    </ScrollArea>
  );
}
