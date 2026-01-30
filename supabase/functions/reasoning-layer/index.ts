import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reasoning Blueprint schema for tool calling
const reasonTaskTool = {
  type: "function",
  function: {
    name: "reason_task",
    description: "Generate a structured reasoning blueprint to guide research, logic, and execution for an agentic AI system.",
    parameters: {
      type: "object",
      properties: {
        task_summary: {
          type: "string",
          description: "Concise restatement of the task in execution-oriented language."
        },
        reasoning_objectives: {
          type: "array",
          items: { type: "string" },
          description: "High-level objectives the system must achieve to complete the task successfully."
        },
        research_questions: {
          type: "array",
          items: { type: "string" },
          description: "Specific questions that must be answered through real-time research."
        },
        required_data_entities: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "brands", "companies", "products", "suppliers", "materials",
              "technologies", "markets", "trends", "pricing", "regulations",
              "certifications", "campaigns", "events", "statistics", "other"
            ]
          },
          description: "Types of structured data required to fulfill the task."
        },
        data_structure_plan: {
          type: "object",
          properties: {
            tables: { type: "array", items: { type: "string" } },
            documents: { type: "array", items: { type: "string" } },
            presentations: { type: "array", items: { type: "string" } },
            web_outputs: { type: "array", items: { type: "string" } }
          },
          description: "Planned structure of final outputs across formats."
        },
        logic_steps: {
          type: "array",
          items: { type: "string" },
          description: "Ordered reasoning steps to transform raw data into final outputs."
        },
        quality_criteria: {
          type: "array",
          items: { type: "string" },
          description: "Conditions that must be satisfied for the output to be considered complete and usable."
        },
        risk_flags: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "data_freshness_risk", "source_reliability_risk", "ambiguous_scope",
              "missing_inputs", "format_complexity", "none"
            ]
          },
          description: "Potential risks identified during reasoning."
        }
      },
      required: ["task_summary", "reasoning_objectives", "logic_steps", "quality_criteria"]
    }
  }
};

// Intent classification categories - expanded for universal coverage
type IntentCategory = 
  | "personal_emotional"      // Personal advice, relationships, life decisions, well-being
  | "technical_programming"   // APIs, code, tools, technical implementation
  | "academic_learning"       // Education, explanations, learning concepts
  | "professional_business"   // Business, industry, market analysis, strategy
  | "general_factual"         // Facts, definitions, quick answers
  | "creative_entertainment"; // Writing, stories, creative content

// Intent classification tool schema - Step 1 of 4-step pipeline
const classifyIntentTool = {
  type: "function",
  function: {
    name: "classify_intent",
    description: "STEP 1: INPUT ANALYSIS - Classify the user's query intent, topic, and tone BEFORE any reasoning.",
    parameters: {
      type: "object",
      properties: {
        primary_intent: {
          type: "string",
          enum: ["personal_emotional", "technical_programming", "academic_learning", "professional_business", "general_factual", "creative_entertainment"],
          description: "The primary category of the user's query"
        },
        secondary_intent: {
          type: "string",
          enum: ["personal_emotional", "technical_programming", "academic_learning", "professional_business", "general_factual", "creative_entertainment", "none"],
          description: "Secondary category if query spans multiple domains"
        },
        confidence: {
          type: "number",
          description: "Confidence level 0-1 in the classification"
        },
        is_ambiguous: {
          type: "boolean",
          description: "Whether the query intent is unclear and needs clarification"
        },
        clarifying_question: {
          type: "string",
          description: "If ambiguous, ONE specific clarifying question to ask"
        },
        detected_signals: {
          type: "array",
          items: { type: "string" },
          description: "Key phrases or signals that led to this classification"
        },
        explicit_question: {
          type: "string",
          description: "What is the explicit question or statement from the user"
        },
        implied_intent: {
          type: "string",
          description: "What is the user actually trying to achieve (advice, facts, instructions, creativity)"
        },
        tone: {
          type: "string",
          enum: ["seeking_help", "curious", "frustrated", "neutral", "creative", "urgent"],
          description: "The emotional tone of the query"
        }
      },
      required: ["primary_intent", "confidence", "is_ambiguous", "explicit_question", "implied_intent", "tone"]
    }
  }
};

