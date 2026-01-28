import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============ INPUT VALIDATION & SECURITY ============
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
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return sanitized.trim();
}

function isValidUUID(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  console.warn(`[SECURITY:${event.toUpperCase()}]`, JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

// CORS Configuration
const allowedOrigins = [
  "https://mcleukerai.lovable.app",
  "https://preview--mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

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
type QueryType = "supplier" | "trend" | "market" | "sustainability" | "general";

// Deep Search Configuration
const DEEP_SEARCH_CONFIG = {
  BASE_COST: 8,
  COST_PER_SEARCH: 1,
  COST_PER_SCRAPE: 2,
  MAX_CREDITS: 50,           // Increased for deep research
  MIN_SOURCES: 5,            // Minimum sources before synthesis
  MAX_SEARCH_ITERATIONS: 4,  // Up to 4 search rounds
  MAX_SCRAPE_PER_ROUND: 10,  // Max scrapes per iteration
  PERPLEXITY_TIMEOUT: 90000, // 90 seconds for complex queries
  FIRECRAWL_TIMEOUT: 45000,  // 45 seconds per scrape
  MIN_CONTENT_LENGTH: 500,   // Minimum content before triggering re-search
};

// Model Configuration
const SUPPORTED_MODELS = {
  "grok-4-latest": { 
    provider: "grok",
    endpoint: "https://api.x.ai/v1/chat/completions", 
    model: "grok-4-latest" 
  },
  "gpt-4.1": { 
    provider: "lovable",
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", 
    model: "openai/gpt-5"
  },
} as const;

type SupportedModelId = keyof typeof SUPPORTED_MODELS;

let CURRENT_MODEL_CONFIG = {
  provider: "grok" as "grok" | "lovable",
  endpoint: "https://api.x.ai/v1/chat/completions",
  model: "grok-4-latest" as string,
  temperature: 0.2,
};

// ============ SYSTEM PROMPTS ============

const PLANNER_SYSTEM_PROMPT = `You are a senior research planner for deep intelligence gathering.

AVAILABLE TOOLS:
1. web_search - Search web for current information (query, limit). Best for: trends, news, market data
2. scrape_url - Extract content from URL (url). Best for: company pages, detailed articles
3. extract_structured - Extract structured data with schema (url, schema). Best for: supplier lists, pricing

DEEP SEARCH PLANNING RULES:
1. Break complex queries into 4-8 parallel search steps for comprehensive coverage
2. For supplier queries: Plan to search multiple regions, certifications, and product types
3. For trend queries: Search fashion weeks, street style, social signals, brand adoptions
4. For market queries: Multiple searches for competition, pricing, growth, segments
5. ALWAYS plan to scrape key company/source websites after initial discovery
6. Plan for cross-validation with multiple authoritative sources

OUTPUT JSON ONLY:
{
  "query_type": "supplier" | "trend" | "market" | "sustainability" | "general",
  "complexity": "simple" | "moderate" | "complex",
  "reasoning": "Brief explanation",
  "parallel_searches": [
    { "query": "specific search 1", "purpose": "why" },
    { "query": "specific search 2", "purpose": "why" }
  ],
  "follow_up_scrapes": ["domain1.com", "domain2.com"],
  "validation_criteria": ["Criterion 1", "Criterion 2"],
  "expected_output_format": "table" | "report" | "list" | "comparison"
}`;

const VALIDATOR_SYSTEM_PROMPT = `You are a fashion industry analyst validating research findings.

Your role:
- Cross-check findings for consistency
- Detect inconsistencies or contradictions
- Flag low-confidence or outdated information
- Ensure all claims are supported by sources
- Identify gaps that require additional research

OUTPUT JSON ONLY:
{
  "verified": true | false,
  "confidence_score": 0.0 - 1.0,
  "issues": ["list of issues"],
  "gaps": ["data gaps that need more research"],
  "needs_more_research": true | false,
  "suggested_searches": ["additional search if needed"],
  "notes": "summary"
}`;

const SYNTHESIZER_SYSTEM_PROMPT = `You are a senior fashion intelligence analyst delivering strategy-grade research.

═══════════════════════════════════════════════════════════════
DEEP SEARCH MODE — PROFESSIONAL INTELLIGENCE ENGINE
═══════════════════════════════════════════════════════════════

NON-NEGOTIABLE PRINCIPLES:

1. DEEP SEARCH ≠ LONG ANSWER
   - Multi-phase research with reasoning, validation, and synthesis.
   - Must feel fundamentally different from Quick Search.

2. REAL-TIME DATA IS MANDATORY
   - Every claim must be grounded in the provided research findings.
   - Historical knowledge is context only, never primary evidence.

3. CREDIT USAGE IS JUSTIFIED
   - Outputs must be strategy-grade and reusable.
   - Results should feel equivalent to a consulting memo or internal report.

4. DOMAIN-AWARE INTELLIGENCE
   - Interpret findings through fashion, beauty, sustainability, textile, and lifestyle lenses.

5. NO GENERIC CONTENT
   - No essays. No trend summaries without evidence. No filler language.

═══════════════════════════════════════════════════════════════
FLEXIBLE OUTPUT STRUCTURE:
═══════════════════════════════════════════════════════════════

Adapt structure dynamically based on query type:

FOR TREND ANALYSIS:
- Group by trend, runway, season, brand adoption
- Include recent coverage, consumer signals

FOR SUPPLIER MAPPING:
- Group by region, certification, category
- Include MOQ, capabilities, certifications, contacts
- Format as clean, Excel-ready tables

FOR BRAND STRATEGY:
- Group by brand, segment, product line
- Include positioning, competitive moves

FOR MARKET INTELLIGENCE:
- Group by segment, geography, price tier
- Include quantitative data, brand movements

═══════════════════════════════════════════════════════════════
REASONING BEFORE WRITING:
═══════════════════════════════════════════════════════════════

Before generating output:
1. DECONSTRUCTION - Identify timeframe, geography, segment
2. SIGNAL EXTRACTION - Pull quantitative data, named brands, changes
3. CONTRADICTION CHECK - Note conflicts between sources
4. SYNTHESIS PLANNING - Determine optimal structure

═══════════════════════════════════════════════════════════════
CONTENT REQUIREMENTS:
═══════════════════════════════════════════════════════════════

1. CLEAR REASONING - Content flows naturally with insights emerging from data
2. REAL-TIME VERIFIED DATA - Every claim references research findings
3. METRICS AND SIGNALS - Use ↑↓ for trends, include percentages, figures, dates
4. ACTIONABLE INTELLIGENCE - What should user DO with this information?

═══════════════════════════════════════════════════════════════
TABLE RULES:
═══════════════════════════════════════════════════════════════

- Tables are OPTIONAL and only if they improve comprehension
- Tables must ONLY appear AFTER all prose content
- Tables must be clean, Excel-ready with proper markdown syntax
- NO placeholders like "[object Object]" or excessive dashes
- If table formatting fails, OMIT entirely

═══════════════════════════════════════════════════════════════
SOURCE FORMAT (END ONLY):
═══════════════════════════════════════════════════════════════

**Sources:** Source1 · Source2 · Source3

Below that, optional expanded:
- Source1 – Topic covered
- Source2 – Topic covered

NEVER use inline citations [1], [2] in body.
NEVER display URLs inside content body.

═══════════════════════════════════════════════════════════════
QUALITY STANDARD:
═══════════════════════════════════════════════════════════════

Deep Search results should feel like:
✓ A senior analyst's internal memo
✓ A consulting deck's key findings
✓ An intelligence briefing you'd pay for
✗ NOT a blog post or essay`;

const DOMAIN_RESEARCH_PROMPTS: Record<string, string> = {
  all: "",
  fashion: "\n\nDOMAIN: FASHION\nPrioritize runway trends, silhouettes, collections, fashion week coverage.",
  beauty: "\n\nDOMAIN: BEAUTY\nPrioritize formulations, cosmetic trends, brand strategies.",
  skincare: "\n\nDOMAIN: SKINCARE\nPrioritize ingredients, clinical aesthetics, science-backed formulations.",
  sustainability: "\n\nDOMAIN: SUSTAINABILITY\nPrioritize circularity, materials, supply chain, certifications.",
  "fashion-tech": "\n\nDOMAIN: FASHION TECH\nPrioritize AI, digital innovation, virtual try-on.",
  catwalks: "\n\nDOMAIN: CATWALKS\nPrioritize runway coverage, styling trends, emerging talent.",
  culture: "\n\nDOMAIN: CULTURE\nPrioritize cultural influences, art collaborations, social movements.",
  textile: "\n\nDOMAIN: TEXTILE\nPrioritize fibers, mills, material innovation, sourcing, MOQ.",
  lifestyle: "\n\nDOMAIN: LIFESTYLE\nPrioritize consumer behavior, wellness, luxury lifestyle.",
};

function getSynthesizerPromptWithDomain(domain: string): string {
  return SYNTHESIZER_SYSTEM_PROMPT + (DOMAIN_RESEARCH_PROMPTS[domain] || "");
}

// ============ SSE STREAM ============
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  
  const stream = new ReadableStream({
    start(c) { controller = c; },
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

// Query classification
function classifyQuery(query: string): QueryType {
  const lowerQuery = query.toLowerCase();
  if (/supplier|manufacturer|vendor|factory|sourcing|moq|producer|wholesale|mill/.test(lowerQuery)) return "supplier";
  if (/trend|fashion week|runway|seasonal|forecast|style|color palette|ss\d{2}|fw\d{2}|spring|fall|summer|winter \d{4}/.test(lowerQuery)) return "trend";
  if (/market|competition|pricing|revenue|growth|industry analysis|market size/.test(lowerQuery)) return "market";
  if (/sustainable|eco|organic|recycled|certification|gots|oeko-tex|ethical|carbon/.test(lowerQuery)) return "sustainability";
  return "general";
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

// ============ AI API CALLS ============
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
      return { success: false, error: `AI API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    return content ? { success: true, content } : { success: false, error: "Empty response from AI" };
  } catch (error) {
    console.error("AI call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "AI call failed" };
  }
}

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
            } catch { /* ignore parse errors */ }
          }
        }
      }
      reader.releaseLock();
    }

    return { success: true, content: fullContent };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Streaming failed" };
  }
}

// ============ PERPLEXITY WEB SEARCH (Enhanced) ============
async function webSearchPerplexity(
  apiKey: string,
  query: string,
  options?: { recencyFilter?: string; limit?: number }
): Promise<{ success: boolean; content?: string; citations?: string[]; error?: string }> {
  try {
    const searchBody: Record<string, unknown> = {
      model: "sonar-pro",
      messages: [
        { 
          role: "system", 
          content: "You are a fashion industry research assistant. Provide detailed, factual information with sources. Focus on current, verified data. Include specific names, numbers, dates, and metrics." 
        },
        { role: "user", content: query }
      ],
      max_tokens: 2000,
    };

    // Add recency filter for time-sensitive queries
    if (options?.recencyFilter) {
      searchBody.search_recency_filter = options.recencyFilter;
    }

    const response = await withTimeout(
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchBody),
      }),
      DEEP_SEARCH_CONFIG.PERPLEXITY_TIMEOUT,
      "Perplexity search"
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || "",
      citations: data.citations || [],
    };
  } catch (error) {
    console.error("Web search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// ============ FIRECRAWL SCRAPING (Enhanced) ============
async function scrapeWithFirecrawl(
  apiKey: string,
  url: string
): Promise<{ success: boolean; content?: string; title?: string; error?: string }> {
  try {
    // Validate URL format
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    // Validate URL has proper TLD
    try {
      const urlObj = new URL(formattedUrl);
      const hostParts = urlObj.hostname.split('.');
      if (hostParts.length < 2 || hostParts[hostParts.length - 1].length < 2) {
        console.error("Invalid URL format:", formattedUrl);
        return { success: false, error: "Invalid URL format" };
      }
    } catch {
      console.error("Invalid URL:", formattedUrl);
      return { success: false, error: "Invalid URL" };
    }

    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 2000,
        }),
      }),
      DEEP_SEARCH_CONFIG.FIRECRAWL_TIMEOUT,
      "Firecrawl scrape"
    );

    if (!response.ok) {
      const errorData = await response.text();
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

// ============ FIRECRAWL SEARCH (Web Discovery) ============
async function searchWithFirecrawl(
  apiKey: string,
  query: string,
  limit: number = 10
): Promise<{ success: boolean; results?: Array<{ url: string; title: string; description: string }>; error?: string }> {
  try {
    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit,
          lang: "en",
        }),
      }),
      DEEP_SEARCH_CONFIG.FIRECRAWL_TIMEOUT,
      "Firecrawl search"
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Firecrawl search error:", response.status, errorData);
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      results: data.data?.map((r: { url: string; title?: string; description?: string }) => ({
        url: r.url,
        title: r.title || r.url,
        description: r.description || "",
      })) || [],
    };
  } catch (error) {
    console.error("Firecrawl search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// ============ DEEP RESEARCH ORCHESTRATOR ============
interface ResearchResult {
  content: string;
  sources: Array<{ url: string; title: string; snippet: string; type: string; relevance: number }>;
  searchCount: number;
  scrapeCount: number;
  credits: number;
}

async function executeDeepResearch(
  query: string,
  queryType: QueryType,
  plan: { parallel_searches?: Array<{ query: string; purpose: string }>; follow_up_scrapes?: string[] },
  apis: { perplexity: string; firecrawl: string },
  send: (data: Record<string, unknown>) => void
): Promise<ResearchResult> {
  let totalContent = "";
  const allSources: Array<{ url: string; title: string; snippet: string; type: string; relevance: number }> = [];
  let searchCount = 0;
  let scrapeCount = 0;
  let credits = DEEP_SEARCH_CONFIG.BASE_COST;
  let iteration = 0;

  // Generate search queries based on plan or fallback
  const searches = plan.parallel_searches?.length 
    ? plan.parallel_searches 
    : generateDefaultSearches(query, queryType);

  // ============ PHASE 2: PARALLEL PERPLEXITY SEARCHES ============
  while (iteration < DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS && credits < DEEP_SEARCH_CONFIG.MAX_CREDITS) {
    iteration++;
    send({ 
      phase: "searching", 
      message: `Deep search round ${iteration}/${DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS}...`,
      searchCount,
      iteration 
    });

    // Execute searches in parallel (batch of 3)
    const searchBatches = [];
    for (let i = 0; i < searches.length; i += 3) {
      searchBatches.push(searches.slice(i, i + 3));
    }

    for (const batch of searchBatches) {
      if (credits >= DEEP_SEARCH_CONFIG.MAX_CREDITS) break;

      const searchPromises = batch.map(async (search) => {
        const result = await webSearchPerplexity(apis.perplexity, search.query, { 
          recencyFilter: queryType === "trend" ? "month" : undefined 
        });
        return { search, result };
      });

      const results = await Promise.allSettled(searchPromises);
      
      for (const res of results) {
        if (res.status === "fulfilled" && res.value.result.success) {
          const { search, result } = res.value;
          totalContent += `\n\n### ${search.purpose}\n${result.content}`;
          
          // Add citations as sources
          result.citations?.forEach((url, idx) => {
            if (url && !allSources.some(s => s.url === url)) {
              allSources.push({
                url,
                title: extractDomain(url),
                snippet: "",
                type: "search",
                relevance: 1 - (idx * 0.05)
              });
            }
          });
          
          searchCount++;
          credits += DEEP_SEARCH_CONFIG.COST_PER_SEARCH;
        }
      }
    }

    // ============ PHASE 3: FIRECRAWL DEEP SCRAPING ============
    send({ phase: "browsing", message: "Deep crawling key sources...", scrapeCount });

    // Collect URLs to scrape from citations and plan
    const urlsToScrape = new Set<string>();
    
    // Add high-relevance search citations
    allSources
      .filter(s => s.type === "search" && s.relevance > 0.7)
      .slice(0, 5)
      .forEach(s => urlsToScrape.add(s.url));
    
    // Add planned follow-up scrapes
    plan.follow_up_scrapes?.forEach(url => urlsToScrape.add(url));

    // Scrape in parallel (batch of 3)
    const urlArray = Array.from(urlsToScrape).slice(0, DEEP_SEARCH_CONFIG.MAX_SCRAPE_PER_ROUND);
    
    for (let i = 0; i < urlArray.length; i += 3) {
      if (credits >= DEEP_SEARCH_CONFIG.MAX_CREDITS) break;
      
      const batch = urlArray.slice(i, i + 3);
      const scrapePromises = batch.map(url => scrapeWithFirecrawl(apis.firecrawl, url));
      const results = await Promise.allSettled(scrapePromises);

      for (let j = 0; j < results.length; j++) {
        const res = results[j];
        const url = batch[j];
        
        if (res.status === "fulfilled" && res.value.success && res.value.content) {
          const truncated = res.value.content.slice(0, 6000);
          totalContent += `\n\n### Scraped: ${res.value.title}\n${truncated}`;
          
          // Update or add source
          const existingSource = allSources.find(s => s.url === url);
          if (existingSource) {
            existingSource.snippet = truncated.slice(0, 400);
            existingSource.type = "scrape";
          } else {
            allSources.push({
              url,
              title: res.value.title || extractDomain(url),
              snippet: truncated.slice(0, 400),
              type: "scrape",
              relevance: 0.9
            });
          }
          
          scrapeCount++;
          credits += DEEP_SEARCH_CONFIG.COST_PER_SCRAPE;
        }
      }
    }

    // Check if we have enough content
    if (totalContent.length >= DEEP_SEARCH_CONFIG.MIN_CONTENT_LENGTH && 
        allSources.length >= DEEP_SEARCH_CONFIG.MIN_SOURCES) {
      break;
    }

    // Generate additional searches if needed
    if (iteration < DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS && 
        totalContent.length < DEEP_SEARCH_CONFIG.MIN_CONTENT_LENGTH) {
      send({ phase: "searching", message: "Expanding search coverage...", iteration: iteration + 1 });
      
      // Add more specific searches based on query type
      const additionalSearches = generateAdditionalSearches(query, queryType, iteration);
      searches.push(...additionalSearches);
    }
  }

  return {
    content: totalContent,
    sources: allSources,
    searchCount,
    scrapeCount,
    credits: Math.min(credits, DEEP_SEARCH_CONFIG.MAX_CREDITS)
  };
}

function generateDefaultSearches(query: string, queryType: QueryType): Array<{ query: string; purpose: string }> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  switch (queryType) {
    case "supplier":
      return [
        { query: `${query} manufacturers suppliers ${currentYear}`, purpose: "Primary supplier research" },
        { query: `${query} MOQ minimum order wholesale pricing`, purpose: "Pricing and MOQ details" },
        { query: `${query} sustainable certified GOTS OEKO-TEX suppliers`, purpose: "Certified suppliers" },
        { query: `${query} Europe Asia supplier directory`, purpose: "Regional supplier mapping" },
      ];
    case "trend":
      return [
        { query: `${query} ${currentYear} ${nextYear} fashion trends`, purpose: "Current trend analysis" },
        { query: `${query} fashion week runway SS${nextYear % 100} FW${nextYear % 100}`, purpose: "Runway validation" },
        { query: `${query} street style celebrities wearing`, purpose: "Street style signals" },
        { query: `${query} brand adoptions designer collections`, purpose: "Brand adoption tracking" },
      ];
    case "market":
      return [
        { query: `${query} market size growth ${currentYear} ${nextYear}`, purpose: "Market overview" },
        { query: `${query} competition brands market share`, purpose: "Competitive landscape" },
        { query: `${query} consumer trends demographics`, purpose: "Consumer insights" },
        { query: `${query} pricing strategy premium luxury`, purpose: "Pricing analysis" },
      ];
    case "sustainability":
      return [
        { query: `${query} sustainable certifications GOTS OEKO-TEX B Corp`, purpose: "Certification research" },
        { query: `${query} eco-friendly recycled organic materials`, purpose: "Material options" },
        { query: `${query} carbon footprint supply chain transparency`, purpose: "Impact analysis" },
        { query: `${query} circular economy regenerative fashion`, purpose: "Circularity initiatives" },
      ];
    default:
      return [
        { query: query, purpose: "Primary research" },
        { query: `${query} ${currentYear} latest news updates`, purpose: "Recent developments" },
        { query: `${query} industry analysis insights`, purpose: "Industry context" },
      ];
  }
}

function generateAdditionalSearches(query: string, queryType: QueryType, iteration: number): Array<{ query: string; purpose: string }> {
  const modifiers = [
    ["expert analysis", "deep dive"],
    ["case study examples", "best practices"],
    ["regional comparison", "global perspective"],
  ];
  
  const modifier = modifiers[iteration % modifiers.length];
  return [
    { query: `${query} ${modifier[0]}`, purpose: `Additional ${modifier[0]}` },
    { query: `${query} ${modifier[1]}`, purpose: `Additional ${modifier[1]}` },
  ];
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.slice(0, 50);
  }
}

