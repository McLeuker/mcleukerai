
# Universal Intent Classification Pre-Pass Implementation Plan

## Overview

Implement a **Layer 0 Intent Classification** system that runs **before any main AI processing** in both Quick Mode (`fashion-ai`) and Deep Research (`research-agent`). This classification uses **Grok directly** (as requested) to analyze user intent across **all domains universally** — not just fashion or predefined categories.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER QUERY                                      │
│                   "my life got lost in paris"                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 0: INTENT CLASSIFICATION                       │
│                         (Grok Direct Call)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SYSTEM PROMPT: Universal Reasoning Classifier                  │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  • Analyze literal meaning                                      │   │
│  │  • Detect emotional state                                       │   │
│  │  • Rank possible intents with confidence %                      │   │
│  │  • Identify ambiguity                                           │   │
│  │  • Suggest response strategy                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  OUTPUT (JSON):                                                         │
│  {                                                                      │
│    "primary_intent": "personal_emotional",                              │
│    "detected_domain": "life_crisis | travel | relationships | ...",    │
│    "confidence": 0.45,                                                  │
│    "is_ambiguous": true,                                                │
│    "emotional_state": "distress",                                       │
│    "possible_interpretations": [                                        │
│      {"intent": "emotional_overwhelm", "confidence": 0.70},             │
│      {"intent": "practical_travel_issue", "confidence": 0.40}           │
│    ],                                                                   │
│    "response_strategy": "clarify_with_empathy",                         │
│    "detected_signals": ["life", "lost", "emotional language"],          │
│    "suggested_flow": "acknowledge → reflect → offer interpretations"   │
│  }                                                                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
           ┌────────────────────┴────────────────────┐
           │                                          │
           ▼                                          ▼
┌──────────────────────────┐           ┌──────────────────────────┐
│   confidence < 80%       │           │   confidence ≥ 80%       │
│   (AMBIGUOUS PATH)       │           │   (DIRECT PATH)          │
├──────────────────────────┤           ├──────────────────────────┤
│ • Skip main AI pipeline  │           │ • Pass classification    │
│ • Generate human-first   │           │   to main AI pipeline    │
│   clarifying response    │           │ • Build system prompt    │
│ • Use 5-step structure:  │           │   based on detected      │
│   1. Acknowledge         │           │   domain + intent        │
│   2. Reflect ambiguity   │           │ • Generate response      │
│   3. Offer 2-3 options   │           │   with appropriate       │
│   4. Partial value       │           │   structure              │
│   5. Gentle follow-up    │           │                          │
└──────────────────────────┘           └──────────────────────────┘
```

## Phase 1: Create Shared Intent Classification Module

### New File: `supabase/functions/_shared/intent-classifier.ts`

A reusable module that both `fashion-ai` and `research-agent` can import.

**Key Components:**

1. **Universal Domain List** (not limited to fashion):
   - `personal_emotional` — life decisions, relationships, well-being, distress
   - `practical_problem` — travel issues, logistics, documents, safety
   - `technical_programming` — APIs, code, tools, implementation
   - `academic_learning` — education, concepts, explanations
   - `professional_business` — industry, market, strategy, B2B
   - `creative_entertainment` — writing, art, stories, games
   - `general_factual` — facts, definitions, quick answers
   - `health_wellness` — medical, fitness, mental health
   - `financial` — money, investments, budgeting
   - `legal` — laws, regulations, contracts
   - `custom_domain` — for any domain not listed (with `detected_domain_name` field)

2. **Classification Interface:**
```typescript
interface IntentClassification {
  // Core classification
  primary_intent: UniversalIntent;
  detected_domain: string;  // Open-ended, not enum-limited
  confidence: number;       // 0-1
  is_ambiguous: boolean;
  
  // Emotional analysis
  emotional_state: "distress" | "curiosity" | "frustration" | "neutral" | "excitement" | "urgency";
  
  // Multi-interpretation support
  possible_interpretations: Array<{
    intent: string;
    domain: string;
    confidence: number;
    signals: string[];
  }>;
  
