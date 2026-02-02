
# Site-Wide Premium Grayscale System Unification

## Executive Summary

Unify the entire site (Homepage, About, Pricing, Services, Contact, all `/domain/*` pages, and Dashboard) with a single premium grayscale "graphite/ombré" design system. This requires:

1. **One shared TopNavigation** component used across ALL pages
2. **One shared Footer** component with graphite styling
3. **Fashion-themed hero image** on homepage (royalty-free runway)
4. **Convert all marketing pages** from light to dark grayscale

---

## Current State Analysis

### Navigation Inconsistencies

| Page | Current Nav | Background | Height |
|------|-------------|------------|--------|
| **Landing.tsx** | Custom inline header | Transparent → scrolled gradient | `h-16 lg:h-20` |
| **Dashboard.tsx** | `TopNavigation` | Graphite gradient | `h-14` |
| **DomainLanding.tsx** | `TopNavigation` | Graphite gradient | `h-14` |
| **About.tsx** | `TopNavigation` | Graphite gradient | `h-14` |
| **Services.tsx** | `TopNavigation` | Graphite gradient | `h-14` |
| **Contact.tsx** | `TopNavigation` | Graphite gradient | `h-14` |
| **Pricing.tsx** | Custom inline header | `bg-background` (light) | `h-16` |

### Footer Inconsistencies

| Current State | Problem |
|---------------|---------|
| Uses `bg-background` semantic | Shows light theme, not graphite |
| Uses `text-muted-foreground` | Not consistent with white/grey on dark |
| Uses `border-border` | Light border, not `rgba(255,255,255,0.08)` |

### Marketing Pages Theme Issues

| Page | Background | Sections | Cards |
|------|------------|----------|-------|
| **About.tsx** | `bg-background` (white) | Light `bg-secondary/30` | Light `bg-card` |
| **Services.tsx** | `bg-background` (white) | Light `bg-secondary/30` | Light `bg-card` |
| **Contact.tsx** | `bg-background` (white) | Light sections | Light `bg-card` |
| **Pricing.tsx** | `bg-background` (white) | Light throughout | Light cards |

---

## Unified Design Tokens

### Top Navigation Spec

```css
/* Height */
height: 72px desktop, 64px mobile

/* Background */
background: linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)
border-bottom: 1px solid rgba(255,255,255,0.08)
box-shadow: 0 10px 28px rgba(0,0,0,0.45) /* optional */

/* Padding */
padding: 0 24px (mobile), 0 32px (desktop)
```

### Footer Spec

```css
/* Height */
min-height: 80px desktop, 72px mobile

/* Background */
background: linear-gradient(180deg, #0A0A0A 0%, #070707 100%)
border-top: 1px solid rgba(255,255,255,0.08)

/* Text */
color: rgba(255,255,255,0.58)
hover color: rgba(255,255,255,0.85)

/* Padding */
padding: 24px (mobile), 32px (desktop)
```

### Page Backgrounds

```css
/* Base */
background: #070707

/* Section alternates */
section-a: #070707
section-b: #0A0A0A
section-c: #0B0B0B

/* Panels/Cards */
card-gradient: linear-gradient(180deg, #1A1A1A 0%, #141414 100%)
border: 1px solid rgba(255,255,255,0.10)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/TopNavigation.tsx` | Update height, add marketing-mode variant |
| `src/components/layout/Footer.tsx` | Full graphite redesign |
| `src/pages/Landing.tsx` | Replace custom header with TopNavigation |
| `src/pages/Pricing.tsx` | Replace custom header with TopNavigation, dark theme |
| `src/pages/About.tsx` | Convert to dark graphite theme |
| `src/pages/Services.tsx` | Convert to dark graphite theme |
| `src/pages/Contact.tsx` | Convert to dark graphite theme |

---

## Detailed Implementation

### 1. TopNavigation.tsx Updates

**Add marketing-mode variant and standardize height:**

```tsx
interface TopNavigationProps {
  showSectorTabs?: boolean;
  showCredits?: boolean;
  showNewChat?: boolean;
  onNewChat?: () => void;
  variant?: "app" | "marketing"; // NEW: marketing mode
}
```

**Height standardization:**

```tsx
// Update line 109:
<div className="h-[72px] lg:h-[72px] flex items-center justify-between px-6 lg:px-8">

// Mobile:
<div className="h-16 lg:h-[72px] flex items-center ...">
```

**Marketing variant shows different nav links:**

```tsx
{variant === "marketing" && (
  <nav className="hidden lg:flex items-center gap-10">
    <Link to="/about" className="text-sm text-white/60 hover:text-white/90">About</Link>
    <Link to="/services" className="text-sm text-white/60 hover:text-white/90">Solutions</Link>
    <Link to="/pricing" className="text-sm text-white/60 hover:text-white/90">Pricing</Link>
    <Link to="/contact" className="text-sm text-white/60 hover:text-white/90">Contact</Link>
  </nav>
)}
```

