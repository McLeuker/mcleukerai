/**
 * Universal Intent Classification Module
 * Layer 0: Runs BEFORE any main AI processing
 * Uses Grok directly for universal domain reasoning
 */

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export type UniversalIntent = 
  | "personal_emotional"    // Life decisions, relationships, well-being, distress
  | "practical_problem"     // Travel issues, logistics, documents, safety
  | "technical_programming" // APIs, code, tools, implementation
  | "academic_learning"     // Education, concepts, explanations
  | "professional_business" // Industry, market, strategy, B2B
  | "creative_entertainment" // Writing, art, stories, games
  | "general_factual"       // Facts, definitions, quick answers
  | "health_wellness"       // Medical, fitness, mental health
  | "financial"             // Money, investments, budgeting
  | "legal"                 // Laws, regulations, contracts
  | "fashion_industry"      // Fashion-specific professional queries
  | "custom_domain";        // Any domain not listed above

export type EmotionalState = 
  | "distress" 
  | "curiosity" 
  | "frustration" 
  | "neutral" 
  | "excitement" 
  | "urgency"
  | "confusion"
  | "hope";

export type ResponseStrategy = 
  | "clarify_with_empathy"  // For emotional/ambiguous personal queries
  | "clarify_factual"       // For ambiguous but neutral queries
  | "direct_answer"         // For clear factual questions
  | "step_by_step"          // For technical/how-to queries
  | "structured_analysis"   // For business/research queries
  | "creative_flow";        // For creative/entertainment requests

export interface PossibleInterpretation {
  intent: string;
  domain: string;
  confidence: number;
  signals: string[];
}

export interface IntentClassification {
  // Core classification
  primary_intent: UniversalIntent;
  detected_domain: string;  // Open-ended, not enum-limited
  confidence: number;       // 0-1
  is_ambiguous: boolean;
  
  // Emotional analysis
  emotional_state: EmotionalState;
  
  // Multi-interpretation support
  possible_interpretations: PossibleInterpretation[];
  
  // Response guidance
  response_strategy: ResponseStrategy;
  suggested_flow: string;
  
  // Detection metadata
  detected_signals: string[];
  explicit_question: string;
  implied_need: string;
  tone: string;
}

// ═══════════════════════════════════════════════════════════════
// GROK CLASSIFICATION SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const CLASSIFIER_SYSTEM_PROMPT = `You are a Universal Intent Classifier. Your job is to deeply analyze user queries and understand:

1. WHAT they literally said
2. WHAT they actually mean
3. HOW they feel (emotional state)
4. WHAT they expect as a response

═══════════════════════════════════════════════════════════════
CLASSIFICATION RULES (NON-NEGOTIABLE):
═══════════════════════════════════════════════════════════════

NEVER assume a default domain. Analyze the actual words.
NEVER force business/industry framing on personal queries.
ALWAYS consider emotional subtext.
ALWAYS rank multiple interpretations with confidence scores.
ALWAYS detect the TRUE intent, not what a chatbot "expects."

═══════════════════════════════════════════════════════════════
DOMAIN DETECTION (OPEN-ENDED):
═══════════════════════════════════════════════════════════════

Detect the actual domain from the query. Examples:
- "my life got lost" → personal_emotional, life_crisis
- "lost my passport" → practical_problem, travel_documents
- "integrate Stripe API" → technical_programming, payment_integration
- "sustainable suppliers in Italy" → professional_business, supply_chain
- "write a poem about stars" → creative_entertainment, poetry
- "what is quantum entanglement" → academic_learning, physics
- "SS26 runway trends Milan" → fashion_industry, runway_analysis
- "how to style oversized blazers" → fashion_industry, styling_advice
- "find recycled textile mills" → fashion_industry, sustainable_sourcing

You are NOT limited to predefined categories. Detect the ACTUAL domain.

═══════════════════════════════════════════════════════════════
EMOTIONAL STATE DETECTION:
═══════════════════════════════════════════════════════════════

