
# Fix Empty Response Issue

## Problem

When the backend returns a response as an object/dict instead of a string, the current code just does `JSON.stringify()` which can result in empty or malformed responses.

## Solution

Update the object-to-string conversion in `normalizeResponse()` to extract actual content from common response keys.

## File Change

**File:** `src/lib/mcLeukerAPI.ts`

**Lines:** 254-258

**Current code:**
```typescript
// If response is somehow an object, stringify it (shouldn't happen with fixed backend)
if (typeof responseText !== 'string') {
  log('NORMALIZE', 'Response was not a string, converting', { type: typeof responseText });
  responseText = JSON.stringify(responseText);
}
```

**New code:**
```typescript
// If response is an object, extract content from common keys
if (typeof responseText === 'object' && responseText !== null) {
  log('NORMALIZE', 'Response was an object, extracting content', { type: typeof responseText, keys: Object.keys(responseText) });
  responseText = responseText.content 
    || responseText.text 
    || responseText.message 
    || responseText.answer
    || responseText.result
    || responseText.response
    || JSON.stringify(responseText);
} else if (typeof responseText !== 'string') {
  responseText = String(responseText);
}
```

## What This Fixes

| Backend Returns | Before | After |
|-----------------|--------|-------|
| `{ content: "Fashion info..." }` | `{"content":"Fashion info..."}` | `Fashion info...` |
| `{ text: "Result here" }` | `{"text":"Result here"}` | `Result here` |
| `{ message: "Answer" }` | `{"message":"Answer"}` | `Answer` |
| `""` (empty string) | `""` | `""` (no change) |
| `"Normal response"` | `Normal response` | `Normal response` (no change) |

No new UI elements, no retry buttons, no error messages added - just better extraction of response content.
