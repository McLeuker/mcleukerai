import { useEffect } from "react";
import { useMcLeukerStatus } from "@/hooks/useMcLeukerStatus";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface McLeukerStatusIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export function McLeukerStatusIndicator({ 
  showLabel = true, 
  className 
}: McLeukerStatusIndicatorProps) {
  const { 
    connectionStatus, 
    configStatus, 
    checkHealth, 
    checkConfigStatus 
  } = useMcLeukerStatus(true);

  // Check config status after initial health check
  useEffect(() => {
    if (connectionStatus === "connected") {
      checkConfigStatus();
    }
  }, [connectionStatus, checkConfigStatus]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connecting":
        return <Loader2 className="h-4 w-4 animate-spin text-warning" />;
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "disconnected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Connected";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connecting":
        return "bg-warning/10 text-warning border-warning/20";
      case "connected":
        return "bg-success/10 text-success border-success/20";
      case "disconnected":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const tooltipContent = () => {
    if (connectionStatus === "connected" && configStatus) {
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium">McLeuker AI Backend</p>
          <p className="text-muted-foreground">
            Status: {configStatus.status}
          </p>
          {configStatus.default_llm && (
            <p className="text-muted-foreground">
              Model: {configStatus.default_llm}
            </p>
          )}
          {configStatus.services && configStatus.services.length > 0 && (
            <div className="pt-1 border-t border-border mt-1">
              {configStatus.services.map((service) => (
                <p key={service.name} className="text-xs text-muted-foreground">
                  {service.name}: {service.status}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (connectionStatus === "disconnected") {
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-destructive">Backend Disconnected</p>
          <p className="text-muted-foreground">
            Check that VITE_RAILWAY_API_URL is configured correctly
          </p>
        </div>
      );
    }

    return (
      <p className="text-sm">Checking connection to McLeuker backend...</p>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => checkHealth()}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md border transition-colors hover:opacity-80",
              getStatusColor(),
              className
            )}
          >
            {getStatusIcon()}
            {showLabel && (
              <span className="text-xs font-medium">{getStatusLabel()}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
