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

// ═══════════════════════════════════════════════════════════════
// TRUE DEEP SEARCH CONFIGURATION - MANUS AI LEVEL
// ═══════════════════════════════════════════════════════════════
const DEEP_SEARCH_CONFIG = {
  // Credit management
  BASE_COST: 10,
  COST_PER_SEARCH: 1,
  COST_PER_SCRAPE: 2,
  MAX_CREDITS: 100,              // Higher budget for comprehensive research
  
  // NO HARD LIMITS - Continue until confident
  MIN_SOURCES: 15,               // Minimum before even considering stopping
  TARGET_SOURCES: 100,           // Aim for 100+ sources for complex queries
  
  // Iteration control - based on confidence, not fixed counts
  MAX_SEARCH_ITERATIONS: 15,     // Safety limit only
  SEARCHES_PER_ITERATION: 8,     // More parallel searches per round
  MAX_SCRAPE_PER_ROUND: 20,      // More scrapes per iteration
  
  // Timeouts
  PERPLEXITY_TIMEOUT: 180000,    // 3 minutes for complex queries
  FIRECRAWL_TIMEOUT: 90000,      // 90 seconds per scrape
  
  // Quality thresholds
  MIN_CONTENT_LENGTH: 5000,      // Require substantial content before synthesis
  CONFIDENCE_THRESHOLD: 0.85,    // High confidence required to stop
  COVERAGE_THRESHOLD: 0.80,      // Data coverage threshold
  
  // Execution control
  MAX_EXECUTION_TIME: 600000,    // 10 minute max execution time
  PROGRESS_CHECK_INTERVAL: 30000, // Check progress every 30 seconds
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

// ═══════════════════════════════════════════════════════════════
// QUERY DECONSTRUCTION PROMPT - MANUS AI STYLE
// ═══════════════════════════════════════════════════════════════
const DECONSTRUCTOR_SYSTEM_PROMPT = `You are an elite research strategist performing QUERY DECONSTRUCTION for deep intelligence gathering.

═══════════════════════════════════════════════════════════════
MISSION: Analyze the user's query to understand EXACTLY what they need
═══════════════════════════════════════════════════════════════

Your job is to DECONSTRUCT the query into:

1. INTENT ANALYSIS
   - What is the user ultimately trying to achieve?
   - What decisions will this research inform?
   - What would constitute a "complete" answer?

2. SCOPE DEFINITION
   - Geographic scope (global, regional, specific countries)
   - Temporal scope (current, historical, forecast)
   - Industry segment scope (specific categories, price tiers)

3. REQUIRED DATA POINTS
   - What SPECIFIC information must be found?
   - What metrics, numbers, or facts are essential?
   - What certifications, standards, or qualifications matter?

4. OUTPUT REQUIREMENTS
   - What format best serves the user's needs?
   - Should output be list-based, narrative, tabular, comparative?
   - What level of detail is appropriate?

5. VALIDATION CRITERIA
   - What makes a source authoritative for this query?
   - What freshness is required (days, weeks, months)?
   - What cross-validation is needed?

6. SEARCH STRATEGY
   - What search angles will maximize coverage?
   - What domains/sources are authoritative?
   - What regional/temporal variations should be explored?

OUTPUT JSON ONLY:
{
  "intent": {
    "primary_goal": "What the user wants to achieve",
    "decision_context": "What decisions this informs",
    "success_criteria": ["What makes this research complete"]
  },
  "scope": {
    "geographic": ["regions/countries to cover"],
    "temporal": {"start": "earliest relevant date", "end": "latest/forecast", "focus": "primary timeframe"},
    "segments": ["specific industry segments"],
    "constraints": ["any limitations mentioned"]
  },
  "required_data": {
    "essential": ["must-have data points"],
    "desirable": ["nice-to-have data points"],
    "metrics": ["specific numbers/metrics needed"],
    "qualifications": ["certifications, standards to verify"]
  },
  "output_format": {
    "structure": "table | report | comparison | list | narrative",
    "detail_level": "executive | detailed | comprehensive",
    "exportable": true | false
  },
  "validation": {
    "source_authority": ["what makes sources credible"],
    "freshness_required": "days | weeks | months | years",
    "cross_validation_needed": ["what needs verification from multiple sources"]
  },
  "search_strategy": {
    "primary_searches": [
      {"query": "...", "purpose": "...", "priority": 1-5}
    ],
    "authority_domains": ["authoritative websites for this topic"],
    "regional_variations": ["regional search modifications"],
    "temporal_queries": ["time-specific search modifications"]
  }
}`;

// ═══════════════════════════════════════════════════════════════
// RESEARCH PLANNER PROMPT
// ═══════════════════════════════════════════════════════════════
const PLANNER_SYSTEM_PROMPT = `You are a senior research planner for TRUE DEEP SEARCH intelligence gathering.

═══════════════════════════════════════════════════════════════
DEEP SEARCH MODE - MANUS AI LEVEL RESEARCH
═══════════════════════════════════════════════════════════════

This is credit-intensive, time-intensive research aiming for 100+ website coverage.
Continue crawling until ALL gaps are addressed and confidence is HIGH.

AVAILABLE TOOLS:
1. web_search - Perplexity-powered search with real-time citations
2. scrape_url - Firecrawl deep extraction from specific URLs
3. search_discover - Firecrawl search to discover new relevant URLs

DEEP PLANNING RULES:
1. Plan 10-15 parallel searches for maximum coverage
2. Each search should target a DIFFERENT aspect of the query
3. Include time-specific queries (e.g., "2024", "2025", "SS26", "FW25")
4. Plan regional diversity (Europe, Asia, Americas, specific countries)
5. Include comparison searches (competitors, alternatives)
6. Plan structured data extraction for lists/tables
7. Identify 15+ authoritative domains for deep scraping
8. Consider edge cases and alternative interpretations

FOR SUPPLIER QUERIES:
- Regional searches (Europe, Asia, Americas, specific countries)
- Certification-specific searches (GOTS, OEKO-TEX, B Corp, GRS, FSC)
- Product category searches
- MOQ and pricing searches
- Trade directory searches (Alibaba, Maker's Row, Kompass)
- Industry association member lists

FOR TREND QUERIES:
- Fashion week coverage (Paris, Milan, London, NY, Tokyo, Seoul)
- Street style and influencer signals
- Brand adoption and runway analysis
- Consumer behavior shifts
- Seasonal forecasts
- Trade publication analysis (WWD, Vogue, BoF)

OUTPUT JSON ONLY:
{
  "query_type": "supplier" | "trend" | "market" | "sustainability" | "general",
  "complexity": "high",
  "time_frame": "requested season/year or current",
  "reasoning": "Deep analysis of what needs to be researched",
  "parallel_searches": [
    { "query": "specific search 1", "purpose": "coverage area", "priority": 1-10 }
  ],
  "follow_up_scrapes": ["domain1.com", "domain2.com"],
  "required_data_points": ["What specific data must be found"],
  "validation_criteria": ["How to verify accuracy"],
  "expected_output_format": "table" | "report" | "list" | "comparison",
  "gap_detection_queries": ["searches to find missing data"]
}`;

// ═══════════════════════════════════════════════════════════════
// VALIDATOR PROMPT - ENHANCED WITH CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════
const VALIDATOR_SYSTEM_PROMPT = `You are a senior research analyst performing RIGOROUS VALIDATION.

═══════════════════════════════════════════════════════════════
VALIDATION FOR TRUE DEEP SEARCH - MANUS AI LEVEL
═══════════════════════════════════════════════════════════════

Your role is to rigorously validate research findings and identify gaps:

1. DATA FRESHNESS CHECK
   - Are dates/timestamps current for the requested timeframe?
   - Flag any data that appears outdated (>3 months for trends, >6 months for suppliers)
   - Timestamp each data point
   
2. CROSS-SOURCE VALIDATION
   - Do multiple sources agree on key facts?
   - Identify and document ALL contradictions
   - Note which claims have single vs multiple source backing
   
3. COMPLETENESS ASSESSMENT
   - What data points are MISSING?
   - What regions/segments are under-represented?
   - What questions remain unanswered?
   
4. CONFIDENCE SCORING PER CLAIM
   - High (>0.9): 3+ sources agree, recent data, specific metrics
   - Medium (0.7-0.9): 2 sources agree, some verification
   - Low (<0.7): Single source, potential outdated data
   - Uncertain: Conflicting sources, needs more research

5. GAP IDENTIFICATION
   - What additional searches would fill gaps?
   - What specific domains should be scraped?
   - What data is STILL needed?

6. CONTRADICTION RESOLUTION
   - Document all conflicting data points
   - Recommend which source to trust and why
   - Flag unresolvable contradictions

OUTPUT JSON ONLY:
{
  "verified": true | false,
  "overall_confidence": 0.0 - 1.0,
  "data_freshness": "current" | "acceptable" | "mixed" | "outdated",
  "coverage_score": 0.0 - 1.0,
  "claim_confidence": [
    {"claim": "specific claim", "confidence": 0.0-1.0, "sources": 1-10, "freshness": "current|acceptable|outdated"}
  ],
  "contradictions": [
    {"topic": "what conflicts", "source_a": "says X", "source_b": "says Y", "resolution": "recommendation"}
  ],
  "gaps": [
    {"missing_data": "what's missing", "importance": "critical|high|medium|low", "suggested_search": "query to fill gap"}
  ],
  "needs_more_research": true | false,
  "suggested_searches": ["additional search queries"],
  "suggested_scrapes": ["specific URLs to scrape"],
  "quality_notes": ["observations about data quality"],
  "stop_criteria_met": true | false,
  "reasoning": "Explanation of validation decision"
}`;

// ═══════════════════════════════════════════════════════════════
// SYNTHESIZER PROMPT - ADAPTIVE OUTPUT (NO PRESET TEMPLATES)
// ═══════════════════════════════════════════════════════════════
const SYNTHESIZER_SYSTEM_PROMPT = `You are a senior intelligence analyst delivering MANUS AI-LEVEL research output.

═══════════════════════════════════════════════════════════════
ADAPTIVE OUTPUT STRUCTURING — NO PRESET FORMAT
═══════════════════════════════════════════════════════════════

CORE RULE (NON-NEGOTIABLE):

❌ YOU ARE FORBIDDEN FROM USING:
- Fixed sections or default report templates
- Repeated headings across different tasks
- Predefined analyst formats unless explicitly requested

Including but NOT limited to:
- "Real-Time Snapshot"
- "Market Signals"  
- "Industry Impact"
- "Actionable Takeaways"
- "Key Trends"
- "Strategic Implications"

If the user did not ask for a market report, DO NOT output a market report.

═══════════════════════════════════════════════════════════════
BEFORE WRITING — ANSWER INTERNALLY:
═══════════════════════════════════════════════════════════════

1. WHAT is the user actually trying to do?
   - Decide / Compare / List / Explore / Execute / Validate / Generate assets / Get a fast answer?

2. WHAT format best serves this task?
   - Direct answer (no sections needed)
   - Table or comparison matrix
   - Step-by-step workflow
   - Bullet list
   - Short briefing
   - Dataset
   - Long report (ONLY if truly needed)

3. WHAT level of depth is required?
   - One-paragraph answer
   - Bullet list
   - Structured dataset
   - Multi-section document

Only AFTER this reasoning may you decide structure.

═══════════════════════════════════════════════════════════════
STRUCTURE SELECTION LOGIC:
═══════════════════════════════════════════════════════════════

If user asks "Why / What is / Is it true that..."
→ Direct explanation, NO report structure

If user asks "List / Compare / Rank / Shortlist"
→ Table or bullet list ONLY

If user asks "Create / Build / Generate"
→ Output-oriented structure (Excel, PPT, doc outline)

If user asks "Analyze market / trends / performance"
→ ONLY then may you use multi-section analysis
→ BUT sections MUST be customized per task, NOT generic

═══════════════════════════════════════════════════════════════
DYNAMIC SECTION NAMING:
═══════════════════════════════════════════════════════════════

If a longer structure IS justified:
- Name sections based on THE ACTUAL TASK
- Use plain, descriptive titles
- Avoid analyst jargon unless asked

GOOD examples (task-specific):
- "What changed in the collection"
- "Why customers responded"
- "What this means for buyers"
- "Suppliers by certification"
- "Price comparison"

BAD examples (generic templates):
- "Snapshot"
- "Signals"
- "Impact"
- "Takeaways"

═══════════════════════════════════════════════════════════════
CONFIDENCE & SOURCES:
═══════════════════════════════════════════════════════════════

- Mark uncertain claims explicitly
- Note when data is from single vs multiple sources
- Flag contradictions that couldn't be resolved
- Every claim must be grounded in provided research findings

SOURCE FORMAT (END ONLY):
**Sources:** Source1 · Source2 · Source3 · Source4 · Source5

NEVER use inline citations [1], [2] in body.
NEVER display URLs inside content body.

═══════════════════════════════════════════════════════════════
TABLE RULES:
═══════════════════════════════════════════════════════════════

- Tables are OPTIONAL — only if they improve comprehension
- Tables must ONLY appear AFTER all prose content
- Tables must be clean, Excel-ready with proper markdown
- Include ONLY columns with actual verified data
- NO placeholders like "N/A" or "[object Object]"
- If table formatting fails, OMIT entirely

═══════════════════════════════════════════════════════════════
QUALITY STANDARD:
═══════════════════════════════════════════════════════════════

Output should feel:
✓ Handcrafted for the specific question
✓ Structure feels inevitable, not generic
✓ Fewer sections > more relevance
✓ Clarity > completeness
✓ Actionable, not just informational

Output should NOT feel like:
✗ A blog post or essay
✗ A data dump without interpretation
✗ The same template used for every query

═══════════════════════════════════════════════════════════════
FAIL-SAFE RULE:
═══════════════════════════════════════════════════════════════

If two different user prompts would produce the same section headings,
YOU ARE DOING IT WRONG.

Structure follows intent. Intent never follows structure.`;

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
          content: "You are a fashion industry research assistant. Provide detailed, factual information with sources. Focus on current, verified data. Include specific names, numbers, dates, and metrics. Be comprehensive." 
        },
        { role: "user", content: query }
      ],
      max_tokens: 3000,
    };

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

