/**
 * assistantPostprocess.ts - Unified post-processor for assistant responses
 * 
 * Ensures every assistant message is user-friendly:
 * - Removes [object Object] artifacts
 * - Replaces generic failure phrases with helpful content
 * - Normalizes whitespace
 */

// ═══════════════════════════════════════════════════════════════
// ARTIFACT CLEANUP
// ═══════════════════════════════════════════════════════════════

/**
 * Remove rendering artifacts like [object Object] and normalize text
 */
export function cleanupArtifacts(text: string): string {
  if (!text || typeof text !== "string") return "";
  
  return text
    // Remove [object Object] including variations
    .replace(/\[object Object\]/gi, "")
    .replace(/\[object\s+Object\]/gi, "")
    // Clean up comma artifacts (,,, or , , ,)
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*$/gm, "") // trailing commas
    .replace(/^\s*,/gm, "") // leading commas
    // Clean up repeated punctuation
    .replace(/\.{4,}/g, "...")
    .replace(/\s{3,}/g, "  ")
    // Normalize line breaks
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// UNHELPFUL TEXT DETECTION
// ═══════════════════════════════════════════════════════════════

const UNHELPFUL_PATTERNS = [
  /^I apologize,?\s*but I couldn'?t generate a response/i,
  /^I couldn'?t generate a response/i,
  /^I encountered an error/i,
  /^Error:/i,
  /^API error:/i,
  /^Request failed/i,
  /^Something went wrong/i,
  /^Please try again\.?$/i,
  /^I'm sorry,?\s*(but\s+)?I can'?t\s+(help|assist|process)/i,
  /^\s*$/,
];

const MIN_HELPFUL_LENGTH = 20;

/**
 * Detect if text is an unhelpful failure message
 */
