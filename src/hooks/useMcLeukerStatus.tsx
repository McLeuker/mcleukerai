import { useState, useEffect, useCallback } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import type { ConfigStatus, HealthResponse, StatusResponse } from "@/types/mcLeuker";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface UseMcLeukerStatusReturn {
  status: StatusResponse | null;
  health: HealthResponse | null;
  configStatus: ConfigStatus | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
  checkHealth: () => Promise<boolean>;
  checkConfigStatus: () => Promise<void>;
}

export function useMcLeukerStatus(autoCheck: boolean = true): UseMcLeukerStatusReturn {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const healthResponse = await mcLeukerAPI.getHealth();
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
      const statusResponse = await mcLeukerAPI.getStatus();
      setStatus(statusResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status check failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkConfigStatus = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const configResponse = await mcLeukerAPI.getConfigStatus();
      setConfigStatus(configResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Config status check failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      checkHealth();
    }
  }, [autoCheck, checkHealth]);

  return {
    status,
    health,
    configStatus,
    connectionStatus,
    isLoading,
    error,
    checkStatus,
    checkHealth,
    checkConfigStatus,
  };
}
