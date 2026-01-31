import { useState, useCallback, useEffect } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import type { UserCredits, PricingResponse } from "@/types/mcLeuker";
import { useAuth } from "./useAuth";

interface UseMcLeukerCreditsReturn {
  credits: UserCredits | null;
  pricing: PricingResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  fetchPricing: () => Promise<void>;
}

export function useMcLeukerCredits(): UseMcLeukerCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const userCredits = await mcLeukerAPI.getUserCredits(user.id);
      setCredits(userCredits);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch credits";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchPricing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pricingData = await mcLeukerAPI.getPricing();
      setPricing(pricingData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch pricing";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch credits on mount when user is available
  useEffect(() => {
    if (user?.id) {
      refreshCredits();
    }
  }, [user?.id, refreshCredits]);

  return {
    credits,
    pricing,
    isLoading,
    error,
    refreshCredits,
    fetchPricing,
  };
}