distress → User sounds overwhelmed, lost, panicked, or in crisis
curiosity → User is exploring, learning, or genuinely interested
frustration → User is annoyed, stuck, or experiencing repeated problems
neutral → User is matter-of-fact, no emotional charge
excitement → User is enthusiastic, eager, or positively anticipating
urgency → User needs immediate help, time-sensitive situation
confusion → User is unsure, unclear, or needs clarification
hope → User is seeking solutions with cautious optimism

═══════════════════════════════════════════════════════════════
CONFIDENCE SCORING:
═══════════════════════════════════════════════════════════════

High (≥0.8): Single clear interpretation, specific domain signals, unambiguous wording
Medium (0.6-0.79): Likely interpretation but could go another way
Low (<0.6): Multiple valid interpretations, needs clarification

IF confidence < 0.8, you MUST provide multiple possible_interpretations.

═══════════════════════════════════════════════════════════════
RESPONSE STRATEGY SELECTION:
═══════════════════════════════════════════════════════════════

clarify_with_empathy → For emotional/ambiguous personal queries
  - User sounds distressed, confused, or emotionally charged
  - Query could mean multiple things
  - Jumping to "answers" might miss the real need

clarify_factual → For ambiguous but neutral queries
  - Query is unclear but no emotional charge
  - Need more specifics before providing useful info

direct_answer → For clear factual questions
  - Single interpretation, clear domain
  - User wants information, not conversation

step_by_step → For technical/how-to queries
  - User needs implementation guidance
  - Practical steps will help most

structured_analysis → For business/research queries
  - User needs comprehensive professional intelligence
  - Data, comparisons, or market analysis expected

creative_flow → For creative/entertainment requests
  - User wants creative output
  - Structure should serve the creative goal

═══════════════════════════════════════════════════════════════
SUGGESTED FLOW TEMPLATES:
═══════════════════════════════════════════════════════════════

For clarify_with_empathy:
"acknowledge → reflect → offer interpretations → partial value → gentle follow-up"

For clarify_factual:
"clarify need → present options → ask one specific question"

For direct_answer:
"answer directly → add relevant context → offer to go deeper"

For step_by_step:
"numbered steps → code/examples if relevant → troubleshooting notes"

For structured_analysis:
"key findings → supporting data → implications → next actions"

For creative_flow:
"creative output → variations if helpful → invitation to refine"

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY):
═══════════════════════════════════════════════════════════════

{
  "primary_intent": "one of the UniversalIntent types",
  "detected_domain": "specific domain detected (open-ended string)",
  "confidence": 0.0-1.0,
  "is_ambiguous": true | false,
  "emotional_state": "one of the EmotionalState types",
  "possible_interpretations": [
    {
      "intent": "what the user might mean",
      "domain": "relevant domain",
      "confidence": 0.0-1.0,
      "signals": ["words/phrases that suggest this interpretation"]
    }
  ],
  "response_strategy": "one of the ResponseStrategy types",
  "suggested_flow": "recommended response flow",
  "detected_signals": ["key words/phrases that informed classification"],
  "explicit_question": "what the user literally asked",
  "implied_need": "what the user actually needs",
  "tone": "description of the user's tone"
}