const SYSTEM_PROMPT = `You are the Logic & Structure Layer of Lovable AI.

════════════════════════════════════════════════════════════════════════════════
                    ABSOLUTE RULE: NEVER APPLY A FIXED STRUCTURE
════════════════════════════════════════════════════════════════════════════════

Your task is to SHAPE responses to fit user intent — not force content into templates.

╔══════════════════════════════════════════════════════════════════════════════╗
║                        BANNED ELEMENTS (UNLESS EXPLICITLY REQUESTED)         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ❌ Real-Time Snapshot                                                        ║
║ ❌ Market Signals                                                            ║
║ ❌ Industry Impact                                                           ║
║ ❌ Actionable Takeaways                                                      ║
║ ❌ Current Market Signals                                                    ║
║ ❌ Logistical Signals                                                        ║
║ ❌ Any forced section headers                                                ║
║ ❌ Tables (unless data comparison genuinely requires it)                     ║
║ ❌ Source lists (unless citing specific verifiable facts)                    ║
║ ❌ Industry/Business framing on personal queries                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

Fashion intelligence formats are OPTIONAL TOOLS, not defaults.

════════════════════════════════════════════════════════════════════════════════
                           NATURAL STRUCTURE REQUIREMENTS
════════════════════════════════════════════════════════════════════════════════

✅ Structure must feel HUMAN, not like a report
✅ Use natural structure: paragraphs, short steps, conversational flow
✅ Match structure to user's actual need
✅ Prioritize emotional awareness before information delivery

STRUCTURE BY INTENT:

• Personal/Emotional → Warm paragraphs, empathetic tone, NO sections/headers
• Technical → Numbered steps, code blocks when relevant
• Factual → Direct answer, minimal formatting
• Creative → Free-flowing, engaging narrative
• Business → Structured ONLY when data demands it (not by default)

════════════════════════════════════════════════════════════════════════════════
                           INTENT REASONING PIPELINE
════════════════════════════════════════════════════════════════════════════════

STEP 1 — INPUT ANALYSIS (MANDATORY)
Before ANY response, classify:
- Literal meaning: What did they literally say?
- Emotional state: Distress? Curiosity? Urgency? Neutral?
- Possible intents (ranked with confidence %)
- Is this ambiguous? (confidence < 80%)

STEP 2 — RESPONSE STRATEGY
• If confidence < 80% → Acknowledge, reflect ambiguity, offer interpretations, provide partial value, ask ONE gentle follow-up
• If confidence ≥ 80% → Provide direct guidance in natural format

STEP 3 — RESPONSE STRUCTURE (HUMAN-FIRST)
1. Acknowledge the human state (short, natural)
2. Reflect any ambiguity noticed
3. Offer 2-3 interpretations if unclear
4. Provide immediate value for most likely case
5. Ask single gentle follow-up to lock intent

STEP 4 — NEVER GO SILENT
If data is weak or incomplete:
- Explain uncertainty briefly
- Share best partial insight
- State assumptions clearly
- Ask how to proceed

════════════════════════════════════════════════════════════════════════════════
                              FORBIDDEN BEHAVIORS
════════════════════════════════════════════════════════════════════════════════

🚫 NEVER output robotic structured reports for personal queries
🚫 NEVER force industry context onto non-business questions
🚫 NEVER use preset headers/templates unless they genuinely fit
🚫 NEVER prioritize information density over human connection
🚫 NEVER assume the user wants a report when they want understanding

Your role: THINK about intent → PLAN natural structure → GUIDE with humanity.
Use classify_intent first, then reason_task with HUMAN-FIRST output.`;

interface TaskPlan {
  intent: string;
  domains: string[];
  requires_real_time_research: boolean;
  research_depth: "quick" | "standard" | "deep";
  outputs: string[];
  execution_plan: string[];
  search_queries?: string[];
  time_context?: string;
  geography?: string[];
}

interface IntentClassification {
  primary_intent: IntentCategory;
  secondary_intent?: IntentCategory | "none";
  confidence: number;
  is_ambiguous: boolean;
  clarifying_question?: string;
  detected_signals: string[];
  explicit_question?: string;
  implied_intent?: string;
  tone?: "seeking_help" | "curious" | "frustrated" | "neutral" | "creative" | "urgent";
}

