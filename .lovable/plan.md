
# Layout Composition Improvements - Gutter, Centered Message Column & Subtle Left→Right Gradient

## Overview

The current chat bubbles feel too close to the sidebar boundary. This plan introduces proper spacing, a centered message column with constrained width, reduced bubble widths, and a subtle left-to-right gradient to add depth.

---

## Current Issues

| Problem | Current State |
|---------|---------------|
| No dedicated gutter | Sidebar and chat share edge, bubbles feel cramped |
| Full-width message area | Messages stretch across entire content area |
| Bubbles too wide | `max-width: 72%` is too large for chat feel |
| Hard divider | `border-white/[0.08]` creates harsh separation |
| Flat background | Radial vignette lacks directional depth |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add gutter spacing, update main layout |
| `src/components/dashboard/ChatView.tsx` | Add centered message column container |
| `src/components/dashboard/ChatMessage.tsx` | Reduce bubble widths, add AI left inset |
| `src/index.css` | Add left→right gradient class, soften dividers |

---

## 1. Dashboard.tsx - Add Dedicated Gutter

**Current:** Sidebar uses `fixed` positioning, main content has `lg:pl-64` or `lg:pl-14` padding.

**Updated:** Add explicit gutter spacing to create breathing room between sidebar and chat:

```tsx
// Current (line 118-121):
<main className={cn(
  "flex-1 flex flex-col min-h-0 relative",
  sidebarOpen ? "lg:pl-64" : "lg:pl-14"
)}>

// Updated with gutter:
<main className={cn(
  "flex-1 flex flex-col min-h-0 relative",
  sidebarOpen ? "lg:pl-[304px]" : "lg:pl-[72px]"  // sidebar + 32px gutter
)}>
```

**Calculation:**
- Sidebar open: 288px (w-72) + 32px gutter = 320px, using `pl-[304px]` for balance
- Sidebar collapsed: 56px (w-14) + 16px gutter = 72px

---

## 2. ChatView.tsx - Centered Message Column

**Add a wrapper container for all messages with max-width and centering:**

```tsx
// Inside ScrollArea, wrap messages in centered container:
<div className="min-h-full py-6">
  {/* Centered message column */}
  <div className="max-w-[1040px] mx-auto px-6 lg:px-8 space-y-4">
    {filteredMessages.map((message, index) => (
      // ... messages
    ))}
  </div>
</div>
```

**Benefits:**
- `max-width: 1040px` prevents messages from stretching on wide screens
- `mx-auto` centers the column
- `px-6 lg:px-8` provides inner padding (24-32px)

---

## 3. ChatMessage.tsx - Reduce Bubble Widths & Add AI Inset

### Updated Max-Widths

| Bubble Type | Current | New |
|-------------|---------|-----|
| AI bubble | `max-w-[72%]` | `max-w-[65%]` |
| User bubble | `max-w-[72%]` | `max-w-[55%]` |

### Add Extra Left Inset for AI Messages

```tsx
// AI message container:
<div className="flex justify-start pl-3 lg:pl-4">
  <div className="max-w-[65%] rounded-[20px] px-5 py-4 graphite-bubble-ai">
    {/* ... content */}
  </div>
</div>

// User message container (right-aligned, no extra inset):
<div className="flex justify-end">
  <div className="max-w-[55%] rounded-[20px] px-5 py-4 graphite-bubble-user">
    {/* ... content */}
  </div>
</div>
```

The `pl-3 lg:pl-4` (12-16px) on AI rows creates additional separation from the left boundary.

---

## 4. Soften the Sidebar Divider

**Current graphite-glass class:**
```css
.graphite-glass {
  background: linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);  /* visible border */
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.50);
}
```

**Updated - softer right border:**
```css
.graphite-glass {
  background: linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);  /* softer */
  border-right-color: rgba(255, 255, 255, 0.03);  /* even softer on dividing edge */
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.50);
}
```

Alternatively, use a gradient fade instead of a hard border on the right edge.

---

## 5. Add Left→Right Gradient to Main Chat Panel

**New CSS class in index.css:**

```css
/* Subtle left→right gradient for chat panel depth */
.chat-panel-gradient {
  background: 
    linear-gradient(90deg, #060606 0%, #080808 35%, #0A0A0A 100%),
    radial-gradient(
      ellipse 80% 60% at 50% 40%,
      #0C0C0C 0%,
      #070707 50%,
      #050505 100%
    );
}
```

**Apply to ChatView:**
```tsx
// Current:
<div className="flex-1 flex flex-col min-h-0 overflow-hidden premium-ombre-bg">

// Updated:
<div className="flex-1 flex flex-col min-h-0 overflow-hidden chat-panel-gradient">
```

