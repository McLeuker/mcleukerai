

## Black Background + Grainy Transition + Grey Toggle

Update the All Domains page styling with full black background, a subtle grainy ombre transition, and grey mode toggle.

---

## Visual Design

```text
┌────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (WHITE)          │  MAIN AREA (FULL BLACK)               │
│                           │                                        │
│  ┌─────────────────────┐  │        Where is my mind?              │
│  │ + New Chat          │  │   Powered by McLeuker AI              │
│  └─────────────────────┘  │                                        │
│                           │   ┌─────────────────────────┐          │
│  Chat History             │   │ Quick 5 | Deep 50       │ ← GREY   │
│  ┌─────────────────────┐  │   └─────────────────────────┘          │
│  │ Grey bubble         │  │                                        │
│  └─────────────────────┘  │   ┌─────────────────────────┐          │
│                           │   │ Ask anything...         │          │
│                 ████████████   └─────────────────────────┘          │
│               ░░░░░░░░░░░░│                                        │
│             ░░░░░░░░░░░░░░│   ○ Topic 1  ○ Topic 2                 │
│           (grainy fade)   │                                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## Changes Overview

### 1. Full Black Background
Currently the All Domains view has `min-h-[calc(100vh-200px)]` which doesn't cover the entire screen. Change to full viewport height.

### 2. Grainy Gradient Transition
Add a CSS noise/grain effect at the transition between the black content area and white sidebar. This creates a subtle ombre from black → grey → white with a film grain texture.

### 3. Grey Mode Toggle
Change the Quick/Deep toggle bubble from the current styling to a solid grey background (`bg-white/20` or similar grey).

---

## Technical Implementation

### File: `src/components/dashboard/DomainStarterPanel.tsx`

**Line 52 - Update container height:**
```tsx
// Change from:
<div className={cn("flex flex-col min-h-[calc(100vh-200px)] bg-foreground", className)}>

// To:
<div className={cn("flex flex-col min-h-screen bg-black", className)}>
```

**Lines 65-71 - Update mode toggle wrapper styling:**
```tsx
// Change the wrapper div to apply grey styling:
<div className="bg-white/15 rounded-full p-1">
  <ResearchModeToggle ... />
</div>
```

### File: `src/components/dashboard/ResearchModeToggle.tsx`

**Line 25 - Change outer container to grey:**
```tsx
// Change from:
<div className="inline-flex items-center rounded-full bg-muted p-1">

// To:
<div className="inline-flex items-center rounded-full bg-white/15 p-1">
```

**Lines 32-36 - Update button active/inactive states for dark background:**
```tsx
// Active state (selected):
mode === "quick"
  ? "bg-white/25 text-white shadow-sm"
  : "text-white/60 hover:text-white"
```

**Same changes for Deep button (lines 63-67)**

### File: `src/index.css`

**Add grainy gradient transition class:**
```css
/* Grainy ombre transition effect */
.gradient-grain-transition {
  position: relative;
}

.gradient-grain-transition::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80px;
  background: linear-gradient(
    to right,
    hsl(0 0% 0% / 0),
    hsl(0 0% 20% / 0.3) 30%,
    hsl(0 0% 50% / 0.4) 60%,
    hsl(0 0% 100% / 0.8) 100%
  );
  pointer-events: none;
  /* Add noise texture via SVG filter */
  filter: url(#noise);
}

/* CSS Noise filter for grain effect */
.noise-grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.08;
}
```

### File: `src/pages/Dashboard.tsx`

**Add grainy transition overlay between sidebar and main content:**

Add a subtle grain overlay div at the boundary that creates the ombre effect from black to white through grey.

---

## Summary of Changes

| File | Change |
|------|--------|
| `DomainStarterPanel.tsx` | Full black background (`bg-black`), full screen height |
| `ResearchModeToggle.tsx` | Grey outer bubble (`bg-white/15`), white text for dark mode |
| `index.css` | New `.gradient-grain-transition` utility with noise effect |
| `Dashboard.tsx` | Add grainy overlay div at sidebar/content boundary |

---

## Color Palette for Dark Theme Toggle

- Outer bubble: `bg-white/15` (subtle grey on black)
- Active button: `bg-white/25 text-white`
- Inactive button: `text-white/60 hover:text-white`
- Credit coins: `text-white/40`

