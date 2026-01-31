

## Visual Redesign: Domain Landing Page (`/domain/fashion`)

This plan applies an editorial fashion layout while keeping all existing sections, order, and content intact.

---

## Current Structure (Preserved)

1. **DomainHero** - Hero section with title and tagline
2. **DomainInsights** - "What's Happening Now" intelligence cards
3. **DomainModules** - Intelligence module grid
4. **DomainAskBar** - Fixed bottom prompt bar with suggestions

---

## Design Changes Overview

### 1. Typography Hierarchy

| Element | Current | Proposed |
|---------|---------|----------|
| Page title (Hero) | `font-editorial text-4xl-7xl` | `font-editorial text-5xl md:text-7xl lg:text-8xl tracking-tight` |
| Section headers | `text-xs uppercase` | `font-editorial text-2xl md:text-3xl` (serif, sentence case) |
| Card titles | `text-[15px] font-medium` | `text-base font-medium` (sans) |
| Body text | `text-sm` | `text-[15px] leading-relaxed` |
| Meta/labels | `text-xs` | `text-[11px] uppercase tracking-widest` |

### 2. Whitespace & Grid

- Hero padding: increase from `py-10` to `py-16 md:py-24`
- Section padding: increase from `py-10 md:py-14` to `py-16 md:py-20`
- Max width: keep `max-w-5xl` but add consistent `px-6 md:px-8`
- Card gaps: increase from `gap-4` to `gap-6`
- Vertical rhythm: minimum `24px` between text blocks

### 3. Accent Color System

Single accent: **foreground (black in light mode, white in dark mode)**

Applied to:
- Active buttons and links
- Active/hover chips in DomainAskBar
- Refresh button hover state
- Module card hover border

All other interactive elements remain neutral (grey borders, muted backgrounds).

### 4. AI Interface Card Styling

Wrap AI-related elements in a distinct card style:

```css
.ai-interface-card {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  border-radius: 16px;
  padding: 24px 32px;
}
```

Applied to:
- **DomainAskBar** (bottom prompt bar): wrap entire input area
- **DomainInsights cards** (AI output): wrap each intelligence item
- **DomainModules** (AI prompts): wrap entire module grid section

---

## File-by-File Changes

### `src/components/domain/DomainHero.tsx`

**Changes:**
- Increase hero min-height from `280px/360px` to `320px/420px`
- Larger title typography: `text-5xl md:text-7xl lg:text-8xl`
- Add more bottom padding for breathing room
- Tagline: increase from `text-base/lg` to `text-lg md:text-xl` with relaxed leading

### `src/components/domain/DomainInsights.tsx`

**Changes:**
- Section header: change from `text-xs uppercase` to `font-editorial text-2xl md:text-3xl` (editorial serif)
- Increase section padding to `py-16 md:py-20`
- Intelligence cards: apply AI interface card styling (1px border, 16px radius, 24-32px padding)
- Increase card gaps from `space-y-3` to `space-y-6`
- Card titles: keep sans but increase to `text-base`
- Meta row: tighter, use dots consistently, `text-[11px]`

### `src/components/domain/DomainModules.tsx`

**Changes:**
- Section header: change to `font-editorial text-2xl md:text-3xl`
- Increase section padding to `py-16 md:py-20`
- Wrap entire module grid in AI interface card container
- Card grid: increase gaps from `gap-4` to `gap-6`
- Module cards: maintain current style but unify hover with single accent color (border-foreground on hover)
- Remove background color change on hover, keep subtle border only

### `src/components/domain/DomainAskBar.tsx`

**Changes:**
- Wrap inner content in AI interface card styling
- Increase padding from `py-3` to `py-6 md:py-8`
- Starter chips: single accent color on hover (bg-foreground text-background)
- Input area: maintain current style, ensure consistent border radius

---

## Visual Summary

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   HERO (320-420px)                                      │
│   ─────────────────────────────────────────────────     │
│                                                         │
│   Fashion                                               │
│   (serif, 7xl-8xl)                                      │
│                                                         │
│   Runway signals, silhouettes & street style            │
│   (sans, lg-xl, muted)                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  INSIGHTS SECTION (py-20)                               │
│  ─────────────────────────────────────────────────      │
│                                                         │
│  What's Happening Now  (serif, 2xl-3xl)                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ AI CARD (1px border, 16px radius, 24-32px pad)  │    │
│  │                                                 │    │
│  │ Title (sans, base weight medium)               │    │
│  │ Description text (sans, 15px relaxed)          │    │
│  │ · Realtime · Today · Vogue                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  (gap-6 between cards)                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  MODULES SECTION (py-20)                                │
│  ─────────────────────────────────────────────────      │
│                                                         │
│  Intelligence Modules  (serif, 2xl-3xl)                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ AI INTERFACE WRAPPER                            │    │
│  │                                                 │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │    │
│  │  │Module│ │Module│ │Module│ │Module│           │    │
│  │  └──────┘ └──────┘ └──────┘ └──────┘           │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FIXED ASK BAR                                          │
│  ─────────────────────────────────────────────────      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ AI INTERFACE CARD                               │    │
│  │                                                 │    │
│  │ ✦ Suggested                                     │    │
│  │ [chip] [chip] [chip] [chip]                     │    │
│  │                                                 │    │
│  │ ┌─────────────────────────────────────────┐    │    │
│  │ │ Ask about fashion trends...          ↑ │    │    │
│  │ └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Notes

- No new components created
- No new CSS classes added to index.css (uses existing utilities)
- All changes confined to the 4 domain component files
- Accent color uses existing `foreground` variable for consistency
- AI interface card styling uses inline Tailwind classes for simplicity