**Active page indicator:**

```tsx
const isActive = (path: string) => location.pathname === path;

<Link 
  to="/about" 
  className={cn(
    "text-sm transition-colors",
    isActive("/about") 
      ? "text-white/90 border-b-2 border-white/[0.18] pb-0.5" 
      : "text-white/60 hover:text-white/90"
  )}
>
  About
</Link>
```

### 2. Footer.tsx - Full Graphite Redesign

**Replace entire component with graphite styling:**

```tsx
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.08] bg-gradient-to-b from-[#0A0A0A] to-[#070707] mt-auto">
      <div className="container mx-auto px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={mcleukerLogo}
              alt="McLeuker AI"
              className="h-8 w-auto"
            />
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-6 lg:gap-8">
            <Link
              to="/about"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              About
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-white/[0.58] hover:text-white/[0.85] transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-white/[0.42]">
            © {currentYear} McLeuker AI
          </p>
        </div>
      </div>
    </footer>
  );
}
```

**Key changes:**
- Background: `bg-gradient-to-b from-[#0A0A0A] to-[#070707]`
- Border: `border-white/[0.08]`
- Text: `text-white/[0.58]` default, `text-white/[0.85]` hover
- Height: ~80px desktop, ~72px mobile (via padding)
- Simplified layout: logo, links, copyright in one row

### 3. Landing.tsx - Replace Custom Header

**Remove custom header (lines 102-155) and use TopNavigation:**

```tsx
// Remove the inline <header> block

// Replace with:
<TopNavigation 
  variant="marketing" 
  showSectorTabs={false} 
  showCredits={false} 
/>
<div className="h-[72px]" /> {/* Spacer for fixed nav */}
```

**Hero runway image - Verify fashion theme:**

The current `hero-runway.jpg` should be a fashion runway image. If it's not clearly fashion-themed, replace with a verified runway image:

```tsx
// Search for Unsplash runway image
// Example: https://images.unsplash.com/photo-1558618666-fcd25c85cd64
// Or use existing hero-runway.jpg if it's already runway-themed

<img 
  src={heroRunwayImage} 
  alt="Fashion runway" 
  className="w-full h-full object-cover"
  style={{
    filter: 'grayscale(100%) contrast(1.08) brightness(0.85)'
  }}
/>
```

### 4. Pricing.tsx - Full Dark Theme Conversion

**Replace page container and remove custom header:**

```tsx
<div className="min-h-screen bg-[#070707]">
  <TopNavigation 
    variant="marketing" 
    showSectorTabs={false} 
    showCredits={false} 
  />
  <div className="h-[72px]" />
  
  <main className="pb-16">
    {/* Hero - Dark */}
    <div className="container mx-auto px-4 pt-12 pb-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-light mb-4 text-white/[0.92]">
          Simple Credit-Based Pricing
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          All features available to everyone. Credits are the only gate.
        </p>
      </div>
      ...
    </div>
  </main>
</div>
```

**Convert cards to graphite:**

```tsx
<Card className={cn(
  "relative flex flex-col rounded-[20px]",
  "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
  "border border-white/[0.10]",
  isPopular && "border-white/[0.25] shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
)}>
```

### 5. About.tsx - Dark Theme Conversion

**Page container:**

```tsx
<div className="min-h-screen bg-[#070707] flex flex-col">
```

**Hero section:**

```tsx
<section className="py-24 lg:py-32">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-4xl mx-auto text-center">
      <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-6">
        About McLeuker AI
      </p>
      <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl text-white/[0.92] mb-8">
        AI & Sustainability<br />for Fashion
      </h1>
      <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto">
        We're building the future of fashion intelligence...
      </p>
    </div>
  </div>
</section>
```

**Mission section - graphite cards:**

```tsx
<section className="py-24 lg:py-32 bg-[#0B0B0B]">
  ...
  <div className={cn(
    "p-10 lg:p-12 rounded-[20px]",
    "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
    "border border-white/[0.10]",
    "shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
  )}>
```

**Values cards:**

```tsx
<div className={cn(
  "p-8 lg:p-10 rounded-[20px]",
  "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
  "border border-white/[0.10]",
  "hover:border-white/[0.18] transition-all"
)}>
```

### 6. Services.tsx - Dark Theme Conversion

**Page container:**

```tsx
<div className="min-h-screen bg-[#070707] flex flex-col">
```

**Services grid section:**

