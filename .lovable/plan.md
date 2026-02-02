
# Chat UI Redesign: Fix Clipping + White Bubbles + Background Activity Panel

## Problem Summary (from screenshot analysis)

Based on the screenshot, I've identified these issues:

1. **Sidebar clipping**: The selected chat item bubble is cut off on the left edge
2. **Favorites star**: The "★ Favorites" header row might be clipped
3. **No chat bubbles**: Messages appear as flat rows, not as distinct white bubbles on black
4. **No background activity panel**: The existing `ReasoningDisplay` only shows after completion; no real-time progress during generation

---

## A) Fix Clipping Issues

### A1. Sidebar Chat List Bubble Clipping

**Root cause**: The `px-2` padding on the list container combined with `ring-2 ring-offset-2` on selected items causes the ring to extend outside the container bounds.

**File**: `src/components/dashboard/ChatSidebar.tsx`

**Changes**:
- Increase inner padding from `px-2` to `px-4` on the list container (line 136)
- Change from `ring-offset-2` to using a solid border approach that stays within bounds
- Ensure `overflow-visible` on parent if needed

```text
Current:
<div className="px-2 pb-4 space-y-1">
  <div className="...ring-2 ring-primary ring-offset-2 ring-offset-sidebar">

Fixed:
<div className="px-4 pb-4 space-y-1.5">
  <div className="...border-2 border-primary shadow-sm">
```

### A2. Favorites Star Clipping (in ChatView)

**File**: `src/components/dashboard/ChatView.tsx`

**Changes**:
- Add left padding to the filter bar header
- Ensure the Star icon has proper spacing

---

## B) Chat Bubbles (White on Black)

### B1. Visual Theme Update

Convert the current flat message rows to distinct white bubbles with black text.

**File**: `src/components/dashboard/ChatMessage.tsx`

**Current structure**:
```text
┌────────────────────────────────────────────┐
│ Avatar │ Header + Content (flat bg)        │
└────────────────────────────────────────────┘
```

**New structure**:
```text
                ┌──────────────────────────┐
                │ White bubble, black text │  ← User (right-aligned)
                └──────────────────────────┘

┌──────────────────────────────────┐
│ White bubble, black text         │  ← AI (left-aligned)
│ with avatar header inside        │
└──────────────────────────────────┘
```

**Key styling changes**:
- Wrapper: `bg-black` (consistent dark background)
- Message bubbles: `bg-white text-black rounded-2xl px-5 py-4`
- User messages: `ml-auto max-w-[80%]` (right-aligned)
- AI messages: `mr-auto max-w-[80%]` (left-aligned)
- Outer gutters: `px-4 md:px-8` to ensure bubbles never touch edges
- Spacing between bubbles: `space-y-4`

### B2. ChatView Wrapper

**File**: `src/components/dashboard/ChatView.tsx`

**Changes**:
- Ensure the message list area has consistent `bg-black`
- Add proper vertical spacing between message bubbles
- Keep filter bar styled for dark theme

---

## C) Background Activity Panel (Manus-style)

Create a new component that shows real-time progress during AI generation.

### C1. New Component: `BackgroundActivityPanel.tsx`

**File**: `src/components/dashboard/BackgroundActivityPanel.tsx` (NEW)

**Features**:
- Collapsible panel with chevron toggle
- Header: "Background activity" + status ("Running..." / "Complete")
- Step list with status icons:
  - `in_progress`: Loader2 spinner
  - `done`: Check icon
  - `error`: AlertCircle icon
- Safe, user-facing step labels (no hidden chain-of-thought)
- Smooth expand/collapse animation

**Step taxonomy**:
```typescript
const ACTIVITY_STEPS = [
  { id: "understanding", label: "Understanding request" },
  { id: "planning", label: "Planning approach" },
  { id: "gathering", label: "Gathering information" },
  { id: "generating", label: "Generating answer" },
  { id: "finalizing", label: "Finalizing output" },
];
```

### C2. Placement

**Location**: Inside `ChatMessage.tsx`, displayed above the AI response bubble when:
- Message is currently streaming (`isStreaming === true`)
- OR message has activity history and panel is expanded

