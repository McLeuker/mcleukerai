
# Robust AI Fallback Behavior Implementation Plan

## Problem Summary
The system can expose internal errors, thinking states, or model failures to users, sometimes resulting in empty outputs or error messages like "I couldn't generate a response" or raw error traces. Users should always receive a helpful, human-readable response.

## Current Architecture Analysis

| Layer | Component | Current Fallback Status |
|-------|-----------|------------------------|
| Frontend | `mcLeukerAPI.ts` | Has retry logic (2 retries) but returns raw error messages |
| Frontend | `useConversations.tsx` | Shows "I apologize, but I couldn't generate..." fallback |
| Frontend | `ChatMessage.tsx` | Displays errors with retry button, but shows raw errors |
| Backend | `agent-orchestrator` | Has `NO-SILENCE_CONFIG` with heartbeat, fallback output generator |
| Backend | `research-agent` | Has model fallback cascade (Grok → GPT-4.1) but still exposes failures |
| Backend | `reasoning-layer` | Returns errors on gateway failures (429, 402) |

## Current Gaps

1. **Frontend API Layer (`mcLeukerAPI.ts`)**:
   - Returns raw error messages to UI
   - No user-friendly fallback responses on complete failure

2. **Frontend Conversation Hook (`useConversations.tsx`)**:
   - Line 282: Falls back to "I apologize, but I couldn't generate a response. Please try again."
   - Line 338: Exposes raw `error.message` in error state

3. **Backend Research Agent**:
   - Line 2222: Returns raw "Research failed" error
   - No fallback response generation on complete failure

4. **Backend Reasoning Layer**:
   - Exposes rate limit (429) and payment (402) errors directly

---

## Implementation Plan

### Layer 1: Frontend API (`src/lib/mcLeukerAPI.ts`)

**Goal**: Never return raw errors; always provide a helpful response

**Changes**:
- Add `FALLBACK_RESPONSES` constant with context-aware fallback messages
- Modify `normalizeResponse()` to generate fallback content when response is empty
- Add `generateFallbackResponse()` helper that creates helpful partial answers
- Ensure `chat()` method always returns a valid, user-friendly message

```typescript
// New constants
const FALLBACK_RESPONSES = {
  timeout: "I'm taking longer than expected to process your request. Here's what I can tell you based on what I know...",
  network: "I'm having trouble connecting right now. Let me provide what guidance I can...",
  empty: "I wasn't able to gather complete information on this topic. Here's a general perspective...",
  general: "I encountered some technical limitations, but I can still help. Here's my best guidance..."
};

// Enhanced error handling in chat() method
if (!normalized.response || normalized.response.trim() === "") {
  normalized.response = generateContextualFallback(message);
  normalized.message = normalized.response;
}
```

### Layer 2: Frontend Conversation Hook (`src/hooks/useConversations.tsx`)

**Goal**: Never display raw error messages; always show actionable content

**Changes**:
- Replace generic "I apologize..." message with helpful fallback
- Add `getContextualErrorResponse()` helper to generate meaningful responses based on query
- Modify error message display to provide partial value
- Keep retry functionality but improve error messaging

```typescript
// Line 281-282: Replace generic fallback
const responseContent = chatResult.response || chatResult.message || 
  getContextualErrorResponse(content);

// New helper function
function getContextualErrorResponse(query: string): string {
  // Analyze query to provide relevant fallback
  const isQuestion = query.includes("?");
  const isResearch = /research|find|search|look up/i.test(query);
  
  if (isResearch) {
    return `I wasn't able to complete the full research on "${query.slice(0, 50)}...", but here's what I can suggest: Try breaking this into smaller, more specific questions, or I can help you find alternative approaches.`;
  }
  
  return `I'm working through some technical challenges right now. While I couldn't fully process your request, here's what I can offer: ${generatePartialGuidance(query)}`;
}
```

### Layer 3: Backend Agent Orchestrator (`supabase/functions/agent-orchestrator/index.ts`)

**Goal**: Ensure `NO-SILENCE` policy delivers useful content even on total failure

**Current State**: Already has `generateFallbackOutput()` and `NO_SILENCE_CONFIG` ✓

**Changes**:
- Enhance `generateFallbackOutput()` to be more query-aware
- Add query-type specific fallback templates
- Ensure fallback is always delivered with `phase: "completed"` (never "failed")
- Add partial synthesis even when research tools fail

```typescript
// Enhanced fallback generator (lines 68-95)
function generateFallbackOutput(prompt: string, phase: string, partialData?: unknown): string {
  // Analyze prompt intent
  const isSupplier = /supplier|manufacturer|vendor|factory/i.test(prompt);
  const isTrend = /trend|fashion|style|season/i.test(prompt);
  const isPersonal = /feel|life|advice|help me/i.test(prompt);
  
  if (isPersonal) {
    return `I want to acknowledge your question and provide what insight I can...`;
  }
  
  if (isSupplier) {
    return `While I couldn't complete the full supplier research, here are some general approaches...`;
  }
  
  // ... more intent-specific fallbacks
}
```

### Layer 4: Backend Research Agent (`supabase/functions/research-agent/index.ts`)

**Goal**: Never send `phase: "failed"` without actionable content

**Changes**:
- Wrap main error handler (line 2220-2223) to always deliver content
- Add `createEmergencyFallback()` function for complete failure scenarios
- Ensure graceful degradation when API keys missing
- Add partial result synthesis even when validation fails

```typescript
// Replace lines 2220-2223
} catch (error) {
  console.error("Research agent error:", error);
  
  // NEVER send "failed" without content
  const fallbackContent = createEmergencyFallback(sanitizedQuery, queryType, error);
  
  // Stream the fallback content
  for (let i = 0; i < fallbackContent.length; i += 50) {
    send({ phase: "generating", content: fallbackContent.slice(i, i + 50) });
    await new Promise(r => setTimeout(r, 10));
  }
  
  // Send as "completed" with low confidence annotation
  send({
    phase: "completed",
    sources: [],
    creditsUsed: 0, // No charge for fallback
    modelUsed: "fallback",
    confidence: 10,
    note: "This is a best-effort response due to technical limitations."
  });
  
  close();
}