export function isUnhelpfulFailureText(text: string): boolean {
  if (!text || typeof text !== "string") return true;
  
  const cleaned = text.trim();
  
  // Too short to be helpful
  if (cleaned.length < MIN_HELPFUL_LENGTH) return true;
  
  // Check against known unhelpful patterns
  for (const pattern of UNHELPFUL_PATTERNS) {
    if (pattern.test(cleaned)) return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════
// QUERY INTENT DETECTION
// ═══════════════════════════════════════════════════════════════

type QueryIntent = "research" | "realtime" | "trends" | "personal" | "technical" | "creative" | "general";

function detectQueryIntent(query: string): QueryIntent {
  const q = query.toLowerCase();
  
  // Real-time / current events
  if (/\b(right now|today|happening|current|latest|this week|this month|breaking)\b/i.test(q)) {
    return "realtime";
  }
  
  // Future trends
  if (/\b(202[5-9]|203\d|trends?|forecast|prediction|future|upcoming)\b/i.test(q)) {
    return "trends";
  }
  
  // Research queries
  if (/\b(find|search|research|look up|discover|list|compare|analyze|supplier|manufacturer)\b/i.test(q)) {
    return "research";
  }
  
  // Personal advice
  if (/\b(feel|life|advice|help me|should i|worried|stressed|relationship|personal)\b/i.test(q)) {
    return "personal";
  }
  
  // Technical queries
  if (/\b(code|api|implement|function|error|debug|programming|typescript|javascript)\b/i.test(q)) {
    return "technical";
  }
  
  // Creative requests
  if (/\b(write|poem|story|creative|imagine|compose|draft)\b/i.test(q)) {
    return "creative";
  }
  
  return "general";
}

// ═══════════════════════════════════════════════════════════════
// USER-FACING ANSWER GENERATION
// ═══════════════════════════════════════════════════════════════

interface AnswerAttemptOptions {
  query: string;
  text?: string;
  failureType?: "timeout" | "network" | "rateLimit" | "empty" | "error" | "general";
}

/**
 * Generate a best-effort user-facing answer when the original response is unhelpful
 */
function generateAnswerAttempt(options: AnswerAttemptOptions): string {
  const { query, failureType = "general" } = options;
  const intent = detectQueryIntent(query);
  const queryPreview = query.length > 50 ? query.slice(0, 50) + "..." : query;
  
  // Intent-specific helpful responses
  const responses: Record<QueryIntent, string> = {
    realtime: `I'm working on gathering real-time information for you. While I process your request, here's what I can offer:

**About "${queryPreview}":**

Real-time data requires connecting to live sources, which can sometimes take longer. Here are some ways to get the most current information:

- **Social platforms**: Check trending topics directly on X (Twitter), Instagram, or LinkedIn
- **News aggregators**: Google News, Apple News, or industry-specific outlets
- **Specific angle**: Tell me which platform or region you're most interested in

What specific aspect would you like me to focus on?`,

    trends: `I'm compiling trend information for your query. Here's what I can share:

**Regarding "${queryPreview}":**

When analyzing future trends, I consider multiple factors including current trajectories, industry reports, and expert predictions. To give you the most relevant insights:

- **Specify the industry**: Fashion, tech, marketing, finance?
- **Geographic focus**: Global, specific region, or market?
- **Time horizon**: Near-term (6-12 months) or longer-term?

This helps me provide actionable trend analysis rather than generic forecasts.`,

    research: `I'm working through your research query. Here's my initial guidance:

**For "${queryPreview}":**

While I gather comprehensive information, consider these approaches:

- **Narrow the scope**: Specific brands, regions, or time periods help focus results
- **One topic at a time**: Complex queries work better when broken into parts
- **Key criteria**: What factors matter most (price, quality, location)?

What specific aspect should I prioritize in my research?`,

    personal: `I want to acknowledge what you're asking and help in whatever way I can.

While I work through some technical challenges, I'm here to listen. Sometimes the best approach is to take things one step at a time.

Could you share a bit more about what's on your mind? I'm ready to help when you are.`,

    technical: `I'm processing your technical query. Here's what I can offer:

**For "${queryPreview}":**

To provide the most accurate technical guidance:

- **Share specifics**: Error messages, code snippets, or expected behavior
- **Environment details**: What framework, language, or platform?
- **What you've tried**: This helps narrow down the issue

Ready to dive deeper once you share more details.`,

    creative: `I'd love to help with your creative request.

**For "${queryPreview}":**

To craft something that resonates:

- **Tone**: Formal, casual, playful, or something else?
- **Audience**: Who will read/see this?
- **Key elements**: Any must-have themes or messages?

Share these details and I'll get creative for you.`,

    general: `I'm working on your request. Here's what I can offer right now:

**For "${queryPreview}":**

I wasn't able to complete the full response, but I'm still here to help.

**What you can try:**
- Rephrase with more specific details
- Ask about one aspect at a time
- Let me know if there's a particular angle to focus on

What would be most helpful for you?`,
  };
  
  return responses[intent];
}

// ═══════════════════════════════════════════════════════════════
// MAIN POST-PROCESSOR
// ═══════════════════════════════════════════════════════════════

interface PostProcessOptions {
  query: string;
  text: string;
  failureType?: "timeout" | "network" | "rateLimit" | "empty" | "error" | "general";
}

/**
 * Post-process assistant text to ensure it's always user-friendly
 * 
 * 1. Cleans up artifacts ([object Object], etc.)
 * 2. Detects unhelpful failure messages
 * 3. Replaces with contextual answer attempts
 */
export function postProcessAssistantText(options: PostProcessOptions): string {
  const { query, text, failureType } = options;
  
  // Step 1: Clean artifacts
  let cleaned = cleanupArtifacts(text);
  
  // Step 2: Check if result is unhelpful
  if (isUnhelpfulFailureText(cleaned)) {
    // Step 3: Generate a helpful answer attempt
    cleaned = generateAnswerAttempt({ query, text: cleaned, failureType });
  }
  
  return cleaned;
}

/**
 * Pre-render cleanup for display - removes artifacts from stored messages
 */
export function cleanForDisplay(text: string): string {
  return cleanupArtifacts(text);
}