  // Response guidance
  response_strategy: "clarify_with_empathy" | "clarify_factual" | "direct_answer" | "step_by_step" | "structured_analysis" | "creative_flow";
  suggested_flow: string;
  
  // Detection metadata
  detected_signals: string[];
  explicit_question: string;
  implied_need: string;
  tone: string;
}
```

3. **Grok Classification System Prompt:**
   - Uses Grok's reasoning capabilities to deeply analyze intent
   - No hardcoded domain assumptions
   - Focuses on **what the user is actually trying to achieve**
   - Returns structured JSON via response_format

4. **Classification Function:**
```typescript
async function classifyIntent(
  prompt: string, 
  grokApiKey: string
): Promise<IntentClassification>
```

## Phase 2: Update Quick Mode (`fashion-ai`)

### Changes to `supabase/functions/fashion-ai/index.ts`:

1. **Import the classifier module**

2. **Add Layer 0 before main processing:**
   - Call `classifyIntent()` immediately after input validation
   - This happens BEFORE calling Grok for the main response

3. **Implement confidence-based branching:**

   **If `classification.confidence < 0.8` (ambiguous):**
   - Generate a human-first clarifying response using Grok
   - Use the 5-step structure from the Unified Reasoning Engine
   - Do NOT use the current template-based system prompt
   - Stream this directly without hitting the fashion system prompt

   **If `classification.confidence >= 0.8` (clear intent):**
   - Build a **dynamic system prompt** based on detected domain
   - If `primary_intent === "personal_emotional"`:
     - Use empathetic, conversational structure
     - Ban all template headers
   - If `primary_intent === "practical_problem"`:
     - Use helpful steps without "protocol" language
   - If `primary_intent === "professional_business"`:
     - Allow structured analysis (but still not forced templates)
   - Pass the classification to the main Grok call as context

4. **Remove the hardcoded `FASHION_SYSTEM_PROMPT` as the default**
   - Fashion-specific prompting only when `detected_domain` includes fashion signals
   - Otherwise, use a universal reasoning prompt

5. **Add output sanitization:**
   - Post-process Grok's response to strip banned headers if they leak through
   - Banned: `REAL-TIME SNAPSHOT`, `MARKET SIGNALS`, `INDUSTRY IMPACT`, `ACTIONABLE TAKEAWAYS`

## Phase 3: Update Deep Research (`research-agent`)

### Changes to `supabase/functions/research-agent/index.ts`:

1. **Import the classifier module**

2. **Add Layer 0 intent gate at the start:**
   - Classify the query BEFORE starting the research pipeline
   - This determines whether deep research is even appropriate

3. **Intent-based routing:**

   **If `primary_intent === "personal_emotional"` AND `is_ambiguous`:**
   - SKIP the entire research pipeline (Perplexity, Firecrawl, etc.)
   - Generate an empathetic, clarifying response directly
   - Use the 5-step human-first structure
   - Deduct minimal credits (or none)

   **If `confidence < 0.6`:**
   - Ask for clarification before burning research credits
   - "Before I search for this, I want to make sure I understand..."

   **If research is appropriate:**
   - Pass classification to synthesis phase
   - Synthesizer uses detected domain to structure output
   - No "intelligence briefing" tone for non-business queries

4. **Neutralize fashion bias in Perplexity prompts:**
   - Change: `"You are a fashion industry research assistant"`
   - To: `"You are a research assistant. Provide factual, current information with sources relevant to the user's query."`

5. **Update synthesis to use classification context:**
   - If `primary_intent !== "professional_business"`:
     - Remove "senior analyst's intelligence briefing" instruction
     - Use natural, intent-appropriate structure

## Technical Implementation Details

### Grok Direct Call for Classification

```typescript
// In _shared/intent-classifier.ts

const GROK_CLASSIFIER_ENDPOINT = "https://api.x.ai/v1/chat/completions";