```tsx
<section className="py-24 lg:py-32 bg-[#0B0B0B]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {services.map((service, i) => (
          <div className={cn(
            "group p-8 lg:p-10 rounded-[20px]",
            "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
            "border border-white/[0.10]",
            "hover:border-white/[0.18] transition-all"
          )}>
            ...
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
```

**Apply grayscale filter to images:**

```tsx
<img 
  src={atelierImage} 
  alt="Fashion atelier workspace" 
  className="w-full aspect-square object-cover"
  style={{
    filter: 'grayscale(100%) contrast(1.05) brightness(0.9)'
  }}
/>
```

### 7. Contact.tsx - Dark Theme Conversion

**Page container:**

```tsx
<div className="min-h-screen bg-[#070707] flex flex-col">
```

**Form card - graphite:**

```tsx
<div className={cn(
  "p-8 lg:p-12 rounded-[20px]",
  "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
  "border border-white/[0.10]",
  "shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
)}>
```

**Input styling:**

```tsx
<Input
  className={cn(
    "h-12 rounded-xl",
    "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
    "border border-white/[0.10]",
    "text-white/[0.88] placeholder:text-white/40",
    "focus:border-white/[0.18]"
  )}
/>
```

---

## Homepage Hero Image

### Current State
The landing page currently imports `heroRunwayImage` from `@/assets/hero-runway.jpg`.

### Verification Required
Confirm the image is clearly fashion-themed (runway/backstage). If not, replace with a verified runway image:

**Recommended sources:**
- Unsplash: search "fashion runway silhouette monochrome"
- Pexels: search "catwalk spotlight black and white"

**Styling (already applied):**

```tsx
style={{
  filter: 'grayscale(100%) contrast(1.08) brightness(0.85)'
}}
```

**Overlay (already applied):**

```tsx
background: linear-gradient(180deg, 
  rgba(0,0,0,0.55) 0%, 
  rgba(0,0,0,0.82) 60%, 
  rgba(0,0,0,0.90) 100%
)
```

---

## CSS Additions (if needed)

Add to `src/index.css`:

```css
/* Unified nav styling */
.graphite-nav {
  background: linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
}

/* Unified footer styling */
.graphite-footer {
  background: linear-gradient(180deg, #0A0A0A 0%, #070707 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Marketing card (lighter than chat bubbles) */
.graphite-marketing-card {
  background: linear-gradient(180deg, #1A1A1A 0%, #141414 100%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
  transition: border-color 160ms ease;
}

.graphite-marketing-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
}
```

---

## Visual Comparison

### Before

```text
┌─────────────────────────────────────────────────────────────────────┐
│ LANDING - Custom header, h-16/h-20, transparent→gradient           │
│ PRICING - Custom header, h-16, bg-background (white)               │
│ ABOUT/SERVICES/CONTACT - TopNavigation h-14, bg-background (white) │
│ DASHBOARD/DOMAINS - TopNavigation h-14, graphite                   │
│                                                                      │
│ FOOTER - bg-background (white), tall multi-column layout           │
└─────────────────────────────────────────────────────────────────────┘
```

### After

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ALL PAGES - TopNavigation h-[72px], graphite-nav                   │
│   - Marketing pages: About/Solutions/Pricing/Contact links         │
│   - App pages: Sector tabs, credits, user menu                     │
│                                                                      │
│ ALL BACKGROUNDS - #070707 base, #0A0A0A/#0B0B0B section alternates │
│                                                                      │
│ ALL CARDS - graphite-marketing-card                                 │
│                                                                      │
│ ALL PAGES - Footer graphite-footer, compact one-row layout         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Checklist

| Requirement | Implementation |
|-------------|----------------|
| One shared TopNav across all pages | TopNavigation with `variant` prop |
| Nav height 72px desktop, 64px mobile | `h-[72px] lg:h-[72px]` |
| Nav graphite background | `bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A]` |
| Active page indicator | `border-b-2 border-white/[0.18]` |
| One shared Footer across all pages | Single Footer component |
| Footer graphite background | `bg-gradient-to-b from-[#0A0A0A] to-[#070707]` |
| Footer height ~80px desktop | Padding-based sizing |
| No light/white sections | All pages use `#070707` base |
| Hero image fashion-themed | Verify/replace `hero-runway.jpg` |
| Consistent typography | Same tokens across all pages |

---

## Implementation Order

1. **TopNavigation.tsx** - Add `variant` prop, update height
2. **Footer.tsx** - Full graphite redesign
3. **Landing.tsx** - Replace custom header with TopNavigation
4. **Pricing.tsx** - Replace custom header, convert to dark
5. **About.tsx** - Convert to dark graphite theme
6. **Services.tsx** - Convert to dark graphite theme
7. **Contact.tsx** - Convert to dark graphite theme
8. **Verify hero image** - Ensure runway-themed or replace

