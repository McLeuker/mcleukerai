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

// Hugging Face Models Configuration
const HUGGINGFACE_MODELS = {
  mistral: {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    displayName: "Mistral-7B-Instruct-v0.3",
    description: "Structured research & supplier reports",
  },
  falcon: {
    id: "tiiuae/Falcon3-7B-Instruct",
    displayName: "Falcon3-7B-Instruct",
    description: "Trend analysis & market intelligence",
  },
  llama: {
    id: "meta-llama/Llama-2-7b-chat-hf",
    displayName: "Llama-2-7b-chat",
    description: "Conversational & follow-up tasks",
  },
} as const;

// Model selection keywords
const MODEL_KEYWORDS = {
  mistral: [
    "find", "list", "compare", "analyze", "map", "supplier", "pricing", 
    "certification", "sourcing", "manufacturer", "factory", "moq", 
    "research", "database", "report", "structured", "audit"
  ],
  falcon: [
    "trend", "forecast", "prediction", "insights", "overview", "emerging",
    "market intelligence", "competitive", "landscape", "growth", "projection"
  ],
  llama: [
    "explain", "help", "what is", "how to", "tell me", "describe",
    "clarify", "elaborate", "more about", "follow up"
  ],
} as const;

// Function to select the best model based on prompt
function selectModel(prompt: string): keyof typeof HUGGINGFACE_MODELS {
  const lowerPrompt = prompt.toLowerCase();
  
  // Count keyword matches for each model
  const scores = {
    mistral: 0,
    falcon: 0,
    llama: 0,
  };
  
  for (const keyword of MODEL_KEYWORDS.mistral) {
    if (lowerPrompt.includes(keyword)) scores.mistral++;
  }
  for (const keyword of MODEL_KEYWORDS.falcon) {
    if (lowerPrompt.includes(keyword)) scores.falcon++;
  }
  for (const keyword of MODEL_KEYWORDS.llama) {
    if (lowerPrompt.includes(keyword)) scores.llama++;
  }
  
  // Select model with highest score, default to mistral
  if (scores.falcon > scores.mistral && scores.falcon > scores.llama) {
    return "falcon";
  }
  if (scores.llama > scores.mistral && scores.llama >= scores.falcon) {
    return "llama";
  }
  return "mistral"; // Default for structured research
}

const FASHION_SYSTEM_PROMPT = `You are an expert fashion industry AI analyst, researcher, and operator. You work with fashion sourcing managers, marketers, brand teams, buyers, merchandisers, and consultants.

Your role is to:
1. Understand fashion industry tasks and requirements
2. Research suppliers, trends, markets, and industry data
3. Structure insights into actionable intelligence
4. Generate professional deliverables (reports, analyses, recommendations)

When responding, format your output professionally for the luxury fashion industry:
- Use clear headers and sections with markdown formatting
- Present data in tables where appropriate (supplier lists, comparisons, etc.)
- Use bullet points for key insights and recommendations
- Include summary sections for quick reference
- Be professional, concise, and data-driven
- Focus on actionable insights
- Reference industry standards and best practices

For Supplier Research queries:
- Structure results in a table format with columns: Supplier Name, Location, Specialization, MOQ, Certifications, Contact
- Include sustainability certifications when relevant (GOTS, OEKO-TEX, GRS, etc.)
- Provide sourcing recommendations

For Trend Analysis queries:
- Organize by trend category (colors, materials, silhouettes, etc.)
- Include seasonal relevance and market adoption rates
- Provide actionable recommendations for brand positioning

For Market Intelligence queries:
- Include competitive landscape analysis
- Provide market size and growth projections
- Highlight key opportunities and risks

For Sustainability Audit queries:
- Focus on certifications, compliance, and impact metrics
- Provide clear action items for improvement
- Reference industry standards (Higg Index, ZDHC, etc.)

You specialize in:
- Supplier research and sourcing strategies
- Market analysis and trend forecasting
- Sustainability and compliance assessments
- Cost analysis and negotiation strategies
- Brand positioning and competitive analysis
- Collection planning and merchandising`;

