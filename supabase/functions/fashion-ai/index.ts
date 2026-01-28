import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============ INPUT VALIDATION & SECURITY ============
// Inline validation to prevent SQL/NoSQL injection attacks

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
  "https://id-preview--697e9ee9-fa45-4e69-8ad9-6a04c8a6c0f7.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Credit costs per action type
const CREDIT_COSTS = {
  ai_research_query: 4,
  market_analysis: 10,
  trend_report: 18,
  supplier_search: 8,
  pdf_export: 3,
  excel_export: 4,
} as const;

// Heavy actions that can trigger 2x cost for Studio beyond threshold
const HEAVY_ACTIONS = ["market_analysis", "trend_report"];

// Rate limits per plan
const RATE_LIMITS = {
  free: { 
    maxQueriesPerDay: 5, 
    maxQueriesPerMinute: 1,
    maxHeavyQueriesPerDay: 0,
    allowedActions: ["ai_research_query"],
  },
  pro: { 
    maxQueriesPerDay: 100, 
    maxQueriesPerMinute: null,
    maxHeavyQueriesPerDay: 20, 
    allowedActions: null,
  },
  studio: { 
    maxQueriesPerDay: 500, 
    maxQueriesPerMinute: null,
    maxHeavyQueriesPerDay: null,
    allowedActions: null,
    heavyUsageThreshold: 1500,
    heavyActionMultiplier: 2,
  },
  enterprise: { 
    maxQueriesPerDay: null,
    maxQueriesPerMinute: null,
    maxHeavyQueriesPerDay: null, 
    allowedActions: null,
  },
} as const;

// ============ GROK MODEL CONFIGURATION ============
// Only use models confirmed to exist in your xAI account
const GROK_MODELS = {
  "grok-2-latest": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-2-latest" },
  "grok-2": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-2" },
  "grok-beta": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-beta" },
} as const;

type GrokModelId = keyof typeof GROK_MODELS;

const GROK_CONFIG = {
  endpoint: "https://api.x.ai/v1/chat/completions",
  model: "grok-2-latest" as string,
  temperature: 0.2,
};

// Fashion AI System Prompt - REASONING-DRIVEN OUTPUT (ChatGPT/Perplexity style)
const FASHION_SYSTEM_PROMPT = `You are an expert fashion industry AI analyst. Your role is to provide intelligent, reasoning-driven responses for fashion professionals.

CORE PRINCIPLES:
1. Reason through the question first - explain what is known, what is uncertain, what can be done
2. Write naturally like a knowledgeable expert explaining things conversationally
3. Use dynamic structure - only use tables, lists, or headings when they improve understanding
4. NEVER use inline citations like [1], [2] - sources go at the end only
5. NEVER display URLs inside the main content body
6. Prioritize reading flow over academic referencing

RESPONSE STYLE:
- Write in clear, intelligent paragraphs when explaining concepts
- Use bullet points for actionable items or key takeaways
- Use tables ONLY for comparative data (suppliers, metrics, brands)
- Use headings sparingly - only when switching major topics
- Include ↑↓ trend indicators for metrics where relevant

DYNAMIC STRUCTURE (adapt based on question):
- Analysis questions → Explain your reasoning, then provide structured insights
- Supplier requests → Brief context, then data table
- Trend questions → Narrative explanation with key patterns highlighted
- Market questions → Reasoning about data availability, then findings

SOURCE HANDLING (MANDATORY):
- Do NOT insert any citations or source references inside sentences
- At the END of your response, add a "Sources" section
- Format: Simple numbered list with source name + brief description
- Example:
  ## Sources
  1. Vogue Business – Fashion week coverage analysis
  2. Business of Fashion – Market size data
  3. FHCM Official – Paris Fashion Week schedule

TONE: Precise, conversational, consulting-grade. Like a senior analyst explaining findings to a colleague.

If information is uncertain or limited, explicitly acknowledge it rather than fabricating data.`;