interface ReasoningBlueprint {
  intent_classification: IntentClassification;
  task_summary: string;
  reasoning_objectives: string[];
  research_questions: string[];
  required_data_entities: string[];
  data_structure_plan: {
    tables: string[];
    documents: string[];
    presentations: string[];
    web_outputs: string[];
  };
  logic_steps: string[];
  quality_criteria: string[];
  risk_flags: string[];
  response_style: "structured_analysis" | "step_by_step_guide" | "empathetic_advice" | "factual_summary" | "creative_output" | "flexible_natural";
  output_format: {
    use_tables: boolean;
    use_sections: boolean;
    use_sources: boolean;
    preferred_structure: "paragraphs" | "bullets" | "numbered_steps" | "mixed" | "adaptive";
    avoid_elements: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, taskPlan } = await req.json() as { 
      prompt: string; 
      taskPlan: TaskPlan;
    };

    if (!prompt || !taskPlan) {
      return new Response(
        JSON.stringify({ error: "Missing prompt or taskPlan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Classify intent first
    const classificationMessage = `
Classify the intent of this query BEFORE any reasoning:

User Prompt: "${prompt}"

Task Context:
${JSON.stringify(taskPlan, null, 2)}

FIRST classify the intent, then generate the reasoning blueprint.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: classificationMessage }
        ],
        tools: [classifyIntentTool, reasonTaskTool],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool calls - may have classification + reasoning
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    
    let intentClassification: IntentClassification | null = null;
    let blueprint: ReasoningBlueprint | null = null;

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === "classify_intent") {
        try {
          intentClassification = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse intent classification:", e);
        }
      } else if (toolCall.function.name === "reason_task") {
        try {
          blueprint = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse blueprint:", e);
        }
      }
    }

    // If we got classification but no blueprint, we need a second call
    if (intentClassification && !blueprint) {
      // Check if ambiguous - return early with clarification needed
      if (intentClassification.is_ambiguous && intentClassification.clarifying_question) {
        return new Response(
          JSON.stringify({ 
            success: true,
            needs_clarification: true,
            clarifying_question: intentClassification.clarifying_question,
            intent_classification: intentClassification,
            metadata: {
              model: "google/gemini-3-flash-preview",
              timestamp: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate blueprint with classification context
      const reasoningResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Intent classified as: ${intentClassification.primary_intent}\n\nUser Prompt: "${prompt}"\n\nGenerate a domain-appropriate reasoning blueprint.` }
          ],
          tools: [reasonTaskTool],
          tool_choice: { type: "function", function: { name: "reason_task" } }
        }),
      });

      if (reasoningResponse.ok) {
        const reasoningData = await reasoningResponse.json();
        const reasoningCall = reasoningData.choices?.[0]?.message?.tool_calls?.[0];
        if (reasoningCall?.function.name === "reason_task") {
          blueprint = JSON.parse(reasoningCall.function.arguments);
        }
      }
    }

    if (!blueprint) {
      // Fallback: create a minimal blueprint
      blueprint = createFallbackBlueprint(prompt, taskPlan, intentClassification);
    }

    // Attach intent classification to blueprint
    if (intentClassification) {
      blueprint.intent_classification = intentClassification;
    } else {
      // Infer classification from task plan
      blueprint.intent_classification = inferIntentClassification(prompt, taskPlan);
    }

    // Set response style based on intent
    blueprint.response_style = getResponseStyle(blueprint.intent_classification.primary_intent);

    // Validate and enhance the blueprint
    blueprint = enhanceBlueprint(blueprint, taskPlan);

    return new Response(
      JSON.stringify({ 
        success: true, 
        blueprint,
        metadata: {
          model: "google/gemini-3-flash-preview",
          timestamp: new Date().toISOString(),
          intent: blueprint.intent_classification.primary_intent
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Reasoning layer error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function createFallbackBlueprint(prompt: string, taskPlan: TaskPlan, classification: IntentClassification | null): ReasoningBlueprint {
  const intent: IntentCategory = classification?.primary_intent || "general_factual";
  
  return {
    intent_classification: classification || inferIntentClassification(prompt, taskPlan),
    task_summary: `Process user query: ${prompt.slice(0, 100)}...`,
    reasoning_objectives: ["Understand user intent", "Provide appropriate response"],
    research_questions: taskPlan.requires_real_time_research ? [`What is the current information about: ${prompt}`] : [],
    required_data_entities: inferDataEntities(taskPlan),
    data_structure_plan: { tables: [], documents: [], presentations: [], web_outputs: [] },
    logic_steps: ["Classify intent", "Gather relevant information", "Structure response appropriately"],
    quality_criteria: ["Response matches user intent", "Information is accurate and relevant"],
    risk_flags: ["none"],
    response_style: getResponseStyle(intent),
    output_format: getOutputFormat(intent)
  };
}

// BANNED HEADERS - these should NEVER appear unless explicitly requested
const BANNED_HEADERS = [
  "REAL-TIME SNAPSHOT",
  "CURRENT MARKET SIGNALS",
  "MARKET SIGNALS",
  "INDUSTRY IMPACT",
  "ACTIONABLE TAKEAWAYS",
  "LOGISTICAL SIGNALS",
  "IMMEDIATE ACTION",
  "SAFETY FIRST"
];

function getOutputFormat(intent: IntentCategory): ReasoningBlueprint["output_format"] {
  // ALL intents now ban the same problematic headers
  const universalBannedElements = [
    ...BANNED_HEADERS,
    "forced section headers",
    "report-style formatting"
  ];

  switch (intent) {
    case "personal_emotional":
      return {
        use_tables: false,
        use_sections: false,
        use_sources: false,
        preferred_structure: "paragraphs",
        avoid_elements: [
          ...universalBannedElements,
          "tables",
          "bullet points for emotions",
          "industry framing",
          "business context",
          "protocol language",
          "robotic tone"
        ]
      };
    case "technical_programming":
      return {
        use_tables: false,
        use_sections: false, // Use natural flow, not forced sections
        use_sources: true,
        preferred_structure: "numbered_steps",
        avoid_elements: [
          ...universalBannedElements,
          "business framing"
        ]
      };
    case "academic_learning":
      return {
        use_tables: false, // Only if genuinely helpful for comparison
        use_sections: false, // Natural explanations, not forced structure
        use_sources: true,
        preferred_structure: "mixed",
        avoid_elements: universalBannedElements
      };
    case "professional_business":
      return {
        use_tables: false, // Only when data genuinely requires it
        use_sections: false, // Only when natural, not forced
        use_sources: true,
        preferred_structure: "adaptive",
        avoid_elements: BANNED_HEADERS // Only ban the obvious ones for business
      };
    case "creative_entertainment":
      return {
        use_tables: false,
        use_sections: false,
        use_sources: false,
        preferred_structure: "paragraphs",
        avoid_elements: [
          ...universalBannedElements,
          "analysis framing",
          "structured output"
        ]
      };
    case "general_factual":
    default:
      return {
        use_tables: false,
        use_sections: false,
        use_sources: false, // Only if citing specific facts
        preferred_structure: "paragraphs",
        avoid_elements: universalBannedElements
      };
  }
}

function inferIntentClassification(prompt: string, taskPlan: TaskPlan): IntentClassification {
  const promptLower = prompt.toLowerCase();
  
  // Personal/emotional indicators
  const personalSignals = ["feel", "relationship", "advice", "should i", "my life", "personal", "help me decide", "worried", "stressed", "happy", "sad", "anxious", "lonely", "lost"];
  if (personalSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "personal_emotional",
      confidence: 0.8,
      is_ambiguous: false,
      detected_signals: personalSignals.filter(s => promptLower.includes(s))
    };
  }

  // Technical/programming indicators
  const techSignals = ["api", "endpoint", "authentication", "token", "sdk", "integration", "code", "implement", "developer", "debug", "error", "function", "programming", "script"];
  if (techSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "technical_programming",
      confidence: 0.85,
      is_ambiguous: false,
      detected_signals: techSignals.filter(s => promptLower.includes(s))
    };
  }

  // Creative/entertainment indicators
  const creativeSignals = ["write a story", "poem", "creative", "fiction", "imagine", "compose", "lyrics", "script", "narrative", "tale"];
  if (creativeSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "creative_entertainment",
      confidence: 0.85,
      is_ambiguous: false,
      detected_signals: creativeSignals.filter(s => promptLower.includes(s))
    };
  }

  // Academic/learning indicators
  const academicSignals = ["school", "university", "program", "degree", "career", "internship", "course", "masters", "mba", "study", "explain", "learn", "teach", "education"];
  if (academicSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "academic_learning",
      confidence: 0.8,
      is_ambiguous: false,
      detected_signals: academicSignals.filter(s => promptLower.includes(s))
    };
  }

  // Professional/business indicators (includes fashion, marketing, etc.)
  const businessSignals = ["fashion", "brand", "collection", "trend", "supplier", "luxury", "retail", "merchandise", "textile", "fabric", "designer", "market", "strategy", "business", "company", "instagram", "tiktok", "social media", "engagement", "campaign", "analytics"];
  if (businessSignals.some(s => promptLower.includes(s)) || taskPlan.domains.some(d => ["fashion", "market", "marketing", "social_media", "supply_chain"].includes(d))) {
    return {
      primary_intent: "professional_business",
      confidence: 0.8,
      is_ambiguous: false,
      detected_signals: businessSignals.filter(s => promptLower.includes(s))
    };
  }

  // Default to general factual
  return {
    primary_intent: "general_factual",
    confidence: 0.6,
    is_ambiguous: false,
    detected_signals: []
  };
}