### C3. Panel UI Design

```text
┌────────────────────────────────────────────┐
│ Background activity           Running... ▼ │
├────────────────────────────────────────────┤
│ ✓ Understanding request                    │
│ ✓ Planning approach                        │
│ ⟳ Generating answer                        │
│ ○ Finalizing output                        │
└────────────────────────────────────────────┘
```

**Styling**:
- Container: `bg-zinc-900 border border-white/10 rounded-xl`
- Header: `text-white/90` with toggle chevron
- Step rows: `text-white/70` with status icons
- Collapsed state: Single-line summary "Complete ✓"

### C4. Integration with useConversations

**File**: `src/hooks/useConversations.tsx`

**Changes**:
- Add `activitySteps` to the `ResearchState` interface
- Update `setResearchState` during message flow to track progress phases
- Pass activity state to `ChatMessage` component

### C5. Streaming Behavior

During AI response generation:
1. Show panel expanded with steps updating
2. Mark steps as done progressively
3. When complete, collapse to summary line
4. Keep panel expandable for review

---

## D) Layout Rules

### D1. Main Chat Scroll

**File**: `src/components/dashboard/ChatView.tsx`

- Main chat area scrolls vertically (already working via ScrollArea)
- Ensure no horizontal overflow from bubbles

### D2. Input Pinning

**File**: `src/pages/Dashboard.tsx`

- Input stays pinned at bottom (already implemented with `sticky bottom-0`)
- Ensure no clipping of input elements

### D3. Overflow Handling

- Remove any `overflow-hidden` that clips the sidebar selected state
- Ensure `overflow-visible` where ring effects are used

---

## File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/dashboard/ChatSidebar.tsx` | Modify | Fix padding, change ring to border, prevent clipping |
| `src/components/dashboard/ChatMessage.tsx` | Modify | Convert to white bubble UI, add BackgroundActivityPanel |
| `src/components/dashboard/ChatView.tsx` | Modify | Update spacing, fix favorites star padding |
| `src/components/dashboard/BackgroundActivityPanel.tsx` | Create | New Manus-style progress panel |
| `src/hooks/useConversations.tsx` | Modify | Add activity steps tracking |
| `src/index.css` | Modify | Add bubble utility classes |

---

## Technical Implementation Details

### ChatMessage Bubble Structure

```tsx
// User message
<div className="flex justify-end px-4 md:px-8 py-2">
  <div className="bg-white text-black rounded-2xl px-5 py-4 max-w-[80%]">
    {/* Content */}
  </div>
</div>

// AI message  
<div className="flex justify-start px-4 md:px-8 py-2">
  <div className="bg-white text-black rounded-2xl px-5 py-4 max-w-[80%]">
    {/* Activity panel (collapsible) */}
    {/* Header with avatar, time, model */}
    {/* Markdown content */}
  </div>
</div>
```

### BackgroundActivityPanel Props

```typescript
interface BackgroundActivityPanelProps {
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "in_progress" | "done" | "error";
    detail?: string;
  }>;
  isActive: boolean;
  defaultExpanded?: boolean;
}
```

### Activity Steps Mapping

Map the existing `ResearchState.phase` to activity steps:
- `"planning"` → Step 1-2 in progress
- `"searching"` → Step 3 in progress
- `"generating"` → Step 4 in progress
- `"completed"` → All steps done

---

## Acceptance Criteria

| Requirement | Implementation |
|-------------|----------------|
| Selected chat bubble not clipped | Increased padding + border instead of ring |
| Favorites star fully visible | Added left padding to filter bar |
| White bubbles with black text | New bubble wrapper styling |
| User messages right-aligned | `justify-end` + `ml-auto` |
| AI messages left-aligned | `justify-start` + `mr-auto` |
| Bubbles have 70-80% max width | `max-w-[80%]` |
| Outer gutters prevent edge touching | `px-4 md:px-8` |
| Background activity panel visible during generation | New component + streaming integration |
| Panel collapses after completion | Collapsible with summary state |
| No hidden reasoning exposed | Only safe step labels shown |
| Smooth animations | Height transition on collapse |
| Keyboard accessible | Focus states on toggle buttons |
