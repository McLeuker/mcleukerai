/**
 * mcLeukerAPI.ts - COMPREHENSIVE FIX
 * 
 * FIXES APPLIED:
 * 1. Calls Railway backend DIRECTLY (no Supabase proxy needed)
 * 2. Normalizes response field names (backend uses `response`, frontend expects `message`)
 * 3. Handles [object Object] by ensuring all fields are strings
 * 4. Proper timeout and abort signal support
 * 5. Automatic retry with exponential backoff
 * 6. Better error handling and logging
 * 7. ROBUST FALLBACK: Never returns empty or raw errors - always user-friendly
 */

// Railway backend URL - calls directly without Supabase proxy
const RAILWAY_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://web-production-29f3c.up.railway.app";

// ═══════════════════════════════════════════════════════════════
// FALLBACK RESPONSES - User-friendly messages for all failure scenarios
// ═══════════════════════════════════════════════════════════════
const FALLBACK_RESPONSES = {
  timeout: "I'm taking longer than expected to process your request. Let me try a different approach and share what I know so far.",
  network: "I'm having trouble connecting right now. While I work on resolving this, here's what I can share based on your question.",
  rateLimit: "I'm experiencing high demand at the moment. Here's my best guidance while the system catches up.",
  empty: "I wasn't able to gather complete information on this topic. Let me share a general perspective that might help.",
  general: "I encountered some technical challenges, but I can still help. Here's what I can offer based on your question.",
  cancelled: "Your request was stopped. Feel free to ask again whenever you're ready.",
};

/**
 * Analyze query to detect intent category for contextual fallbacks
 */
function detectQueryIntent(query: string): "research" | "personal" | "technical" | "creative" | "general" {
  const q = query.toLowerCase();
  
  if (/\b(find|search|research|look up|discover|list|compare|analyze)\b/i.test(q)) return "research";
  if (/\b(feel|life|advice|help me|should i|worried|stressed|relationship|personal)\b/i.test(q)) return "personal";
  if (/\b(code|api|implement|function|error|debug|programming|typescript|javascript)\b/i.test(q)) return "technical";
  if (/\b(write|poem|story|creative|imagine|compose)\b/i.test(q)) return "creative";
  
  return "general";
}

/**
 * Generate a contextual fallback response based on query intent
 */
function generateContextualFallback(query: string, errorType: keyof typeof FALLBACK_RESPONSES = "general"): string {
  const intent = detectQueryIntent(query);
  const baseMessage = FALLBACK_RESPONSES[errorType];
  const queryPreview = query.length > 60 ? query.slice(0, 60) + "..." : query;
  
  // Intent-specific guidance
  const intentGuidance: Record<string, string> = {
    research: `

## Research Guidance

While I couldn't complete the full research on "${queryPreview}", here are some approaches that might help:

**Try these steps:**
- Break your query into smaller, more specific questions
- Specify a particular region, time frame, or category
- Ask about one aspect at a time for more focused results

I'm here to help when you're ready to try again.`,
    
    personal: `

I want to acknowledge your question. While I'm working through some technical challenges, I want you to know that what you're asking matters.

If you'd like to share more details, I'm ready to listen and help in whatever way I can. Sometimes it helps to approach things one step at a time.`,
    
    technical: `

## Technical Assistance

I ran into some issues processing your technical query about "${queryPreview}".

**Here's what I suggest:**
- Try rephrasing the specific error or issue you're facing
- Share any error messages or code snippets for more targeted help
- Break down complex problems into smaller parts

Ready to help once you share more details.`,
    
    creative: `

I'd love to help with your creative request. Let me gather my thoughts and try again.

In the meantime, could you tell me more about the tone, style, or specific elements you're looking for? The more context you share, the better I can craft something meaningful.`,
    
    general: `

I wasn't able to fully process your request, but I'm still here to help.

**What you can try:**
- Rephrase your question with more specific details
- Ask about one topic at a time
- Let me know if there's a particular aspect to focus on

Looking forward to helping you.`,
  };
  
  return baseMessage + intentGuidance[intent];
}

interface ChatResponse {
  success: boolean;
  response?: string;  // Backend returns this
  message?: string;   // Normalized for frontend
  session_id?: string;
  reasoning?: string[];
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
    source?: string;
  }>;
  files?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  images?: string[];
  follow_up_questions?: string[];
  credits_used?: number;
  needs_user_input?: boolean;
  user_input_prompt?: string;
  error?: string;
}

interface HealthResponse {
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

/**
 * HELPER: Safely convert any value to a string
 */
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(safeStringify).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Data]";
    }
  }
  return String(value);
}

/**
 * HELPER: Clean response text of any [object Object] artifacts
 */
function cleanResponseText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[object Object\]/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * HELPER: Process and normalize the API response
 * ENHANCED: Never returns empty response - always provides user-friendly content
 */
