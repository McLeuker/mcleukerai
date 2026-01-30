import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  classifyIntent, 
  buildDynamicSystemPrompt, 
  generateClarificationResponse,
  needsClarification,
  sanitizeOutput,
  type IntentClassification 
} from "../_shared/intent-classifier.ts";

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

// Credit costs per action type - CREDITS ARE THE ONLY GATE
// All users have equal access to all features as long as they have credits
const CREDIT_COSTS = {
  ai_research_query: 4,
  market_analysis: 10,
  trend_report: 18,
  supplier_search: 8,
  pdf_export: 3,
  excel_export: 4,
  clarification_response: 1, // Low cost for clarification
} as const;

// ============ GROK MODEL CONFIGURATION ============
const GROK_MODELS = {
  "grok-4-latest": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-4-latest" },
  "grok-4": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-4" },
  "grok-3-latest": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-3-latest" },
  "grok-3": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-3" },
  "grok-2-latest": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-2-latest" },
  "grok-2": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-2" },
  "grok-beta": { endpoint: "https://api.x.ai/v1/chat/completions", model: "grok-beta" },
} as const;

type GrokModelId = keyof typeof GROK_MODELS;

// Default to grok-4-latest (the model your API key has access to)
const DEFAULT_MODEL: GrokModelId = "grok-4-latest";

const GROK_CONFIG = {
  endpoint: "https://api.x.ai/v1/chat/completions",
  model: "grok-4-latest" as string,
  temperature: 0.2,
};

// Domain-specific prompt additions (only used when domain is explicitly detected)
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

