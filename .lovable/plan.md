

## Domain Hero Styling & Image Update

Updating text colors to black, search bar to grey, and replacing all background images with specific aesthetics matching each domain.

---

## 1. Text Color Changes

**Title (h1):** `text-white` → `text-black`

**Tagline (p):** `text-white/60` → `text-black/70`

**Search bar text:** `text-white` → `text-black`

**Placeholder:** `placeholder:text-white/50` → `placeholder:text-black/50`

**Suggestion chips:** `text-white/80` → `text-black/80`, `border-white/30` → `border-black/30`

---

## 2. Search Bar Styling

Change from transparent white to recognizable grey:

```tsx
// Before
"bg-white/10 border-white/20 text-white placeholder:text-white/50"

// After  
"bg-gray-200/90 border-gray-300 text-black placeholder:text-black/50"
```

Submit button stays white with black icon for contrast.

---

## 3. New Sector Images (All Unsplash - Royalty Free)

| Sector | New Image | Aesthetic |
|--------|-----------|-----------|
| **fashion** | Bond Street / luxury flagship store | High fashion retail, prestige |
| **beauty** | Golden luxury cosmetics | Guerlain aesthetic, gold/beige |
| **skincare** | K-beauty minimal products | Clean, light, airy, white |
| **sustainability** | Raw cotton/linen fibers close-up | Natural textile fibers |
| **fashion-tech** | Futuristic digital/holographic | Virtual AI, tech aesthetic |
| **catwalks** | Paris haute couture runway | Elegant runway show |
| **culture** | Fashion museum/gallery | Art exhibition space |
| **textile** | Embroidery detail close-up | Intricate fabric craftsmanship |
| **lifestyle** | Influencer aesthetic | Matcha, minimal, outfit culture |

**Selected Unsplash URLs:**

```tsx
const sectorImages: Record<Sector, string> = {
  all: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80",
  // Luxury shopping street
  fashion: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1920&q=80",
  // Golden luxury beauty products  
  beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1920&q=80",
  // K-beauty minimal clean aesthetic
  skincare: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1920&q=80",
  // Raw cotton fibers close-up
  sustainability: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
  // Futuristic digital holographic
  "fashion-tech": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1920&q=80",
  // Haute couture Paris runway
  catwalks: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
  // Fashion museum gallery
  culture: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1920&q=80",
  // Embroidery dress detail
  textile: "https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=1920&q=80",
  // Influencer lifestyle matcha aesthetic
  lifestyle: "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=1920&q=80",
};
```

---

## 4. Code Changes Summary

**File:** `src/components/domain/DomainHero.tsx`

| Line | Element | Change |
|------|---------|--------|
| 27-38 | `sectorImages` | Replace all URLs with new aesthetic-specific images |
| 108 | Title h1 | `text-white` → `text-black` |
| 111 | Tagline p | `text-white/60` → `text-black/70` |
| 127-130 | Textarea | Grey background with black text |
| 155-158 | Chips | Black text/borders instead of white |

---

## Visual Result

```text
┌─────────────────────────────────────────────────────────┐
│  ████████ SECTOR IMAGE (80% opacity) ████████████████  │
│                                                         │
│                       Fashion                           │
│                    (BLACK TEXT)                         │
│        Runway signals, silhouettes & street style       │
│                    (BLACK/70%)                          │
│                                                         │
│         ┌─────────────────────────────────┐             │
│         │ ░░░░ GREY SEARCH BAR ░░░░░░░░ ↑ │             │
│         └─────────────────────────────────┘             │
│                                                         │
│         [Chip 1] [Chip 2] [Chip 3] [Chip 4]             │
│              (black text, black border)                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    WHITE SECTION                        │
└─────────────────────────────────────────────────────────┘
```

---

## Notes

- All Unsplash images are 100% royalty-free for commercial use
- No attribution required under Unsplash license
- Images selected for light/neutral tones to ensure black text readability
- Grey search bar (bg-gray-200/90) provides clear input area while being subtle

