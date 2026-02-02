
# Dashboard Dark-First Redesign Plan

## Current State Analysis

The dashboard currently has:
- **White L-shape**: Sidebar (`bg-sidebar`) + TopNavigation (`bg-sidebar`) - this should remain
- **Light input area**: Bottom footer with `bg-background/95` - currently light, needs to be black
- **Header spacer**: `bg-sidebar` (beige) between nav and content
- **Two inputs**: One in `DomainStarterPanel` (for "All Domains"), another in the bottom footer (always visible)
- **ChatView**: Has light backgrounds in filter bar and loading states
- **Centering**: Currently uses screen-relative centering via `max-w-3xl mx-auto`

---

## Implementation Summary

| Change | Files Affected |
|--------|---------------|
| Remove bottom input for all domains | `Dashboard.tsx` |
| Make main content area black | `Dashboard.tsx`, `ChatView.tsx` |
| Dark-theme input styling | `ChatInput.tsx` |
| Dark-theme mode toggles | `ResearchModeToggle.tsx`, `ModelSelector.tsx` |
| Increase New Chat button size by 8% | `TopNavigation.tsx` |
| Fix centering within black box | `Dashboard.tsx`, `ChatView.tsx` |
| Add dark utility classes | `index.css` |

---

## Detailed Changes

### 1. Dashboard.tsx - Main Layout

**Remove bottom input when on "All Domains"**:
The `DomainStarterPanel` already has an integrated search bar for the "all" sector. The bottom `ChatInput` should only appear when there are messages OR when viewing a specific domain.

```text
Current:
┌────────────────────────────────────────────┐
│  [Sidebar]  │  [Black Content Area]        │
│             │  ┌──────────────────────┐    │
│             │  │  DomainStarterPanel  │    │
│             │  │  (with input)        │    │
│             │  └──────────────────────┘    │
│             │  ┌──────────────────────┐    │
│             │  │  ChatInput (bottom)  │ ← DELETE for "all"
│             │  └──────────────────────┘    │
└────────────────────────────────────────────┘

After:
┌────────────────────────────────────────────┐
│  [Sidebar]  │  [Black Content Area]        │
│  (white)    │  ┌──────────────────────┐    │
│             │  │  DomainStarterPanel  │    │
│             │  │  (centered input)    │    │
│             │  └──────────────────────┘    │
│             │  [NO bottom input]           │
└────────────────────────────────────────────┘
```

**Background changes**:
- Change `bg-background` → `bg-black` for main wrapper
- Header spacer: `bg-sidebar` → `bg-black` (or remove if not needed)
- Input area footer: `bg-background/95` → `bg-black border-white/10`

**Centering fix**:
Content currently uses `max-w-3xl mx-auto` which centers relative to full width. Instead, the black content area should be its own flex container with centered children.

### 2. ChatInput.tsx - Dark Theme Restyling

Transform from light to dark:

```text
Before                          After
┌─────────────────────┐        ┌─────────────────────┐
│ bg-background       │   →    │ bg-black            │
│ border-border       │   →    │ border-white/15     │
│ text-foreground     │   →    │ text-white          │
│ placeholder: gray   │   →    │ placeholder: white/40│
│ button: bg-muted    │   →    │ button: bg-white/10 │
└─────────────────────┘        └─────────────────────┘
```

**Specific changes**:
- Textarea: `bg-black border border-white/15 text-white placeholder:text-white/40`
- Send button active: `bg-white text-black` (inverted for visibility)
- Send button disabled: `bg-white/10 text-white/40`
- Research mode toggle background: `bg-white/10` instead of `bg-muted`
- Model selector: white text on dark

### 3. ChatView.tsx - Dark Theme

**Filter bar** (when messages exist):
- Current: `bg-background/50 border-border`
- New: `bg-black border-white/10`

**Loading indicator**:
- Current: `bg-muted/30`
- New: `bg-white/5` or transparent with white/10 border

**Message area scroll**:
- Already inherits from parent, but ensure no light backgrounds leak through

### 4. ResearchModeToggle.tsx - Dark Theme

**Container**:
- Current: `bg-muted` (light gray)
- New: `bg-white/10` (subtle dark)

**Active button**:
- Current: `bg-background text-foreground`
- New: `bg-white text-black` (inverted for contrast)

**Inactive button**:
- Current: `text-muted-foreground`
- New: `text-white/60 hover:text-white`

### 5. TopNavigation.tsx - New Chat Button Size Increase

Current button classes:
```
px-3 py-1.5 h-auto text-xs
```

Increase by ~8%:
```
px-3.5 py-2 h-auto text-[13px]
```

This maintains the pill shape while making it slightly more prominent.

### 6. DomainStarterPanel.tsx - Minor Adjustments

The "All Domains" hero is already dark. Ensure:
- Input maintains dark styling
- Topic buttons have subtle white/10-20 borders
- No white backgrounds anywhere

### 7. index.css - Add Dark Dashboard Utilities

Add utility classes for consistent dark theme:

```css
/* Dashboard dark theme */
.dashboard-dark-input {
  @apply bg-black border border-white/15 text-white;
  @apply placeholder:text-white/40;
  @apply focus:border-white/30 focus:ring-white/10;
}

.dashboard-dark-button {
  @apply bg-white/10 text-white/80;
  @apply hover:bg-white/15 hover:text-white;
  @apply border border-white/10;
}

.dashboard-dark-button-active {
  @apply bg-white text-black;
  @apply hover:bg-white/90;
}
```

