
<goal>
Stop the “Are you looking for general inquiry?” loop and make Quick mode correctly understand simple prompts like “I lost my wallet in Paris, what should I do?”.
</goal>

<what-i-found>
1) Your UI sends Quick-mode requests to the backend function <code>fashion-ai</code> with <code>model: "grok-4-latest"</code> (see <code>src/hooks/useConversations.tsx</code>).
2) <code>fashion-ai</code> currently does NOT support <code>grok-4-latest</code>. It only recognizes:
   - grok-2-latest
   - grok-2
   - grok-beta
   (see <code>supabase/functions/fashion-ai/index.ts</code>)
3) Because the requested model isn’t recognized, <code>fashion-ai</code> silently falls back to <code>grok-2-latest</code>.
4) Your Grok key does not have access to <code>grok-2-latest</code>, causing 404s:
   - “The model grok-2-latest does not exist or your team … does not have access to it.”
   (confirmed in backend logs)
5) When Layer-0 classification fails, it returns a default classification whose only interpretation is “general inquiry”.
   That default triggers the fallback clarification response:
   “Are you looking for general inquiry?”
   which repeats forever as the user replies “yes / im looking for solutions”.
</what-i-found>

<root-cause>
The loop is caused by an invalid Quick-mode model mapping:
UI requests <code>grok-4-latest</code> → <code>fashion-ai</code> downgrades to <code>grok-2-latest</code> → Grok 404 → classifier defaults to “general inquiry” → clarification fallback repeats.

This is not a “prompt structure” issue; it’s a model routing + error-handling issue.
</root-cause>

<plan>
<step id="1" title="Fix Quick-mode model routing in fashion-ai">
- Update <code>supabase/functions/fashion-ai/index.ts</code>:
  - Add <code>"grok-4-latest"</code> to <code>GROK_MODELS</code>
  - Change the default model from <code>grok-2-latest</code> to <code>grok-4-latest</code>
  - Ensure <code>requestedModel</code> = <code>"grok-4-latest"</code> actually selects Grok-4, not Grok-2
  - Update labels like <code>modelUsed: "Grok-2"</code> to <code>"Grok-4"</code> where appropriate, so the UI doesn’t misreport
</step>

<step id="2" title="Fix Layer-0 classifier to use Grok-4 (and avoid hardcoded Grok-2)">
- Update <code>supabase/functions/_shared/intent-classifier.ts</code>:
  - Replace <code>CLASSIFIER_MODEL = "grok-2-latest"</code> with <code>"grok-4-latest"</code>
  - Even better: remove the hard-coded classifier model entirely and pass the selected model into:
    - <code>classifyIntent(...)</code>
    - <code>generateClarificationResponse(...)</code>
  so Layer 0 always uses the same model the user selected (or the same one <code>fashion-ai</code> is using).
</step>

<step id="3" title="Add a ‘no-loop’ safety so failures never produce the same clarifying question forever">
Even after fixing the model, we should prevent this class of failure from ever reappearing.

- If Grok classification fails (non-OK response):
  - Do NOT default to “general inquiry” + “Are you looking for general inquiry?”
  - Instead, use a deterministic local fallback classifier for obvious practical intents (wallet/passport/lost/urgent, etc.) to return:
    - <code>primary_intent: "practical_problem"</code>
    - <code>confidence: 0.9</code>
    - <code>response_strategy: "step_by_step"</code>
  This guarantees “lost wallet” becomes “help steps” even if a model is temporarily unavailable.

- Additionally: if the user’s message is a short follow-up (“yes”, “no”, “that one”), treat it as a continuation of the last assistant question rather than re-classifying it in isolation.
</step>

<step id="4" title="(Optional but recommended) Use conversation context for classification continuity">
Right now Layer 0 classifies only the single prompt string.

Improve robustness by:
- In <code>fashion-ai</code>, if <code>conversationId</code> exists:
  - Fetch last ~6 messages from <code>public.chat_messages</code> for that conversation (user + assistant)
  - Provide that context to the classifier (so “yes” can be interpreted)
  - Provide that context to response generation (so the assistant continues the same topic naturally)

This will directly address the “yes / im looking for solutions” scenario if clarification ever occurs.
</step>

<step id="5" title="Testing (backend + UI)">
Because these functions stream SSE, automated tool-testing is limited, but we can still validate in two ways:

A) Backend log validation (after deployment)
- Confirm no more:
  - “Grok classification error: 404 … grok-2-latest …”
  - “Clarification generation error: 404”
- Confirm logs show Grok-4 being selected for Quick mode.

B) End-to-end UI tests (most important)
In Quick mode:
1) “I lost my wallet in paris, what should I do”
   - Expected: immediate practical steps (freeze cards, police report, embassy if documents, etc.)
   - Must NOT ask “Are you looking for general inquiry?”
2) “im looking for solutions to my problem”
   - Expected: continues with steps, not a reset question.
3) “yes”
   - Expected: continues; does not loop into the same clarification.

Also verify model dropdown:
- If user picks GPT-4.1, Quick mode should either:
  - use the Lovable AI gateway for that request, OR
  - clearly fall back and label the used model accurately.
</step>
</plan>

<expected-outcome>
- “Lost wallet in Paris” is treated as a clear practical request and answered directly.
- The “general inquiry” loop is eliminated.
- Quick mode correctly honors <code>grok-4-latest</code> (and doesn’t silently downgrade to an inaccessible Grok model).
- Even if Grok temporarily fails, the assistant won’t get stuck repeating the same question.
</expected-outcome>
