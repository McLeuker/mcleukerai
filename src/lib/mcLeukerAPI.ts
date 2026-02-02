/**
 * McLeuker API Client - V3.1 with Reliability Hardening
 * Handles communication with the Railway backend DIRECTLY
 * 
 * FIX: Removed Supabase proxy dependency - calls Railway directly
 */

export interface ChatResponseV2 {
  success: boolean;
  response?: string;  // Backend returns 'response' not 'message'
  message?: string;   // Keep for backwards compatibility
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

  constructor() {
    // Direct Railway URL - no proxy needed
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || "https://web-production-29f3c.up.railway.app";
    console.log("[API] Initialized with baseUrl:", this.baseUrl);
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
      // Call Railway backend directly
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
      console.log("[API] Response received:", { 
        success: data.success, 
        hasResponse: !!data.response,
        hasMessage: !!data.message,
        responseLength: (data.response || data.message || "").length
      });

      // Normalize response field - backend returns 'response', frontend expects 'message'
      if (data.response && !data.message) {
        data.message = data.response;
      }

      // Ensure message is a string (fix [object Object] issue)
      if (data.message && typeof data.message === "object") {
        data.message = JSON.stringify(data.message, null, 2);
      }
      if (data.response && typeof data.response === "object") {
        data.response = JSON.stringify(data.response, null, 2);
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
   * Health check endpoint
   */
  async health(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
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
        console.log(`[API] Fetch attempt ${attempt + 1}/${maxRetries + 1} to ${url}`);
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
          const waitTime = 1000 * (attempt + 1);
          console.log(`[API] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error("All fetch attempts failed");
  }
}

// Export singleton instance
export const mcLeukerAPI = new McLeukerAPI();