Output JSON only. No markdown, no explanation, no preamble.`;

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION FUNCTION (GROK DIRECT)
// ═══════════════════════════════════════════════════════════════

const GROK_CLASSIFIER_ENDPOINT = "https://api.x.ai/v1/chat/completions";
const CLASSIFIER_MODEL = "grok-2-latest";

export async function classifyIntent(
  prompt: string,
  grokApiKey: string
): Promise<IntentClassification> {
  try {
    const response = await fetch(GROK_CLASSIFIER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${grokApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
          { role: "user", content: `Classify this query: "${prompt}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Low temperature for consistent classification
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok classification error:", response.status, errorText);
      // Return a default classification on error
      return getDefaultClassification(prompt);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty classification response from Grok");
      return getDefaultClassification(prompt);
    }

    const classification = JSON.parse(content) as IntentClassification;
    
    // Validate and normalize the classification
    return normalizeClassification(classification, prompt);
  } catch (error) {
    console.error("Classification error:", error);
    return getDefaultClassification(prompt);
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getDefaultClassification(prompt: string): IntentClassification {
  // Fallback when classification fails - defaults to requiring clarification
  return {
    primary_intent: "general_factual",
    detected_domain: "unknown",
    confidence: 0.5,
    is_ambiguous: true,
    emotional_state: "neutral",
    possible_interpretations: [
      {
        intent: "general inquiry",
        domain: "unknown",
        confidence: 0.5,
        signals: []
      }
    ],
    response_strategy: "clarify_factual",
    suggested_flow: "clarify need → present options → ask one specific question",
    detected_signals: [],
    explicit_question: prompt,
    implied_need: "unclear - needs clarification",
    tone: "neutral"
  };
}

function normalizeClassification(
  classification: IntentClassification, 
  originalPrompt: string
): IntentClassification {
  // Ensure all required fields exist with valid values
  return {
    primary_intent: classification.primary_intent || "general_factual",
    detected_domain: classification.detected_domain || "unknown",
    confidence: typeof classification.confidence === "number" 
      ? Math.max(0, Math.min(1, classification.confidence)) 
      : 0.5,
    is_ambiguous: classification.is_ambiguous ?? (classification.confidence < 0.8),
    emotional_state: classification.emotional_state || "neutral",
    possible_interpretations: Array.isArray(classification.possible_interpretations) 
      ? classification.possible_interpretations 
      : [],
    response_strategy: classification.response_strategy || "direct_answer",
    suggested_flow: classification.suggested_flow || "answer directly",
    detected_signals: Array.isArray(classification.detected_signals) 
      ? classification.detected_signals 
      : [],
    explicit_question: classification.explicit_question || originalPrompt,
    implied_need: classification.implied_need || originalPrompt,
    tone: classification.tone || "neutral"
  };
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

export function buildDynamicSystemPrompt(classification: IntentClassification): string {
  const { primary_intent, detected_domain, emotional_state, response_strategy } = classification;
  
  // Base universal prompt
  let prompt = `You are a helpful AI assistant. Respond naturally based on the user's actual needs.

DETECTED INTENT: ${primary_intent}
DETECTED DOMAIN: ${detected_domain}
EMOTIONAL STATE: ${emotional_state}
RESPONSE STRATEGY: ${response_strategy}

═══════════════════════════════════════════════════════════════
STRUCTURE RULES:
═══════════════════════════════════════════════════════════════
`;

  // Add intent-specific instructions
  switch (primary_intent) {
    case "personal_emotional":
      prompt += `
• Use warm, empathetic paragraphs
• NO headers, NO templates, NO industry framing
• Acknowledge feelings first
• Offer practical support second
• Keep it conversational and human
• NEVER use bullet points for emotions
• NEVER sound robotic or formulaic`;
      break;
      
    case "practical_problem":
      prompt += `
• Provide clear, actionable steps
• Use natural language, not "protocol" speak
• Be helpful without being robotic
• Short numbered list is fine if it helps
• Focus on solving the immediate problem
• Offer to go deeper if needed`;
      break;
      
    case "technical_programming":
      prompt += `
• Use numbered steps with code examples
• Be precise and practical
• Include error handling guidance
• Link to official documentation when relevant
• Anticipate common follow-up questions`;
      break;
      
    case "professional_business":
    case "fashion_industry":
      prompt += `
• Structure analysis by topic, not by template
• Use data and specifics
• Make recommendations actionable
• Tables only if they genuinely help comprehension
• Focus on what the user can DO with this information`;
      break;
      
    case "academic_learning":
      prompt += `
• Explain concepts clearly with examples
• Build from fundamentals to advanced
• Use analogies when helpful
• Offer to go deeper on any topic`;
      break;
      
    case "creative_entertainment":
      prompt += `
• Let creativity flow naturally
• Match the user's creative energy
• Offer variations if helpful
• Keep it playful and engaging`;
      break;
      
    case "health_wellness":
      prompt += `
• Be supportive and non-judgmental
• Include appropriate disclaimers
• Focus on general wellness, not medical diagnosis
• Recommend professional help when appropriate`;
      break;
      
    case "financial":
      prompt += `
• Be clear about risks and uncertainties
• Include appropriate disclaimers
• Focus on education, not specific advice
• Recommend professional help for complex situations`;
      break;
      
    case "legal":
      prompt += `
• Include clear disclaimers
• Focus on general information, not legal advice
• Recommend consulting a legal professional
• Be precise with terminology`;
      break;
      
    default:
      prompt += `
• Respond naturally to the user's need
• Match the complexity of your response to the question
• Be helpful without being verbose
• Offer to go deeper if relevant`;
  }
  
  // Add emotional state adjustments
  if (emotional_state === "distress") {
    prompt += `

EMOTIONAL ADJUSTMENT:
The user appears distressed. Be extra gentle and supportive. Acknowledge their situation before offering solutions.`;
  } else if (emotional_state === "frustration") {
    prompt += `

EMOTIONAL ADJUSTMENT:
The user appears frustrated. Be efficient and solution-focused. Don't add unnecessary pleasantries.`;
  } else if (emotional_state === "urgency") {
    prompt += `

EMOTIONAL ADJUSTMENT:
The user needs help urgently. Lead with the most important action. Be concise.`;
  }
  
  // Always add banned elements
  prompt += `

═══════════════════════════════════════════════════════════════
BANNED (NEVER USE UNLESS USER EXPLICITLY REQUESTS):
═══════════════════════════════════════════════════════════════
❌ REAL-TIME SNAPSHOT
❌ MARKET SIGNALS  
❌ INDUSTRY IMPACT
❌ ACTIONABLE TAKEAWAYS
❌ KEY TRENDS
❌ STRATEGIC IMPLICATIONS
❌ Any forced template sections
❌ Inline citations like [1], [2]

If the user did not ask for a market report, DO NOT output a market report.
Structure follows intent. Intent never follows structure.`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════════
// CLARIFICATION RESPONSE GENERATOR
// ═══════════════════════════════════════════════════════════════

const CLARIFICATION_SYSTEM_PROMPT = `You are a compassionate, thoughtful assistant generating a human-first clarifying response.

RULES:
• Warm and supportive for emotional queries
• Helpful and clear for practical queries  
• NEVER robotic or formulaic
• NEVER use bullet points for emotions
• Keep it conversational
• Use natural paragraphs, not rigid structures

Output the response directly, no JSON, no markdown formatting instructions.`;

export async function generateClarificationResponse(
  classification: IntentClassification,
  originalPrompt: string,
  grokApiKey: string
): Promise<string> {
  const interpretationsText = classification.possible_interpretations
    .map(i => `- ${i.intent} (${Math.round(i.confidence * 100)}% likely): ${i.signals.join(', ')}`)
    .join('\n');

  const clarifyPrompt = `Generate a human-first clarifying response for this situation:

USER QUERY: "${originalPrompt}"
EMOTIONAL STATE: ${classification.emotional_state}
POSSIBLE INTERPRETATIONS:
${interpretationsText}

═══════════════════════════════════════════════════════════════
RESPONSE STRUCTURE (FOLLOW THE SPIRIT, NOT THE FORMAT):
═══════════════════════════════════════════════════════════════

1. ACKNOWLEDGE: One sentence acknowledging the human state (empathetic for distress, helpful for confusion)

2. REFLECT AMBIGUITY: Show you noticed the query could mean different things (without being mechanical about it)

3. OFFER 2-3 INTERPRETATIONS: Based on the possible interpretations above, present them as options:
   - If emotional: frame options gently, with care
   - If factual: frame options clearly and efficiently

4. PROVIDE IMMEDIATE VALUE: Give partial help for the most likely interpretation (don't leave them empty-handed)

5. GENTLE FOLLOW-UP: Ask ONE question to lock in their actual need

═══════════════════════════════════════════════════════════════
TONE GUIDANCE:
═══════════════════════════════════════════════════════════════

${classification.emotional_state === 'distress' 
  ? 'This person sounds like they might be struggling. Be extra warm. Say something like "I want to pause here..." or "That sounds heavy..." before jumping to options.' 
  : classification.emotional_state === 'urgency' 
  ? 'This person needs help fast. Be efficient but still human. Get to the point quickly.' 
  : 'Be naturally helpful, like a friend who happens to know a lot about things.'}

Write the response now. Make it feel like a real person wrote it, not an AI following a template.`;

  try {
    const response = await fetch(GROK_CLASSIFIER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${grokApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: CLARIFICATION_SYSTEM_PROMPT },
          { role: "user", content: clarifyPrompt }
        ],
        temperature: 0.7, // Slightly higher for more natural responses
      }),
    });

    if (!response.ok) {
      console.error("Clarification generation error:", response.status);
      return generateFallbackClarification(classification, originalPrompt);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    return content || generateFallbackClarification(classification, originalPrompt);
  } catch (error) {
    console.error("Clarification generation error:", error);
    return generateFallbackClarification(classification, originalPrompt);
  }
}

