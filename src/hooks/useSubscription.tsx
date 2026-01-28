import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { SUBSCRIPTION_PLANS } from "@/config/pricing";

export interface SubscriptionState {
  subscribed: boolean;
  plan: "free" | "pro" | "studio" | "enterprise";
  billingCycle: "monthly" | "yearly" | null;
  subscriptionEnd: string | null;
  monthlyCredits: number;
  extraCredits: number;
  creditBalance: number;
  refillsThisMonth: number;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  refreshSubscription: () => Promise<void>;
  createCheckout: (plan: string, billingCycle: string) => Promise<void>;
  purchaseCredits: (packId: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  canRefill: () => boolean;
  hasCreditsFor: (creditCost: number) => boolean;
  getPlanConfig: () => typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: "free",
    billingCycle: null,
    subscriptionEnd: null,
    monthlyCredits: 40, // Free plan default
    extraCredits: 0,
    creditBalance: 40,
    refillsThisMonth: 0,
    loading: true,
  });

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Get fresh session to avoid expired token errors
      const { data: sessionData } = await supabase.auth.getSession();
      const freshToken = sessionData?.session?.access_token;
      
      if (!freshToken) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${freshToken}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        return;
      }

      setState({
        subscribed: data.subscribed || false,
        plan: data.plan || "free",
        billingCycle: data.billingCycle || null,
        subscriptionEnd: data.subscriptionEnd || null,
        monthlyCredits: data.monthlyCredits || 40,
        extraCredits: data.extraCredits || 0,
        creditBalance: data.creditBalance || data.monthlyCredits || 40,
        refillsThisMonth: data.refillsThisMonth || 0,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  // Fetch subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setState({
        subscribed: false,
        plan: "free",
        billingCycle: null,
        subscriptionEnd: null,
        monthlyCredits: 40,
        extraCredits: 0,
        creditBalance: 40,
        refillsThisMonth: 0,
        loading: false,
      });
    }
  }, [user, refreshSubscription]);

  // Refresh subscription periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

  // Check for checkout success in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutSuccess = params.get("checkout");
    const creditsSuccess = params.get("credits");
    const creditsAmount = params.get("amount");

    if (checkoutSuccess === "success") {
      toast({
        title: "Subscription activated!",
        description: "Welcome to your new plan. Your credits have been added.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      refreshSubscription();
    } else if (creditsSuccess === "success" && creditsAmount) {
      toast({
        title: "Credits purchased!",
        description: `${creditsAmount} credits have been added to your account.`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      refreshSubscription();
    }
  }, [toast, refreshSubscription]);

  const createCheckout = async (plan: string, billingCycle: string) => {
    if (!session?.access_token) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to subscribe.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const purchaseCredits = async (packId: string) => {
    if (!session?.access_token) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to purchase credits.",
        variant: "destructive",
      });
      return;
    }

    // Check if user can refill
    if (!canRefill()) {
      toast({
        title: "Refill limit reached",
        description: "You've reached your monthly refill limit.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { packId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase failed",
        description: "Unable to start purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Unable to open billing portal",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Check if user can purchase refills (paid plans only)
  const canRefill = () => {
    if (!state.subscribed || state.plan === "free") return false;
    
    const planConfig = SUBSCRIPTION_PLANS[state.plan as keyof typeof SUBSCRIPTION_PLANS];
    if (!planConfig || !('maxRefillsPerMonth' in planConfig)) return false;
    
    const maxRefills = planConfig.maxRefillsPerMonth as number;
    return state.refillsThisMonth < maxRefills;
  };

  // Check if user has credits for a specific action
  const hasCreditsFor = (creditCost: number) => {
    return state.creditBalance >= creditCost;
  };

  const getPlanConfig = () => {
    return SUBSCRIPTION_PLANS[state.plan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        refreshSubscription,
        createCheckout,
        purchaseCredits,
        openCustomerPortal,
        canRefill,
        hasCreditsFor,
        getPlanConfig,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
