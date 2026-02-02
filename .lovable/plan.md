
# Domain Pages Premium Grayscale Redesign

## Overview

Redesign all domain pages (`/domain/fashion`, `/domain/beauty`, etc.) to match the premium grayscale dashboard/chat system. The main issue is the jarring white "What's Happening Now" section that breaks visual consistency.

---

## Current Issues

| Component | Problem |
|-----------|---------|
| `DomainLanding.tsx` | Uses `bg-background` (light theme) instead of dark base |
| `DomainHero.tsx` | Input doesn't match dashboard composer styling |
| `DomainInsights.tsx` | Uses `bg-card` (white) and light card styling - **main culprit** |
| `DomainModules.tsx` | Close but could better align with premium token system |

---

## Color System (Matching Dashboard)

### Page Foundation
| Element | Value |
|---------|-------|
| Page background | `#070707` |
| Section background | `#0B0B0B` or gradient `#0A0A0A → #070707` |
| Panel/card gradient | `linear-gradient(180deg, #232323 0%, #191919 100%)` |

### Feed Cards (Graphite Style)
| Element | Value |
|---------|-------|
| Card bg | `linear-gradient(180deg, #232323 0%, #191919 100%)` |
| Card border | `rgba(255,255,255,0.12)` |
| Card shadow | `0 14px 40px rgba(0,0,0,0.55)` |
| Card radius | `20px` |

### Text Colors
| Element | Value |
|---------|-------|
| Title | `rgba(255,255,255,0.92)` |
| Description | `rgba(255,255,255,0.72)` |
| Meta (source/date) | `rgba(255,255,255,0.50)` |

### Input & Chips
| Element | Value |
|---------|-------|
| Input bg | `linear-gradient(180deg, #1B1B1B 0%, #111111 100%)` |
| Input border | `rgba(255,255,255,0.10)` |
| Chip default | `#141414` + border `rgba(255,255,255,0.10)` |
| Chip hover | `#1A1A1A` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DomainLanding.tsx` | Dark background (`#070707`), consistent layout |
| `src/components/domain/DomainHero.tsx` | Premium input styling, reduced height, graphite chips |
| `src/components/domain/DomainInsights.tsx` | Dark section + graphite cards (main fix) |
| `src/components/domain/DomainModules.tsx` | Align with premium token system |
| `src/index.css` | Add domain-specific utility classes |

---

## 1. DomainLanding.tsx Updates

### Change page background to dark

```tsx
// Current (line 94):
<div className="min-h-screen bg-background flex flex-col">

// Updated:
<div className="min-h-screen bg-[#070707] flex flex-col overflow-x-hidden">
```

### Consistent structure

The page structure is already good - Hero → Insights → Modules. Just need to ensure consistent dark theming flows through.

---

## 2. DomainHero.tsx Updates

### Reduce vertical height

```tsx
// Current (line 86):
<div className="... pt-16 md:pt-24 pb-20 md:pb-28">

// Updated - reduce bottom padding:
<div className="... pt-12 md:pt-16 pb-12 md:pb-16">
```

### Match input to dashboard composer

```tsx
// Current input styling (lines 106-111):
"bg-white/10 border-white/20 text-white placeholder:text-white/50"

// Updated - match premium-input from dashboard:
className={cn(
  "min-h-[56px] max-h-[120px] resize-none pr-14",
  "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
  "border border-white/[0.10]",
  "text-white/[0.88] placeholder:text-white/40",
  "focus:border-white/[0.18] focus-visible:ring-0",
  "text-[15px] rounded-[20px]",
  "shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
)}
```

### Match suggestion chips to graphite pill style

```tsx
// Current chip styling (lines 135-139):
"border border-white/30 text-white/80"
"hover:bg-white hover:text-black"

// Updated - graphite pill style:
className={cn(
  "text-[13px] px-4 py-2 rounded-full",
  "bg-[#141414] border border-white/[0.10]",
  "text-white/78",
  "hover:bg-[#1A1A1A] hover:border-white/[0.15]",
  "active:bg-[#1C1C1C] active:border-white/[0.18]",
  "transition-all duration-150"
)}
```

---

## 3. DomainInsights.tsx Updates (Main Fix)

### Change section background to dark

```tsx
// Current (line 127):
<section className="w-full max-w-6xl mx-auto px-6 md:px-8 py-12 md:py-14">

// Updated - dark background section:
<section className="w-full bg-[#0B0B0B]">
  <div className="max-w-[1120px] mx-auto px-7 py-12 md:py-14">
```

### Update section header styling

