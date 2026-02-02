
# Homepage Premium Grayscale Redesign

## Overview

Transform the homepage to match the premium grayscale dashboard/chat system we built. Remove all warm/beige visual language and replace with graphite panels, subtle ombré gradients, and consistent spacing.

---

## Current Issues

| Section | Current State | Problem |
|---------|--------------|---------|
| Page base | `bg-background` (light) | Not matching `#070707` dashboard base |
| Header | Light background classes | Doesn't match TopNavigation styling |
| Hero image | `hero-luxury.jpg` (beige materials) | Warm tones break grayscale system |
| Experience section | `bg-foreground` | OK but needs polish |
| Brand Statement | `bg-background` (white) | Jarring white section |
| Services | `bg-secondary/30` (light gray) | Light cards on light bg |
| Atelier/Sustainability | Mixed backgrounds | Inconsistent theming |
| Testimonials | `bg-background` (white) | White cards on white bg |
| CTAs | `bg-secondary/50` (light) | Light sections |
| Input | Light styling | Doesn't match dashboard composer |

---

## Color System (Matching Dashboard)

### Page Foundation
| Element | Value |
|---------|-------|
| Page background | `#070707` |
| Vignette overlay | radial gradient to add depth |
| Section backgrounds | `#0B0B0B`, `#0A0A0A` |

### Panels & Cards
| Element | Value |
|---------|-------|
| Panel gradient | `linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)` |
| Card gradient | `linear-gradient(180deg, #232323 0%, #191919 100%)` |
| Border | `rgba(255,255,255,0.08)` to `rgba(255,255,255,0.12)` |
| Shadow | `0 14px 40px rgba(0,0,0,0.55)` |
| Radius | `18-20px` |

### Text Colors
| Element | Value |
|---------|-------|
| Headline | `rgba(255,255,255,0.92)` |
| Body | `rgba(255,255,255,0.72)` |
| Muted | `rgba(255,255,255,0.50)` |
| Subtle | `rgba(255,255,255,0.40)` |

### Input Styling
| Element | Value |
|---------|-------|
| Background | `linear-gradient(180deg, #1B1B1B 0%, #111111 100%)` |
| Border | `rgba(255,255,255,0.10)` |
| Placeholder | `rgba(255,255,255,0.40)` |
| Text | `rgba(255,255,255,0.88)` |
| Focus ring | `0 0 0 3px rgba(255,255,255,0.06)` |
| Radius | `20px` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Full page redesign with grayscale system |
| `src/index.css` | Add homepage-specific utility classes if needed |

---

## Detailed Implementation

### 1. Page Container Update

```tsx
// Current (line 105):
<div className="min-h-screen bg-background">

// Updated - dark base with vignette:
<div className="min-h-screen bg-[#070707] overflow-x-hidden">
```

### 2. Header/Navigation Update

Replace custom header (lines 107-158) with consistent dark styling:

```tsx
<header 
  className={cn(
    "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
    isScrolled 
      ? "bg-gradient-to-b from-[#0D0D0D]/95 to-[#0A0A0A]/95 backdrop-blur-md border-b border-white/[0.08]" 
      : "bg-transparent"
  )}
>
  <div className="container mx-auto px-6 lg:px-12 h-16 lg:h-20 flex items-center justify-between">
    {/* Nav items with white text on dark */}
    <nav className="hidden lg:flex items-center gap-10">
      <Link className="text-sm text-white/60 hover:text-white/90 transition-colors">
```

### 3. "Experience the Platform" Section Polish

Keep dark theme but align with premium system:

```tsx
// Update section (line 161):
<section className="pt-24 lg:pt-28 pb-16 lg:pb-24 bg-[#0A0A0A]">

// Input styling - match dashboard composer (lines 177-181):
<textarea 
  className={cn(
    "w-full h-28 sm:h-32 px-4 sm:px-6 py-4 sm:py-5",
    "rounded-[20px]",
    "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
    "border border-white/[0.10]",
    "text-white/[0.88] placeholder:text-white/40",
    "focus:outline-none focus:border-white/[0.18]",
    "focus:ring-[3px] focus:ring-white/[0.06]",
    "resize-none text-sm sm:text-base",
    "shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
  )}
/>

// Suggestion cards - graphite style (lines 221-241):
<button
  className={cn(
    "group relative p-4 sm:p-5 rounded-[18px]",
    "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
    "border border-white/[0.10]",
    "hover:border-white/[0.18]",
    "transition-all duration-200 text-left"
  )}
>
```

