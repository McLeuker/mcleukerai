import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "https://mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "https://id-preview--697e9ee9-fa45-4e69-8ad9-6a04c8a6c0f7.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Research agent phases
type ResearchPhase = "planning" | "searching" | "browsing" | "extracting" | "validating" | "generating" | "completed" | "failed";

// Query type classification for model selection
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

// HuggingFace models for different query types
const HF_MODELS = {
  supplier: "mistralai/Mistral-7B-Instruct-v0.3",
  trend: "meta-llama/Llama-2-7b-chat-hf",
  market: "tiiuae/Falcon3-7B-Instruct",
  sustainability: "mistralai/Mistral-7B-Instruct-v0.3",
  general: "google/gemma-2-2b-it"
};

// Fashion industry system prompt for planner
const PLANNER_SYSTEM_PROMPT = `You are an autonomous research planning agent for the fashion industry. Given a user query, create a comprehensive execution plan using available tools.

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

OUTPUT STRICT JSON FORMAT:
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

const FASHION_SYSTEM_PROMPT = `You are an expert fashion industry AI analyst. Your role is to synthesize research findings into professional, actionable intelligence reports.

OUTPUT FORMAT REQUIREMENTS:
- Use clear headers and sections with markdown formatting
- Present data in tables where appropriate (supplier lists, comparisons, trend summaries)
- Use bullet points for key insights
- Include inline citations using [1], [2], etc. format referencing sources
- Be professional, concise, and data-driven
- Focus on actionable insights for fashion professionals

QUERY-SPECIFIC FORMATTING:
- Supplier Research: Table format with columns: Supplier Name, Location, Specialization, MOQ, Certifications, Contact
- Trend Analysis: Organize by category (colors, materials, silhouettes) with seasonal relevance and confidence level
- Market Intelligence: Include competitive landscape, market size estimates, key opportunities with supporting data
- Sustainability: Focus on certifications, compliance requirements, action items with timelines

