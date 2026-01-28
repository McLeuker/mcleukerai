import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============ INPUT VALIDATION & SECURITY ============
// SQL/NoSQL injection protection patterns

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|FROM|WHERE|OR|AND)\b.*\b(FROM|INTO|TABLE|DATABASE|SET|VALUES)\b)/i,
  /(\-\-|\/\*|\*\/|;|\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(\bOR\b\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
  /(\b(SLEEP|BENCHMARK|WAITFOR|DELAY)\s*\()/i,
  /(CHAR\s*\(|CONCAT\s*\(|SUBSTRING\s*\()/i,
  /(\bINTO\s+(OUTFILE|DUMPFILE)\b)/i,
  /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
];

function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const normalized = input.replace(/\s+/g, ' ').trim();
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(normalized));
}

function sanitizeString(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input.substring(0, maxLength);
  sanitized = sanitized.replace(/\0/g, ''); // Remove null bytes
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars
  return sanitized.trim();
}

function isValidUUID(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  console.warn(`[SECURITY:${event.toUpperCase()}]`, JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

// Allowed origins for CORS
const allowedOrigins = [
  "https://mcleukerai.lovable.app",
  "https://preview--mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

// Allow Lovable preview domains dynamically
function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Research agent phases
type ResearchPhase = "planning" | "searching" | "browsing" | "extracting" | "validating" | "generating" | "completed" | "failed";

// Query type classification
type QueryType = "supplier" | "trend" | "market" | "sustainability" | "general";

// Tool definitions for the planner
const AVAILABLE_TOOLS = {
  web_search: {
    name: "web_search",
    description: "Search the web for current information using Perplexity AI",
    parameters: { query: "string", limit: "number" }
  },
  scrape_url: {
    name: "scrape_url",
    description: "Extract content from a specific URL using Firecrawl",
    parameters: { url: "string", format: "markdown" }
  },
  extract_structured: {
    name: "extract_structured",
    description: "Extract structured data from a page with a schema",
    parameters: { url: "string", schema: "object" }
  }
};

// Credit costs for research agent
const BASE_RESEARCH_COST = 8;
const COST_PER_SEARCH = 1;
const COST_PER_SCRAPE = 2;
const MAX_CREDITS_PER_TASK = 25;
const MAX_RETRIES = 2;
const PERPLEXITY_TIMEOUT = 60000;
const FIRECRAWL_TIMEOUT = 30000;

// ============ MODEL CONFIGURATION ============
// Supported models - Grok for real-time, GPT-4.1 for complex reasoning
const SUPPORTED_MODELS = {
  "grok-4-latest": { 
    provider: "grok",
    endpoint: "https://api.x.ai/v1/chat/completions", 
    model: "grok-4-latest" 
  },
  "gpt-4.1": { 
    provider: "lovable",
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", 
    model: "openai/gpt-5" // GPT-4.1 maps to gpt-5 in Lovable AI gateway
  },
} as const;

type SupportedModelId = keyof typeof SUPPORTED_MODELS;

// Current model configuration (set per request)
let CURRENT_MODEL_CONFIG = {
  provider: "grok" as "grok" | "lovable",
  endpoint: "https://api.x.ai/v1/chat/completions",
  model: "grok-4-latest" as string,
  temperature: 0.2,
};

// PLANNER SYSTEM PROMPT - Grok-powered hidden planner
const PLANNER_SYSTEM_PROMPT = `You are a senior fashion research planner. Break the task into clear, efficient research steps using available tools. Do not generate answers.

AVAILABLE TOOLS:
1. web_search - Search the web for current information (query, limit). Best for: trends, market data, news
2. scrape_url - Extract content from a specific URL (url, format: markdown). Best for: supplier websites, company pages
3. extract_structured - Extract structured data with a schema (url, schema). Best for: supplier lists, pricing data

QUERY TYPE DETECTION:
- SUPPLIER queries: Company research, manufacturer search, vendor evaluation → Use scrape_url after initial search
- TREND queries: Fashion trends, seasonal forecasts, runway analysis → Multiple web searches + industry sites
- MARKET queries: Market size, competition, pricing analysis → Multi-step searches with cross-validation
- SUSTAINABILITY queries: Certifications, eco-materials, compliance → Specialized searches + certification databases

PLANNING RULES:
1. Break complex queries into 2-5 actionable steps
2. For supplier/company queries, ALWAYS plan to scrape company websites after finding them
3. For market data, use multiple search queries for cross-validation
4. For trend analysis, search recent fashion week coverage and industry publications
5. Always validate findings with multiple sources when possible
6. Prioritize authoritative fashion sources: WWD, BOF, Vogue Business, sustainability certifications

OUTPUT STRICT JSON FORMAT ONLY:
{
  "query_type": "supplier" | "trend" | "market" | "sustainability" | "general",
  "reasoning": "Brief explanation of the research approach",
  "steps": [
    { "tool": "web_search", "params": { "query": "specific search query", "limit": 5 }, "purpose": "Why this step" },
    { "tool": "scrape_url", "params": { "url": "https://example.com" }, "purpose": "Why scraping this" }
  ],
  "validation_criteria": ["Criterion 1", "Criterion 2"],
  "expected_output_format": "table" | "report" | "list" | "comparison"
}`;

// VALIDATOR SYSTEM PROMPT - Grok-powered validator
const VALIDATOR_SYSTEM_PROMPT = `You are a fashion industry analyst validating research findings. Only approve information supported by sources.

Your role:
- Cross-check findings for consistency
- Detect inconsistencies or contradictions
- Flag low-confidence or outdated information
- Ensure all claims are supported by the provided sources

OUTPUT JSON ONLY:
{
  "verified": true | false,
  "issues": ["list of issues found"],
  "confidence_score": 0.0 - 1.0,
  "notes": "summary of validation"
}`;

// SYNTHESIZER SYSTEM PROMPT - Reasoning-driven report writer (ChatGPT/Perplexity style)
const SYNTHESIZER_SYSTEM_PROMPT = `You are a senior fashion intelligence analyst. Write like a knowledgeable expert explaining findings conversationally.

CRITICAL RULES (MANDATORY):
1. NEVER use inline citations like [1], [2], (source) inside your text
2. NEVER display URLs inside the content body
3. NEVER use rigid template structures for every response
4. Prioritize reading flow and natural explanation
5. Use trend indicators ↑↓ where metrics are involved

RESPONSE APPROACH:
1. Start with reasoning - what the research found, what it means
2. Structure content dynamically based on the question complexity
3. Use paragraphs for explanations, bullets for key points, tables for comparisons
4. Write naturally, like explaining to a senior colleague

STRUCTURE GUIDELINES (use flexibly):

For complex analysis:
## Key Findings
Brief reasoning about what the research uncovered and its implications.

## [Contextual Section Title]
- Key insight with explanation
- Another finding with context
- Actionable recommendation

| Comparison Table (only if comparing entities) |
|-----------------------------------------------|

## Strategic Takeaways
- What this means for decision-making
- Recommended next steps

---

## Sources
Group by relevance. Format: Source name + short description only.
1. 📰 Vogue Business – Paris Fashion Week analysis
2. 🧵 Fashion Network – Supplier certification data
3. 📊 Business of Fashion – Market sizing methodology
4. 🏛 FHCM – Official show schedules

For simple questions:
- Just answer naturally with relevant context
- Add sources at the end

TABLE FORMAT (when needed):
| Entity | Key Metric | Trend | Notes |
|--------|-----------|-------|-------|
| Data   | Value ↑   | Context | Brief observation |

TONE: Precise, intelligent, conversational. The user should feel like they're reading a clear explanation, not a research dump.

If data is missing or uncertain, acknowledge it explicitly rather than fabricating.`;

// Domain-specific prompt additions for research agent
const DOMAIN_RESEARCH_PROMPTS: Record<string, string> = {
  all: "",
  fashion: "\n\nDOMAIN: FASHION\nPrioritize runway trends, silhouettes, designer collections, fashion week coverage, and ready-to-wear developments.",
  beauty: "\n\nDOMAIN: BEAUTY\nPrioritize beauty formulations, cosmetic trends, backstage beauty, brand strategies, and consumer preferences.",
  skincare: "\n\nDOMAIN: SKINCARE\nPrioritize skincare ingredients, clinical aesthetics, regulatory compliance, and science-backed formulations.",
  sustainability: "\n\nDOMAIN: SUSTAINABILITY\nPrioritize circularity, sustainable materials, supply chain transparency, certifications, and environmental impact.",
  "fashion-tech": "\n\nDOMAIN: FASHION TECH\nPrioritize AI in fashion, digital innovation, virtual try-on, tech startups, and emerging technologies.",
  catwalks: "\n\nDOMAIN: CATWALKS\nPrioritize runway coverage, designer shows, styling trends, fashion week analysis, and emerging talent.",
  culture: "\n\nDOMAIN: CULTURE\nPrioritize cultural influences, art collaborations, social movements, and regional cultural signals in fashion.",
  textile: "\n\nDOMAIN: TEXTILE\nPrioritize fibers, mills, material innovation, textile sourcing, MOQ requirements, and manufacturing capabilities.",
  lifestyle: "\n\nDOMAIN: LIFESTYLE\nPrioritize consumer behavior, wellness trends, luxury lifestyle, travel influence, and cross-category signals.",
};

// Get enhanced synthesizer prompt with domain context
function getSynthesizerPromptWithDomain(domain: string): string {
  const domainAddition = DOMAIN_RESEARCH_PROMPTS[domain] || DOMAIN_RESEARCH_PROMPTS.all;
  return SYNTHESIZER_SYSTEM_PROMPT + domainAddition;
}

// Helper to send SSE events
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  
  const send = (data: Record<string, unknown>) => {
    if (controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }
  };
  
  const close = () => {
    if (controller) {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  };
  
  return { stream, send, close };
}

// Classify query type
function classifyQuery(query: string): QueryType {
  const lowerQuery = query.toLowerCase();
  
  if (/supplier|manufacturer|vendor|factory|sourcing|moq|producer|wholesale/.test(lowerQuery)) {
    return "supplier";
  }
  if (/trend|fashion week|runway|seasonal|forecast|style|color palette/.test(lowerQuery)) {
    return "trend";
  }
  if (/market|competition|pricing|revenue|growth|industry analysis|market size/.test(lowerQuery)) {
    return "market";
  }
  if (/sustainable|eco|organic|recycled|certification|gots|oeko-tex|ethical|carbon/.test(lowerQuery)) {
    return "sustainability";
  }
  return "general";
}

// Retry wrapper for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt <= maxRetries) {
        onRetry?.(attempt, lastError);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    )
  ]);
}

// ============ AI MODEL API CALL ============
// Unified function for all AI calls (Grok or GPT-4.1 via Lovable AI)
async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { stream?: boolean; jsonMode?: boolean }
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      model: CURRENT_MODEL_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: CURRENT_MODEL_CONFIG.temperature,
      stream: options?.stream ?? false,
    };

    if (options?.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(CURRENT_MODEL_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please try again shortly." };
      }
      if (response.status === 401) {
        return { success: false, error: "AI authentication failed." };
      }
      return { success: false, error: `AI API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      return { success: false, error: "Empty response from AI" };
    }

    return { success: true, content };
  } catch (error) {
    console.error("AI call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "AI call failed" };
  }
}

// Streaming call for final report generation (works with both Grok and GPT-4.1)
async function callAIStreaming(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(CURRENT_MODEL_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CURRENT_MODEL_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: CURRENT_MODEL_CONFIG.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI streaming error:", response.status, errorText);
      return { success: false, error: `AI API error: ${response.status}` };
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
      reader.releaseLock();
    }

    return { success: true, content: fullContent };
  } catch (error) {
    console.error("AI streaming error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Streaming failed" };
  }
}

// Call Perplexity for web search (tool only - NOT an LLM replacement)
async function webSearch(
  apiKey: string,
  query: string,
  limit: number = 5
): Promise<{ success: boolean; results?: Array<{ url: string; title: string; content: string }>; citations?: string[]; error?: string }> {
  try {
    const searchPromise = fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: "You are a fashion industry research assistant. Provide detailed, factual information with sources. Focus on current, verified data." },
          { role: "user", content: query }
        ],
        max_tokens: 1500,
      }),
    });

    const response = await withTimeout(searchPromise, PERPLEXITY_TIMEOUT, "Perplexity search");

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      if (response.status === 429) {
        return { success: false, error: "Search rate limit reached" };
      }
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    return {
      success: true,
      results: [{ url: "", title: query, content }],
      citations,
    };
  } catch (error) {
    console.error("Web search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// Call Firecrawl to scrape a URL (tool only - NOT an LLM replacement)
async function scrapeUrl(
  apiKey: string,
  url: string
): Promise<{ success: boolean; content?: string; title?: string; error?: string }> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const scrapePromise = fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const response = await withTimeout(scrapePromise, FIRECRAWL_TIMEOUT, "Firecrawl scrape");

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Firecrawl API error:", response.status, errorData);
      return { success: false, error: `Scrape failed: ${response.status}` };
    }

    const data = await response.json();
    const content = data.data?.markdown || data.markdown || "";
    const title = data.data?.metadata?.title || data.metadata?.title || url;

    return { success: true, content, title };
  } catch (error) {
    console.error("Scrape error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Scrape failed" };
  }
}

// Extract structured data using Firecrawl (tool only)
async function extractStructured(
  apiKey: string,
  url: string,
  schema: Record<string, unknown>
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const extractPromise = fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: [{ type: "json", schema }],
        onlyMainContent: true,
      }),
    });

    const response = await withTimeout(extractPromise, FIRECRAWL_TIMEOUT, "Firecrawl extract");

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Firecrawl extract error:", response.status, errorData);
      return { success: false, error: `Extract failed: ${response.status}` };
    }

    const result = await response.json();
    const extractedData = result.data?.json || result.json || {};

    return { success: true, data: extractedData };
  } catch (error) {
    console.error("Extract error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Extract failed" };
  }
}

// Create fallback plan based on query type
function createFallbackPlan(queryType: QueryType, query: string): {
  query_type: QueryType;
  steps: Array<{ tool: string; params: Record<string, unknown>; purpose: string }>;
  validation_criteria: string[];
  expected_output_format: string;
} {
  const basePlan = {
    query_type: queryType,
    validation_criteria: ["Source reliability", "Data currency", "Information accuracy"],
    expected_output_format: "report" as string,
    steps: [] as Array<{ tool: string; params: Record<string, unknown>; purpose: string }>
  };

  switch (queryType) {
    case "supplier":
      basePlan.steps = [
        { tool: "web_search", params: { query: `${query} manufacturers suppliers`, limit: 5 }, purpose: "Find relevant suppliers" },
        { tool: "web_search", params: { query: `${query} MOQ pricing wholesale`, limit: 5 }, purpose: "Get pricing and MOQ details" }
      ];
      basePlan.expected_output_format = "table";
      break;

    case "trend":
      basePlan.steps = [
        { tool: "web_search", params: { query: `${query} fashion trends 2024 2025`, limit: 5 }, purpose: "Current trend analysis" },
        { tool: "web_search", params: { query: `${query} fashion week runway`, limit: 5 }, purpose: "Runway validation" }
      ];
      basePlan.expected_output_format = "report";
      break;

    case "market":
      basePlan.steps = [
        { tool: "web_search", params: { query: `${query} market analysis size growth`, limit: 5 }, purpose: "Market overview" },
        { tool: "web_search", params: { query: `${query} competition brands pricing`, limit: 5 }, purpose: "Competitive landscape" }
      ];
      basePlan.expected_output_format = "report";
      break;

    case "sustainability":
      basePlan.steps = [
        { tool: "web_search", params: { query: `${query} sustainable certifications GOTS OEKO-TEX`, limit: 5 }, purpose: "Certification research" },
        { tool: "web_search", params: { query: `${query} eco-friendly materials suppliers`, limit: 5 }, purpose: "Sustainable options" }
      ];
      basePlan.expected_output_format = "report";
      break;

    default:
      basePlan.steps = [
        { tool: "web_search", params: { query: query, limit: 5 }, purpose: "General research" }
      ];
  }

  return basePlan;
}

// Main research agent handler
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Set up SSE stream
  const { stream, send, close } = createSSEStream();

  // Start processing in background
  (async () => {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        send({ phase: "failed", error: "No authorization header" });
        close();
        return;
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        send({ phase: "failed", error: "Unauthorized" });
        close();
        return;
      }

      const { query, conversationId, model: requestedModel, domain } = await req.json();
      const activeDomain = domain || "all";
      
      // ============ INPUT VALIDATION WITH INJECTION PROTECTION ============
      
      if (!query || typeof query !== "string") {
        logSecurityEvent('validation_error', { field: 'query', userId: user.id, reason: 'invalid_type' });
        send({ phase: "failed", error: "Invalid query" });
        close();
        return;
      }
      
      // Sanitize the query - removes null bytes, control characters, limits length
      const sanitizedQuery = sanitizeString(query, 5000);
      
      if (sanitizedQuery.length === 0) {
        send({ phase: "failed", error: "Query cannot be empty" });
        close();
        return;
      }
      
      // Check for SQL injection attempts
      if (containsSqlInjection(sanitizedQuery)) {
        logSecurityEvent('injection_attempt', { 
          type: 'sql', 
          userId: user.id, 
          queryLength: sanitizedQuery.length,
        });
        send({ phase: "failed", error: "Invalid characters detected in query" });
        close();
        return;
      }
      
      // Use sanitized query from here on
      const trimmedQuery = sanitizedQuery;
      
      // Validate conversationId if provided
      if (conversationId && !isValidUUID(conversationId)) {
        logSecurityEvent('validation_error', { field: 'conversationId', userId: user.id, reason: 'invalid_uuid' });
        send({ phase: "failed", error: "Invalid conversation ID format" });
        close();
        return;
      }

      // Validate and set model - support grok-4-latest and gpt-4.1
      const selectedModel: SupportedModelId = (requestedModel && SUPPORTED_MODELS[requestedModel as SupportedModelId]) 
        ? requestedModel as SupportedModelId 
        : "grok-4-latest";
      
      // Update config for this request
      const modelConfig = SUPPORTED_MODELS[selectedModel];
      CURRENT_MODEL_CONFIG = {
        provider: modelConfig.provider,
        endpoint: modelConfig.endpoint,
        model: modelConfig.model,
        temperature: 0.2,
      };

      // Get API keys based on selected model
      const GROK_API_KEY = Deno.env.get("Grok_API");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

      // Determine which API key to use
      const AI_API_KEY = CURRENT_MODEL_CONFIG.provider === "lovable" ? LOVABLE_API_KEY : GROK_API_KEY;

      if (!AI_API_KEY) {
        send({ phase: "failed", error: `${CURRENT_MODEL_CONFIG.provider === "lovable" ? "Lovable" : "Grok"} AI service not configured` });
        close();
        return;
      }

      // PRE-FLIGHT CREDIT CHECK - Verify sufficient credits before starting
      const { data: userData } = await supabase
        .from("users")
        .select("credit_balance, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!userData) {
        send({ phase: "failed", error: "Unable to verify account. Please try again." });
        close();
        return;
      }

      // CREDIT-BASED ACCESS: All users have equal access, credits are the only gate
      if (userData.credit_balance < BASE_RESEARCH_COST) {
        send({ 
          phase: "failed", 
          error: "You're out of credits for this research. Add credits to continue searching and researching. All features remain available once credits are added.",
          insufficientCredits: true,
          currentBalance: userData.credit_balance,
          requiredCredits: BASE_RESEARCH_COST
        });
        close();
        return;
      }

      // Classify query type
      const queryType = classifyQuery(trimmedQuery);

      // Create research task record
      const { data: taskData, error: taskError } = await supabase
        .from("research_tasks")
        .insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          query: trimmedQuery,
          phase: "planning",
        })
        .select()
        .single();

      if (taskError || !taskData) {
        console.error("Error creating research task:", taskError);
        send({ phase: "failed", error: "Failed to create research task" });
        close();
        return;
      }

      const taskId = taskData.id;
      let totalCredits = BASE_RESEARCH_COST;
      const allSources: Array<{ url: string; title: string; snippet: string; type: string; relevance_score?: number }> = [];
      const executionSteps: Array<{ step: number; tool: string; status: string; message: string }> = [];

      // ============ PHASE 1: PLANNING (Grok) ============
      send({ phase: "planning", message: "Analyzing your research request...", queryType });

      const planResult = await callAI(
        AI_API_KEY,
        PLANNER_SYSTEM_PROMPT,
        `Research Query: ${trimmedQuery}\n\nCreate a detailed research plan optimized for this ${queryType} query. Output JSON only.`,
        { jsonMode: true }
      );

      let plan: { 
        query_type: QueryType;
        steps: Array<{ tool: string; params: Record<string, unknown>; purpose: string }>; 
        validation_criteria: string[];
        expected_output_format?: string;
      };
      
      if (planResult.success && planResult.content) {
        try {
          plan = JSON.parse(planResult.content);
        } catch {
          console.log("Failed to parse Grok plan, using fallback");
          plan = createFallbackPlan(queryType, trimmedQuery);
        }
      } else {
        plan = createFallbackPlan(queryType, trimmedQuery);
      }

      // Save plan (hidden from user - internal only)
      await supabase
        .from("research_tasks")
        .update({ plan: plan, phase: "searching" })
        .eq("id", taskId);

      // ============ PHASE 2: TOOL EXECUTION ============
      let researchFindings = "";
      let searchCount = 0;
      let scrapeCount = 0;
      
      for (let i = 0; i < plan.steps.length && i < 5; i++) {
        const step = plan.steps[i];
        
        // Check credit cap
        if (totalCredits >= MAX_CREDITS_PER_TASK) {
          console.log("Credit cap reached, stopping execution");
          break;
        }

        // WEB SEARCH (using Perplexity as a tool)
        if (step.tool === "web_search" && PERPLEXITY_API_KEY) {
          send({ phase: "searching", step: i + 1, total: plan.steps.length, message: `Searching: ${step.purpose}` });
          
          const searchQuery = (step.params.query as string) || trimmedQuery;
          
          let searchResult = await webSearch(PERPLEXITY_API_KEY, searchQuery, (step.params.limit as number) || 5);
          
          // Retry on failure
          if (!searchResult.success) {
            searchResult = await webSearch(PERPLEXITY_API_KEY, searchQuery, (step.params.limit as number) || 5);
          }
          
          if (searchResult.success && searchResult.results) {
            researchFindings += `\n\n### Search: ${searchQuery}\n${searchResult.results.map(r => r.content).join("\n")}`;
            
            // Add citations as sources with relevance score
            if (searchResult.citations) {
              searchResult.citations.forEach((url, idx) => {
                allSources.push({
                  url,
                  title: `Search Result ${allSources.length + 1}`,
                  snippet: "",
                  type: "search",
                  relevance_score: 1 - (idx * 0.1)
                });
              });
            }
            
            totalCredits += COST_PER_SEARCH;
            searchCount++;
            executionSteps.push({ step: i + 1, tool: "web_search", status: "completed", message: step.purpose });
          } else {
            executionSteps.push({ step: i + 1, tool: "web_search", status: "failed", message: searchResult.error || "Search failed" });
          }
        }
        
        // SCRAPE URL (using Firecrawl as a tool)
        if (step.tool === "scrape_url" && FIRECRAWL_API_KEY) {
          const url = step.params.url as string;
          if (url) {
            send({ phase: "browsing", step: i + 1, total: plan.steps.length, message: `Browsing: ${url}` });
            
            let scrapeResult = await scrapeUrl(FIRECRAWL_API_KEY, url);
            
            // Retry on failure
            if (!scrapeResult.success) {
              scrapeResult = await scrapeUrl(FIRECRAWL_API_KEY, url);
            }
            
            if (scrapeResult.success && scrapeResult.content) {
              // Limit content length
              const truncatedContent = scrapeResult.content.slice(0, 4000);
              researchFindings += `\n\n### Scraped: ${scrapeResult.title || url}\n${truncatedContent}`;
              
              allSources.push({
                url,
                title: scrapeResult.title || url,
                snippet: truncatedContent.slice(0, 300),
                type: "scrape",
                relevance_score: 0.9
              });
              
              totalCredits += COST_PER_SCRAPE;
              scrapeCount++;
              executionSteps.push({ step: i + 1, tool: "scrape_url", status: "completed", message: step.purpose });
            } else {
              executionSteps.push({ step: i + 1, tool: "scrape_url", status: "failed", message: scrapeResult.error || "Scrape failed" });
            }
          }
        }

        // EXTRACT STRUCTURED (using Firecrawl as a tool)
        if (step.tool === "extract_structured" && FIRECRAWL_API_KEY) {
          const url = step.params.url as string;
          const schema = step.params.schema as Record<string, unknown>;
          
          if (url && schema) {
            send({ phase: "extracting", step: i + 1, total: plan.steps.length, message: `Extracting data from: ${url}` });
            
            const extractResult = await extractStructured(FIRECRAWL_API_KEY, url, schema);
            
            if (extractResult.success && extractResult.data) {
              researchFindings += `\n\n### Extracted Data: ${url}\n\`\`\`json\n${JSON.stringify(extractResult.data, null, 2)}\n\`\`\``;
              
              allSources.push({
                url,
                title: `Structured Data: ${url}`,
                snippet: JSON.stringify(extractResult.data).slice(0, 200),
                type: "scrape",
                relevance_score: 0.95
              });
              
              totalCredits += COST_PER_SCRAPE;
              executionSteps.push({ step: i + 1, tool: "extract_structured", status: "completed", message: step.purpose });
            } else {
              executionSteps.push({ step: i + 1, tool: "extract_structured", status: "failed", message: extractResult.error || "Extract failed" });
            }
          }
        }
      }

      // Save sources to database
      for (const source of allSources) {
        await supabase.from("research_sources").insert({
          task_id: taskId,
          url: source.url,
          title: source.title,
          snippet: source.snippet,
          source_type: source.type,
          relevance_score: source.relevance_score,
        });
      }

      // Update execution steps
      await supabase
        .from("research_tasks")
        .update({ execution_steps: executionSteps, sources: allSources, phase: "validating" })
        .eq("id", taskId);

      // ============ PHASE 3: VALIDATION (Grok) ============
      send({ phase: "validating", message: "Cross-referencing and verifying findings..." });

      // Handle case with no findings
      if (!researchFindings || researchFindings.length < 100) {
        // Return partial results with disclaimer
        researchFindings = `Note: Limited data was retrieved from external sources. The following response is based on available information.\n\nQuery: ${trimmedQuery}`;
      }

      // Validate findings with AI
      const validationResult = await callAI(
        AI_API_KEY,
        VALIDATOR_SYSTEM_PROMPT,
        `Validate the following research findings for the query: "${trimmedQuery}"\n\nFINDINGS:\n${researchFindings.slice(0, 4000)}\n\nSOURCES: ${allSources.length} sources collected`,
        { jsonMode: true }
      );

      let validationNotes: string[] = [];
      if (validationResult.success && validationResult.content) {
        try {
          const validation = JSON.parse(validationResult.content);
          if (validation.issues && validation.issues.length > 0) {
            validationNotes = validation.issues;
          }
          if (validation.confidence_score && validation.confidence_score < 0.7) {
            validationNotes.push("Confidence level moderate - recommend verification");
          }
        } catch {
          console.log("Failed to parse validation result");
        }
      }

      if (allSources.length < 2) {
        validationNotes.push("Limited sources available - findings should be verified independently");
      }

      // ============ PHASE 4: GENERATION (Grok with Streaming) ============
      send({ phase: "generating", message: "Synthesizing research findings..." });

      await supabase
        .from("research_tasks")
        .update({ phase: "generating" })
        .eq("id", taskId);

      const sourceList = allSources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join("\n");
      
      const generationPrompt = `Based on the following research findings, generate a comprehensive professional response to the user's query.

USER QUERY: ${trimmedQuery}
QUERY TYPE: ${plan.query_type}
EXPECTED FORMAT: ${plan.expected_output_format || "report"}

RESEARCH FINDINGS:
${researchFindings}

AVAILABLE SOURCES:
${sourceList || "No external sources - provide general industry knowledge with clear disclaimers."}

VALIDATION NOTES:
${validationNotes.join("\n") || "All findings verified."}

CRITICAL INSTRUCTIONS:
1. DO NOT hallucinate or fabricate any data
2. Only use information from the provided research findings
3. Use inline citations like [1], [2] when referencing sources
4. Format with markdown headers, bullet points, and tables where appropriate
5. Focus on actionable insights for fashion industry professionals
6. If information is incomplete or uncertain, acknowledge it clearly
7. Include a "Key Takeaways" section at the end
8. For supplier queries, use table format with key details
9. For trend queries, organize by category with confidence levels`;

      // Stream the response from AI
      let finalContent = "";
      
      const synthesizerPrompt = getSynthesizerPromptWithDomain(activeDomain);
      const streamResult = await callAIStreaming(
        AI_API_KEY,
        synthesizerPrompt,
        generationPrompt,
        (chunk: string) => {
          send({ phase: "generating", content: chunk });
        }
      );

      if (!streamResult.success || !streamResult.content) {
        // Fallback to non-streaming if streaming fails
        const fallbackResult = await callAI(
          AI_API_KEY,
          synthesizerPrompt,
          generationPrompt
        );
        
        if (!fallbackResult.success || !fallbackResult.content) {
          send({ phase: "failed", error: fallbackResult.error || "Failed to generate response" });
          await supabase.from("research_tasks").update({ phase: "failed", error_message: fallbackResult.error }).eq("id", taskId);
          close();
          return;
        }
        
        finalContent = fallbackResult.content;
        // Stream the fallback content
        const chunkSize = 50;
        for (let i = 0; i < finalContent.length; i += chunkSize) {
          const chunk = finalContent.slice(i, i + chunkSize);
          send({ phase: "generating", content: chunk });
          await new Promise(r => setTimeout(r, 15));
        }
      } else {
        finalContent = streamResult.content;
      }

      // Deduct credits only on success
      const finalCredits = Math.min(totalCredits, MAX_CREDITS_PER_TASK);
      const { error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: finalCredits,
        p_description: `Deep Research - ${queryType} (${searchCount} searches, ${scrapeCount} scrapes)`
      });

      if (deductError) {
        console.error("Credit deduction error:", deductError);
      }

      // Mark task as completed
      await supabase
        .from("research_tasks")
        .update({
          phase: "completed",
          final_answer: finalContent,
          credits_used: finalCredits,
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);

      // Send completion event with all metadata
      send({
        phase: "completed",
        sources: allSources,
        creditsUsed: finalCredits,
        taskId,
        queryType,
        modelUsed: "Grok-4"
      });

      close();
    } catch (error) {
      console.error("Research agent error:", error);
      send({ phase: "failed", error: "An unexpected error occurred" });
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