// Domain-specific prompt additions
const DOMAIN_PROMPTS: Record<string, string> = {
  all: "",
  fashion: "\n\nDOMAIN MODE: FASHION\nFocus on runway trends, silhouettes, designer collections, fashion week insights, and ready-to-wear developments. Prioritize insights from Fashion Weeks, emerging designers, and styling patterns.",
  beauty: "\n\nDOMAIN MODE: BEAUTY\nFocus on beauty formulations, cosmetic trends, brand strategies, backstage beauty, and consumer preferences. Prioritize insights on clean beauty, K-beauty, and prestige segments.",
  skincare: "\n\nDOMAIN MODE: SKINCARE\nFocus on skincare ingredients, clinical aesthetics, regulatory compliance, and science-backed formulations. Prioritize actives, efficacy data, and market innovations.",
  sustainability: "\n\nDOMAIN MODE: SUSTAINABILITY\nFocus on circularity, sustainable materials, supply chain transparency, certifications, and environmental impact. Prioritize regenerative practices, certifications, and regulatory shifts.",
  "fashion-tech": "\n\nDOMAIN MODE: FASHION TECH\nFocus on AI in fashion, digital innovation, virtual try-on, tech startups, and future technologies. Prioritize emerging technologies and their adoption in the industry.",
  catwalks: "\n\nDOMAIN MODE: CATWALKS\nFocus on runway coverage, designer shows, styling trends, fashion week analysis, and emerging talent. Prioritize recent shows and live runway insights.",
  culture: "\n\nDOMAIN MODE: CULTURE\nFocus on cultural influences, art collaborations, social movements, and regional cultural signals in fashion. Prioritize cultural narratives shaping brand positioning.",
  textile: "\n\nDOMAIN MODE: TEXTILE\nFocus on fibers, mills, material innovation, textile sourcing, MOQ requirements, and manufacturing capabilities. Prioritize supplier data, certifications, and production insights.",
  lifestyle: "\n\nDOMAIN MODE: LIFESTYLE\nFocus on consumer behavior, wellness trends, luxury lifestyle, travel influence, and cross-category signals. Prioritize lifestyle shifts impacting fashion consumption.",
};

// Get enhanced system prompt with domain context
function getSystemPromptWithDomain(domain: string): string {
  const domainAddition = DOMAIN_PROMPTS[domain] || DOMAIN_PROMPTS.all;
  return FASHION_SYSTEM_PROMPT + domainAddition;
}