### 4. Hero Section - Replace Beige Image with Runway

**Remove current image:**
- Delete import: `import heroImage from "@/assets/hero-luxury.jpg";`

**Add new royalty-free runway image:**
- Source: Unsplash or Pexels
- Search: "black and white runway silhouette" or "fashion show runway lights monochrome"
- Recommended image URL: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64` (fashion runway lights) or similar

**Apply grayscale filter + dark overlay:**

```tsx
<section className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center justify-center overflow-hidden">
  {/* Background Image with grayscale + dark overlay */}
  <div className="absolute inset-0">
    <img 
      src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80" 
      alt="Fashion runway" 
      className="w-full h-full object-cover"
      style={{
        filter: 'grayscale(100%) contrast(1.08) brightness(0.85)'
      }}
    />
    {/* Dark gradient overlay for readability */}
    <div 
      className="absolute inset-0" 
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.90) 100%)'
      }}
    />
  </div>

  {/* Hero Content */}
  <div className="relative z-10 container mx-auto px-6 lg:px-12 py-20 lg:py-32">
    <div className="max-w-4xl mx-auto text-center">
      {/* Tagline badge - graphite style */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#141414]/80 backdrop-blur-sm border border-white/[0.12] mb-8 lg:mb-10">
        <Sparkles className="w-4 h-4 text-white/60" />
        <span className="text-sm text-white/70 tracking-wide">
          AI & Sustainability for Fashion
        </span>
      </div>

      {/* Headlines with white text */}
      <h2 className="font-luxury text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white/[0.92] mb-6 lg:mb-8 leading-[1.05]">
        The Future of<br />Fashion Intelligence
      </h2>

      <p className="text-base md:text-lg lg:text-xl text-white/65 mb-10 lg:mb-12 max-w-2xl mx-auto leading-relaxed">
        From a single prompt to finished reports, sourcing sheets, and presentation decks.
      </p>

      {/* CTAs - graphite buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button 
          size="lg" 
          className="px-8 py-6 text-base bg-white text-black hover:bg-white/90"
        >
          Open Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button 
          size="lg" 
          variant="outline" 
          className="px-8 py-6 text-base bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          Explore Domains
        </Button>
      </div>

      {/* "Try a prompt" input - styled like dashboard composer */}
      <div className="mt-12 max-w-xl mx-auto">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Or try a prompt</p>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g., Analyze SS26 color trends..."
            className={cn(
              "w-full px-5 py-4 rounded-[20px]",
              "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
              "border border-white/[0.10]",
              "text-white/[0.88] placeholder:text-white/40",
              "focus:outline-none focus:border-white/[0.18]",
              "focus:ring-[3px] focus:ring-white/[0.06]",
              "text-[15px]"
            )}
          />
        </div>
      </div>
    </div>
  </div>
</section>
```

### 5. Brand Statement - Convert to Dark

```tsx
// Current (line 302):
<section className="py-32 lg:py-40 bg-background">

// Updated - dark section:
<section className="py-32 lg:py-40 bg-[#070707]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="font-luxury text-3xl md:text-4xl lg:text-5xl text-white/[0.92] leading-[1.2] mb-8">
        "We believe fashion intelligence should be as refined as the industry it serves."
      </h2>
      <p className="text-white/50 text-lg">
        — McLeuker AI
      </p>
    </div>
  </div>
</section>
```

### 6. Services Section - Graphite Cards

```tsx
// Current (line 316):
<section className="py-24 lg:py-32 bg-secondary/30">

// Updated - dark section with graphite cards:
<section className="py-24 lg:py-32 bg-[#0B0B0B]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-[1120px] mx-auto">
      {/* Section Header */}
      <div className="text-center mb-20">
        <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
          Our Expertise
        </p>
        <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92]">
          Comprehensive Solutions
        </h2>
      </div>

      {/* Services Grid - graphite cards */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
        {services.map((service, i) => (
          <div 
            key={i} 
            className={cn(
              "group p-8 lg:p-10 rounded-[20px]",
              "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
              "border border-white/[0.10]",
              "hover:border-white/[0.18]",
              "transition-all duration-200 cursor-pointer"
            )}
          >
            <div className="flex items-start justify-between mb-6">
              <span className="text-5xl font-luxury text-white/15">
                0{i + 1}
              </span>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl lg:text-2xl font-medium text-white/[0.92] mb-3">
              {service.title}
            </h3>
            <p className="text-white/60 leading-relaxed">
              {service.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA - graphite button */}
      <div className="text-center mt-16">
        <Button 
          size="lg" 
          variant="outline" 
          className="px-8 bg-[#141414] border-white/[0.10] text-white/80 hover:bg-[#1A1A1A] hover:border-white/[0.18]"
        >
          Explore All Solutions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  </div>
</section>
```

### 7. Visual Showcase Sections - Apply Grayscale Filter to Images

For both Atelier and Sustainability sections:

```tsx
<section className="py-24 lg:py-32 bg-[#070707]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Image with grayscale filter */}
        <div className="relative rounded-[20px] overflow-hidden shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
          <img 
            src={atelierImage} 
            alt="Fashion atelier workspace" 
            className="w-full aspect-[4/5] object-cover"
            style={{
              filter: 'grayscale(100%) contrast(1.05) brightness(0.9)'
            }}
          />
        </div>

        {/* Content - white text */}
        <div className="lg:py-12">
          <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
            Crafted for Excellence
          </p>
          <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92] mb-8 leading-[1.1]">
            Intelligence meets craftsmanship
          </h2>
          <p className="text-white/65 text-lg leading-relaxed mb-8">
            Just as the finest ateliers combine tradition with innovation...
          </p>
          <ul className="space-y-4 mb-10">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-white/[0.85]">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>
                {item}
              </li>
            ))}
          </ul>
          <Button size="lg" className="bg-white text-black hover:bg-white/90">
            Start Your Journey
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 8. Testimonials - Graphite Cards