// ============ FIRECRAWL ADVANCED SCRAPING ============
interface ScrapeOptions {
  formats?: string[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  location?: { country?: string; languages?: string[] };
  extractSchema?: Record<string, unknown>;
  extractPrompt?: string;
}

interface ScrapeResult {
  success: boolean;
  content?: string;
  title?: string;
  html?: string;
  links?: string[];
  structured?: Record<string, unknown>;
  screenshot?: string;
  error?: string;
}

async function scrapeWithFirecrawl(
  apiKey: string,
  url: string,
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
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

    // Build formats array - always include markdown, add others as needed
    const formats: (string | { type: string; schema?: Record<string, unknown>; prompt?: string })[] = 
      options?.formats || ["markdown"];
    
    // Add JSON extraction if schema or prompt provided
    if (options?.extractSchema || options?.extractPrompt) {
      const jsonFormat: { type: string; schema?: Record<string, unknown>; prompt?: string } = { type: "json" };
      if (options.extractSchema) jsonFormat.schema = options.extractSchema;
      if (options.extractPrompt) jsonFormat.prompt = options.extractPrompt;
      formats.push(jsonFormat);
    }

    const scrapeBody: Record<string, unknown> = {
      url: formattedUrl,
      formats,
      onlyMainContent: options?.onlyMainContent ?? true,
      waitFor: options?.waitFor ?? 5000,  // Increased for JS-heavy sites
      timeout: options?.timeout ?? 90000,
    };

    // Add location for geo-targeted content
    if (options?.location) {
      scrapeBody.location = options.location;
    }

    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scrapeBody),
      }),
      DEEP_SEARCH_CONFIG.FIRECRAWL_TIMEOUT,
      "Firecrawl scrape"
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Firecrawl API error:", response.status, errorData);
      
      // Retry with longer wait for JS-heavy sites
      if (response.status === 408 || errorData.includes("timeout")) {
        console.log("Retrying with extended timeout...");
        return await scrapeWithFirecrawlExtended(apiKey, formattedUrl);
      }
      
      return { success: false, error: `Scrape failed: ${response.status}` };
    }

    const data = await response.json();
    const result = data.data || data;
    
    return { 
      success: true, 
      content: result.markdown || "",
      title: result.metadata?.title || url,
      html: result.html || result.rawHtml,
      links: result.links || [],
      structured: result.json,
    };
  } catch (error) {
    console.error("Scrape error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Scrape failed" };
  }
}