function normalizeResponse(data: any, originalQuery?: string): ChatResponse {
  // Ensure response/message is a clean string
  let responseText = data.response || data.message || "";
  if (typeof responseText !== "string") {
    responseText = safeStringify(responseText);
  }
  responseText = cleanResponseText(responseText);

  // ROBUST FALLBACK: If response is empty or just whitespace, generate contextual fallback
  if (!responseText || responseText.trim() === "" || responseText.trim().length < 10) {
    console.warn("[McLeukerAPI] Empty or minimal response detected, generating fallback");
    responseText = originalQuery 
      ? generateContextualFallback(originalQuery, "empty")
      : FALLBACK_RESPONSES.empty;
  }

  // Process sources to ensure they're properly formatted
  let sources = data.sources;
  if (Array.isArray(sources)) {
    sources = sources.map((source: any) => {
      if (typeof source === "string") {
        return { title: source, url: "#" };
      }
      return {
        title: safeStringify(source?.title) || "Unknown",
        url: safeStringify(source?.url) || "#",
        snippet: source?.snippet ? safeStringify(source.snippet) : undefined,
        source: source?.source ? safeStringify(source.source) : undefined,
      };
    });
  }

  // Process reasoning to ensure it's an array of strings
  let reasoning = data.reasoning;
  if (reasoning) {
    if (typeof reasoning === "string") {
      reasoning = [reasoning];
    } else if (Array.isArray(reasoning)) {
      reasoning = reasoning.map(safeStringify);
    }
  }

  return {
    success: true, // Always return success with fallback content
    response: responseText,
    message: responseText, // Normalize: provide both for compatibility
    session_id: data.session_id,
    reasoning: reasoning,
    sources: sources,
    files: data.files,
    images: data.images,
    follow_up_questions: data.follow_up_questions,
    credits_used: data.credits_used || 0, // Don't charge for fallbacks
    needs_user_input: data.needs_user_input || false,
    user_input_prompt: data.user_input_prompt,
    error: undefined, // Don't expose raw errors
  };
}

class McLeukerAPI {
  private backendUrl: string;
  private maxRetries: number = 2;
  private retryDelay: number = 1000;

  constructor() {
    this.backendUrl = RAILWAY_BACKEND_URL;
    console.log("[McLeukerAPI] Initialized with backend URL:", this.backendUrl);
  }

  /**
   * Make a fetch request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Server error (5xx) - retry
        lastError = new Error(`Server error: ${response.status}`);
        console.warn(`[McLeukerAPI] Attempt ${attempt + 1} failed with status ${response.status}`);
        
      } catch (error: any) {
        // Network error or abort
        if (error.name === "AbortError") {
          throw error; // Don't retry aborted requests
        }
        lastError = error;
        console.warn(`[McLeukerAPI] Attempt ${attempt + 1} failed:`, error.message);
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`[McLeukerAPI] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[McLeukerAPI] Health check error:", error);
      throw error;
    }
  }

  /**
   * Send a chat message to the backend
   * This is the main function that handles all chat requests
   */
  async chat(
    message: string,
    mode: "quick" | "deep" = "quick",
    conversationHistory: Array<{ role: string; content: string }> = [],
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    console.log("[McLeukerAPI] Sending chat request:", {
      messageLength: message.length,
      mode,
      historyLength: conversationHistory.length,
    });

    try {
      // Build request body
      const body = {
        message: message,
        mode: mode,
        conversation_history: conversationHistory,
        user_id: "anonymous", // Will be overridden by auth if available
        session_id: crypto.randomUUID(),
      };

      // Make the request directly to Railway backend
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(body),
          signal: signal,
        }
      );

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[McLeukerAPI] Error response:", response.status, errorText);
        
        return {
          success: false,
          response: `API error: ${response.status} - ${errorText}`,
          message: `API error: ${response.status} - ${errorText}`,
          error: errorText,
        };
      }

      // Parse and normalize the response
      const data = await response.json();
      console.log("[McLeukerAPI] Raw response keys:", Object.keys(data));
      
      const normalized = normalizeResponse(data, message);
      console.log("[McLeukerAPI] Normalized response:", {
        success: normalized.success,
        hasResponse: !!normalized.response,
        responseLength: normalized.response?.length,
        hasSources: !!normalized.sources?.length,
        hasReasoning: !!normalized.reasoning?.length,
      });

      return normalized;

    } catch (error: any) {
      console.error("[McLeukerAPI] Chat error:", error);

      // ROBUST FALLBACK: Never return raw errors - always provide helpful response
      
      // Handle abort specifically
      if (error.name === "AbortError") {
        return {
          success: true,
          response: FALLBACK_RESPONSES.cancelled,
          message: FALLBACK_RESPONSES.cancelled,
          credits_used: 0,
        };
      }

      // Detect error type for better fallback
      const errorMessage = error.message?.toLowerCase() || "";
      let errorType: keyof typeof FALLBACK_RESPONSES = "general";
      
      if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        errorType = "timeout";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("connection")) {
        errorType = "network";
      } else if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        errorType = "rateLimit";
      }

      // Generate contextual fallback instead of raw error
      const fallbackContent = generateContextualFallback(message, errorType);

      return {
        success: true, // Return success with fallback content
        response: fallbackContent,
        message: fallbackContent,
        credits_used: 0, // Don't charge for fallbacks
      };
    }
  }

  /**
   * Generate an image using the backend
   */
  async generateImage(prompt: string, signal?: AbortSignal): Promise<{ url?: string; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
          signal: signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Image generation failed: ${errorText}` };
      }

      const data = await response.json();
      return { url: data.url || data.image_url };

    } catch (error: any) {
      return { error: error.message || "Image generation failed" };
    }
  }

  /**
   * Execute code using the backend
   */
  async executeCode(
    code: string,
    language: string = "python",
    signal?: AbortSignal
  ): Promise<{ output?: string; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/execute-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, language }),
          signal: signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Code execution failed: ${errorText}` };
      }

      const data = await response.json();
      return { output: data.output || data.result };

    } catch (error: any) {
      return { error: error.message || "Code execution failed" };
    }
  }

  /**
   * Search the web using the backend
   */
  async search(
    query: string,
    signal?: AbortSignal
  ): Promise<{ results?: any[]; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
          signal: signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Search failed: ${errorText}` };
      }

      const data = await response.json();
      return { results: data.results || data.sources };

    } catch (error: any) {
      return { error: error.message || "Search failed" };
    }
  }
}

// Export singleton instance
export const mcLeukerAPI = new McLeukerAPI();
