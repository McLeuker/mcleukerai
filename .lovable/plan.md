

## Remove Black Background - Show Image at 80% Opacity

Updating the hero section to display the background image prominently without any black color, keeping text readable.

---

## Changes

### File: `src/components/domain/DomainHero.tsx`

**Line 98** - Remove `bg-black` from section:
```tsx
// Before
<section className="relative w-full bg-black overflow-hidden">

// After
<section className="relative w-full overflow-hidden">
```

**Line 101** - Change image opacity from 20% to 80%:
```tsx
// Before
className="absolute inset-0 bg-cover bg-center opacity-20"

// After
className="absolute inset-0 bg-cover bg-center opacity-80"
```

**Lines 105-106** - Delete the dark overlay entirely:
```tsx
// Remove this completely
{/* Dark overlay for text contrast */}
<div className="absolute inset-0 bg-black/60" />
```

---

## Visual Result

```text
┌─────────────────────────────────────────────────────────┐
│  ████████████████████████████████████████████████████  │
│  ████████ BACKGROUND IMAGE (80% opacity) ████████████  │
│  ████████████████████████████████████████████████████  │
│                                                         │
│                       Fashion                           │
│        Runway signals, silhouettes & street style       │
│                                                         │
│         ┌─────────────────────────────────┐             │
│         │ Ask about fashion trends...   ↑ │             │
│         └─────────────────────────────────┘             │
│                                                         │
│         [Chip 1] [Chip 2] [Chip 3] [Chip 4]             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    WHITE (unchanged)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

| Line | Change |
|------|--------|
| 98 | Remove `bg-black` from section class |
| 101 | Change `opacity-20` to `opacity-80` |
| 105-106 | Delete the dark overlay div completely |

The image will be the main visual at 80% opacity with white text over it.