// Hugging Face API call with retry logic
async function callHuggingFace(
  apiKey: string,
  modelId: string,
  prompt: string,
  systemPrompt: string,
  retryCount = 0
): Promise<{ success: boolean; content?: string; error?: string }> {
  const maxRetries = 1;
  
  try {
    const response = await fetch(
      // HF deprecated api-inference.*; router.* is the supported endpoint
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${systemPrompt}\n\nTask: ${prompt}\n\nProvide a comprehensive, professional response with:\n- Summary of results\n- Key insights\n- Recommendations\n- Sources (if applicable) [/INST]`,
          parameters: {
            max_new_tokens: 1500,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HuggingFace API error (${modelId}):`, response.status, errorText);
      
      // Retry once on failure
      if (retryCount < maxRetries) {
        console.log(`Retrying ${modelId}... (attempt ${retryCount + 2})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return callHuggingFace(apiKey, modelId, prompt, systemPrompt, retryCount + 1);
      }
      
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    
    // Handle different response formats
    let content = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      content = data[0].generated_text;
    } else if (data.generated_text) {
      content = data.generated_text;
    } else if (typeof data === "string") {
      content = data;
    } else {
      console.error("Unexpected HuggingFace response format:", data);
      return { success: false, error: "Unexpected response format" };
    }

    // Clean up response (remove system prompt echoes if any)
    content = content.trim();
    
    return { success: true, content };
  } catch (error) {
    console.error(`HuggingFace call error (${modelId}):`, error);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying ${modelId}... (attempt ${retryCount + 2})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callHuggingFace(apiKey, modelId, prompt, systemPrompt, retryCount + 1);
    }
    
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function callLovableAI(
  apiKey: string,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; content?: string; error?: string; modelUsed?: string }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Lovable AI Gateway error:", response.status, t);
      if (response.status === 429) return { success: false, error: "AI rate limit exceeded. Please try again shortly." };
      if (response.status === 402) return { success: false, error: "AI credits exhausted. Please add credits to your workspace." };
      if (response.status === 401) return { success: false, error: "AI authentication failed." };
      return { success: false, error: "AI service temporarily unavailable." };
    }

    const data = await response.json();
    const content = (data?.choices?.[0]?.message?.content as string | undefined)?.trim();
    if (!content) return { success: false, error: "AI returned an empty response." };

    return { success: true, content, modelUsed: "Lovable AI (Gemini 3 Flash)" };
  } catch (e) {
    console.error("Lovable AI call error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// Try models with fallback
async function executeWithFallback(
  apiKey: string,
  primaryModel: keyof typeof HUGGINGFACE_MODELS,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; content?: string; modelUsed?: string; error?: string }> {
  const modelOrder: (keyof typeof HUGGINGFACE_MODELS)[] = 
    primaryModel === "mistral" ? ["mistral", "falcon", "llama"] :
    primaryModel === "falcon" ? ["falcon", "mistral", "llama"] :
    ["llama", "mistral", "falcon"];

  for (const modelKey of modelOrder) {
    const model = HUGGINGFACE_MODELS[modelKey];
    console.log(`Trying model: ${model.displayName}`);
    
    const result = await callHuggingFace(apiKey, model.id, prompt, systemPrompt);
    
    if (result.success && result.content) {
      return {
        success: true,
        content: result.content,
        modelUsed: model.displayName,
      };
    }
    
    console.log(`Model ${model.displayName} failed, trying next...`);
  }

  // Final fallback: Lovable AI Gateway
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_API_KEY) {
    console.log("All Hugging Face models failed; falling back to Lovable AI (Gemini 3 Flash)");
    const fallback = await callLovableAI(LOVABLE_API_KEY, prompt, systemPrompt);
    if (fallback.success && fallback.content) {
      return { success: true, content: fallback.content, modelUsed: fallback.modelUsed };
    }
    return { success: false, error: fallback.error || "All AI providers failed." };
  }

  return { success: false, error: "All AI models failed. Please try again later." };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { prompt, taskId, conversationId } = await req.json();
    
    // Support both legacy taskId and new conversationId modes
    const isLegacyMode = !!taskId;
    
    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      return new Response(JSON.stringify({ error: "Prompt cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (trimmedPrompt.length > 5000) {
      return new Response(JSON.stringify({ error: "Prompt too long (max 5000 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Validate taskId only in legacy mode
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (isLegacyMode) {
      if (!taskId || typeof taskId !== 'string' || !uuidRegex.test(taskId)) {
        return new Response(JSON.stringify({ error: "Invalid taskId format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Verify task ownership
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
        return new Response(JSON.stringify({ error: "Unauthorized access to task" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get Hugging Face API Key
    const HF_API_KEY = Deno.env.get("Huggingface_api_key");
    if (!HF_API_KEY) {
      console.error("Huggingface_api_key is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select model based on prompt
    const selectedModelKey = selectModel(trimmedPrompt);
    const selectedModel = HUGGINGFACE_MODELS[selectedModelKey];
    console.log(`Selected model: ${selectedModel.displayName} for prompt: "${trimmedPrompt.substring(0, 50)}..."`);

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

    // Update task to understanding status with selected model
    await supabase.from("tasks").update({
      status: "understanding",
      model_used: selectedModel.displayName,
      steps: [{ step: "understanding", status: "running", message: "Analyzing your request..." }]
    }).eq("id", taskId);

    // Execute AI with fallback
    const aiResult = await executeWithFallback(HF_API_KEY, selectedModelKey, trimmedPrompt, FASHION_SYSTEM_PROMPT);

    if (!aiResult.success) {
      // Don't deduct credits on failure
      await supabase.from("tasks").update({
        status: "failed",
        steps: [
          { step: "understanding", status: "completed", message: "Request analyzed" },
          { step: "researching", status: "failed", message: aiResult.error || "AI service failed" }
        ]
      }).eq("id", taskId);
      
      return new Response(JSON.stringify({ error: aiResult.error || "AI service failed. Please try again." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits only after successful AI execution
    const { data: deductResult, error: deductError } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: actualCreditCost,
      p_description: `${actionType.replace(/_/g, " ")} - ${aiResult.modelUsed}${actualCreditCost > creditCost ? ' (2x penalty)' : ''}`
    });

    if (deductError || !deductResult?.success) {
      const errorMsg = deductResult?.error || "Failed to deduct credits";
      if (errorMsg === "Insufficient credits") {
        await supabase.from("tasks").update({
          status: "failed",
          steps: [
            { step: "understanding", status: "completed", message: "Request analyzed" },
            { step: "researching", status: "failed", message: "Insufficient credits" }
          ]
        }).eq("id", taskId);
        
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
    await supabase.from("tasks").update({
      status: "completed",
      model_used: aiResult.modelUsed,
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk, modelUsed: aiResult.modelUsed })}\n\n`));
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