```tsx
// Current (lines 130-131):
<h2 className="font-editorial text-2xl md:text-3xl text-foreground">

// Updated - white text on dark:
<h2 className="font-editorial text-2xl md:text-3xl text-white/[0.92]">
```

### Convert cards from white to graphite

```tsx
// Current card styling (lines 198-201):
className={cn(
  "group p-6 md:p-8 border border-border rounded-2xl",
  "bg-card transition-colors duration-200"
)}

// Updated - graphite card styling:
className={cn(
  "group p-6 rounded-[20px]",
  "bg-gradient-to-b from-[#232323] to-[#191919]",
  "border border-white/[0.12]",
  "shadow-[0_14px_40px_rgba(0,0,0,0.55)]",
  "transition-all duration-200",
  "hover:border-white/[0.18]"
)}
```

### Update card text colors

```tsx
// Title (line 222-223):
// Current: text-foreground
// Updated: text-white/[0.92]

// Description (line 233):
// Current: text-foreground/70
// Updated: text-white/[0.72]

// Meta/date (line 238):
// Current: text-muted-foreground
// Updated: text-white/50
```

### Update confidence badge styling

```tsx
// Current getConfidenceBadge (lines 85-92):
const styles = {
  high: 'bg-foreground/10 text-foreground border-foreground/20',
  medium: 'bg-muted text-muted-foreground border-muted-foreground/20',
  low: 'bg-muted/50 text-muted-foreground/70 border-muted-foreground/10',
};

// Updated - graphite badge style:
const styles = {
  high: 'bg-[#141414] text-white/78 border-white/[0.12]',
  medium: 'bg-[#141414] text-white/65 border-white/[0.10]',
  low: 'bg-[#141414] text-white/50 border-white/[0.08]',
};
```

### Update Live/Predictive badges

```tsx
// Current (lines 135-145):
<Badge variant="outline" className="... border-foreground/20">

// Updated - graphite style:
<Badge variant="outline" className="text-[11px] px-2 py-0.5 h-5 bg-[#141414] text-white/78 border-white/[0.12]">
```

### Update refresh button

```tsx
// Current (lines 155-163):
<Button variant="ghost" className="... text-muted-foreground hover:text-foreground">

// Updated - graphite button:
<Button
  variant="ghost"
  size="sm"
  onClick={onRefresh}
  className="h-9 px-3 bg-[#141414] border border-white/[0.10] text-white/70 hover:bg-[#1A1A1A] hover:text-white/90 rounded-lg"
>
```

### Update loading skeleton

```tsx
// Current (lines 168-179):
<div className="p-6 md:p-8 border border-border rounded-2xl bg-card">

// Updated - graphite skeleton container:
<div className="p-6 rounded-[20px] bg-gradient-to-b from-[#232323] to-[#191919] border border-white/[0.12]">
  <Skeleton className="h-5 w-3/4 mb-3 bg-white/10" />
  <Skeleton className="h-4 w-full mb-4 bg-white/10" />
  ...
</div>
```

---

## 4. DomainModules.tsx Updates

### Align with premium system

The modules section is already dark (`bg-foreground`). Update to use exact hex values:

```tsx
// Current (line 331):
<div className="bg-foreground">

// Updated - explicit hex:
<div className="bg-[#0A0A0A]">
```

### Update module card styling

```tsx
// Current (lines 346-349):
className={cn(
  "group text-left p-5 rounded-xl border border-background/20",
  "bg-background/10 transition-all duration-200",
  "hover:bg-background/20 hover:border-background/40"
)}

// Updated - match graphite card language:
className={cn(
  "group text-left p-5 rounded-[18px]",
  "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
  "border border-white/[0.10]",
  "transition-all duration-200",
  "hover:bg-gradient-to-b hover:from-[#202020] hover:to-[#181818]",
  "hover:border-white/[0.18]"
)}
```

### Update text colors

```tsx
// Icon (line 353):
// Current: text-background/50 group-hover:text-background
// Updated: text-white/50 group-hover:text-white

// Title (line 360):
// Current: text-background
// Updated: text-white/[0.92]

// Description (line 363):
// Current: text-background/60
// Updated: text-white/60
```

---

## 5. index.css Updates

### Add domain-specific utility classes