const CLASSIFIER_SYSTEM_PROMPT = `You are a Universal Intent Classifier. Your job is to deeply analyze user queries and understand:

1. WHAT they literally said
2. WHAT they actually mean
3. HOW they feel (emotional state)
4. WHAT they expect as a response

═══════════════════════════════════════════════════════════════
CLASSIFICATION RULES:
═══════════════════════════════════════════════════════════════

NEVER assume a default domain. Analyze the actual words.
NEVER force business/industry framing on personal queries.
ALWAYS consider emotional subtext.
ALWAYS rank multiple interpretations with confidence scores.

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

You are not limited to predefined categories. Detect the ACTUAL domain.

═══════════════════════════════════════════════════════════════
CONFIDENCE SCORING:
═══════════════════════════════════════════════════════════════

High (≥0.8): Single clear interpretation, specific domain signals
Medium (0.6-0.79): Likely interpretation but could go another way
Low (<0.6): Multiple valid interpretations, needs clarification

IF confidence < 0.8, you MUST provide multiple possible_interpretations.

═══════════════════════════════════════════════════════════════
RESPONSE STRATEGY SELECTION:
═══════════════════════════════════════════════════════════════

clarify_with_empathy → For emotional/ambiguous personal queries
clarify_factual → For ambiguous but neutral queries  
direct_answer → For clear factual questions
step_by_step → For technical/how-to queries
structured_analysis → For business/research queries
creative_flow → For creative/entertainment requests

Output JSON only.`;