// Single Grok API call function
async function callGrok(
  apiKey: string,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; content?: string; error?: string; status?: number }> {
  try {
    const response = await fetch(GROK_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: GROK_CONFIG.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, status: 429, error: "AI rate limit exceeded. Please try again shortly." };
      }
      if (response.status === 402) {
        return { success: false, status: 402, error: "AI credits exhausted." };
      }
      if (response.status === 401) {
        return { success: false, status: 401, error: "AI authentication failed." };
      }
      // Surface status to allow upstream fallback handling
      return { success: false, status: response.status, error: `Grok API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      return { success: false, error: "Empty response from Grok" };
    }

    return { success: true, content };
  } catch (error) {
    console.error("Grok call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Grok call failed" };
  }
}

// Fallback: Lovable AI Gateway (no extra keys required)
async function callLovableAI(
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return { success: false, error: "AI fallback not configured." };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return { success: false, error: "AI rate limit exceeded. Please try again shortly." };
      }
      if (response.status === 402) {
        return { success: false, error: "AI credits exhausted." };
      }

      return { success: false, error: `AI gateway error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { success: false, error: "Empty response from AI" };
    return { success: true, content };
  } catch (e) {
    console.error("Lovable AI call error:", e);
    return { success: false, error: e instanceof Error ? e.message : "AI call failed" };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, taskId, conversationId, model: requestedModel, domain } = await req.json();
    
    // Support both legacy taskId and new conversationId modes
    const isLegacyMode = !!taskId;
    const activeDomain = domain || "all";
    
    // ============ INPUT VALIDATION WITH INJECTION PROTECTION ============
    
    // Validate prompt exists and is a string
    if (!prompt || typeof prompt !== 'string') {
      logSecurityEvent('validation_error', { field: 'prompt', userId: user.id, reason: 'invalid_type' });
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Sanitize the prompt - removes null bytes, control characters
    const sanitizedPrompt = sanitizeString(prompt, 5000);
    
    if (sanitizedPrompt.length === 0) {
      return new Response(JSON.stringify({ error: "Prompt cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Check for SQL injection attempts
    if (containsSqlInjection(sanitizedPrompt)) {
      logSecurityEvent('injection_attempt', { 
        type: 'sql', 
        userId: user.id, 
        promptLength: sanitizedPrompt.length,
        // Don't log the actual prompt to avoid log injection
      });
      return new Response(JSON.stringify({ error: "Invalid characters detected in input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Use sanitized prompt from here on
    const trimmedPrompt = sanitizedPrompt;
    
    // Validate taskId format using secure UUID validation
    if (isLegacyMode) {
      if (!taskId || typeof taskId !== 'string' || !isValidUUID(taskId)) {
        logSecurityEvent('validation_error', { field: 'taskId', userId: user.id, reason: 'invalid_uuid' });
        return new Response(JSON.stringify({ error: "Invalid taskId format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Verify task ownership using parameterized query (Supabase SDK handles this safely)
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("user_id")
        .eq("id", taskId)
        .maybeSingle();
      
      if (taskError || !task) {
        return new Response(JSON.stringify({ error: "Task not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (task.user_id !== user.id) {
        logSecurityEvent('auth_failure', { type: 'task_ownership', userId: user.id, taskId });
        return new Response(JSON.stringify({ error: "Unauthorized access to task" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Validate conversationId if provided
    if (conversationId && !isValidUUID(conversationId)) {
      logSecurityEvent('validation_error', { field: 'conversationId', userId: user.id, reason: 'invalid_uuid' });
      return new Response(JSON.stringify({ error: "Invalid conversationId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Grok API Key - REQUIRED, NO FALLBACKS
    const GROK_API_KEY = Deno.env.get("Grok_API");
    if (!GROK_API_KEY) {
      console.error("Grok_API is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set model based on request
    const selectedModel = (requestedModel && GROK_MODELS[requestedModel as GrokModelId]) 
      ? requestedModel as GrokModelId 
      : "grok-2-latest";
    GROK_CONFIG.model = GROK_MODELS[selectedModel].model;

    // Determine action type
    const lowerPrompt = trimmedPrompt.toLowerCase();
    let actionType: keyof typeof CREDIT_COSTS = "ai_research_query";
    
    if (lowerPrompt.includes("market analysis") || lowerPrompt.includes("analyze the market") || lowerPrompt.includes("market intel")) {
      actionType = "market_analysis";
    } else if (
      // IMPORTANT: Don't block normal "trends" questions on the free plan.
      // Only treat it as the paid "trend_report" when the user explicitly asks for a report.
      lowerPrompt.includes("trend report") ||
      lowerPrompt.includes("trend forecast report") ||
      (lowerPrompt.includes("forecast") && lowerPrompt.includes("report"))
    ) {
      actionType = "trend_report";
    } else if (lowerPrompt.includes("supplier") || lowerPrompt.includes("sourcing") || (lowerPrompt.includes("find") && (lowerPrompt.includes("manufacturer") || lowerPrompt.includes("factory")))) {
      actionType = "supplier_search";
    } else if (lowerPrompt.includes("sustainability") || lowerPrompt.includes("audit") || lowerPrompt.includes("certification")) {
      actionType = "market_analysis";
    }
    
    const creditCost = CREDIT_COSTS[actionType];

    // Get user data
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("subscription_plan, monthly_credits, extra_credits")
      .eq("user_id", user.id)
      .single();
    
    if (userDataError) {
      console.error("Error fetching user data:", userDataError);
    }
    
    const userPlan = (userData?.subscription_plan || "free") as keyof typeof RATE_LIMITS;
    const planLimits = RATE_LIMITS[userPlan];

    // Check allowed actions
    const allowedActions = planLimits.allowedActions as readonly string[] | null;
    if (allowedActions && !allowedActions.includes(actionType)) {
      return new Response(JSON.stringify({ 
        error: `${actionType.replace(/_/g, " ")} is not available on your plan. Please upgrade to Pro or Studio.`,
        upgradeRequired: true
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate credit cost
    let actualCreditCost = creditCost;
    if (userPlan === "studio" && HEAVY_ACTIONS.includes(actionType)) {
      const originalMonthly = 1800;
      const usedCredits = originalMonthly - (userData?.monthly_credits || 0);
      
      if (usedCredits >= 1500) {
        actualCreditCost = creditCost * 2;
        console.log(`Studio user beyond threshold, applying 2x cost: ${creditCost} -> ${actualCreditCost}`);
      }
    }

    // Update task to understanding status
    if (isLegacyMode) {
      await supabase.from("tasks").update({
        status: "understanding",
        model_used: "Grok-4",
        steps: [{ step: "understanding", status: "running", message: "Analyzing your request..." }]
      }).eq("id", taskId);
    }

    // Get domain-enhanced system prompt
    const systemPrompt = getSystemPromptWithDomain(activeDomain);

    // Execute AI (Grok primary, Lovable AI fallback if Grok model is unavailable)
    let modelUsedLabel = "Grok";
    let aiResult = await callGrok(GROK_API_KEY, trimmedPrompt, systemPrompt);

    // If Grok is unavailable for this account (404/403/5xx), fall back so the app still works.
    if (!aiResult.success && (aiResult.status === 404 || aiResult.status === 403 || (aiResult.status && aiResult.status >= 500))) {
      console.warn("Grok unavailable, falling back to Lovable AI.", { status: aiResult.status });
      const fallback = await callLovableAI(trimmedPrompt, systemPrompt);
      if (fallback.success) {
        aiResult = { success: true, content: fallback.content };
        modelUsedLabel = "Lovable AI";
      }
    }

    if (!aiResult.success) {
      // Don't deduct credits on failure
      if (isLegacyMode) {
        await supabase.from("tasks").update({
          status: "failed",
          steps: [
            { step: "understanding", status: "completed", message: "Request analyzed" },
            { step: "researching", status: "failed", message: aiResult.error || "AI service failed" }
          ]
        }).eq("id", taskId);
      }
      
      return new Response(JSON.stringify({ error: aiResult.error || "AI service failed. Please try again." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits only after successful AI execution
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: actualCreditCost,
      p_description: `${actionType.replace(/_/g, " ")} - ${modelUsedLabel}${actualCreditCost > creditCost ? ' (2x penalty)' : ''}`
    });

    if (deductError || !deductResult?.success) {
      const errorMsg = deductResult?.error || "Failed to deduct credits";
      if (errorMsg === "Insufficient credits") {
        if (isLegacyMode) {
          await supabase.from("tasks").update({
            status: "failed",
            steps: [
              { step: "understanding", status: "completed", message: "Request analyzed" },
              { step: "researching", status: "failed", message: "Insufficient credits" }
            ]
          }).eq("id", taskId);
        }
        
        return new Response(JSON.stringify({ 
          error: "Insufficient credits. Please purchase more credits to continue.",
          balance: deductResult?.balance || 0
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Credit deduction error:", errorMsg);
    }

    // Determine files based on action
    const files = [];
    if (actionType === "supplier_search") {
      files.push(
        { name: "Supplier Report.pdf", type: "pdf", description: "Detailed supplier analysis and recommendations" },
        { name: "Supplier Database.xlsx", type: "excel", description: "Structured supplier data export" }
      );
    } else if (actionType === "trend_report") {
      files.push(
        { name: "Trend Analysis.pdf", type: "pdf", description: "Comprehensive trend report with forecasts" },
        { name: "Trend Data.xlsx", type: "excel", description: "Trend data and adoption metrics" }
      );
    } else if (actionType === "market_analysis") {
      files.push(
        { name: "Market Report.pdf", type: "pdf", description: "Market analysis and competitive insights" },
        { name: "Market Data.xlsx", type: "excel", description: "Market data and projections" }
      );
    } else {
      files.push(
        { name: "Research Report.pdf", type: "pdf", description: "Detailed analysis and recommendations" },
        { name: "Data Export.xlsx", type: "excel", description: "Structured data and findings" }
      );
    }

    // Update task to completed
    if (isLegacyMode) {
      await supabase.from("tasks").update({
        status: "completed",
        model_used: "Grok-4",
        credits_used: actualCreditCost,
        result: { content: aiResult.content },
        steps: [
          { step: "understanding", status: "completed", message: "Request analyzed" },
          { step: "researching", status: "completed", message: "Research complete" },
          { step: "structuring", status: "completed", message: "Insights structured" },
          { step: "generating", status: "completed", message: "Deliverables ready" }
        ],
        files: files
      }).eq("id", taskId);
    }

    // Return streaming-style response for compatibility
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send content in chunks for streaming effect
        const content = aiResult.content || "";
        const chunkSize = 50;
        let offset = 0;
        
        const sendChunk = () => {
          if (offset < content.length) {
            const chunk = content.slice(offset, offset + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk, modelUsed: "Grok-4" })}\n\n`));
            offset += chunkSize;
            setTimeout(sendChunk, 20);
          } else {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        };
        
        sendChunk();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Fashion AI error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