---

## Visual Architecture After Redesign

```text
┌─────────────────────────────────────────────────────┐
│  TopNavigation (bg-sidebar/beige)                   │
│  [Logo] [+New Chat 8% bigger] [Tabs] [Credits][👤] │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │  ████████████████████████████████████   │
│ (beige)  │  ██                                ██   │
│          │  ██    [centered within black]     ██   │
│ Chat     │  ██                                ██   │
│ History  │  ██   "Where is my mind?"          ██   │
│          │  ██                                ██   │
│ [bubbles]│  ██   [Quick] [Deep] | [Model]     ██   │
│          │  ██                                ██   │
│          │  ██   ┌───────────────────────┐    ██   │
│          │  ██   │ Ask anything...   [→] │    ██   │
│          │  ██   └───────────────────────┘    ██   │
│          │  ██        (dark input)            ██   │
│          │  ██                                ██   │
│          │  ██   [topic] [topic] [topic]      ██   │
│          │  ██                                ██   │
│          │  ████████████████████████████████████   │
│          │                                          │
│          │  (NO SECOND INPUT - removed)             │
└──────────┴──────────────────────────────────────────┘

Legend:
- ████ = Pure black (#000)
- beige = bg-sidebar (the white L-shape)
- All borders within black area = white at 10-15% opacity
```

---

## Component-by-Component File Changes

### File: `src/pages/Dashboard.tsx`

1. **Line 72**: Change `bg-background` → `bg-black`
2. **Line 94**: Header spacer - change `bg-sidebar` → `bg-black` 
3. **Lines 137-147**: Conditionally hide bottom input when `currentSector === "all"` AND `messages.length === 0`
4. **Line 138**: Change input area footer from `bg-background/95` → `bg-black border-t border-white/10`

### File: `src/components/dashboard/ChatInput.tsx`

1. **Lines 98-103**: Textarea styling - add dark variant classes
2. **Lines 110-115**: Button styling - invert colors for dark theme
3. **Line 127**: Credit hint text - use `text-white/50` instead of `text-muted-foreground`

### File: `src/components/dashboard/ChatView.tsx`

1. **Line 78**: Filter bar - change `bg-background/50` → `bg-black border-white/10`
2. **Line 169**: Loading indicator - change `bg-muted/30` → `bg-white/5`

### File: `src/components/dashboard/ResearchModeToggle.tsx`

1. **Line 25**: Container - change `bg-muted` → `bg-white/10`
2. **Lines 33-36**: Active state - change to `bg-white text-black`
3. **Line 37**: Inactive text - change to `text-white/60`

### File: `src/components/layout/TopNavigation.tsx`

1. **Lines 117-122**: New Chat button - increase padding and font size by ~8%
   - `px-3` → `px-3.5`
   - `py-1.5` → `py-2`
   - `text-xs` → `text-[13px]`
   - Icon: `h-3.5 w-3.5` → `h-4 w-4`

### File: `src/components/dashboard/DomainStarterPanel.tsx`

1. **Lines 88-95**: Ensure input has explicit dark classes (already partially dark)
2. **Lines 113-125**: Topic buttons - verify border is `border-white/20` not `border-white/30`

### File: `src/index.css`

Add new utility classes for dashboard dark theme consistency.

---

## Acceptance Criteria Checklist

| Requirement | Implementation |
|-------------|----------------|
| Everything black except white L-shape | Main container `bg-black`, sidebar/nav stay `bg-sidebar` |
| Only one input exists | Hide bottom ChatInput when `currentSector === "all"` && no messages |
| Content centered within black box only | Use flex centering relative to content area, not screen |
| New Chat bubble ~8% bigger | Increase px/py/font by ~8% |
| No white panels/strips remain | Replace all `bg-background`, `bg-muted`, `bg-card` with dark equivalents |
| Subtle borders for separation | Use `border-white/10` to `border-white/20` |
| Hover states: outline/brightness only | No `hover:bg-white`, use `hover:bg-white/10` or `hover:brightness-110` |

---

## Technical Notes

### Centering Strategy

The key insight is that centering should be calculated relative to the **visible black content area**, not the full viewport. This means:

```jsx
// Current (wrong - centers relative to full width)
<div className="max-w-3xl mx-auto">

// Correct approach - content area is its own flex container
<main className="flex-1 flex flex-col items-center justify-center">
  <div className="w-full max-w-2xl">
    {/* Content naturally centers within black area */}
  </div>
</main>
```

### Color Reference

| Element | Current | New |
|---------|---------|-----|
| Main background | `bg-background` (white) | `bg-black` |
| Input background | `bg-background` | `bg-black` |
| Input border | `border-border` | `border-white/15` |
| Input text | `text-foreground` | `text-white` |
| Placeholder | `text-muted-foreground/60` | `text-white/40` |
| Active button | `bg-foreground text-background` | `bg-white text-black` |
| Inactive button | `bg-muted text-muted-foreground` | `bg-white/10 text-white/60` |
| Separator borders | `border-border` | `border-white/10` |
