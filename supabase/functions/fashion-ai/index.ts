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
const GROK_MODELS = {
  "grok-4-latest": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-4-latest" },
  "grok-4-mini": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-4-mini" },
  "grok-4-fast": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-4-fast" },
} as const;

type GrokModelId = keyof typeof GROK_MODELS;

const GROK_CONFIG = {
  endpoint: "https://api.x.ai/v1/chat/completions",
  model: "grok-4-latest" as string,
  temperature: 0.2,
};

// Fashion AI System Prompt for Grok - STRUCTURED OUTPUT FORMAT
const FASHION_SYSTEM_PROMPT = `You are an expert fashion industry AI analyst. Your role is to provide structured, professional intelligence for fashion sourcing managers, brand teams, buyers, and consultants.

OUTPUT FORMAT REQUIREMENTS (MANDATORY):

## Executive Summary
- 3-5 key bullet points with trend indicators (↑ for positive/growth, ↓ for negative/decline)
- Decision-oriented, factual insights only

---

## [Analysis Section - Context-Appropriate Title]
Present data in markdown tables where appropriate:
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |

---

## Key Insights
- Bullet points with specific, actionable findings
- Include trend indicators where relevant

---

## Recommendations
- Concrete action items
- Strategic next steps

---

## Sources
If referencing specific data, list sources at the end.

QUERY-SPECIFIC FORMATS:

**Supplier Research** - Use table format:
| Supplier Name | Location | Specialization | MOQ | Certifications |
|---------------|----------|----------------|-----|----------------|

**Trend Analysis** - Organize by category:
- Colors, Materials, Silhouettes with seasonal relevance
- Include confidence levels and adoption rates

**Market Intelligence** - Include:
- Competitive landscape analysis
- Market size estimates
- Key opportunities and risks

**Sustainability Audit** - Focus on:
- Certifications (GOTS, OEKO-TEX, GRS, etc.)
- Compliance requirements
- Action items with timelines

CRITICAL RULES:
1. NEVER use "--" separators - use proper markdown "---"
2. ALWAYS structure with clear headers (##, ###)
3. Use tables for comparative data
4. Include ↑↓ trend indicators for metrics
5. Be concise but comprehensive
6. If uncertain, explicitly acknowledge limitations`;

// Single Grok API call function - NO FALLBACKS
async function callGrok(
  apiKey: string,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; content?: string; error?: string }> {
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
        return { success: false, error: "AI rate limit exceeded. Please try again shortly." };
      }
      if (response.status === 402) {
        return { success: false, error: "AI credits exhausted." };
      }
      if (response.status === 401) {
        return { success: false, error: "AI authentication failed." };
      }
      return { success: false, error: `Grok API error: ${response.status}` };
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

    const { prompt, taskId, conversationId, model: requestedModel } = await req.json();
    
    // Support both legacy taskId and new conversationId modes
    const isLegacyMode = !!taskId;
    
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
      : "grok-4-latest";
    GROK_CONFIG.model = GROK_MODELS[selectedModel].model;

    // Determine action type
    const lowerPrompt = trimmedPrompt.toLowerCase();
    let actionType: keyof typeof CREDIT_COSTS = "ai_research_query";
    
    if (lowerPrompt.includes("market analysis") || lowerPrompt.includes("analyze the market") || lowerPrompt.includes("market intel")) {
      actionType = "market_analysis";
    } else if (lowerPrompt.includes("trend") || lowerPrompt.includes("forecast")) {
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

    // Execute AI with Grok ONLY - NO FALLBACKS
    const aiResult = await callGrok(GROK_API_KEY, trimmedPrompt, FASHION_SYSTEM_PROMPT);

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
      p_description: `${actionType.replace(/_/g, " ")} - Grok-4${actualCreditCost > creditCost ? ' (2x penalty)' : ''}`
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
