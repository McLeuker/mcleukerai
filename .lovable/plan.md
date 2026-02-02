

## Fix Intermittent Chat Response - Reliability Hardening

### Root Causes Identified

1. **AbortController never connected**: `abortControllerRef` exists (line 98) but is never set before the API call, and `chatV2()` doesn't accept an AbortSignal
2. **No timeout**: Fetch can hang indefinitely with no user feedback
3. **No immediate placeholder**: User sends message → waits for full API response → appears to "do nothing" if slow/fails
4. **Error only shows toast**: Toast can be missed; no persistent visual feedback in chat

---

### Technical Changes

#### 1. Add AbortSignal Support to API Layer

**File:** `src/lib/mcLeukerAPI.ts`

Update `chatV2` method to accept optional signal:

```typescript
async chatV2(
  message: string, 
  conversationId?: string, 
  mode: ChatMode = 'quick',
  signal?: AbortSignal  // NEW
): Promise<ChatResponseV2> {
  const response = await fetch(`${this.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId, mode }),
    signal,  // NEW - enables cancellation
  });
  // ... rest unchanged
}
```

---

#### 2. Add Placeholder Message + Timeout + Retry in useConversations

**File:** `src/hooks/useConversations.tsx`

**A) Add placeholder assistant message immediately after user message:**
```typescript
// After adding user message to state (around line 271)
const placeholderId = `placeholder-${Date.now()}`;
const placeholderMessage: ChatMessage = {
  id: placeholderId,
  conversation_id: conversation.id,
  user_id: user.id,
  role: "assistant",
  content: mode === "deep" ? "Researching..." : "Thinking...",
  model_used: null,
  credits_used: 0,
  is_favorite: false,
  created_at: new Date().toISOString(),
  isPlaceholder: true,  // NEW field to identify placeholder
};
setMessages((prev) => [...prev, placeholderMessage]);
```

**B) Create AbortController with timeout before API call:**
```typescript
// Before calling mcLeukerAPI.chatV2 (around line 290)
abortControllerRef.current = new AbortController();
const timeoutMs = mode === "deep" ? 120000 : 45000; // 120s deep, 45s quick
const timeoutId = setTimeout(() => {
  abortControllerRef.current?.abort();
}, timeoutMs);

try {
  const chatResult = await mcLeukerAPI.chatV2(
    prompt, 
    conversation.id, 
    mode,
    abortControllerRef.current.signal  // Pass signal
  );
  clearTimeout(timeoutId);
  // ... process result
```

**C) Replace placeholder with real response or error:**
```typescript
// On success - replace placeholder with real message
setMessages((prev) => prev.map(m => 
  m.id === placeholderId 
    ? { ...newAssistantMessage } 
    : m
));

// On error - replace placeholder with error + retry option
setMessages((prev) => prev.map(m =>
  m.id === placeholderId
    ? { 
        ...m, 
        content: "Failed to get response. Click to retry.",
        isError: true,
        retryData: { prompt, mode, model, domain }
      }
    : m
));
```

**D) Add retry function:**
```typescript
const retryMessage = useCallback(async (messageId: string) => {
  const msg = messages.find(m => m.id === messageId);
  if (msg?.retryData) {
    // Remove error message
    setMessages(prev => prev.filter(m => m.id !== messageId));
    // Resend with original parameters
    await sendMessage(
      msg.retryData.prompt,
      msg.retryData.mode,
      msg.retryData.model,
      msg.retryData.domain
    );
  }
}, [messages, sendMessage]);
```

---

#### 3. Update ChatMessage Interface

**File:** `src/hooks/useConversations.tsx`

Add new fields to `ChatMessage` interface:
```typescript
export interface ChatMessage {
  // ... existing fields
  isPlaceholder?: boolean;
  isError?: boolean;
  retryData?: {
    prompt: string;
    mode: ResearchMode;
    model?: string;
    domain?: string;
  };
}
```

---

#### 4. Render Error State with Retry Button

**File:** `src/components/dashboard/ChatMessage.tsx`

Handle error state in message rendering:
```typescript
{message.isError && (
  <div className="flex items-center gap-2 mt-2">
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => onRetry?.(message.id)}
      className="text-destructive"
    >
      <RefreshCw className="h-4 w-4 mr-1" />
      Retry
    </Button>
  </div>
)}
```

---

### Summary Table

| File | Change |
|------|--------|
| `src/lib/mcLeukerAPI.ts` | Add `signal` parameter to `chatV2()` |
| `src/hooks/useConversations.tsx` | Add placeholder message, timeout, AbortController setup, retry logic |
| `src/components/dashboard/ChatMessage.tsx` | Render error state with retry button |

---

### Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| User sends message | No feedback until response | Immediate "Thinking..." bubble appears |
| Backend slow (>45s quick, >120s deep) | Hangs forever | Auto-cancels, shows "Timed out. Retry" |
| Network error / backend error | Toast only, looks like nothing happened | Error message in chat with Retry button |
| User clicks Cancel | Nothing happens | Request aborted, placeholder removed |
| Retry click | N/A | Resends original message with same mode/model |

