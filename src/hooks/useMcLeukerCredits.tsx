import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserCredits {
  balance: number;
  monthly_credits: number;
  extra_credits: number;
}

interface UseMcLeukerCreditsReturn {
  credits: UserCredits | null;
  pricing: null;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  fetchPricing: () => Promise<void>;
}

export function useMcLeukerCredits(): UseMcLeukerCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshCredits = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("users")
        .select("credit_balance, monthly_credits, extra_credits")
        .eq("user_id", user.id)
        .single();

      if (dbError) throw dbError;

      setCredits({
        balance: data?.credit_balance || 0,
        monthly_credits: data?.monthly_credits || 0,
        extra_credits: data?.extra_credits || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch credits";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchPricing = useCallback(async () => {
    // Pricing is handled via config, no API call needed
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshCredits();
    }
  }, [user?.id, refreshCredits]);

  return {
    credits,
    pricing: null,
    isLoading,
    error,
    refreshCredits,
    fetchPricing,
  };
}
