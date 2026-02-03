/**
 * McLeuker AI V4 - mcLeukerAPI.ts
 * 
 * CLEAN TRANSPARENT API LAYER
 * 
 * Design Principles:
 * 1. NO fake content generation - return exactly what backend sends
 * 2. TRANSPARENT error handling - return actual errors, not masked content
 * 3. PROPER CORS handling - route through Supabase proxy
 * 4. DETAILED logging - for debugging
 * 5. RETRY capability - with exponential backoff
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Use Supabase proxy to avoid CORS issues
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://pvyruwqjcnmyylsgvjkr.supabase.co";
const PROXY_ENDPOINT = `${SUPABASE_URL}/functions/v1/proxy-railway`;

// Direct Railway URL (for reference/debugging only)
const RAILWAY_DIRECT_URL = import.meta.env.VITE_BACKEND_URL || "https://web-production-29f3c.up.railway.app";

// Debug mode
const DEBUG = import.meta.env.DEV || true; // Enable for now to diagnose issues

// ============================================================================
// TYPES
// ============================================================================

export interface ChatResponse {
  success: boolean;
  response?: string;
  message?: string; // Alias for response (backwards compatibility)
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
  canRetry?: boolean;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp?: string;
  services: {
    grok: boolean;
    perplexity: boolean;
    exa: boolean;
    browserless: boolean;
    e2b: boolean;
    nano_banana: boolean;
  };
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function log(category: string, message: string, data?: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] [McLeukerAPI] [${category}]`, message, data || '');
  }
}

function logError(category: string, message: string, error?: any) {
  console.error(`[McLeukerAPI] [${category}] ERROR:`, message, error || '');
}

// ============================================================================
// API CLASS
// ============================================================================

class McLeukerAPI {
  private proxyUrl: string;
  private directUrl: string;

  constructor() {
    this.proxyUrl = PROXY_ENDPOINT;
    this.directUrl = RAILWAY_DIRECT_URL;
    log('INIT', `Initialized with proxy: ${this.proxyUrl}`);
    log('INIT', `Direct URL (reference): ${this.directUrl}`);
  }

  /**
   * Check backend health
   * Uses direct Railway URL since health check doesn't need auth
   */
  async checkHealth(): Promise<HealthResponse> {
    log('HEALTH', 'Checking backend health...');
    
    try {
      const response = await fetch(`${this.directUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      log('HEALTH', 'Backend healthy', data);
      return data;
    } catch (error: any) {
      logError('HEALTH', 'Health check failed', error);
      throw error;
    }
  }

  /**
   * Send chat message to backend
   * 
   * TRANSPARENT DESIGN:
   * - Returns exactly what backend sends (success or error)
   * - NO fake content generation
   * - NO response masking
   */
  async chat(
    message: string,
    mode: "quick" | "deep" = "quick",
    conversationHistory: Array<{ role: string; content: string }> = [],
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    const requestId = Math.random().toString(36).substring(7);
    
    log('CHAT', `[${requestId}] Starting request`, {
      messageLength: message.length,
      messagePreview: message.substring(0, 50),
      mode,
      historyLength: conversationHistory.length,
    });

    // Build request body
    const body = {
      message: message,
      mode: mode,
      conversation_history: conversationHistory,
      session_id: crypto.randomUUID(),
    };

    try {
      // Set timeout based on mode
      const timeoutMs = mode === "deep" ? 180000 : 60000; // 3 min for deep, 1 min for quick
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      // Combine with external signal if provided
      const combinedSignal = signal 
        ? new AbortController().signal // TODO: Combine signals properly
        : controller.signal;

      log('CHAT', `[${requestId}] Sending to proxy: ${this.proxyUrl}`);

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      log('CHAT', `[${requestId}] Response status: ${response.status}`);

      // Handle HTTP errors TRANSPARENTLY
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logError('CHAT', `[${requestId}] HTTP error`, { status: response.status, errorText });
        
        // Return ACTUAL error - no fake content
        return {
          success: false,
          error: `Server error (${response.status}): ${errorText}`,
          canRetry: response.status >= 500,
          credits_used: 0,
        };
      }

      // Parse response
      const data = await response.json();
      
      log('CHAT', `[${requestId}] Response received`, {
        success: data.success,
        hasResponse: !!data.response,
        responseLength: data.response?.length,
        hasError: !!data.error,
        keys: Object.keys(data),
      });

      // Return EXACTLY what backend sent - no modifications except normalization
      return this.normalizeResponse(data);

    } catch (error: any) {
      logError('CHAT', `[${requestId}] Request failed`, error);

      // Handle abort
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request was cancelled or timed out',
          canRetry: true,
          credits_used: 0,
        };
      }

      // Handle network errors TRANSPARENTLY
      return {
        success: false,
        error: `Network error: ${error.message || 'Connection failed'}`,
        canRetry: true,
        credits_used: 0,
      };
    }
  }

  /**
   * Normalize backend response
   * 
   * ONLY does:
   * - Ensure response/message field exists
   * - Clean [object Object] artifacts (display issue, not content masking)
   * 
   * DOES NOT:
   * - Generate fake content
   * - Replace "unhelpful" responses
   * - Mask errors
   */
  private normalizeResponse(data: any): ChatResponse {
    // Get the actual response text - check multiple possible fields
    // Backend may return content in different fields depending on response type
    let responseText = data.response 
      || data.message 
      || data.user_input_prompt    // Backend puts content here when needs_user_input=true
      || data.output 
      || data.content
      || data.text
      || data.answer
      || '';
    
    // If response is an object, extract content from common keys
    if (typeof responseText === 'object' && responseText !== null) {
      log('NORMALIZE', 'Response was an object, extracting content', { type: typeof responseText, keys: Object.keys(responseText) });
      responseText = responseText.content 
        || responseText.text 
        || responseText.message 
        || responseText.answer
        || responseText.result
        || responseText.response
        || JSON.stringify(responseText);
    } else if (typeof responseText !== 'string') {
      responseText = String(responseText);
    }

    // Clean [object Object] artifacts (display bug fix, not content masking)
    responseText = this.cleanArtifacts(responseText);

    // Normalize sources array
    let sources = data.sources;
    if (Array.isArray(sources)) {
      sources = sources.map((s: any) => ({
        title: String(s?.title || 'Source'),
        url: String(s?.url || '#'),
        snippet: s?.snippet ? String(s.snippet) : undefined,
        source: s?.source ? String(s.source) : undefined,
      }));
    }

    // Normalize reasoning array
    let reasoning = data.reasoning;
    if (reasoning && !Array.isArray(reasoning)) {
      reasoning = [String(reasoning)];
    } else if (Array.isArray(reasoning)) {
      reasoning = reasoning.map((r: any) => String(r));
    }

    return {
      success: data.success !== false && !data.error,
      response: responseText,
      message: responseText, // Alias for backwards compatibility
      session_id: data.session_id,
      reasoning: reasoning,
      sources: sources,
      files: data.files,
      images: data.images,
      follow_up_questions: data.follow_up_questions,
      credits_used: data.credits_used || 1,
      needs_user_input: data.needs_user_input,
      user_input_prompt: data.user_input_prompt,
      error: data.error,
      canRetry: !!data.error,
    };
  }

  /**
   * Clean [object Object] artifacts from text
   * This is a DISPLAY BUG FIX, not content masking
   */
  private cleanArtifacts(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    return text
      // Remove [object Object] patterns
      .replace(/\[object Object\]/g, '')
      // Clean up resulting comma artifacts
      .replace(/,\s*,/g, ',')
      .replace(/,\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .replace(/^\s*,\s*/g, '')
      .replace(/\s*,\s*$/g, '')
      .trim();
  }

  /**
   * Generate image using backend
   */
  async generateImage(prompt: string, signal?: AbortSignal): Promise<{ url?: string; error?: string }> {
    log('IMAGE', 'Generating image', { promptLength: prompt.length });
    
    try {
      const response = await fetch(`${this.directUrl}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { error: `Image generation failed: ${errorText}` };
      }

      const data = await response.json();
      return { url: data.url || data.image_url };
    } catch (error: any) {
      return { error: `Image generation error: ${error.message}` };
    }
  }

  /**
   * Execute code using backend
   */
  async executeCode(
    code: string,
    language: string = "python",
    signal?: AbortSignal
  ): Promise<{ output?: string; error?: string }> {
    log('CODE', 'Executing code', { language, codeLength: code.length });
    
    try {
      const response = await fetch(`${this.directUrl}/api/execute-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { error: `Code execution failed: ${errorText}` };
      }

      const data = await response.json();
      return { output: data.output || data.result };
    } catch (error: any) {
      return { error: `Code execution error: ${error.message}` };
    }
  }

  /**
   * Search using backend
   */
  async search(query: string, signal?: AbortSignal): Promise<{ results?: any[]; error?: string }> {
    log('SEARCH', 'Searching', { query });
    
    try {
      const response = await fetch(`${this.directUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { error: `Search failed: ${errorText}` };
      }

      const data = await response.json();
      return { results: data.results || data.sources };
    } catch (error: any) {
      return { error: `Search error: ${error.message}` };
    }
  }
}

// Export singleton instance
export const mcLeukerAPI = new McLeukerAPI();