```css
/* Domain page feed section background */
.domain-feed-section {
  background: linear-gradient(180deg, #0B0B0B 0%, #090909 50%, #070707 100%);
}

/* Domain page graphite card - matches chat bubbles */
.domain-card {
  background: linear-gradient(180deg, #232323 0%, #191919 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.55);
  border-radius: 20px;
  transition: all 160ms ease;
}

.domain-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
}

/* Graphite pill/chip for suggestion chips and badges */
.graphite-pill {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.10);
  transition: all 160ms ease;
}

.graphite-pill:hover {
  background: #1A1A1A;
  border-color: rgba(255, 255, 255, 0.15);
}

/* Module card - slightly different gradient for hierarchy */
.domain-module-card {
  background: linear-gradient(180deg, #1A1A1A 0%, #141414 100%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  transition: all 160ms ease;
}

.domain-module-card:hover {
  background: linear-gradient(180deg, #202020 0%, #181818 100%);
  border-color: rgba(255, 255, 255, 0.18);
}
```

---

## Visual Comparison

### Before (Current State)
```text
┌─────────────────────────────────────────────────────────────────────┐
│  [DARK HERO - "Fashion" title + input]                              │
│  bg-black                                                            │
├─────────────────────────────────────────────────────────────────────┤
│  [WHITE SECTION - "What's Happening Now"]                           │
│  bg-card (white), white cards ← JARRING CONTRAST                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                         │
│  │ White     │ │ White     │ │ White     │                         │
│  │ Card      │ │ Card      │ │ Card      │                         │
│  └───────────┘ └───────────┘ └───────────┘                         │
├─────────────────────────────────────────────────────────────────────┤
│  [DARK SECTION - Intelligence Modules]                              │
│  bg-foreground (dark) - OK                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### After (Redesigned)
```text
┌─────────────────────────────────────────────────────────────────────┐
│  [DARK HERO - Reduced height, premium input]                        │
│  bg-black → gradient                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Graphite input bar (from-#1B1B1B to-#111111)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [Graphite chips] [Graphite chips]                                  │
├─────────────────────────────────────────────────────────────────────┤
│  [DARK SECTION - "What's Happening Now"]                            │
│  bg-[#0B0B0B] - seamless transition                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                         │
│  │ Graphite  │ │ Graphite  │ │ Graphite  │                         │
│  │ Card      │ │ Card      │ │ Card      │                         │
│  │ #232323   │ │ #232323   │ │ #232323   │                         │
│  └───────────┘ └───────────┘ └───────────┘                         │
├─────────────────────────────────────────────────────────────────────┤
│  [DARK SECTION - Intelligence Modules]                              │
│  bg-[#0A0A0A] - consistent                                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │ Module    │ │ Module    │ │ Module    │ │ Module    │          │
│  │ #1A1A1A   │ │ #1A1A1A   │ │ #1A1A1A   │ │ #1A1A1A   │          │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Reusable Template Architecture

The current architecture is already template-based via `DomainLanding.tsx` which uses:
- `useSector()` for domain config (title, tagline, placeholder)
- `DOMAIN_STARTERS` for suggestion chips
- `domainModules` in DomainModules.tsx for domain-specific modules

This remains the same - only the visual styling changes to be consistently dark.

### Domain Configuration (Already Exists)

```tsx
// SectorContext.tsx provides:
- config.label → Hero title
- config.placeholder → Input placeholder
- config.tagline → Subtitle

// DOMAIN_STARTERS provides:
- Suggestion chips per domain

// domainModules in DomainModules.tsx provides:
- Module cards per domain
```

No architectural changes needed - just visual styling updates.

---

## Acceptance Checklist

| Requirement | Implementation |
|-------------|----------------|
| No white sections | All sections use dark backgrounds (#070707, #0B0B0B, #0A0A0A) |
| Graphite cards in feed | `linear-gradient(180deg, #232323 0%, #191919 100%)` |
| Premium input styling | Matches dashboard composer exactly |
| Graphite chips | `#141414` default, `#1A1A1A` hover |
| Consistent spacing | Centered containers with max-width and padding |
| Single template | All domains use same DomainLanding with config differences |
| Typography consistent | Serif only in hero title, UI font elsewhere |
| No horizontal scrolling | `overflow-x-hidden` on root container |

---

## Technical Summary

### Files Modified
| File | Change Type |
|------|-------------|
| `src/pages/DomainLanding.tsx` | Background color update |
| `src/components/domain/DomainHero.tsx` | Input styling, chip styling, reduced height |
| `src/components/domain/DomainInsights.tsx` | Dark section, graphite cards, text colors |
| `src/components/domain/DomainModules.tsx` | Align card styling with premium system |
| `src/index.css` | Add domain utility classes |

### CSS Utility Classes Added
- `.domain-feed-section` - Feed section background
- `.domain-card` - Graphite card styling
- `.graphite-pill` - Chip/badge styling
- `.domain-module-card` - Module card styling
