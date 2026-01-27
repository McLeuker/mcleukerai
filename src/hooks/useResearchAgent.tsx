import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { ResearchPhase } from "@/components/dashboard/ResearchProgress";
import type { Source } from "@/components/dashboard/SourceCitations";
import type { ModelId } from "@/components/dashboard/ModelSelector";
import { isManusModel } from "@/components/dashboard/ModelSelector";

export interface BudgetConfirmationData {
  estimatedCost: { min: number; max: number };
  userBalance: number;
  maxAllowed: number;
  profileName: string;
}

export interface ResearchState {
  isResearching: boolean;
  phase: ResearchPhase | null;
  currentStep: number;
  totalSteps: number;
  message: string;
  content: string;
  sources: Source[];
  creditsUsed: number;
  error: string | null;
  isAgentMode: boolean;
  budgetConfirmation: BudgetConfirmationData | null;
  awaitingBudgetConfirmation: boolean;
}

const initialState: ResearchState = {
  isResearching: false,
  phase: null,
  currentStep: 0,
  totalSteps: 0,
  message: "",
  content: "",
  sources: [],
  creditsUsed: 0,
  error: null,
  isAgentMode: false,
  budgetConfirmation: null,
  awaitingBudgetConfirmation: false,
};

export function useResearchAgent() {
  const [state, setState] = useState<ResearchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingQueryRef = useRef<{ query: string; conversationId?: string; model?: ModelId } | null>(null);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setState(initialState);
    pendingQueryRef.current = null;
  }, []);

  const startResearch = useCallback(async (
    query: string,
    conversationId?: string,
    model?: ModelId
  ): Promise<{ success: boolean; content: string; sources: Source[]; creditsUsed: number }> => {
    const isAgent = model ? isManusModel(model) : false;
    
    // Reset state
    setState({
      ...initialState,
      isResearching: true,
      phase: "planning",
      message: isAgent ? "Connecting to Manus Agent..." : "Starting research...",
      isAgentMode: isAgent,
    });

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Please log in to continue");
      }

      abortControllerRef.current = new AbortController();

      // Use appropriate endpoint based on model type
      const endpoint = isAgent 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manus-agent`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-agent`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          query,
          conversationId,
          model,
          profile: model, // For Manus agent
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = "Research failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Request failed: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let finalSources: Source[] = [];
      let finalCreditsUsed = 0;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const eventData = line.slice(6).trim();
                if (eventData === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(eventData);

                  // Handle budget confirmation phase (for Manus)
                  if (parsed.phase === "budget_confirmation") {
                    setState(prev => ({
                      ...prev,
                      awaitingBudgetConfirmation: true,
                      budgetConfirmation: {
                        estimatedCost: parsed.estimatedCost,
                        userBalance: parsed.userBalance,
                        maxAllowed: parsed.maxAllowed,
                        profileName: parsed.profileName,
                      },
                    }));
                    // Store pending query for resumption after confirmation
                    pendingQueryRef.current = { query, conversationId, model };
                    continue;
                  }

                  // Handle different event types
                  if (parsed.phase) {
                    setState(prev => ({
                      ...prev,
                      phase: parsed.phase as ResearchPhase,
                      message: parsed.message || prev.message,
                      currentStep: parsed.step || prev.currentStep,
                      totalSteps: parsed.total || prev.totalSteps,
                      creditsUsed: parsed.creditsUsed || prev.creditsUsed,
                      awaitingBudgetConfirmation: false,
                    }));
                  }

                  // Handle streaming content
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setState(prev => ({
                      ...prev,
                      content: fullContent,
                    }));
                  }

                  // Handle completion
                  if (parsed.sources) {
                    finalSources = parsed.sources;
                    setState(prev => ({
                      ...prev,
                      sources: parsed.sources,
                    }));
                  }

                  if (parsed.creditsUsed) {
                    finalCreditsUsed = parsed.creditsUsed;
                    setState(prev => ({
                      ...prev,
                      creditsUsed: parsed.creditsUsed,
                    }));
                  }

                  // Handle errors
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (parseError) {
                  if (parseError instanceof SyntaxError) continue;
                  throw parseError;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Mark as completed
      setState(prev => ({
        ...prev,
        isResearching: false,
        phase: "completed",
        message: "Research complete",
      }));

      return {
        success: true,
        content: fullContent,
        sources: finalSources,
        creditsUsed: finalCreditsUsed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Research failed";
      
      if ((error as Error).name === "AbortError") {
        setState(prev => ({
          ...prev,
          isResearching: false,
          phase: null,
        }));
        return { success: false, content: "", sources: [], creditsUsed: 0 };
      }

      setState(prev => ({
        ...prev,
        isResearching: false,
        phase: "failed",
        error: errorMessage,
        message: errorMessage,
      }));

      toast({
        title: "Research Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, content: "", sources: [], creditsUsed: 0 };
    } finally {
      abortControllerRef.current = null;
    }
  }, [toast]);

  const confirmBudget = useCallback(async (maxBudget: number) => {
    if (!pendingQueryRef.current) return;
    
    const { query, conversationId, model } = pendingQueryRef.current;
    pendingQueryRef.current = null;
    
    setState(prev => ({
      ...prev,
      awaitingBudgetConfirmation: false,
      budgetConfirmation: null,
    }));

    // Re-call with confirmed budget
    // Note: In a full implementation, you'd pass maxBudget to the API
    return startResearch(query, conversationId, model);
  }, [startResearch]);

  const cancelBudgetConfirmation = useCallback(() => {
    pendingQueryRef.current = null;
    setState(prev => ({
      ...prev,
      isResearching: false,
      awaitingBudgetConfirmation: false,
      budgetConfirmation: null,
      phase: null,
    }));
  }, []);

  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    pendingQueryRef.current = null;
    setState(prev => ({
      ...prev,
      isResearching: false,
      phase: null,
      awaitingBudgetConfirmation: false,
      budgetConfirmation: null,
    }));
  }, []);

  return {
    ...state,
    startResearch,
    cancelResearch,
    confirmBudget,
    cancelBudgetConfirmation,
    reset,
  };
}