// Get domain addition if user-selected domain is professional/fashion
function getDomainAddition(domain: string, classification: IntentClassification): string {
  // Only add domain-specific prompts for professional/business/fashion intents
  if (classification.primary_intent === "professional_business" || 
      classification.primary_intent === "fashion_industry") {
    return DOMAIN_PROMPTS[domain] || DOMAIN_PROMPTS.all;
  }
  return "";
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
      });
      return new Response(JSON.stringify({ error: "Invalid characters detected in input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
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
      
      // Verify task ownership using parameterized query
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

    // Get Grok API Key - REQUIRED
    const GROK_API_KEY = Deno.env.get("Grok_API");
    if (!GROK_API_KEY) {
      console.error("Grok_API is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set model based on request - default to grok-4-latest
    const selectedModel = (requestedModel && GROK_MODELS[requestedModel as GrokModelId]) 
      ? requestedModel as GrokModelId 
      : DEFAULT_MODEL;
    GROK_CONFIG.model = GROK_MODELS[selectedModel].model;
    
    console.log("[Model Selection] Using model:", GROK_CONFIG.model);

    // ═══════════════════════════════════════════════════════════════
    // LAYER 0: INTENT CLASSIFICATION (Grok Direct)
    // ═══════════════════════════════════════════════════════════════
    
    console.log("[Layer 0] Starting intent classification for:", trimmedPrompt.slice(0, 100));
    
    // Pass the selected model to the classifier so it uses the same model
    const classification = await classifyIntent(trimmedPrompt, GROK_API_KEY, GROK_CONFIG.model);
    
    console.log("[Layer 0] Classification result:", {
      intent: classification.primary_intent,
      domain: classification.detected_domain,
      confidence: classification.confidence,
      is_ambiguous: classification.is_ambiguous,
      strategy: classification.response_strategy,
      emotional_state: classification.emotional_state
    });

    // ═══════════════════════════════════════════════════════════════
    // AMBIGUITY PATH: Generate clarification response
    // ═══════════════════════════════════════════════════════════════
    
    if (needsClarification(classification)) {
      console.log("[Layer 0] Ambiguous query detected, generating clarification response");
      
      // Update task status if in legacy mode
      if (isLegacyMode) {
        await supabase.from("tasks").update({
          status: "understanding",
          model_used: "Grok-4",
          steps: [{ step: "understanding", status: "running", message: "Analyzing your request..." }]
        }).eq("id", taskId);
      }
      
      // Generate human-first clarification using the same model
      const clarificationContent = await generateClarificationResponse(
        classification, 
        trimmedPrompt, 
        GROK_API_KEY,
        GROK_CONFIG.model
      );
      
      // Deduct minimal credits for clarification
      const clarificationCost = CREDIT_COSTS.clarification_response;
      await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: clarificationCost,
        p_description: `clarification - ${classification.primary_intent}`
      });
      
      // Update task to completed
      if (isLegacyMode) {
        await supabase.from("tasks").update({
          status: "completed",
          model_used: "Grok-4",
          credits_used: clarificationCost,
          result: { content: clarificationContent },
          steps: [
            { step: "understanding", status: "completed", message: "Analyzing your request" },
            { step: "clarifying", status: "completed", message: "Clarification provided" }
          ]
        }).eq("id", taskId);
      }
      
      // Stream clarification response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const content = clarificationContent;
          const chunkSize = 50;
          let offset = 0;
          
          const sendChunk = () => {
            if (offset < content.length) {
              const chunk = content.slice(offset, offset + chunkSize);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                content: chunk, 
                modelUsed: "Grok-4",
                creditsUsed: clarificationCost,
                classification: {
                  intent: classification.primary_intent,
                  confidence: classification.confidence,
                  is_ambiguous: classification.is_ambiguous
                }
              })}\n\n`));
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
    }

    // ═══════════════════════════════════════════════════════════════
    // DIRECT PATH: Clear intent, proceed with dynamic system prompt
    // ═══════════════════════════════════════════════════════════════

    // Determine action type based on classification and prompt
    const lowerPrompt = trimmedPrompt.toLowerCase();
    let actionType: keyof typeof CREDIT_COSTS = "ai_research_query";
    
    if (classification.primary_intent === "professional_business" || 
        classification.primary_intent === "fashion_industry") {
      if (lowerPrompt.includes("market analysis") || lowerPrompt.includes("analyze the market")) {
        actionType = "market_analysis";
      } else if (lowerPrompt.includes("trend report") || lowerPrompt.includes("trend forecast report")) {
        actionType = "trend_report";
      } else if (lowerPrompt.includes("supplier") || lowerPrompt.includes("sourcing")) {
        actionType = "supplier_search";
      }
    }
    
    const creditCost = CREDIT_COSTS[actionType];

    // Update task to understanding status
    if (isLegacyMode) {
      await supabase.from("tasks").update({
        status: "understanding",
        model_used: "Grok-4",
        steps: [{ step: "understanding", status: "running", message: "Analyzing your request..." }]
      }).eq("id", taskId);
    }

    // Build dynamic system prompt based on classification
    let systemPrompt = buildDynamicSystemPrompt(classification);
    
    // Add domain-specific additions only for professional/business queries
    systemPrompt += getDomainAddition(activeDomain, classification);

    // Execute AI (Grok primary, Lovable AI fallback if Grok unavailable)
    let modelUsedLabel = "Grok-4";
    let aiResult = await callGrok(GROK_API_KEY, trimmedPrompt, systemPrompt);

    // Fallback to Lovable AI if Grok unavailable
    if (!aiResult.success && (aiResult.status === 404 || aiResult.status === 403 || (aiResult.status && aiResult.status >= 500))) {
      console.warn("Grok unavailable, falling back to Lovable AI.", { status: aiResult.status });
      const fallback = await callLovableAI(trimmedPrompt, systemPrompt);
      if (fallback.success) {
        aiResult = { success: true, content: fallback.content };
        modelUsedLabel = "Lovable AI";
      }
    }

    if (!aiResult.success) {
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

    // Sanitize output to remove any template headers that leaked through
    const sanitizedContent = sanitizeOutput(aiResult.content || "", classification);

    // Deduct credits only after successful AI execution
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: creditCost,
      p_description: `${actionType.replace(/_/g, " ")} - ${modelUsedLabel}`
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
          error: "You're out of credits for this request. Add credits to continue searching and researching.",
          balance: deductResult?.balance || 0,
          creditRequired: creditCost
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
    } else if (classification.primary_intent === "professional_business" || 
               classification.primary_intent === "fashion_industry") {
      files.push(
        { name: "Research Report.pdf", type: "pdf", description: "Detailed analysis and recommendations" },
        { name: "Data Export.xlsx", type: "excel", description: "Structured data and findings" }
      );
    }

    // Update task to completed
    if (isLegacyMode) {
      await supabase.from("tasks").update({
        status: "completed",
        model_used: modelUsedLabel,
        credits_used: creditCost,
        result: { content: sanitizedContent },
        steps: [
          { step: "understanding", status: "completed", message: "Request analyzed" },
          { step: "researching", status: "completed", message: "Research complete" },
          { step: "structuring", status: "completed", message: "Insights structured" },
          { step: "generating", status: "completed", message: "Deliverables ready" }
        ],
        files: files.length > 0 ? files : undefined
      }).eq("id", taskId);
    }

    // Return streaming-style response for compatibility
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const content = sanitizedContent;
        const chunkSize = 50;
        let offset = 0;
        
        const sendChunk = () => {
          if (offset < content.length) {
            const chunk = content.slice(offset, offset + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              content: chunk, 
              modelUsed: modelUsedLabel,
              creditsUsed: creditCost,
              classification: {
                intent: classification.primary_intent,
                domain: classification.detected_domain,
                confidence: classification.confidence
              }
            })}\n\n`));
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