function generateFallbackClarification(
  classification: IntentClassification, 
  originalPrompt: string
): string {
  const interpretations = classification.possible_interpretations
    .slice(0, 3)
    .map(i => i.intent)
    .join(", or ");
  
  if (classification.emotional_state === "distress") {
    return `I want to pause here, because your message sounds like it carries some weight.

When you say "${originalPrompt.slice(0, 50)}...", do you mean ${interpretations}?

Whatever's going on, I'm here to help. What feels most urgent right now?`;
  }
  
  return `I want to make sure I understand what you need.

Are you looking for ${interpretations}?

Let me know which direction would be most helpful, and I'll focus there.`;
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════

const BANNED_HEADERS = [
  "REAL-TIME SNAPSHOT",
  "REAL TIME SNAPSHOT",
  "CURRENT MARKET SIGNALS",
  "MARKET SIGNALS",
  "INDUSTRY IMPACT",
  "ACTIONABLE TAKEAWAYS",
  "KEY TRENDS",
  "STRATEGIC IMPLICATIONS",
  "EXECUTIVE SUMMARY",
  "QUICK SEARCH OUTPUT STRUCTURE",
];

export function sanitizeOutput(content: string, classification: IntentClassification): string {
  let sanitized = content;
  
  // Only sanitize if the intent doesn't warrant formal structure
  if (classification.primary_intent !== "professional_business" && 
      classification.primary_intent !== "fashion_industry") {
    
    // Remove banned headers
    for (const header of BANNED_HEADERS) {
      // Match variations: with **, with #, or standalone
      const patterns = [
        new RegExp(`\\*\\*${header}\\*\\*\\s*\\n?`, 'gi'),
        new RegExp(`#{1,3}\\s*${header}\\s*\\n?`, 'gi'),
        new RegExp(`^${header}\\s*\\n`, 'gim'),
      ];
      for (const pattern of patterns) {
        sanitized = sanitized.replace(pattern, '');
      }
    }
    
    // Remove excessive bullet formatting that looks template-y
    // (but keep normal bullet lists)
    sanitized = sanitized.replace(/^[●○■□▪▫►◆◇→]\s*/gm, '• ');
  }
  
  // Always remove inline citations like [1], [2] unless user asked for them
  sanitized = sanitized.replace(/\[\d+\]/g, '');
  
  // Clean up multiple blank lines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  return sanitized.trim();
}

// ═══════════════════════════════════════════════════════════════
// SHOULD SKIP RESEARCH CHECK
// ═══════════════════════════════════════════════════════════════

export function shouldSkipResearch(classification: IntentClassification): boolean {
  // Skip deep research for personal/emotional queries
  if (classification.primary_intent === "personal_emotional") {
    return true;
  }
  
  // Skip if very ambiguous and needs clarification first
  if (classification.is_ambiguous && classification.confidence < 0.6) {
    return true;
  }
  
  // Skip if clarification strategy is recommended
  if (classification.response_strategy === "clarify_with_empathy" || 
      classification.response_strategy === "clarify_factual") {
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════
// NEEDS CLARIFICATION CHECK
// ═══════════════════════════════════════════════════════════════

export function needsClarification(classification: IntentClassification): boolean {
  // Always clarify if confidence is low
  if (classification.confidence < 0.8) {
    return true;
  }
  
  // Clarify if strategy says so
  if (classification.response_strategy === "clarify_with_empathy" || 
      classification.response_strategy === "clarify_factual") {
    return true;
  }
  
  // Clarify if ambiguous flag is set
  if (classification.is_ambiguous) {
    return true;
  }
  
  return false;
}