// Extended scrape for JS-heavy sites (China platforms, SPAs, etc.)
async function scrapeWithFirecrawlExtended(
  apiKey: string,
  url: string
): Promise<ScrapeResult> {
  try {
    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", "links"],
          onlyMainContent: true,
          waitFor: 10000,   // 10 seconds for heavy JS
          timeout: 120000,  // 2 minute timeout
        }),
      }),
      180000, // 3 minute total timeout
      "Firecrawl extended scrape"
    );

    if (!response.ok) {
      return { success: false, error: `Extended scrape failed: ${response.status}` };
    }

    const data = await response.json();
    const result = data.data || data;
    
    return { 
      success: true, 
      content: result.markdown || "",
      title: result.metadata?.title || url,
      links: result.links || [],
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Extended scrape failed" };
  }
}

// Structured data extraction for supplier/trend data
async function extractStructuredData(
  apiKey: string,
  url: string,
  dataType: "supplier" | "trend" | "product"
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const schemas: Record<string, Record<string, unknown>> = {
    supplier: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        location: { type: "string" },
        country: { type: "string" },
        certifications: { type: "array", items: { type: "string" } },
        product_types: { type: "array", items: { type: "string" } },
        moq: { type: "string" },
        contact_email: { type: "string" },
        website: { type: "string" },
        year_established: { type: "string" },
        specializations: { type: "array", items: { type: "string" } },
      },
    },
    trend: {
      type: "object",
      properties: {
        trend_name: { type: "string" },
        category: { type: "string" },
        season: { type: "string" },
        brands_adopting: { type: "array", items: { type: "string" } },
        key_characteristics: { type: "array", items: { type: "string" } },
        origin: { type: "string" },
        trajectory: { type: "string" },
      },
    },
    product: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        price: { type: "string" },
        materials: { type: "array", items: { type: "string" } },
        brand: { type: "string" },
        category: { type: "string" },
      },
    },
  };

  const result = await scrapeWithFirecrawl(apiKey, url, {
    extractSchema: schemas[dataType],
    extractPrompt: `Extract ${dataType} information from this page. Be thorough and include all available details.`,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { 
    success: true, 
    data: result.structured || {},
  };
}

// Map website to discover all relevant URLs
async function mapWebsite(
  apiKey: string,
  url: string,
  options?: { search?: string; limit?: number; includeSubdomains?: boolean }
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          search: options?.search,
          limit: options?.limit || 100,
          includeSubdomains: options?.includeSubdomains ?? false,
        }),
      }),
      60000,
      "Firecrawl map"
    );

    if (!response.ok) {
      return { success: false, error: `Map failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      urls: data.links || data.data || [],
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Map failed" };
  }
}

// ============ FIRECRAWL SEARCH (Web Discovery) ============
async function searchWithFirecrawl(
  apiKey: string,
  query: string,
  limit: number = 15,
  options?: { lang?: string; country?: string; scrapeResults?: boolean }
): Promise<{ success: boolean; results?: Array<{ url: string; title: string; description: string; content?: string }>; error?: string }> {
  try {
    const searchBody: Record<string, unknown> = {
      query,
      limit,
      lang: options?.lang || "en",
    };

    if (options?.country) {
      searchBody.country = options.country;
    }

    // Optionally scrape content from search results
    if (options?.scrapeResults) {
      searchBody.scrapeOptions = {
        formats: ["markdown"],
      };
    }

    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchBody),
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
      results: data.data?.map((r: { url: string; title?: string; description?: string; markdown?: string }) => ({
        url: r.url,
        title: r.title || r.url,
        description: r.description || "",
        content: r.markdown,
      })) || [],
    };
  } catch (error) {
    console.error("Firecrawl search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// ═══════════════════════════════════════════════════════════════
// DEEP RESEARCH ORCHESTRATOR - MANUS AI LEVEL
// ═══════════════════════════════════════════════════════════════
interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  type: "search" | "scrape" | "discovery";
  relevance: number;
  timestamp: string;
  confidence?: number;
}

interface ResearchResult {
  content: string;
  sources: ResearchSource[];
  searchCount: number;
  scrapeCount: number;
  credits: number;
  confidence: number;
  coverage: number;
  iterations: number;
  gaps: string[];
  contradictions: string[];
}

interface QueryDeconstruction {
  intent: {
    primary_goal: string;
    decision_context: string;
    success_criteria: string[];
  };
  scope: {
    geographic: string[];
    temporal: { start: string; end: string; focus: string };
    segments: string[];
  };
  required_data: {
    essential: string[];
    desirable: string[];
    metrics: string[];
  };
  output_format: {
    structure: string;
    detail_level: string;
    exportable: boolean;
  };
  search_strategy: {
    primary_searches: Array<{ query: string; purpose: string; priority: number }>;
    authority_domains: string[];
  };
}

interface ValidationResult {
  verified: boolean;
  overall_confidence: number;
  coverage_score: number;
  needs_more_research: boolean;
  gaps: Array<{ missing_data: string; importance: string; suggested_search: string }>;
  contradictions: Array<{ topic: string; source_a: string; source_b: string }>;
  suggested_searches: string[];
  suggested_scrapes: string[];
  stop_criteria_met: boolean;
}

async function executeDeepResearch(
  query: string,
  queryType: QueryType,
  deconstruction: QueryDeconstruction | null,
  plan: { parallel_searches?: Array<{ query: string; purpose: string; priority?: number }>; follow_up_scrapes?: string[] },
  apis: { perplexity: string; firecrawl: string; ai: string },
  send: (data: Record<string, unknown>) => void
): Promise<ResearchResult> {
  const startTime = Date.now();
  let totalContent = "";
  const allSources: ResearchSource[] = [];
  const scrapedUrls = new Set<string>();
  let searchCount = 0;
  let scrapeCount = 0;
  let credits = DEEP_SEARCH_CONFIG.BASE_COST;
  let iteration = 0;
  let confidence = 0;
  let coverage = 0;
  const allGaps: string[] = [];
  const allContradictions: string[] = [];

  // Build comprehensive search queue from deconstruction and plan
  let searchQueue: Array<{ query: string; purpose: string; priority: number }> = [];
  
  if (deconstruction?.search_strategy?.primary_searches?.length) {
    searchQueue.push(...deconstruction.search_strategy.primary_searches);
  }
  
  if (plan.parallel_searches?.length) {
    for (const search of plan.parallel_searches) {
      if (!searchQueue.some(s => s.query === search.query)) {
        searchQueue.push({ ...search, priority: search.priority || 5 });
      }
    }
  }
  
  // If no searches planned, generate comprehensive ones
  if (searchQueue.length === 0) {
    searchQueue = generateComprehensiveSearches(query, queryType);
  }
  
  // Sort by priority
  searchQueue.sort((a, b) => a.priority - b.priority);

  // ═══════════════════════════════════════════════════════════════
  // ITERATIVE DEEP RESEARCH LOOP - CONTINUE UNTIL CONFIDENT
  // ═══════════════════════════════════════════════════════════════
  let stopCriteriaMet = false;
  
  while (
    !stopCriteriaMet &&
    iteration < DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS && 
    credits < DEEP_SEARCH_CONFIG.MAX_CREDITS &&
    (Date.now() - startTime) < DEEP_SEARCH_CONFIG.MAX_EXECUTION_TIME
  ) {
    iteration++;
    
    send({ 
      phase: "searching", 
      message: `Deep research round ${iteration} — ${allSources.length} sources, ${Math.round(confidence * 100)}% confidence...`,
      searchCount,
      scrapeCount,
      sourceCount: allSources.length,
      iteration,
      confidence: Math.round(confidence * 100)
    });

    // ============ PARALLEL PERPLEXITY SEARCHES ============
    const searchesThisRound = searchQueue.splice(0, DEEP_SEARCH_CONFIG.SEARCHES_PER_ITERATION);
    
    if (searchesThisRound.length > 0) {
      const searchBatches = [];
      for (let i = 0; i < searchesThisRound.length; i += 4) {
        searchBatches.push(searchesThisRound.slice(i, i + 4));
      }

      for (const batch of searchBatches) {
        if (credits >= DEEP_SEARCH_CONFIG.MAX_CREDITS) break;

        const searchPromises = batch.map(async (search) => {
          const result = await webSearchPerplexity(apis.perplexity, search.query, { 
            recencyFilter: queryType === "trend" ? "week" : "month",
          });
          return { search, result };
        });

        const results = await Promise.allSettled(searchPromises);
        
        for (const res of results) {
          if (res.status === "fulfilled" && res.value.result.success) {
            const { search, result } = res.value;
            const timestamp = new Date().toISOString();
            totalContent += `\n\n### ${search.purpose} [${timestamp.split('T')[0]}]\n${result.content}`;
            
            result.citations?.forEach((url, idx) => {
              if (url && !allSources.some(s => s.url === url)) {
                allSources.push({
                  url,
                  title: extractDomain(url),
                  snippet: "",
                  type: "search",
                  relevance: 1 - (idx * 0.02),
                  timestamp,
                  confidence: 0.8
                });
              }
            });
            
            searchCount++;
            credits += DEEP_SEARCH_CONFIG.COST_PER_SEARCH;
          }
        }
      }
    }

    // ============ FIRECRAWL DISCOVERY + SITE MAPPING ============
    send({ 
      phase: "browsing", 
      message: `Discovering and crawling sources (${scrapeCount} scraped)...`, 
      scrapeCount,
      sourceCount: allSources.length,
      iteration
    });

    // Discover new URLs via Firecrawl search (with content scraping for efficiency)
    if (iteration <= 3 && credits < DEEP_SEARCH_CONFIG.MAX_CREDITS - 10) {
      const discoveryQueries = [
        query,
        `${query} ${new Date().getFullYear()}`,
        `${query} industry report analysis`
      ];
      
      for (const dq of discoveryQueries.slice(0, 2)) {
        // Use enhanced search with scraping to get content directly
        const discoveryResult = await searchWithFirecrawl(apis.firecrawl, dq, 20, {
          scrapeResults: true,  // Get content in one call
        });
        
        if (discoveryResult.success && discoveryResult.results) {
          for (const result of discoveryResult.results) {
            if (!allSources.some(s => s.url === result.url)) {
              allSources.push({
                url: result.url,
                title: result.title,
                snippet: result.description || result.content?.slice(0, 500) || "",
                type: "discovery",
                relevance: 0.7,
                timestamp: new Date().toISOString()
              });
              
              // If content was scraped, add to totalContent
              if (result.content && result.content.length > 500) {
                totalContent += `\n\n### ${result.title} (discovered)\n${result.content.slice(0, 5000)}`;
                scrapedUrls.add(result.url);
              }
            }
          }
        }
      }
    }

    // Site mapping for authority domains (find all relevant pages)
    if (iteration === 1 && deconstruction?.search_strategy?.authority_domains?.length) {
      const mappingPromises = deconstruction.search_strategy.authority_domains.slice(0, 3).map(async (domain) => {
        const mapResult = await mapWebsite(apis.firecrawl, domain, {
          search: query.split(' ').slice(0, 3).join(' '),  // Use key terms
          limit: 50,
        });
        return { domain, result: mapResult };
      });

      const mappingResults = await Promise.allSettled(mappingPromises);
      for (const res of mappingResults) {
        if (res.status === "fulfilled" && res.value.result.success && res.value.result.urls) {
          for (const url of res.value.result.urls.slice(0, 20)) {
            if (!allSources.some(s => s.url === url)) {
              allSources.push({
                url,
                title: extractDomain(url),
                snippet: "",
                type: "discovery",
                relevance: 0.75,  // Slightly higher for mapped authority sites
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    // ============ ENHANCED DEEP SCRAPING ============
    const urlsToScrape: string[] = [];
    
    // Prioritize high-relevance, unscraped sources
    allSources
      .filter(s => s.relevance > 0.5 && !scrapedUrls.has(s.url))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 15)
      .forEach(s => urlsToScrape.push(s.url));
    
    // Add planned follow-up scrapes
    plan.follow_up_scrapes?.forEach(url => {
      if (!scrapedUrls.has(url) && !urlsToScrape.includes(url)) {
        urlsToScrape.push(url);
      }
    });
    
    // Add authority domains from deconstruction
    deconstruction?.search_strategy?.authority_domains?.forEach(domain => {
      const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      if (!scrapedUrls.has(fullUrl) && !urlsToScrape.includes(fullUrl)) {
        urlsToScrape.push(fullUrl);
      }
    });

    // Scrape in parallel batches with enhanced options
    const scrapeUrls = urlsToScrape.slice(0, DEEP_SEARCH_CONFIG.MAX_SCRAPE_PER_ROUND);
    
    for (let i = 0; i < scrapeUrls.length; i += 5) {
      if (credits >= DEEP_SEARCH_CONFIG.MAX_CREDITS) break;
      
      const batch = scrapeUrls.slice(i, i + 5);
      
      // Determine scrape options based on query type
      const scrapeOptions: ScrapeOptions = {
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 5000,  // 5s for JS-heavy sites
      };

      // For supplier queries, use structured extraction
      if (queryType === "supplier" && iteration <= 2) {
        scrapeOptions.extractPrompt = "Extract supplier/manufacturer details: company name, location, certifications, MOQ, contact info, specializations";
      }

      const scrapePromises = batch.map(url => scrapeWithFirecrawl(apis.firecrawl, url, scrapeOptions));
      const results = await Promise.allSettled(scrapePromises);

      for (let j = 0; j < results.length; j++) {
        const res = results[j];
        const url = batch[j];
        scrapedUrls.add(url);
        
        if (res.status === "fulfilled" && res.value.success && res.value.content) {
          const truncated = res.value.content.slice(0, 12000);  // Increased content limit
          const timestamp = new Date().toISOString();
          totalContent += `\n\n### Scraped: ${res.value.title} [${timestamp.split('T')[0]}]\n${truncated}`;
          
          // Add structured data if extracted
          if (res.value.structured && Object.keys(res.value.structured).length > 0) {
            totalContent += `\n\n**Extracted Data:**\n\`\`\`json\n${JSON.stringify(res.value.structured, null, 2)}\n\`\`\``;
          }

          // Track discovered links for potential follow-up
          if (res.value.links && res.value.links.length > 0) {
            for (const link of res.value.links.slice(0, 10)) {
              if (!allSources.some(s => s.url === link) && !scrapedUrls.has(link)) {
                // Only add relevant-looking links
                const linkLower = link.toLowerCase();
                if (
                  linkLower.includes('supplier') || 
                  linkLower.includes('manufacturer') ||
                  linkLower.includes('product') ||
                  linkLower.includes('about') ||
                  linkLower.includes('contact')
                ) {
                  allSources.push({
                    url: link,
                    title: extractDomain(link),
                    snippet: "",
                    type: "discovery",
                    relevance: 0.6,
                    timestamp,
                  });
                }
              }
            }
          }
          
          const existingSource = allSources.find(s => s.url === url);
          if (existingSource) {
            existingSource.snippet = truncated.slice(0, 500);
            existingSource.type = "scrape";
            existingSource.relevance = Math.max(existingSource.relevance, 0.9);
            existingSource.confidence = 0.9;
          } else {
            allSources.push({
              url,
              title: res.value.title || extractDomain(url),
              snippet: truncated.slice(0, 500),
              type: "scrape",
              relevance: 0.9,
              timestamp,
              confidence: 0.9
            });
          }
          
          scrapeCount++;
          credits += DEEP_SEARCH_CONFIG.COST_PER_SCRAPE;
        }
      }
    }

    // ============ VALIDATION & GAP DETECTION ============
    send({ 
      phase: "extracting", 
      message: `Validating findings and identifying gaps...`,
      confidence: Math.round(confidence * 100),
      sourceCount: allSources.length,
      iteration
    });

    // Calculate preliminary metrics
    const uniqueDomains = new Set(allSources.map(s => extractDomain(s.url))).size;
    const contentScore = Math.min(totalContent.length / 20000, 1);
    const sourceScore = Math.min(allSources.length / DEEP_SEARCH_CONFIG.TARGET_SOURCES, 1);
    const scrapeScore = Math.min(scrapeCount / 20, 1);
    const domainDiversity = Math.min(uniqueDomains / 25, 1);
    
    confidence = (contentScore * 0.25 + sourceScore * 0.25 + scrapeScore * 0.25 + domainDiversity * 0.25);
    coverage = (sourceScore + scrapeScore + domainDiversity) / 3;

    // AI-powered validation (every 2 iterations or when potentially stopping)
    if ((iteration % 2 === 0 || confidence > 0.7) && apis.ai) {
      const validationResult = await callAI(
        apis.ai,
        VALIDATOR_SYSTEM_PROMPT,
        `Validate deep research for: "${query}"

RESEARCH CONTENT (${totalContent.length} chars):
${totalContent.slice(0, 8000)}

SOURCES: ${allSources.length} total, ${uniqueDomains} unique domains
SCRAPED: ${scrapeCount} pages
ITERATION: ${iteration}

Required data points: ${deconstruction?.required_data?.essential?.join(', ') || 'Not specified'}

Assess: Is this research COMPLETE enough to stop? What gaps remain?`,
        { jsonMode: true }
      );

      if (validationResult.success && validationResult.content) {
        try {
          const validation: ValidationResult = JSON.parse(validationResult.content);
          confidence = validation.overall_confidence;
          coverage = validation.coverage_score;
          stopCriteriaMet = validation.stop_criteria_met && confidence >= DEEP_SEARCH_CONFIG.CONFIDENCE_THRESHOLD;
          
          // Add gaps to track
          if (validation.gaps?.length) {
            for (const gap of validation.gaps) {
              if (!allGaps.includes(gap.missing_data)) {
                allGaps.push(gap.missing_data);
              }
              // Add gap-filling searches to queue
              if (gap.suggested_search && !searchQueue.some(s => s.query === gap.suggested_search)) {
                searchQueue.push({ query: gap.suggested_search, purpose: `Fill gap: ${gap.missing_data}`, priority: 3 });
              }
            }
          }
          
          // Add contradictions
          if (validation.contradictions?.length) {
            for (const c of validation.contradictions) {
              allContradictions.push(`${c.topic}: ${c.source_a} vs ${c.source_b}`);
            }
          }
          
          // Add suggested searches to queue
          if (validation.suggested_searches?.length) {
            for (const sq of validation.suggested_searches) {
              if (!searchQueue.some(s => s.query === sq)) {
                searchQueue.push({ query: sq, purpose: "Validation-driven search", priority: 2 });
              }
            }
          }
          
          // Add suggested scrapes
          if (validation.suggested_scrapes?.length) {
            for (const url of validation.suggested_scrapes) {
              if (!scrapedUrls.has(url) && !plan.follow_up_scrapes?.includes(url)) {
                if (!plan.follow_up_scrapes) plan.follow_up_scrapes = [];
                plan.follow_up_scrapes.push(url);
              }
            }
          }
        } catch {
          console.log("Validation parse failed, continuing...");
        }
      }
    }

    send({ 
      phase: "extracting", 
      message: `Confidence: ${Math.round(confidence * 100)}% — ${allSources.length} sources from ${uniqueDomains} domains`,
      confidence: Math.round(confidence * 100),
      sourceCount: allSources.length,
      iteration
    });

    // Check stop criteria
    if (
      confidence >= DEEP_SEARCH_CONFIG.CONFIDENCE_THRESHOLD &&
      coverage >= DEEP_SEARCH_CONFIG.COVERAGE_THRESHOLD &&
      totalContent.length >= DEEP_SEARCH_CONFIG.MIN_CONTENT_LENGTH &&
      allSources.length >= DEEP_SEARCH_CONFIG.MIN_SOURCES
    ) {
      stopCriteriaMet = true;
    }

    // If no more searches and not confident enough, generate more
    if (!stopCriteriaMet && searchQueue.length === 0 && iteration < DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS - 1) {
      const additionalSearches = generateIterativeSearches(query, queryType, iteration, allGaps);
      searchQueue.push(...additionalSearches);
    }
  }

  return {
    content: totalContent,
    sources: allSources,
    searchCount,
    scrapeCount,
    credits: Math.min(credits, DEEP_SEARCH_CONFIG.MAX_CREDITS),
    confidence,
    coverage,
    iterations: iteration,
    gaps: allGaps,
    contradictions: allContradictions
  };
}

// ═══════════════════════════════════════════════════════════════
// SEARCH GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function generateComprehensiveSearches(query: string, queryType: QueryType): Array<{ query: string; purpose: string; priority: number }> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  switch (queryType) {
    case "supplier":
      return [
        { query: `${query} manufacturers suppliers ${currentYear}`, purpose: "Primary supplier discovery", priority: 1 },
        { query: `${query} wholesale factory MOQ minimum order quantity`, purpose: "MOQ and pricing research", priority: 1 },
        { query: `${query} GOTS OEKO-TEX GRS certified sustainable suppliers`, purpose: "Certified sustainable suppliers", priority: 1 },
        { query: `${query} suppliers manufacturers Europe Italy Portugal Turkey Spain`, purpose: "European suppliers", priority: 2 },
        { query: `${query} suppliers manufacturers China India Bangladesh Vietnam`, purpose: "Asian suppliers", priority: 2 },
        { query: `${query} suppliers USA Americas Mexico`, purpose: "Americas suppliers", priority: 2 },
        { query: `${query} B Corp certified ethical manufacturers`, purpose: "Ethical certifications", priority: 3 },
        { query: `${query} supplier directory trade fair exhibitors ${currentYear}`, purpose: "Trade directory listings", priority: 3 },
        { query: `${query} production capacity lead time delivery`, purpose: "Production capabilities", priority: 3 },
        { query: `${query} quality control certifications ISO 9001`, purpose: "Quality certifications", priority: 4 },
        { query: `${query} supplier reviews ratings reliable`, purpose: "Supplier reputation", priority: 4 },
        { query: `${query} small batch low MOQ samples prototype`, purpose: "Small batch options", priority: 4 },
        { query: `${query} supplier contact email wholesale inquiry`, purpose: "Contact information", priority: 5 },
        { query: `${query} Alibaba Maker's Row Kompass supplier list`, purpose: "B2B marketplace research", priority: 5 },
      ];
    case "trend":
      return [
        { query: `${query} fashion trends ${currentYear} ${nextYear}`, purpose: "Current trend overview", priority: 1 },
        { query: `${query} SS${nextYear % 100} Spring Summer ${nextYear} runway`, purpose: "Spring/Summer season", priority: 1 },
        { query: `${query} FW${nextYear % 100} Fall Winter ${nextYear} collections`, purpose: "Fall/Winter season", priority: 1 },
        { query: `${query} Paris Fashion Week runway ${currentYear}`, purpose: "Paris Fashion Week", priority: 2 },
        { query: `${query} Milan Fashion Week collections ${currentYear}`, purpose: "Milan Fashion Week", priority: 2 },
        { query: `${query} London Fashion Week emerging designers`, purpose: "London Fashion Week", priority: 2 },
        { query: `${query} New York Fashion Week NYFW trends`, purpose: "New York Fashion Week", priority: 2 },
        { query: `${query} Tokyo Seoul fashion week Asia trends`, purpose: "Asian Fashion Weeks", priority: 3 },
        { query: `${query} street style celebrities wearing ${currentYear}`, purpose: "Street style signals", priority: 3 },
        { query: `${query} Instagram TikTok viral fashion trend`, purpose: "Social media signals", priority: 3 },
        { query: `${query} brand adoption designer collections luxury`, purpose: "Luxury brand adoption", priority: 4 },
        { query: `${query} emerging trend forecast prediction ${nextYear}`, purpose: "Trend forecasting", priority: 4 },
        { query: `${query} WWD Vogue BoF coverage ${currentYear}`, purpose: "Trade publication analysis", priority: 4 },
        { query: `${query} consumer behavior shift shopping preferences`, purpose: "Consumer behavior", priority: 5 },
      ];
    case "market":
      return [
        { query: `${query} market size revenue ${currentYear} ${nextYear}`, purpose: "Market size analysis", priority: 1 },
        { query: `${query} market growth forecast CAGR projection`, purpose: "Growth projections", priority: 1 },
        { query: `${query} competitive landscape market share brands`, purpose: "Competitive analysis", priority: 1 },
        { query: `${query} market segmentation demographics consumer`, purpose: "Market segmentation", priority: 2 },
        { query: `${query} pricing strategy premium mass market`, purpose: "Pricing analysis", priority: 2 },
        { query: `${query} distribution channels retail e-commerce DTC`, purpose: "Distribution channels", priority: 2 },
        { query: `${query} industry report market research ${currentYear}`, purpose: "Industry reports", priority: 3 },
        { query: `${query} key players leading brands manufacturers`, purpose: "Key market players", priority: 3 },
        { query: `${query} market opportunities challenges barriers entry`, purpose: "Market opportunities", priority: 3 },
        { query: `${query} regional market Europe Asia Americas analysis`, purpose: "Regional analysis", priority: 4 },
        { query: `${query} emerging markets growth potential`, purpose: "Emerging markets", priority: 4 },
        { query: `${query} investment funding M&A acquisitions`, purpose: "Investment activity", priority: 5 },
      ];
    case "sustainability":
      return [
        { query: `${query} sustainable certifications GOTS OEKO-TEX GRS`, purpose: "Certification standards", priority: 1 },
        { query: `${query} eco-friendly recycled organic materials`, purpose: "Sustainable materials", priority: 1 },
        { query: `${query} carbon footprint emissions reduction target`, purpose: "Carbon impact", priority: 1 },
        { query: `${query} circular economy recycling upcycling closed loop`, purpose: "Circularity initiatives", priority: 2 },
        { query: `${query} supply chain transparency traceability blockchain`, purpose: "Supply chain transparency", priority: 2 },
        { query: `${query} sustainable brands ethical fashion ${currentYear}`, purpose: "Sustainable brands", priority: 2 },
        { query: `${query} regenerative agriculture natural fibers cotton`, purpose: "Regenerative practices", priority: 3 },
        { query: `${query} water usage reduction dyeing processes`, purpose: "Water impact", priority: 3 },
        { query: `${query} fair trade ethical labor practices living wage`, purpose: "Social sustainability", priority: 3 },
        { query: `${query} sustainability reporting ESG metrics disclosure`, purpose: "ESG reporting", priority: 4 },
        { query: `${query} greenwashing verification authentic sustainable`, purpose: "Greenwashing detection", priority: 4 },
        { query: `${query} biodegradable compostable end-of-life`, purpose: "End-of-life solutions", priority: 5 },
      ];
    default:
      return [
        { query: query, purpose: "Primary research", priority: 1 },
        { query: `${query} ${currentYear} latest news updates`, purpose: "Recent news", priority: 1 },
        { query: `${query} industry analysis insights report`, purpose: "Industry analysis", priority: 2 },
        { query: `${query} expert opinion trends forecast`, purpose: "Expert insights", priority: 2 },
        { query: `${query} case studies examples best practices`, purpose: "Case studies", priority: 3 },
        { query: `${query} comparison alternatives options`, purpose: "Comparisons", priority: 3 },
        { query: `${query} statistics data metrics ${currentYear}`, purpose: "Quantitative data", priority: 4 },
        { query: `${query} challenges problems solutions`, purpose: "Challenges and solutions", priority: 4 },
      ];
  }
}

function generateIterativeSearches(
  query: string, 
  queryType: QueryType, 
  iteration: number,
  gaps: string[]
): Array<{ query: string; purpose: string; priority: number }> {
  const searches: Array<{ query: string; purpose: string; priority: number }> = [];
  
  // Generate searches to fill identified gaps
  for (const gap of gaps.slice(0, 3)) {
    searches.push({
      query: `${query} ${gap}`,
      purpose: `Fill gap: ${gap}`,
      priority: 2
    });
  }
  
  // Iteration-specific strategies
  const strategies = [
    [
      { mod: "detailed analysis expert review", purpose: "Deep analysis" },
      { mod: "specific examples verified case studies", purpose: "Verified examples" },
    ],
    [
      { mod: `${new Date().getFullYear()} latest recent update`, purpose: "Most recent data" },
      { mod: "regional comparison by country", purpose: "Regional comparison" },
    ],
    [
      { mod: "statistics numbers data metrics", purpose: "Quantitative data" },
      { mod: "challenges risks opportunities", purpose: "Risk assessment" },
    ],
    [
      { mod: "future outlook prediction forecast", purpose: "Future outlook" },
      { mod: "expert interviews insights commentary", purpose: "Expert perspectives" },
    ],
  ];
  
  const strategyIndex = Math.min(iteration - 1, strategies.length - 1);
  const strategySet = strategies[strategyIndex];
  
  for (const s of strategySet) {
    searches.push({
      query: `${query} ${s.mod}`,
      purpose: s.purpose,
      priority: iteration + 2
    });
  }
  
  return searches;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.slice(0, 50);
  }
}

function createFallbackPlan(queryType: QueryType, query: string) {
  return {
    query_type: queryType,
    complexity: "high" as const,
    parallel_searches: generateComprehensiveSearches(query, queryType),
    follow_up_scrapes: [],
    required_data_points: [],
    validation_criteria: ["Source reliability", "Data currency", "Information accuracy", "Cross-source validation"],
    expected_output_format: queryType === "supplier" ? "table" : "report"
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
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

      let AI_API_KEY = CURRENT_MODEL_CONFIG.provider === "lovable" ? LOVABLE_API_KEY : GROK_API_KEY;

      if (!AI_API_KEY) {
        if (CURRENT_MODEL_CONFIG.provider === "grok" && LOVABLE_API_KEY) {
          CURRENT_MODEL_CONFIG = {
            provider: "lovable",
            endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
            model: "openai/gpt-5",
            temperature: 0.2,
          };
          AI_API_KEY = LOVABLE_API_KEY;
        } else if (CURRENT_MODEL_CONFIG.provider === "lovable" && GROK_API_KEY) {
          CURRENT_MODEL_CONFIG = {
            provider: "grok",
            endpoint: "https://api.x.ai/v1/chat/completions",
            model: "grok-4-latest",
            temperature: 0.2,
          };
          AI_API_KEY = GROK_API_KEY;
        } else {
          send({ phase: "failed", error: "AI service not configured" });
          close();
          return;
        }
      }

      if (!AI_API_KEY) {
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

      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: QUERY DECONSTRUCTION
      // ═══════════════════════════════════════════════════════════════
      send({ phase: "planning", message: "Deconstructing your research query...", queryType });

      let deconstruction: QueryDeconstruction | null = null;
      
      const deconstructResult = await callAI(
        AI_API_KEY,
        DECONSTRUCTOR_SYSTEM_PROMPT,
        `QUERY TO DECONSTRUCT: "${sanitizedQuery}"

Analyze this query deeply. What is the user really asking for? What data is essential vs nice-to-have? What would make this research COMPLETE?

Output JSON only.`,
        { jsonMode: true }
      );

      if (deconstructResult.success && deconstructResult.content) {
        try {
          deconstruction = JSON.parse(deconstructResult.content);
          console.log("Query deconstructed:", deconstruction?.intent?.primary_goal);
        } catch {
          console.log("Deconstruction parse failed, continuing without");
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: RESEARCH PLANNING
      // ═══════════════════════════════════════════════════════════════
      send({ phase: "planning", message: "Creating comprehensive research plan...", queryType });

      let plan = createFallbackPlan(queryType, sanitizedQuery);
      
      const planResult = await callAI(
        AI_API_KEY,
        PLANNER_SYSTEM_PROMPT,
        `Research Query: ${sanitizedQuery}

Query Deconstruction:
${deconstruction ? JSON.stringify(deconstruction, null, 2) : 'Not available'}

Create a comprehensive deep research plan that will gather ALL necessary data. Plan for 100+ sources.
Output JSON only.`,
        { jsonMode: true }
      );

      if (planResult.success && planResult.content) {
        try {
          const parsedPlan = JSON.parse(planResult.content);
          plan = { ...plan, ...parsedPlan };
        } catch {
          console.log("Using fallback plan");
        }
      }

      await supabase
        .from("research_tasks")
        .update({ plan, phase: "searching" })
        .eq("id", taskId);

      // ═══════════════════════════════════════════════════════════════
      // PHASES 3-5: DEEP RESEARCH EXECUTION
      // ═══════════════════════════════════════════════════════════════
      let researchResult: ResearchResult;

      if (PERPLEXITY_API_KEY && FIRECRAWL_API_KEY) {
        researchResult = await executeDeepResearch(
          sanitizedQuery,
          queryType,
          deconstruction,
          plan,
          { perplexity: PERPLEXITY_API_KEY, firecrawl: FIRECRAWL_API_KEY, ai: AI_API_KEY },
          send
        );
      } else {
        // Fallback to basic research
        send({ phase: "searching", message: "Searching for information...", searchCount: 0 });
        
        const searches = plan.parallel_searches || generateComprehensiveSearches(sanitizedQuery, queryType);
        let content = "";
        const sources: ResearchSource[] = [];
        let searchCount = 0;

        for (const search of searches.slice(0, 6)) {
          if (PERPLEXITY_API_KEY) {
            const result = await webSearchPerplexity(PERPLEXITY_API_KEY, search.query);
            if (result.success && result.content) {
              content += `\n\n### ${search.purpose}\n${result.content}`;
              result.citations?.forEach((url, idx) => {
                if (url && !sources.some(s => s.url === url)) {
                  sources.push({ 
                    url, 
                    title: extractDomain(url), 
                    snippet: "", 
                    type: "search", 
                    relevance: 1 - idx * 0.1,
                    timestamp: new Date().toISOString()
                  });
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
          credits: DEEP_SEARCH_CONFIG.BASE_COST + searchCount * DEEP_SEARCH_CONFIG.COST_PER_SEARCH,
          confidence: 0.6,
          coverage: 0.5,
          iterations: 1,
          gaps: [],
          contradictions: []
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

      // ═══════════════════════════════════════════════════════════════
      // PHASE 6: FINAL VALIDATION
      // ═══════════════════════════════════════════════════════════════
      send({ phase: "validating", message: "Final validation and quality check...", sourceCount: researchResult.sources.length });

      await supabase
        .from("research_tasks")
        .update({ execution_steps: [], sources: researchResult.sources, phase: "validating" })
        .eq("id", taskId);

      const validationNotes: string[] = [];
      
      if (researchResult.content.length < 1000) {
        validationNotes.push("Limited data retrieved - findings should be verified independently");
      }
      
      if (researchResult.gaps.length > 0) {
        validationNotes.push(`Identified gaps: ${researchResult.gaps.slice(0, 3).join(', ')}`);
      }
      
      if (researchResult.contradictions.length > 0) {
        validationNotes.push(`Noted contradictions: ${researchResult.contradictions.slice(0, 2).join('; ')}`);
      }

      // ═══════════════════════════════════════════════════════════════
      // PHASE 7: SYNTHESIS - MANUS AI LEVEL OUTPUT
      // ═══════════════════════════════════════════════════════════════
      send({ phase: "generating", message: "Synthesizing intelligence report..." });

      await supabase.from("research_tasks").update({ phase: "generating" }).eq("id", taskId);

      const sourceList = researchResult.sources
        .filter(s => s.relevance > 0.5)
        .map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`)
        .slice(0, 50)
        .join("\n");
      
      const generationPrompt = `Transform deep research findings into MANUS AI-LEVEL intelligence output.

═══════════════════════════════════════════════════════════════
USER QUERY: ${sanitizedQuery}
QUERY TYPE: ${queryType}
INTENT: ${deconstruction?.intent?.primary_goal || 'General research'}
SUCCESS CRITERIA: ${deconstruction?.intent?.success_criteria?.join(', ') || 'Comprehensive answer'}
═══════════════════════════════════════════════════════════════

RESEARCH FINDINGS (${researchResult.sources.length} sources, ${researchResult.iterations} iterations):
${researchResult.content.slice(0, 25000) || "Limited data available."}

SOURCES (${researchResult.sources.length} total from ${new Set(researchResult.sources.map(s => extractDomain(s.url))).size} domains):
${sourceList || "Limited sources."}

CONFIDENCE: ${Math.round(researchResult.confidence * 100)}%
COVERAGE: ${Math.round(researchResult.coverage * 100)}%

${researchResult.gaps.length > 0 ? `KNOWN GAPS: ${researchResult.gaps.join(', ')}` : ''}
${researchResult.contradictions.length > 0 ? `CONTRADICTIONS: ${researchResult.contradictions.join('; ')}` : ''}
${validationNotes.length > 0 ? `VALIDATION NOTES: ${validationNotes.join('; ')}` : ''}

═══════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS:
1. STRUCTURE adaptively based on content, not templates
2. Include REASONING and INTERPRETATION at every step
3. Use ONLY data from research findings - no hallucination
4. Make ACTIONABLE recommendations
5. Note any UNCERTAINTIES or GAPS explicitly
6. Format sources at END only: **Sources:** Name1 · Name2 · Name3
7. Tables OPTIONAL, must be clean and Excel-ready
8. This should feel like a senior analyst's intelligence briefing
═══════════════════════════════════════════════════════════════`;

      let finalContent = "";
      const synthesizerPrompt = getSynthesizerPromptWithDomain(activeDomain);
      
      const streamResult = await callAIStreaming(
        AI_API_KEY,
        synthesizerPrompt,
        generationPrompt,
        (chunk: string) => { send({ phase: "generating", content: chunk }); }
      );

      if (!streamResult.success || !streamResult.content) {
        const fallbackResult = await callAI(AI_API_KEY, synthesizerPrompt, generationPrompt);
        
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
        p_description: `Deep Research - ${queryType} (${researchResult.searchCount} searches, ${researchResult.scrapeCount} scrapes, ${researchResult.iterations} iterations)`
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
        scrapeCount: researchResult.scrapeCount,
        iterations: researchResult.iterations,
        confidence: Math.round(researchResult.confidence * 100),
        coverage: Math.round(researchResult.coverage * 100),
        gaps: researchResult.gaps,
        contradictions: researchResult.contradictions
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