This layers the left→right gradient on top of the existing radial vignette for subtle directional depth.

---

## Implementation Summary

### Dashboard.tsx Changes (lines 118-121)

```tsx
<main className={cn(
  "flex-1 flex flex-col min-h-0 relative",
  sidebarOpen ? "lg:pl-[304px]" : "lg:pl-[72px]"
)}>
```

### ChatView.tsx Changes (around line 128-129)

Wrap the message list in a centered container:

```tsx
<ScrollArea className="flex-1 overflow-x-hidden" ref={scrollRef}>
  <div className="min-h-full py-6">
    <div className="max-w-[1040px] mx-auto px-6 lg:px-8 space-y-4">
      {filteredMessages.map((message, index) => (
        // ... existing message rendering
      ))}
      
      {/* Loading indicator moved inside centered container */}
      {/* Research progress moved inside centered container */}
      {/* Empty state moved inside centered container */}
    </div>
  </div>
</ScrollArea>
```

Apply the new gradient class:
```tsx
<div className="flex-1 flex flex-col min-h-0 overflow-hidden chat-panel-gradient">
```

### ChatMessage.tsx Changes

**AI messages (around line 324):**
```tsx
<div className="flex justify-start pl-3 lg:pl-4">
  <div className="max-w-[65%] rounded-[20px] px-5 py-4 graphite-bubble-ai">
```

**User messages (around line 258):**
```tsx
<div className="flex justify-end">
  <div className="max-w-[55%] rounded-[20px] px-5 py-4 graphite-bubble-user">
```

**Placeholder messages (around line 275):**
```tsx
<div className="flex justify-start pl-3 lg:pl-4">
  <div className="max-w-[65%] rounded-[20px] px-5 py-4 graphite-bubble-ai">
```

**Error messages (around line 297):**
```tsx
<div className="flex justify-start pl-3 lg:pl-4">
  <div className="max-w-[65%] ...">
```

### index.css Changes

**Add new gradient class (after line 479):**

```css
/* Subtle left→right gradient for chat panel depth */
.chat-panel-gradient {
  background: 
    linear-gradient(90deg, #060606 0%, #080808 35%, #0A0A0A 100%),
    radial-gradient(
      ellipse 80% 60% at 50% 40%,
      #0C0C0C 0%,
      #070707 50%,
      #050505 100%
    );
}
```

**Soften graphite-glass border (around line 482-486):**

```css
.graphite-glass {
  background: linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-right-color: rgba(255, 255, 255, 0.03);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.50);
}
```

---

## Visual Comparison

```text
BEFORE:
┌─────────────────────────────────────────────────────────────────────┐
│ [Sidebar]│[Chat bubbles crammed against left edge]                  │
│          │ ┌────────────────────────────────────────────────────┐   │
│          │ │ Wide AI bubble (72%) no breathing room            │   │
│          │ └────────────────────────────────────────────────────┘   │
│          │                                                          │
│          │               ┌──────────────────────────────────────┐   │
│          │               │ Wide user bubble (72%)               │   │
│          │               └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────────────────────────────────┐
│[Sidebar]░░░░│      [Centered column with max-width 1040px]          │
│         soft│                                                        │
│         fade│   ┌──────────────────────────────────┐                │
│             │   │ AI bubble (65%) with left inset  │                │
│             │   └──────────────────────────────────┘                │
│      gutter │                                                        │
│       32px  │              ┌────────────────────────┐               │
│             │              │ User bubble (55%)      │               │
│             │              └────────────────────────┘               │
│             │              [Subtle L→R gradient adds depth]         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

| Requirement | Implementation |
|-------------|----------------|
| AI bubbles not glued to sidebar | 32px gutter + 12-16px AI inset |
| Comfortable breathing room | Centered column with max-width 1040px |
| No horizontal scrolling | Keep `overflow-x-hidden` + `overflow-wrap: anywhere` |
| Readable bubble widths | AI: 65%, User: 55% |
| Soft divider | Border reduced to 5% opacity, right edge 3% |
| Subtle left→right gradient | Layered gradient adds directional depth |

---

## Responsive Behavior

| Breakpoint | Gutter Size | Bubble Max-Width |
|------------|-------------|------------------|
| Desktop (lg+) | 32px | AI: 65%, User: 55% |
| Tablet (md) | 24px | AI: 70%, User: 60% |
| Mobile | 16px padding | AI: 85%, User: 80% |

The centered message column naturally adapts as viewport shrinks. On mobile, the sidebar is hidden, so the full width is available for the chat column.
