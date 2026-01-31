

## Domain Hero Layout Fixes

Adjusting the hero section based on your feedback: center alignment, straight line separation, and cleaner black/white division.

---

## Changes

### 1. Center All Content in Hero

**File:** `src/components/domain/DomainHero.tsx`

Currently left-aligned, will center:
- Title (h1) → add `text-center`
- Tagline (p) → add `text-center mx-auto`
- Search bar container → add `mx-auto` (already has `max-w-2xl`)
- Suggestion chips → add `justify-center`

### 2. Remove Gradient Fade

**File:** `src/components/domain/DomainHero.tsx`

Delete the bottom fade div:
```jsx
{/* Remove this entirely */}
<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
```

This creates a clean straight line between black hero and white content.

### 3. Ensure White Background Below

The `DomainInsights` and `DomainModules` sections already have white backgrounds via `bg-background` and `bg-card`. The straight line will be the natural edge of the black hero section.

---

## Visual Result

```text
┌─────────────────────────────────────────────────────────┐
│                    SOLID BLACK                          │
│                                                         │
│                    Sustainability                       │
│                      (centered)                         │
│                                                         │
│      Circularity, materials & supply chain...           │
│                      (centered)                         │
│                                                         │
│         ┌─────────────────────────────────┐             │
│         │ Ask about sustainability...   ↑ │             │
│         └─────────────────────────────────┘             │
│                                                         │
│      [Chip 1] [Chip 2] [Chip 3] [Chip 4]                │
│                   (centered)                            │
│                                                         │
├─────────────────────────────────────────────────────────┤  ← Straight line
│                    WHITE                                │
│                                                         │
│   What's Happening Now                                  │
│   [ Intelligence Cards ]                                │
│                                                         │
│   Intelligence Modules                                  │
│   [ Module Grid ]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Code Changes Summary

| Line | Current | Change |
|------|---------|--------|
| 88 | `<h1 className="font-editorial...">` | Add `text-center` |
| 91-92 | `<p className="...max-w-2xl">` | Add `text-center mx-auto` |
| 97 | `<div className="max-w-2xl">` | Add `mx-auto` |
| 130 | `<div className="flex flex-wrap gap-2">` | Add `justify-center` |
| 151-152 | Gradient fade div | Delete entirely |

