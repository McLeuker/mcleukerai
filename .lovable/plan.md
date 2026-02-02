

# Replace Homepage Hero Image with Fashion Runway

## Current Issue
The `hero-runway.jpg` file hasn't been replaced with a proper fashion runway image. The user can see on the homepage that the image beneath "The Future of Fashion Intelligence" is not fashion-themed.

## Solution
Download a royalty-free fashion runway image from Unsplash and replace the existing file at `src/assets/hero-runway.jpg`.

## Image Selection
**Source:** Unsplash (free commercial use)

**Recommended image:** Fashion runway with dramatic lighting/silhouettes
- URL: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64` (fashion runway spotlights)
- Or: `https://images.unsplash.com/photo-1509631179647-0177331693ae` (runway catwalk)

## Technical Implementation

### File to Replace
- `src/assets/hero-runway.jpg`

### Styling Already Applied (in Landing.tsx)
The code already applies proper styling:
```tsx
style={{
  filter: 'grayscale(100%) contrast(1.08) brightness(0.85)'
}}
```

With dark overlay:
```tsx
background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 60%, rgba(0,0,0,0.90) 100%)'
```

## Acceptance Criteria
- ✅ Image is unmistakably fashion-related (runway/backstage)
- ✅ Works with grayscale filter and dark overlay
- ✅ No beige/warm tones
- ✅ Text remains readable over the image

