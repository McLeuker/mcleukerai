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
    health,
    checkHealth, 
  } = useMcLeukerStatus(true);

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
    if (connectionStatus === "connected" && health) {
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium">McLeuker AI Backend</p>
          <p className="text-muted-foreground">
            Status: {health.status}
          </p>
          {health.version && (
            <p className="text-muted-foreground">
              Version: {health.version}
            </p>
          )}
        </div>
      );
    }
    
    if (connectionStatus === "disconnected") {
      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-destructive">Backend Disconnected</p>
          <p className="text-muted-foreground">
            Check that the backend is running
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