export async function classifyIntent(
  prompt: string,
  grokApiKey: string
): Promise<IntentClassification> {
  const response = await fetch(GROK_CLASSIFIER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${grokApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
        { role: "user", content: `Classify this query: "${prompt}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent classification
    }),
  });
  
  // Parse and return classification...
}
```

### Dynamic System Prompt Builder

```typescript
function buildSystemPrompt(classification: IntentClassification): string {
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
• Keep it conversational and human`;
      break;
      
    case "practical_problem":
      prompt += `
• Provide clear, actionable steps
• Use natural language, not "protocol" speak
• Be helpful without being robotic
• Short numbered list is fine if it helps`;
      break;
      
    case "technical_programming":
      prompt += `
• Use numbered steps with code examples
• Be precise and practical
• Include error handling guidance
• Link to official documentation when relevant`;
      break;
      
    case "professional_business":
      prompt += `
• Structure analysis by topic, not by template
• Use data and specifics
• Make recommendations actionable
• Tables only if they genuinely help comprehension`;
      break;
      
    // ... other intents
  }
  
  // Always add banned elements
  prompt += `

═══════════════════════════════════════════════════════════════
BANNED (NEVER USE):
═══════════════════════════════════════════════════════════════
❌ REAL-TIME SNAPSHOT
❌ MARKET SIGNALS  
❌ INDUSTRY IMPACT
❌ ACTIONABLE TAKEAWAYS
❌ Any forced template sections`;

  return prompt;
}
```

### Ambiguity Response Generator

```typescript
function generateClarificationResponse(
  classification: IntentClassification,
  grokApiKey: string
): Promise<string> {
  const clarifyPrompt = `Generate a human-first clarifying response using this 5-step structure:

USER QUERY: "${classification.explicit_question}"
EMOTIONAL STATE: ${classification.emotional_state}
POSSIBLE INTERPRETATIONS:
${classification.possible_interpretations.map(i => `- ${i.intent} (${Math.round(i.confidence * 100)}%): ${i.signals.join(', ')}`).join('\n')}

═══════════════════════════════════════════════════════════════
RESPONSE STRUCTURE (FOLLOW EXACTLY):
═══════════════════════════════════════════════════════════════

1. ACKNOWLEDGE: One sentence acknowledging the human state (empathetic, not robotic)

2. REFLECT AMBIGUITY: Show you noticed the query could mean different things

3. OFFER 2-3 INTERPRETATIONS: Based on the possible_interpretations above, present them as options:
   - If emotional: frame options gently
   - If factual: frame options clearly

4. PROVIDE IMMEDIATE VALUE: Give partial help for the most likely interpretation

5. GENTLE FOLLOW-UP: Ask ONE question to lock in their actual need

═══════════════════════════════════════════════════════════════
TONE RULES:
═══════════════════════════════════════════════════════════════
• Warm and supportive for emotional queries
• Helpful and clear for practical queries
• NEVER robotic or formulaic
• NEVER use bullet points for emotions
• Keep it conversational

Output the response directly, no JSON.`;

  return callGrok(grokApiKey, clarifyPrompt, "You are a compassionate, thoughtful assistant.");
}
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/_shared/intent-classifier.ts` | **CREATE** | Reusable Grok-based classification module |
| `supabase/functions/fashion-ai/index.ts` | **MODIFY** | Add Layer 0 classification, dynamic prompts |
| `supabase/functions/research-agent/index.ts` | **MODIFY** | Add intent gate, skip research for personal queries |

## Expected Behavior After Implementation

### Example 1: "my life got lost in paris, what should i do"

**Layer 0 Classification:**
```json
{
  "primary_intent": "personal_emotional",
  "detected_domain": "life_crisis",
  "confidence": 0.45,
  "is_ambiguous": true,
  "emotional_state": "distress",
  "possible_interpretations": [
    {"intent": "emotional_overwhelm", "confidence": 0.70},
    {"intent": "feeling_disoriented", "confidence": 0.55},
    {"intent": "practical_travel_issue", "confidence": 0.40}
  ],
  "response_strategy": "clarify_with_empathy"
}
```

**Generated Response:**
> Hey — I want to pause for a second, because that sentence sounds heavy.
>
> When you say "my life got lost in Paris", do you mean:
> - you're feeling emotionally overwhelmed or stuck,
> - you're feeling alone or disoriented,
> - or something practical went wrong (documents, housing, money)?
>
> If this is emotional: you're not weak for feeling this way — being far from home when things unravel is brutal.
>
> If something concrete happened, tell me what feels most urgent right now (safety, place to sleep, documents), and we'll tackle it one step at a time.
>
> I'm here with you.

### Example 2: "I lost my passport in Paris"

**Layer 0 Classification:**
```json
{
  "primary_intent": "practical_problem",
  "detected_domain": "travel_documents",
  "confidence": 0.92,
  "is_ambiguous": false,
  "emotional_state": "urgency",
  "response_strategy": "direct_answer"
}
```

**Generated Response:**
> Here's what to do right now:
>
> 1. **File a police report** — Go to the nearest Commissariat de Police and file a "Déclaration de Perte" (loss declaration). You'll need this document for everything else.
>
> 2. **Contact your embassy** — They can issue an emergency travel document, usually within 24 hours. Bring the police report and any ID backup you have.
>
> 3. **Secure your accounts** — If your wallet was with it, call your banks to freeze cards.
>
> 4. **Check digital backups** — Access flight/hotel info via cloud (Google Drive, iCloud) to prove your itinerary.
>
> What's your nationality? I can give you the exact embassy address in Paris.

### Example 3: "Find 10 sustainable textile suppliers in Italy"

**Layer 0 Classification:**
```json
{
  "primary_intent": "professional_business",
  "detected_domain": "supply_chain_sourcing",
  "confidence": 0.95,
  "is_ambiguous": false,
  "response_strategy": "structured_analysis"
}
```

**Behavior:** Proceeds to Deep Research with structured supplier analysis. Tables are appropriate here.

## Credit Impact

- Classification call: ~50 tokens Grok input/output → negligible cost
- Ambiguous queries that skip research: saves 10-100 credits by not running unnecessary searches
- Clear queries: normal credit flow

## Success Criteria

1. "my life got lost in paris" → Empathetic clarification, NO templates
2. "lost my passport in Paris" → Clear steps, human tone, no "protocol" language
3. "sustainable suppliers in Italy" → Structured analysis with tables
4. "how to integrate Instagram API" → Step-by-step technical guide
5. Ambiguous queries → Ask for clarification BEFORE burning research credits