```tsx
<section className="py-24 lg:py-32 bg-[#0A0A0A]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-[1120px] mx-auto">
      {/* Section Header */}
      <div className="text-center mb-20">
        <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-4">
          Trusted by Industry Leaders
        </p>
        <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92]">
          What Our Clients Say
        </h2>
      </div>

      {/* Testimonials Grid - graphite cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, i) => (
          <div 
            key={i} 
            className={cn(
              "p-8 rounded-[20px]",
              "bg-gradient-to-b from-[#232323] to-[#191919]",
              "border border-white/[0.12]",
              "shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
            )}
          >
            <blockquote className="text-white/[0.85] text-lg leading-relaxed mb-8">
              "{testimonial.quote}"
            </blockquote>
            <div>
              <p className="text-sm font-medium text-white/[0.92]">
                {testimonial.author}
              </p>
              <p className="text-sm text-white/50">
                {testimonial.company}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
```

### 9. CTA Sections - Dark with Graphite Panels

```tsx
// Secondary CTA (line 508):
<section className="py-20 lg:py-28 bg-[#0B0B0B]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="font-luxury text-3xl md:text-4xl text-white/[0.92] mb-6">
        Ready to transform your research?
      </h2>
      <p className="text-white/60 text-lg mb-8">
        Join leading fashion brands leveraging AI-powered insights.
      </p>
      <Button size="lg" className="px-8 bg-white text-black hover:bg-white/90">
        Start Free Trial
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  </div>
</section>

// Final CTA (line 528):
<section className="py-32 lg:py-40 bg-[#070707]">
  <div className="container mx-auto px-6 lg:px-12">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="font-luxury text-4xl md:text-5xl lg:text-6xl text-white/[0.92] mb-8 leading-[1.1]">
        Elevate your fashion intelligence
      </h2>
      <p className="text-white/60 text-lg mb-12 max-w-xl mx-auto">
        Join leading fashion brands transforming their research with AI-powered insights.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button size="lg" className="px-10 py-6 text-base bg-white text-black hover:bg-white/90">
          Start Free Trial
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button 
          size="lg" 
          variant="outline" 
          className="px-10 py-6 text-base bg-[#141414] border-white/[0.10] text-white hover:bg-[#1A1A1A]"
        >
          View Pricing
        </Button>
      </div>
    </div>
  </div>
</section>
```

### 10. Add Subtle Noise to Panels (CSS Update)

Add to `src/index.css`:

```css
/* Subtle noise overlay for panels - 2-3% opacity */
.panel-noise::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.025;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 1;
}

/* Homepage graphite panel with noise */
.homepage-panel {
  position: relative;
  background: linear-gradient(180deg, #1A1A1A 0%, #141414 100%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
}

/* Homepage section with left→right gradient */
.homepage-section-gradient {
  background: 
    linear-gradient(90deg, #060606 0%, #080808 35%, #0A0A0A 100%);
}
```

---

## Visual Comparison

