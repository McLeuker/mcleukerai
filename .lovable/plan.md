

## Fix Centering & Unify Sidebar Background Color

Two issues to address:
1. "Where is my mind?" content needs to be centered in the **black area only** (not the whole screen)
2. The L-shaped sidebar area has two different backgrounds (white vs beige) - make it all the same beige color

---

## Visual Target

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Logo]                                                      [Credits] [User]│  ← BEIGE (bg-sidebar)
├────────────────────┬─────────────────────────────────────────────────────────┤
│   [+ New Chat]     │   [All] [Fashion] [Beauty] [...]        │ [Credits]    │  ← BEIGE | BLACK
│                    │                                                         │
│ Chat History       │                                                         │
│                    │              ┌─────────────────────┐                    │
│ • Chat 1           │              │ Where is my mind?   │ ← centered in     │
│ • Chat 2           │              │                     │   BLACK area      │
│ • Chat 3           │              │     [Search]        │                    │
│                    │              │     [Topics]        │                    │
│  BEIGE             │              └─────────────────────┘        BLACK       │
└────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## Changes

### 1. Unify L-shaped area to beige (bg-sidebar)

**File: `src/components/layout/TopNavigation.tsx`** (line 100)

Current:
```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
```

Change to:
```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-sidebar backdrop-blur-sm">
```

This changes the top navigation bar from pure white (`bg-background`) to beige (`bg-sidebar`) matching the sidebar below it, and removes the border.

### 2. Center content in black area only

**File: `src/components/dashboard/DomainStarterPanel.tsx`** (lines 52-53)

The problem: Content is centered in the full width, but visually it appears left-shifted because the sidebar takes up space on the left.

Solution: Since the sidebar is ~16rem (256px) wide when open, the content in the black area should be offset by half that amount to appear visually centered in just the black part.

Current:
```tsx
<div className={cn("flex flex-col h-full min-h-[calc(100vh-200px)] bg-black", className)}>
  <div className="flex-1 flex flex-col items-center justify-center px-6">
```

Change to:
```tsx
<div className={cn("flex flex-col h-full min-h-[calc(100vh-200px)] bg-black", className)}>
  <div className="flex-1 flex flex-col items-center justify-center px-6 lg:pl-0 lg:pr-12">
```

Actually, a better approach is to shift the entire content slightly to the right using padding or margin. Since the sidebar is about 16rem, we can add extra left padding on large screens to push content rightward:

```tsx
<div className="flex-1 flex flex-col items-center justify-center px-6 lg:pr-[8rem]">
```

This adds 8rem (half of 16rem sidebar) right padding on desktop, which will shift the centered content rightward so it appears centered in the black area only.

---

## Summary

| File | Change |
|------|--------|
| `TopNavigation.tsx` | Change `bg-background/95` to `bg-sidebar`, remove `border-b` |
| `DomainStarterPanel.tsx` | Add right padding on desktop to offset for sidebar width and center content in black area |

---

## Technical Details

### Color Alignment

- `bg-sidebar` = HSL(0 0% 98%) = #FAFAFA (light beige/off-white)
- `bg-background` = HSL(0 0% 100%) = #FFFFFF (pure white)

Both the top navigation and sidebar will now use `bg-sidebar` (beige) to create a unified L-shape appearance.

### Centering Math

- Sidebar width: 16rem (when open)
- To center content in black area only: add half of sidebar width (8rem) as extra right padding
- This shifts the visual center point to the right, making content appear centered within just the black area

