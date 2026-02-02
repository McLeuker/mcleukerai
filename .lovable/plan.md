

# Fix Build Error and Restore Chat Design

## Problem Summary

| Issue | Description |
|-------|-------------|
| **Build Error** | `useConversations.tsx` imports from `@/contexts/AuthContext` which doesn't exist |
| **Design Regression** | Recent changes broke the chat UI design - needs to be reverted to the earlier working state |

---

## 1. Fix Build Error (Critical)

### File: `src/hooks/useConversations.tsx`

**Line 16 - Wrong Import:**
```typescript
// CURRENT (broken):
import { useAuth } from "@/contexts/AuthContext";

// FIXED:
import { useAuth } from "@/hooks/useAuth";
```

The `AuthContext` doesn't exist as a separate file. The `useAuth` hook is defined in `src/hooks/useAuth.tsx`.

---

## 2. Restore Chat Design to Earlier State

Based on the current code and your request to restore the 18:30 design, I'll revert the chat components to the clean, working state that matches the memory specifications:

### A) ChatMessage.tsx - Restore WhatsApp-style White Bubbles

The current code uses dark theme styling (`bg-gray-800`, `bg-blue-600`). Restore to:

- **White bubbles** with black text
- **Rounded corners** (16-22px)
- **User messages** right-aligned with profile header
- **AI messages** left-aligned with McLeuker header
- **Consistent 15px typography**
- **Max-width 75%** to prevent overflow
- **`overflow-wrap: anywhere`** to prevent horizontal scroll

### B) ChatInput.tsx - Already Correct

The current `ChatInput.tsx` already has the correct styling:
- `bg-zinc-800` (gray background)
- `rounded-2xl`
- `shadow-lg`
- White text with `text-white/50` placeholder

This file is good and doesn't need changes.

### C) Dashboard.tsx - Ensure Overflow Prevention

Add `overflow-x-hidden` to prevent any horizontal scrolling.

---

## File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/hooks/useConversations.tsx` | Fix Import | Change `@/contexts/AuthContext` to `@/hooks/useAuth` |
| `src/components/dashboard/ChatMessage.tsx` | Restore Design | Revert to white bubble theme with proper typography |
| `src/pages/Dashboard.tsx` | Add Safety | Ensure `overflow-x-hidden` |
| `src/index.css` | Add Utilities | Add `.chat-message-content` class for consistent text flow |

---

## ChatMessage.tsx Restored Design Spec

### User Message Bubble
```text
┌────────────────────────────────────────────────────────────┐
│                           [Right-aligned bubble]           │
│     ┌────────────────────────────────────────┐             │
│     │ 👤 You · 2:30 PM                       │  White bg   │
│     │ Message content with natural           │  Black text │
│     │ text wrapping and 15px font           │  rounded-2xl│
│     └────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────┘
```

### AI Message Bubble
```text
┌────────────────────────────────────────────────────────────┐
│ [Left-aligned bubble]                                      │
│ ┌────────────────────────────────────────────┐             │
│ │ 🤖 McLeuker AI · 2:31 PM                   │  White bg   │
│ │ Response content with markdown support,    │  Black text │
│ │ proper bullet lists, and consistent        │  rounded-2xl│
│ │ typography throughout.                     │             │
│ └────────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────┘
```

### Typography Rules
- Base font: 15px
- Line height: 1.6
- Headers: Same 15px, just bold (no giant headlines)
- Lists: Standard bullets with left padding
- All text: `overflow-wrap: anywhere; word-break: break-word`

### Color Scheme
- Bubble background: `bg-white`
- Text: `text-black`
- Timestamps/meta: `text-black/60`
- Outer gutters: `px-6 md:px-10`

---

## Expected Result

After these changes:
1. Build will succeed (import fixed)
2. Chat bubbles will be white on black background
3. Both user and AI bubbles have profile headers
4. No horizontal scrolling
5. Consistent 15px typography
6. Clean WhatsApp-like layout