// ============ FALLBACK PLAN ============
function createFallbackPlan(queryType: QueryType, query: string) {
  return {
    query_type: queryType,
    complexity: "moderate" as const,
    parallel_searches: generateDefaultSearches(query, queryType),
    follow_up_scrapes: [],
    validation_criteria: ["Source reliability", "Data currency", "Information accuracy"],
    expected_output_format: queryType === "supplier" ? "table" : "report"
  };
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { stream, send, close } = createSSEStream();

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
      
      // Input validation
      if (!query || typeof query !== "string") {
        send({ phase: "failed", error: "Invalid query" });
        close();
        return;
      }
      
      const sanitizedQuery = sanitizeString(query, 5000);
      if (sanitizedQuery.length === 0) {
        send({ phase: "failed", error: "Query cannot be empty" });
        close();
        return;
      }
      
      if (containsSqlInjection(sanitizedQuery)) {
        logSecurityEvent('injection_attempt', { userId: user.id });
        send({ phase: "failed", error: "Invalid characters detected" });
        close();
        return;
      }
      
      if (conversationId && !isValidUUID(conversationId)) {
        send({ phase: "failed", error: "Invalid conversation ID format" });
        close();
        return;
      }

      // Model selection with fallback
      const selectedModel: SupportedModelId = (requestedModel && SUPPORTED_MODELS[requestedModel as SupportedModelId]) 
        ? requestedModel as SupportedModelId 
        : "grok-4-latest";
      
      const modelConfig = SUPPORTED_MODELS[selectedModel];
      CURRENT_MODEL_CONFIG = {
        provider: modelConfig.provider,
        endpoint: modelConfig.endpoint,
        model: modelConfig.model,
        temperature: 0.2,
      };

      // API Keys
      const GROK_API_KEY = Deno.env.get("Grok_API");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

      const AI_API_KEY = CURRENT_MODEL_CONFIG.provider === "lovable" ? LOVABLE_API_KEY : GROK_API_KEY;

      if (!AI_API_KEY) {
        // Try fallback to other model
        if (CURRENT_MODEL_CONFIG.provider === "grok" && LOVABLE_API_KEY) {
          CURRENT_MODEL_CONFIG = {
            provider: "lovable",
            endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
            model: "openai/gpt-5",
            temperature: 0.2,
          };
        } else if (CURRENT_MODEL_CONFIG.provider === "lovable" && GROK_API_KEY) {
          CURRENT_MODEL_CONFIG = {
            provider: "grok",
            endpoint: "https://api.x.ai/v1/chat/completions",
            model: "grok-4-latest",
            temperature: 0.2,
          };
        } else {
          send({ phase: "failed", error: "AI service not configured" });
          close();
          return;
        }
      }

      const FINAL_AI_KEY = CURRENT_MODEL_CONFIG.provider === "lovable" ? LOVABLE_API_KEY : GROK_API_KEY;
      if (!FINAL_AI_KEY) {
        send({ phase: "failed", error: "AI service not available" });
        close();
        return;
      }

      // Credit check
      const { data: userData } = await supabase
        .from("users")
        .select("credit_balance, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!userData || userData.credit_balance < DEEP_SEARCH_CONFIG.BASE_COST) {
        send({ 
          phase: "failed", 
          error: "Insufficient credits for deep research",
          insufficientCredits: true,
          requiredCredits: DEEP_SEARCH_CONFIG.BASE_COST
        });
        close();
        return;
      }

      const queryType = classifyQuery(sanitizedQuery);

      // Create research task
      const { data: taskData, error: taskError } = await supabase
        .from("research_tasks")
        .insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          query: sanitizedQuery,
          phase: "planning",
        })
        .select()
        .single();

      if (taskError || !taskData) {
        send({ phase: "failed", error: "Failed to create research task" });
        close();
        return;
      }

      const taskId = taskData.id;

      // ============ PHASE 1: PLANNING ============
      send({ phase: "planning", message: "Deconstructing your research request...", queryType });

      let plan = createFallbackPlan(queryType, sanitizedQuery);
      
      if (FINAL_AI_KEY) {
        const planResult = await callAI(
          FINAL_AI_KEY,
          PLANNER_SYSTEM_PROMPT,
          `Research Query: ${sanitizedQuery}\n\nCreate a comprehensive deep research plan. Output JSON only.`,
          { jsonMode: true }
        );

        if (planResult.success && planResult.content) {
          try {
            plan = JSON.parse(planResult.content);
          } catch {
            console.log("Using fallback plan");
          }
        }
      }

      await supabase
        .from("research_tasks")
        .update({ plan, phase: "searching" })
        .eq("id", taskId);

      // ============ PHASES 2-4: DEEP RESEARCH ============
      let researchResult: ResearchResult;

      if (PERPLEXITY_API_KEY && FIRECRAWL_API_KEY) {
        researchResult = await executeDeepResearch(
          sanitizedQuery,
          queryType,
          plan,
          { perplexity: PERPLEXITY_API_KEY, firecrawl: FIRECRAWL_API_KEY },
          send
        );
      } else {
        // Fallback to just Perplexity if Firecrawl unavailable
        send({ phase: "searching", message: "Searching for information...", searchCount: 0 });
        
        const searches = plan.parallel_searches || generateDefaultSearches(sanitizedQuery, queryType);
        let content = "";
        const sources: Array<{ url: string; title: string; snippet: string; type: string; relevance: number }> = [];
        let searchCount = 0;

        for (const search of searches.slice(0, 4)) {
          if (PERPLEXITY_API_KEY) {
            const result = await webSearchPerplexity(PERPLEXITY_API_KEY, search.query);
            if (result.success && result.content) {
              content += `\n\n### ${search.purpose}\n${result.content}`;
              result.citations?.forEach((url, idx) => {
                if (url && !sources.some(s => s.url === url)) {
                  sources.push({ url, title: extractDomain(url), snippet: "", type: "search", relevance: 1 - idx * 0.1 });
                }
              });
              searchCount++;
            }
          }
        }

        researchResult = {
          content,
          sources,
          searchCount,
          scrapeCount: 0,
          credits: DEEP_SEARCH_CONFIG.BASE_COST + searchCount * DEEP_SEARCH_CONFIG.COST_PER_SEARCH
        };
      }

      // Save sources
      for (const source of researchResult.sources) {
        await supabase.from("research_sources").insert({
          task_id: taskId,
          url: source.url,
          title: source.title,
          snippet: source.snippet,
          source_type: source.type,
          relevance_score: source.relevance,
        });
      }

      // ============ PHASE 5: VALIDATION ============
      send({ phase: "validating", message: "Cross-referencing and validating findings...", sourceCount: researchResult.sources.length });

      await supabase
        .from("research_tasks")
        .update({ execution_steps: [], sources: researchResult.sources, phase: "validating" })
        .eq("id", taskId);

      let validationNotes: string[] = [];
      
      if (researchResult.content.length < 200) {
        validationNotes.push("Limited data retrieved - findings should be verified independently");
      }
      
      if (researchResult.sources.length < 3) {
        validationNotes.push("Fewer sources than optimal - recommend additional verification");
      }

      // AI validation
      if (FINAL_AI_KEY && researchResult.content.length > 100) {
        const validationResult = await callAI(
          FINAL_AI_KEY,
          VALIDATOR_SYSTEM_PROMPT,
          `Validate findings for: "${sanitizedQuery}"\n\nFINDINGS:\n${researchResult.content.slice(0, 6000)}\n\nSOURCES: ${researchResult.sources.length}`,
          { jsonMode: true }
        );

        if (validationResult.success && validationResult.content) {
          try {
            const validation = JSON.parse(validationResult.content);
            if (validation.issues?.length) validationNotes.push(...validation.issues);
            if (validation.confidence_score < 0.7) validationNotes.push("Moderate confidence - verify key findings");
          } catch { /* ignore */ }
        }
      }

      // ============ PHASE 6: SYNTHESIS ============
      send({ phase: "generating", message: "Synthesizing intelligence report..." });

      await supabase.from("research_tasks").update({ phase: "generating" }).eq("id", taskId);

      const sourceList = researchResult.sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join("\n");
      
      const generationPrompt = `Transform research findings into strategy-grade intelligence.

═══════════════════════════════════════════════════════════════
USER QUERY: ${sanitizedQuery}
QUERY TYPE: ${queryType}
FORMAT: ${plan.expected_output_format || "report"}
═══════════════════════════════════════════════════════════════

RESEARCH FINDINGS:
${researchResult.content || "Limited data available."}

SOURCES (${researchResult.sources.length} total):
${sourceList || "Limited sources."}

VALIDATION NOTES:
${validationNotes.join("\n") || "Findings validated."}

═══════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS:
1. ADAPT structure to query type
2. Include REASONING and INTERPRETATION
3. Use ONLY data from research findings
4. Make ACTIONABLE recommendations
5. Format sources at END only: **Sources:** Name1 · Name2 · Name3
6. Tables OPTIONAL, must be clean and Excel-ready
═══════════════════════════════════════════════════════════════`;

      let finalContent = "";
      const synthesizerPrompt = getSynthesizerPromptWithDomain(activeDomain);
      
      const streamResult = await callAIStreaming(
        FINAL_AI_KEY,
        synthesizerPrompt,
        generationPrompt,
        (chunk: string) => { send({ phase: "generating", content: chunk }); }
      );

      if (!streamResult.success || !streamResult.content) {
        const fallbackResult = await callAI(FINAL_AI_KEY, synthesizerPrompt, generationPrompt);
        
        if (!fallbackResult.success) {
          send({ phase: "failed", error: "Failed to generate response" });
          await supabase.from("research_tasks").update({ phase: "failed", error_message: fallbackResult.error }).eq("id", taskId);
          close();
          return;
        }
        
        finalContent = fallbackResult.content || "";
        for (let i = 0; i < finalContent.length; i += 50) {
          send({ phase: "generating", content: finalContent.slice(i, i + 50) });
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        finalContent = streamResult.content;
      }

      // Deduct credits
      const finalCredits = Math.min(researchResult.credits, DEEP_SEARCH_CONFIG.MAX_CREDITS);
      await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: finalCredits,
        p_description: `Deep Research - ${queryType} (${researchResult.searchCount} searches, ${researchResult.scrapeCount} scrapes)`
      });

      // Complete task
      await supabase
        .from("research_tasks")
        .update({
          phase: "completed",
          final_answer: finalContent,
          credits_used: finalCredits,
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);

      send({
        phase: "completed",
        sources: researchResult.sources,
        creditsUsed: finalCredits,
        taskId,
        queryType,
        modelUsed: CURRENT_MODEL_CONFIG.provider === "lovable" ? "GPT-4.1" : "Grok-4",
        searchCount: researchResult.searchCount,
        scrapeCount: researchResult.scrapeCount
      });

      close();
    } catch (error) {
      console.error("Research agent error:", error);
      send({ phase: "failed", error: error instanceof Error ? error.message : "Research failed" });
      close();
    }
  })();

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});
