import { useState, useEffect, useCallback } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface HealthResponse {
  status: string;
  version?: string;
  services?: Record<string, boolean>;
}

interface UseMcLeukerStatusReturn {
  status: null;
  health: HealthResponse | null;
  configStatus: null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
  checkHealth: () => Promise<boolean>;
  checkConfigStatus: () => Promise<void>;
}

export function useMcLeukerStatus(autoCheck: boolean = true): UseMcLeukerStatusReturn {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const healthResponse = await mcLeukerAPI.checkHealth();
      setHealth(healthResponse);
      setConnectionStatus(healthResponse.status === "healthy" ? "connected" : "disconnected");
      setError(null);
      return healthResponse.status === "healthy";
    } catch (err) {
      setConnectionStatus("disconnected");
      setError(err instanceof Error ? err.message : "Health check failed");
      return false;
    }
  }, []);

  const checkStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await checkHealth();
    } finally {
      setIsLoading(false);
    }
  }, [checkHealth]);

  const checkConfigStatus = useCallback(async (): Promise<void> => {
    // No-op - config status not available
  }, []);

  useEffect(() => {
    if (autoCheck) {
      checkHealth();
    }
  }, [autoCheck, checkHealth]);

  return {
    status: null,
    health,
    configStatus: null,
    connectionStatus,
    isLoading,
    error,
    checkStatus,
    checkHealth,
    checkConfigStatus,
  };
}