// New helper
function createEmergencyFallback(query: string, queryType: QueryType, error: unknown): string {
  const errorHint = error instanceof Error ? error.message : "Unknown issue";
  const isRateLimit = errorHint.includes("429") || errorHint.includes("rate");
  
  if (isRateLimit) {
    return `I'm experiencing high demand right now. While I work on getting your full answer, here's what I can offer about "${query.slice(0, 50)}...":\n\n[General guidance based on query type]`;
  }
  
  return `I encountered some challenges gathering complete information on your query. Here's what I can provide:\n\n## Best-Effort Response\n\n${getQueryTypeGuidance(queryType, query)}`;
}
```

### Layer 5: Backend Reasoning Layer (`supabase/functions/reasoning-layer/index.ts`)

**Goal**: Return helpful content even when AI gateway fails

**Changes**:
- Catch 429/402/5xx errors and generate fallback reasoning
- Add `createFallbackBlueprint()` for when AI call fails
- Ensure response always includes actionable structure

```typescript
// After line 345
if (!response.ok) {
  // Instead of throwing, create fallback blueprint
  const fallbackBlueprint = createFallbackBlueprint(prompt, taskPlan);
  
  return new Response(
    JSON.stringify({
      success: true,
      blueprint: fallbackBlueprint,
      fallback: true,
      note: "Using simplified reasoning due to high demand"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// New helper
function createFallbackBlueprint(prompt: string, taskPlan: TaskPlan): ReasoningBlueprint {
  return {
    task_summary: `Process query: ${prompt.slice(0, 100)}`,
    reasoning_objectives: ["Understand user intent", "Provide helpful response"],
    research_questions: [prompt],
    // ... minimal but valid blueprint
  };
}
```

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `src/lib/mcLeukerAPI.ts` | Add fallback response generation, improve error handling | High |
| `src/hooks/useConversations.tsx` | Replace generic error messages with contextual fallbacks | High |
| `supabase/functions/agent-orchestrator/index.ts` | Enhance fallback output to be query-aware | Medium |
| `supabase/functions/research-agent/index.ts` | Add emergency fallback for complete failures | Medium |
| `supabase/functions/reasoning-layer/index.ts` | Add fallback blueprint generation | Medium |

---

## Expected Behavior After Implementation

### Before (Current)
User sees: "Error: Request failed: 500" or "I couldn't generate a response"

### After (Fixed)
User sees: 
> "I'm working through some technical challenges with your research query. While I gather more data, here's what I can offer:
>
> **General Guidance on [Topic]**
> - [Relevant point 1]
> - [Relevant point 2]
>
> I'm still working on getting you a complete answer. You can try rephrasing your question or breaking it into smaller parts for better results."

---

## Fallback Response Templates

| Scenario | User Message |
|----------|--------------|
| Timeout | "Taking longer than expected. Here's what I know so far..." |
| Rate Limit | "High demand right now. Here's my best guidance while I work on your full answer..." |
| Model Failure | "Working through technical challenges. Let me provide what insight I can..." |
| Empty Response | "Couldn't gather complete data, but here's a general perspective..." |
| Network Error | "Connection issues. Here's what I can help with based on your question..." |

---

## Testing Approach

1. **Simulate API failures** by temporarily blocking API keys
2. **Test rate limiting** by sending rapid requests
3. **Verify timeout handling** with long queries
4. **Check empty response handling** with edge-case prompts
5. **Validate retry behavior** still works with improved messaging
