/**
 * McLeuker API Client - V3.1 with Reliability Hardening
 * Handles communication with the Railway backend
 */

export interface ChatResponseV2 {
  success: boolean;
  message?: string;
  error?: string;
  model?: string;
  credits_used?: number;
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  reasoning?: string;
  reasoning_steps?: Array<{
    step: number;
    title: string;
    content: string;
  }>;
  generated_files?: Array<{
    name: string;
    filename?: string;
    format?: string;
    type?: string;
    url: string;
    download_url?: string;
    size?: number;
    path?: string;
    created_at?: string;
  }>;
  follow_up_questions?: string[];
  needs_user_input?: boolean;
  clarification_prompt?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  services: {
    grok: boolean;
    perplexity: boolean;
    exa: boolean;
    browserless: boolean;
    e2b: boolean;
    nano_banana: boolean;
  };
}

class McLeukerAPI {
  private baseUrl: string;
  private supabaseProxyUrl: string;

  constructor() {
    // Use Supabase Edge Function as proxy (handles CORS properly)
    this.supabaseProxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-railway`;
    // Direct Railway URL as fallback
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || "https://web-production-29f3c.up.railway.app";
  }

  /**
   * Chat V2 endpoint with full reliability features
   * @param message - User message
   * @param conversationId - Optional conversation ID
   * @param mode - "quick" or "deep" research mode
   * @param signal - Optional AbortSignal for cancellation
   */
  async chatV2(
    message: string,
    conversationId?: string,
    mode: "quick" | "deep" = "quick",
    signal?: AbortSignal
  ): Promise<ChatResponseV2> {
    console.log("[API] chatV2 called:", { message: message.slice(0, 50), mode, hasSignal: !!signal });

    try {
      // Try Supabase proxy first (handles auth and CORS)
      const response = await this.fetchWithRetry(
        this.supabaseProxyUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${await this.getSupabaseToken()}`,
          },
          body: JSON.stringify({
            message,
            conversation_id: conversationId,
            mode,
          }),
          signal,
        },
        2 // max retries
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[API] Response not OK:", response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("[API] Response received:", { success: data.success, hasMessage: !!data.message });

      // Ensure message is a string (fix [object Object] issue)
      if (data.message && typeof data.message === "object") {
        data.message = JSON.stringify(data.message, null, 2);
      }

      return data;

    } catch (error: any) {
      console.error("[API] chatV2 error:", error);

      // Re-throw abort errors
      if (error.name === "AbortError") {
        throw error;
      }

      // Return error response
      return {
        success: false,
        error: error.message || "Failed to connect to AI backend. Please try again.",
      };
    }
  }

  /**
   * Fetch with automatic retry on failure
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 2
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[API] Fetch attempt ${attempt + 1}/${maxRetries + 1}`);
        const response = await fetch(url, options);
        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`[API] Fetch attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on abort
        if (error.name === "AbortError") {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("All fetch attempts failed");
  }

  /**
   * Get Supabase auth token
   */
  private async getSupabaseToken(): Promise<string> {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || "";
    } catch {
      return "";
    }
  }

  /**
   * Health check endpoint
   */
  async health(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("[API] Health check error:", error);
      return {
        status: "error",
        version: "unknown",
        services: {
          grok: false,
          perplexity: false,
          exa: false,
          browserless: false,
          e2b: false,
          nano_banana: false,
        },
      };
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return ["grok-4.1-fast-reasoning"];
      }

      const data = await response.json();
      return data.models || ["grok-4.1-fast-reasoning"];
    } catch {
      return ["grok-4.1-fast-reasoning"];
    }
  }
}

// Export singleton instance
export const mcLeukerAPI = new McLeukerAPI();