### Before (Current)
```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Experience Section - Dark] ✓                                       │
├─────────────────────────────────────────────────────────────────────┤
│ [Hero - BEIGE IMAGE] ← Problem: warm tones                          │
│ light text, light badges                                            │
├─────────────────────────────────────────────────────────────────────┤
│ [Brand Statement - WHITE BG] ← Problem: jarring                     │
├─────────────────────────────────────────────────────────────────────┤
│ [Services - LIGHT GRAY BG, WHITE CARDS] ← Problem: light theme      │
├─────────────────────────────────────────────────────────────────────┤
│ [Atelier - WHITE BG] ← Problem: white section                       │
├─────────────────────────────────────────────────────────────────────┤
│ [Testimonials - WHITE BG, WHITE CARDS] ← Problem                    │
├─────────────────────────────────────────────────────────────────────┤
│ [CTAs - LIGHT BG] ← Problem                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### After (Redesigned)
```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Experience Section - Premium Dark #0A0A0A]                         │
│ Graphite input, graphite suggestion cards                           │
├─────────────────────────────────────────────────────────────────────┤
│ [Hero - GRAYSCALE RUNWAY IMAGE]                                     │
│ Dark overlay, white text, "Try a prompt" input                      │
│ bg: grayscale(100%) + dark gradient overlay                         │
├─────────────────────────────────────────────────────────────────────┤
│ [Brand Statement - Dark #070707]                                    │
│ White text on dark                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ [Services - Dark #0B0B0B, GRAPHITE CARDS]                          │
│ Cards: from-#1A1A1A to-#141414                                      │
├─────────────────────────────────────────────────────────────────────┤
│ [Atelier - Dark #070707, GRAYSCALE IMAGE]                          │
│ Image filter: grayscale(100%)                                       │
├─────────────────────────────────────────────────────────────────────┤
│ [Testimonials - Dark #0A0A0A, GRAPHITE CARDS]                      │
│ Cards: from-#232323 to-#191919                                      │
├─────────────────────────────────────────────────────────────────────┤
│ [CTAs - Dark backgrounds, white/graphite buttons]                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Runway Image Recommendations

### Option 1: Fashion Show Spotlights
- URL: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64`
- Shows: Dramatic runway lighting, silhouettes
- License: Unsplash (free commercial use)

### Option 2: Backstage Silhouettes
- Search Pexels for "fashion show backstage black and white"
- Shows: Blurred motion, high-fashion atmosphere

### Option 3: Runway Crowd
- Search Unsplash for "catwalk silhouette monochrome"
- Shows: Editorial runway perspective

### Image Processing (Applied via CSS)
```css
filter: grayscale(100%) contrast(1.08) brightness(0.85);
```

### Dark Overlay (Non-negotiable for readability)
```css
background: linear-gradient(180deg, 
  rgba(0,0,0,0.55) 0%, 
  rgba(0,0,0,0.82) 60%, 
  rgba(0,0,0,0.90) 100%
);
```

---

## Acceptance Checklist

| Requirement | Implementation |
|-------------|----------------|
| Beige image removed | Replace with grayscale runway image |
| Page background | `#070707` with subtle vignette |
| No white sections | All sections use `#070707`, `#0A0A0A`, `#0B0B0B` |
| Text readable over hero | Dark gradient overlay applied |
| Inputs match dashboard | Gradient `#1B1B1B → #111111`, 20px radius |
| Buttons match system | White primary, graphite outline |
| Cards match system | Gradient `#232323 → #191919` or `#1A1A1A → #141414` |
| Subtle noise on panels | 2-3% opacity noise overlay |
| Consistent with domains | Same token system as `/domain/*` pages |

---

## Technical Summary

### Files Modified
| File | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Full redesign - dark theme, graphite cards, grayscale images |
| `src/index.css` | Add `panel-noise`, `homepage-panel`, `homepage-section-gradient` utilities |

### Images
| Current | Replacement |
|---------|-------------|
| `hero-luxury.jpg` (beige) | Unsplash runway image with grayscale filter |
| `fashion-atelier.jpg` | Keep but apply `grayscale(100%)` filter |
| `sustainable-materials.jpg` | Keep but apply `grayscale(100%)` filter |

### Color Token Usage
- Backgrounds: `#070707`, `#0A0A0A`, `#0B0B0B`
- Panel cards: `from-[#1A1A1A] to-[#141414]`
- Testimonial cards: `from-[#232323] to-[#191919]`
- Borders: `border-white/[0.10]`, `border-white/[0.12]`
- Text: `text-white/[0.92]`, `text-white/65`, `text-white/50`