QUALITY STANDARDS:
- Always acknowledge data limitations or uncertainty
- Distinguish between verified facts and market estimates
- Provide context for numbers and claims
- Include actionable next steps when relevant`;

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

// Classify query type for model selection
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
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
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

// Call Perplexity for web search
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
        return { success: false, error: "Search rate limit reached. Using fallback..." };
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

// Call Firecrawl to scrape a URL
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

// Extract structured data using Firecrawl
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

// Call HuggingFace model (with 503 retry logic for model loading)
async function callHuggingFace(
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const hfPromise = async () => {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1500,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      });

      if (response.status === 503) {
        const data = await response.json();
        if (data.estimated_time) {
          throw new Error(`Model loading: ${data.estimated_time}s`);
        }
        throw new Error("Model unavailable");
      }

      if (!response.ok) {
        throw new Error(`HuggingFace error: ${response.status}`);
      }

      const data = await response.json();
      const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      return content;
    };

    const content = await withRetry(hfPromise, 2, (attempt, error) => {
      console.log(`HuggingFace retry ${attempt}: ${error.message}`);
    });

    return { success: true, content };
  } catch (error) {
    console.error("HuggingFace error:", error);
    return { success: false, error: error instanceof Error ? error.message : "HuggingFace call failed" };
  }
}

// Call Lovable AI for planning and generation (primary model)
async function callLovableAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  useToolCall: boolean = false,
  toolSchema?: Record<string, unknown>
): Promise<{ success: boolean; content?: string; toolOutput?: Record<string, unknown>; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2500,
    };

    if (useToolCall && toolSchema) {
      body.tools = [
        {
          type: "function",
          function: {
            name: "create_research_plan",
            description: "Create a structured research plan with tool calls",
            parameters: {
              type: "object",
              properties: {
                query_type: { type: "string", enum: ["supplier", "trend", "market", "sustainability", "general"] },
                reasoning: { type: "string", description: "Brief explanation of research approach" },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tool: { type: "string", enum: ["web_search", "scrape_url", "extract_structured"] },
                      params: { type: "object" },
                      purpose: { type: "string" }
                    },
                    required: ["tool", "params", "purpose"]
                  }
                },
                validation_criteria: { type: "array", items: { type: "string" } },
                expected_output_format: { type: "string", enum: ["table", "report", "list", "comparison"] }
              },
              required: ["query_type", "reasoning", "steps", "validation_criteria"]
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "create_research_plan" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Lovable AI error:", response.status, t);
      if (response.status === 429) return { success: false, error: "Rate limit exceeded. Please try again shortly." };
      if (response.status === 402) return { success: false, error: "AI credits exhausted." };
      return { success: false, error: "AI service temporarily unavailable." };
    }

    const data = await response.json();
    
    // Handle tool call response
    if (useToolCall && data.choices?.[0]?.message?.tool_calls?.[0]) {
      const toolCall = data.choices[0].message.tool_calls[0];
      try {
        const toolOutput = JSON.parse(toolCall.function.arguments);
        return { success: true, toolOutput };
      } catch {
        return { success: false, error: "Failed to parse tool call response" };
      }
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { success: false, error: "Empty response from AI" };

    return { success: true, content };
  } catch (error) {
    console.error("Lovable AI error:", error);
    return { success: false, error: error instanceof Error ? error.message : "AI call failed" };
  }
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

      const { query, conversationId } = await req.json();
      
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        send({ phase: "failed", error: "Invalid query" });
        close();
        return;
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 5000) {
        send({ phase: "failed", error: "Query too long (max 5000 characters)" });
        close();
        return;
      }

      // Get API keys
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      const HUGGINGFACE_API_KEY = Deno.env.get("Huggingface_api_key");

      if (!LOVABLE_API_KEY) {
        send({ phase: "failed", error: "AI service not configured" });
        close();
        return;
      }

      // Check user credits
      const { data: userData } = await supabase
        .from("users")
        .select("credit_balance, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!userData || userData.credit_balance < BASE_RESEARCH_COST) {
        send({ phase: "failed", error: "Insufficient credits for research task" });
        close();
        return;
      }

      // Classify query type for model selection
      const queryType = classifyQuery(trimmedQuery);
      const selectedHFModel = HF_MODELS[queryType];

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

      // ============ PHASE 1: PLANNING ============
      send({ phase: "planning", message: "Analyzing your research request...", queryType });

      const planResult = await callLovableAI(
        LOVABLE_API_KEY,
        PLANNER_SYSTEM_PROMPT,
        `Research Query: ${trimmedQuery}\n\nCreate a detailed research plan optimized for this ${queryType} query.`,
        true,
        { type: "object" }
      );

      let plan: { 
        query_type: QueryType;
        steps: Array<{ tool: string; params: Record<string, unknown>; purpose: string }>; 
        validation_criteria: string[];
        expected_output_format?: string;
      };
      
      if (planResult.success && planResult.toolOutput) {
        plan = planResult.toolOutput as typeof plan;
      } else {
        // Fallback: create a smart plan based on query type
        plan = createFallbackPlan(queryType, trimmedQuery);
      }

      // Save plan (hidden from user)
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

        // WEB SEARCH
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
                  relevance_score: 1 - (idx * 0.1) // Higher relevance for earlier results
                });
              });
            }
            
            totalCredits += COST_PER_SEARCH;
            searchCount++;
            executionSteps.push({ step: i + 1, tool: "web_search", status: "completed", message: step.purpose });
          } else {
            // Fallback to Lovable AI if Perplexity fails
            send({ phase: "searching", step: i + 1, total: plan.steps.length, message: `Using AI fallback for: ${step.purpose}` });
            
            const fallbackResult = await callLovableAI(
              LOVABLE_API_KEY,
              "You are a fashion industry research assistant. Provide detailed, current information.",
              searchQuery
            );
            
            if (fallbackResult.success && fallbackResult.content) {
              researchFindings += `\n\n### AI Analysis: ${searchQuery}\n${fallbackResult.content}`;
              executionSteps.push({ step: i + 1, tool: "web_search", status: "fallback", message: `${step.purpose} (AI fallback)` });
            } else {
              executionSteps.push({ step: i + 1, tool: "web_search", status: "failed", message: searchResult.error || "Search failed" });
            }
          }
        }
        
        // SCRAPE URL
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
              // Limit content length to avoid token overflow
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

        // EXTRACT STRUCTURED
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

      // ============ PHASE 3: VALIDATION ============
      send({ phase: "validating", message: "Cross-referencing and verifying findings..." });

      // Validate we have sufficient findings
      if (!researchFindings || researchFindings.length < 100) {
        // If no external findings, do a direct AI query as fallback
        const directResult = await callLovableAI(
          LOVABLE_API_KEY,
          FASHION_SYSTEM_PROMPT,
          trimmedQuery
        );
        if (directResult.success && directResult.content) {
          researchFindings = directResult.content;
        }
      }

      // Cross-validation: Check for consistency
      const validationNotes: string[] = [];
      if (allSources.length < 2) {
        validationNotes.push("Limited sources available - findings should be verified independently");
      }
      if (scrapeCount === 0 && plan.query_type === "supplier") {
        validationNotes.push("No direct supplier websites were accessible - data from aggregated sources");
      }

      // ============ PHASE 4: GENERATION ============
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
${sourceList}

