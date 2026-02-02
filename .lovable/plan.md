# Chat Reliability Hardening - COMPLETED ✅

## Changes Implemented

### 1. API Layer (`src/lib/mcLeukerAPI.ts`)
- Added `signal?: AbortSignal` parameter to `chatV2()` method
- Enables request cancellation and timeout support

### 2. Conversations Hook (`src/hooks/useConversations.tsx`)
- Extended `ChatMessage` interface with `isPlaceholder`, `isError`, and `retryData` fields
- Immediate placeholder message ("Thinking..." / "Researching...") appears after user sends
- `AbortController` with timeouts: 45s for quick mode, 120s for deep mode
- On success: placeholder replaced with real response
- On error/timeout: placeholder replaced with error message + retry option
- Added `retryMessage()` function to retry failed messages
- `cancelRequest()` now removes placeholder messages when cancelled

### 3. ChatMessage Component (`src/components/dashboard/ChatMessage.tsx`)
- Added `onRetry` prop
- Renders loading spinner for placeholder messages
- Renders error state with AlertCircle icon and Retry button for failed messages

### 4. ChatView (`src/components/dashboard/ChatView.tsx`)
- Added `onRetry` prop to interface and passes it to ChatMessageComponent

### 5. Dashboard (`src/pages/Dashboard.tsx`)
- Destructures `retryMessage` from useConversations
- Passes `onRetry={retryMessage}` to ChatView

## Expected Behavior

| Scenario | Behavior |
|----------|----------|
| User sends message | Immediate "Thinking..." bubble appears |
| Backend responds | Placeholder replaced with real response |
| Backend slow (>45s/120s) | Auto-cancels, shows "Request timed out. Click retry to try again." |
| Network/backend error | Shows error message with Retry button |
| User clicks Cancel | Request aborted, placeholder removed |
| Retry click | Resends original message with same mode/model |