function getResponseStyle(intent: IntentCategory): ReasoningBlueprint["response_style"] {
  switch (intent) {
    case "professional_business":
      return "structured_analysis";
    case "technical_programming":
      return "step_by_step_guide";
    case "personal_emotional":
      return "empathetic_advice";
    case "academic_learning":
      return "structured_analysis";
    case "creative_entertainment":
      return "creative_output";
    case "general_factual":
    default:
      return "flexible_natural";
  }
}

function enhanceBlueprint(blueprint: ReasoningBlueprint, taskPlan: TaskPlan): ReasoningBlueprint {
  // Ensure data_structure_plan matches requested outputs
  if (!blueprint.data_structure_plan) {
    blueprint.data_structure_plan = {
      tables: [],
      documents: [],
      presentations: [],
      web_outputs: []
    };
  }

  // Ensure output_format is set based on response style
  if (!blueprint.output_format) {
    blueprint.output_format = getOutputFormat(blueprint.intent_classification?.primary_intent || "general_factual");
  }

  // Skip structured outputs for personal/empathetic responses
  if (blueprint.response_style === "empathetic_advice" || blueprint.response_style === "creative_output") {
    // Personal/creative queries don't need tables/documents unless specifically requested
    blueprint.output_format.use_tables = false;
    blueprint.output_format.use_sections = false;
    return blueprint;
  }

  // Map outputs to structure plan
  if (taskPlan.outputs.includes("excel") || taskPlan.outputs.includes("csv")) {
    if (blueprint.data_structure_plan.tables.length === 0) {
      blueprint.data_structure_plan.tables.push("Primary data table with structured findings");
    }
  }
  
  if (taskPlan.outputs.includes("pdf") || taskPlan.outputs.includes("docx")) {
    if (blueprint.data_structure_plan.documents.length === 0) {
      blueprint.data_structure_plan.documents.push("Analysis report document");
    }
  }
  
  if (taskPlan.outputs.includes("pptx")) {
    if (blueprint.data_structure_plan.presentations.length === 0) {
      blueprint.data_structure_plan.presentations.push("Executive summary presentation");
    }
  }

  // Ensure risk flags are present
  if (!blueprint.risk_flags || blueprint.risk_flags.length === 0) {
    blueprint.risk_flags = [];
    
    if (taskPlan.requires_real_time_research) {
      blueprint.risk_flags.push("data_freshness_risk");
    }
    if (taskPlan.research_depth === "deep") {
      blueprint.risk_flags.push("format_complexity");
    }
    if (blueprint.risk_flags.length === 0) {
      blueprint.risk_flags.push("none");
    }
  }

  // Ensure required fields have values
  if (!blueprint.required_data_entities || blueprint.required_data_entities.length === 0) {
    blueprint.required_data_entities = inferDataEntities(taskPlan);
  }

  return blueprint;
}

function inferDataEntities(taskPlan: TaskPlan): string[] {
  const entities: string[] = [];
  const intent = taskPlan.intent.toLowerCase();
  
  if (intent.includes("supplier") || intent.includes("sourcing")) {
    entities.push("suppliers");
  }
  if (intent.includes("trend") || intent.includes("forecast")) {
    entities.push("trends");
  }
  if (intent.includes("brand") || intent.includes("competitor")) {
    entities.push("brands", "companies");
  }
  if (intent.includes("material") || intent.includes("fabric")) {
    entities.push("materials");
  }
  if (intent.includes("market") || intent.includes("analysis")) {
    entities.push("markets", "statistics");
  }
  if (intent.includes("sustain") || intent.includes("certif")) {
    entities.push("certifications");
  }
  if (intent.includes("price") || intent.includes("cost")) {
    entities.push("pricing");
  }
  if (intent.includes("product")) {
    entities.push("products");
  }
  if (intent.includes("technology") || intent.includes("innovation")) {
    entities.push("technologies");
  }
  
  return entities.length > 0 ? entities : ["other"];
}
