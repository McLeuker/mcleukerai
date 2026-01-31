

## Domain Landing Page Redesign

This plan restructures the `/domain/:domain` page with a sleek two-tone layout: black hero with integrated AI search bar at top, white content sections below.

---

## Current vs. New Layout

**Current Order:**
1. Hero (black gradient with grain texture)
2. Insights (white)
3. Modules (white)
4. Fixed Ask Bar at bottom

**New Order:**
1. Hero with integrated AI Search Bar (solid black, sleek - no grain)
2. Insights (white)
3. Modules (white)
4. Remove fixed bottom bar (search is now at top)

---

## Visual Design Changes

### Hero Section (Black)
- Remove grainy texture overlay completely
- Solid black background (`bg-black`) - clean and sleek
- Integrate AI search bar directly into hero
- Search bar: white/light styling to contrast against black
- Suggestion chips below search input
- Keep serif title and tagline

### Content Sections (White)
- Pure white background
- Keep current card styling for Insights and Modules
- Clean separation between black top and white bottom

---

## File Changes

### 1. `src/pages/DomainLanding.tsx`
- Remove the `<DomainAskBar>` component from the bottom
- Pass `starters` and `onSubmit` props to `DomainHero` instead
- Remove fixed bottom bar entirely

### 2. `src/components/domain/DomainHero.tsx`
- **Remove grain overlay** (delete the SVG texture div)
- Change background from gradient to solid black (`bg-black`)
- **Add integrated search bar** with:
  - White/light input field
  - Suggestion chips (light styling on dark background)
  - Submit button
- Accept new props: `starters`, `onSubmit`, `placeholder`
- Increase hero height to accommodate search section

### 3. `src/components/domain/DomainAskBar.tsx`
- No changes needed (will no longer be used on domain pages)
- Kept for potential reuse elsewhere

---

## New Hero Layout

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    SOLID BLACK                          │
│                                                         │
│   Fashion                                               │
│   (serif, 7xl-8xl, white)                               │
│                                                         │
│   Runway signals, silhouettes & street style            │
│   (sans, muted white)                                   │
│                                                         │
│   ─────────────────────────────────────────────         │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │ Ask about fashion trends...                   ↑ │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   [Runway Analysis] [Brand Positioning] [Street Style]  │
│   (light chips on dark background)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    WHITE BACKGROUND                     │
│                                                         │
│   What's Happening Now                                  │
│   ─────────────────────────────────────────────         │
│   [ Intelligence Cards ]                                │
│                                                         │
│   Intelligence Modules                                  │
│   ─────────────────────────────────────────────         │
│   [ Module Grid ]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Styling Details

### Search Bar in Hero (on black)
- Input: `bg-white/10 border-white/20 text-white placeholder:text-white/50`
- On focus: `border-white/40`
- Submit button: `bg-white text-black`
- Chips: `border-white/30 text-white/80 hover:bg-white hover:text-black`

### Remove Grain
- Delete the grain overlay div with the SVG background
- Result: clean, sleek solid black hero

### Bottom Fade
- Keep subtle gradient fade from black to white for smooth transition

---

## Technical Notes

- `DomainAskBar` component remains in codebase but unused on domain pages
- All search functionality moves into `DomainHero`
- Same `onSubmit` handler routes to dashboard with pre-filled prompt
- Props passed through `DomainLanding` → `DomainHero`

