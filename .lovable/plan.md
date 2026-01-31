

## Add Domain-Specific Background Images to Hero Section

This plan adds unique royalty-free background images to each domain's hero section (the black AI search area) while keeping the white content sections unchanged.

---

## Image Source: Unsplash

Using Unsplash images which are **100% royalty-free** and free for commercial use under their license. No attribution required.

---

## Image Selection Per Domain

| Sector | Image Theme | Unsplash URL |
|--------|-------------|--------------|
| **fashion** | High fashion runway/editorial | Runway photography |
| **beauty** | Makeup brushes/cosmetics | Beauty products close-up |
| **skincare** | Clean ingredients/botanical | Skincare texture |
| **sustainability** | Natural materials/eco | Sustainable fabrics/nature |
| **fashion-tech** | Digital/tech aesthetic | Technology abstract |
| **catwalks** | Runway show atmosphere | Fashion show lighting |
| **culture** | Art gallery/museum | Art exhibition |
| **textile** | Fabric textures/weaving | Textile close-up |
| **lifestyle** | Wellness/modern living | Lifestyle aesthetic |

---

## Implementation Approach

### File: `src/components/domain/DomainHero.tsx`

**Changes:**

1. **Add image URL mapping** - Create a `Record<Sector, string>` with Unsplash URLs for each domain

2. **Add background image layer** - Insert an absolute-positioned div with:
   - `background-image` set dynamically based on sector
   - `background-size: cover` and `background-position: center`
   - `opacity-20` (20% opacity = 80% transparent for readability)

3. **Add dark overlay** - Keep a semi-transparent black overlay on top of image to ensure text contrast

---

## Code Structure

```tsx
// Image URLs per sector (Unsplash - royalty free)
const sectorImages: Record<Sector, string> = {
  all: "https://images.unsplash.com/...",
  fashion: "https://images.unsplash.com/...",
  beauty: "https://images.unsplash.com/...",
  // ... etc
};

return (
  <section className="relative w-full bg-black overflow-hidden">
    {/* Background Image - 20% opacity */}
    <div 
      className="absolute inset-0 bg-cover bg-center opacity-20"
      style={{ backgroundImage: `url(${sectorImages[sector]})` }}
    />
    
    {/* Dark overlay for extra text contrast */}
    <div className="absolute inset-0 bg-black/60" />
    
    {/* Content (existing) */}
    <div className="relative z-10 ...">
      {/* Title, tagline, search bar - unchanged */}
    </div>
  </section>
);
```

---

## Visual Result

```text
┌─────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░ BACKGROUND IMAGE (20% opacity) ░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
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
├─────────────────────────────────────────────────────────┤ ← Straight line
│                    WHITE (unchanged)                    │
│                                                         │
│   What's Happening Now                                  │
│   Intelligence Modules                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Unsplash Image URLs (All Royalty-Free)

Selected high-quality editorial images:

- **fashion**: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64` (runway)
- **beauty**: `https://images.unsplash.com/photo-1596462502278-27bfdc403348` (makeup)
- **skincare**: `https://images.unsplash.com/photo-1570172619644-dfd03ed5d881` (skincare)
- **sustainability**: `https://images.unsplash.com/photo-1532996122724-e3c354a0b15b` (eco)
- **fashion-tech**: `https://images.unsplash.com/photo-1550751827-4bd374c3f58b` (tech)
- **catwalks**: `https://images.unsplash.com/photo-1509631179647-0177331693ae` (runway show)
- **culture**: `https://images.unsplash.com/photo-1518998053901-5348d3961a04` (art)
- **textile**: `https://images.unsplash.com/photo-1558171813-4c088753af8f` (fabric)
- **lifestyle**: `https://images.unsplash.com/photo-1545205597-3d9d02c29597` (wellness)
- **all**: `https://images.unsplash.com/photo-1441986300917-64674bd600d8` (editorial)

---

## Technical Notes

- Only `DomainHero.tsx` is modified
- White sections below remain completely unchanged
- Images loaded via URL (no local storage needed)
- `overflow-hidden` added to prevent image bleed
- Combined opacity approach: image at 20% + dark overlay = readable text
- All Unsplash images are free for commercial use without attribution