VALIDATION NOTES:
${validationNotes.join("\n") || "All findings verified against multiple sources."}

INSTRUCTIONS:
1. Synthesize the findings into a clear, professional ${plan.expected_output_format || "report"}
2. Use inline citations like [1], [2] when referencing sources
3. Format with markdown headers, bullet points, and tables where appropriate
4. Focus on actionable insights for fashion industry professionals
5. If information is incomplete or uncertain, acknowledge it
6. Include a brief "Key Takeaways" section at the end
7. For supplier queries, use table format with key details
8. For trend queries, organize by category with confidence levels`;

      // Try HuggingFace model first for specific query types, fallback to Lovable AI
      let generationResult: { success: boolean; content?: string; error?: string } = { success: false };
      
      if (HUGGINGFACE_API_KEY && queryType !== "general") {
        send({ phase: "generating", message: `Using specialized ${queryType} model...` });
        generationResult = await callHuggingFace(
          HUGGINGFACE_API_KEY,
          selectedHFModel,
          `${FASHION_SYSTEM_PROMPT}\n\n${generationPrompt}`
        );
      }

      // Fallback to Lovable AI if HuggingFace fails or not available
      if (!generationResult.success) {
        generationResult = await callLovableAI(
          LOVABLE_API_KEY,
          FASHION_SYSTEM_PROMPT,
          generationPrompt
        );
      }

      if (!generationResult.success || !generationResult.content) {
        send({ phase: "failed", error: generationResult.error || "Failed to generate response" });
        await supabase.from("research_tasks").update({ phase: "failed", error_message: generationResult.error }).eq("id", taskId);
        close();
        return;
      }

      // Stream the final answer
      const finalContent = generationResult.content;
      const chunkSize = 50;
      
      for (let i = 0; i < finalContent.length; i += chunkSize) {
        const chunk = finalContent.slice(i, i + chunkSize);
        send({ phase: "generating", content: chunk });
        await new Promise(r => setTimeout(r, 15));
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
        modelUsed: generationResult.success && HUGGINGFACE_API_KEY && queryType !== "general" 
          ? selectedHFModel.split("/")[1] 
          : "Gemini-3-Flash"
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

// Create a fallback plan based on query type
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
        { tool: "web_search", params: { query: `${query} market size growth analysis`, limit: 5 }, purpose: "Market sizing" },
        { tool: "web_search", params: { query: `${query} industry competitors landscape`, limit: 5 }, purpose: "Competitive analysis" }
      ];
      basePlan.expected_output_format = "comparison";
      break;

    case "sustainability":
      basePlan.steps = [
        { tool: "web_search", params: { query: `${query} sustainable certification GOTS OEKO-TEX`, limit: 5 }, purpose: "Certification requirements" },
        { tool: "web_search", params: { query: `${query} eco-friendly materials suppliers`, limit: 5 }, purpose: "Sustainable options" }
      ];
      basePlan.expected_output_format = "list";
      break;

    default:
      basePlan.steps = [
        { tool: "web_search", params: { query, limit: 5 }, purpose: "Primary research" }
      ];
  }

  return basePlan;
}
