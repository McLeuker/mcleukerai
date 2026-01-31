

## Redesign All Domains Page

Transform the "All Domains" dashboard view to match the editorial hero style of domain landing pages, with a centered AI search interface on black background.

---

## Visual Design

```text
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (WHITE)                │  MAIN AREA (BLACK)               │
│  ┌───────────────────────┐      │                                   │
│  │ + New Chat            │      │                                   │
│  └───────────────────────┘      │        Where is my mind?          │
│                                 │   Powered by McLeuker AI • All    │
│  Chat History                   │   Domains Intelligence Mode       │
│  ┌───────────────────────┐      │                                   │
│  │ ● Previous chat 1     │ ←    │   ┌─────────────────────────┐     │
│  │   bubble style        │ Black│   │ Grey search bubble...   │     │
│  └───────────────────────┘ bg   │   └─────────────────────────┘     │
│  ┌───────────────────────┐ white│                                   │
│  │ ● Previous chat 2     │ text │   Quick  Deep  |  Auto            │
│  └───────────────────────┘      │                                   │
│                                 │   ○ Topic 1  ○ Topic 2            │
│                                 │   ○ Topic 3  ○ Topic 4            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Changes Overview

### 1. DomainStarterPanel.tsx
Transform the "All Domains" empty state into a hero-style centered interface:

**Remove:**
- "EXPLORE ALL DOMAINS" header
- "Cross-domain intelligence for fashion professionals" tagline
- Current white card-based starter question buttons

**Add:**
- Full-height centered layout for "all" sector
- Black background for the main content area
- Title: "Where is my mind?" (editorial font, large)
- Subtitle: "Powered by McLeuker AI • All Domains Intelligence Mode"
- Grey search bubble (matching Fashion/Beauty sections)
- 4 cross-domain trending topic chips
- Keep existing ChatInput mode toggles

### 2. ChatSidebar.tsx
Restyle conversation history items as black bubbles:

**Change:**
- Each conversation item from current card style to pill/bubble style
- Background: black (`bg-foreground`)
- Text: white (`text-background`)
- Similar to the "+New Chat" button styling
- Maintain hover states and actions menu

### 3. SectorContext.tsx
Update the "all" domain starters to be cross-sector trending topics:

**Update:**
```typescript
all: [
  "Top sustainability shifts in luxury fashion",
  "AI-driven beauty personalization trends",
  "Emerging materials disrupting textiles",
  "Consumer wellness influencing style",
]
```

---

## Technical Implementation

### File: `src/components/dashboard/DomainStarterPanel.tsx`

**Changes:**
1. Add conditional rendering for `currentSector === "all"` with hero layout
2. For "all" sector:
   - Use `min-h-[calc(100vh-200px)]` for vertical centering
   - Apply `bg-foreground` (black) background
   - Center content with flexbox
   - Add large editorial title "Where is my mind?"
   - Add subtitle with white/muted colors
   - Integrate a search input styled like DomainHero
   - Show 4 suggestion chips at bottom
3. Pass search submission up to parent via new prop

### File: `src/components/dashboard/ChatSidebar.tsx`

**Changes (lines 178-230):**
1. Update conversation item styling from card to bubble:
   ```tsx
   className={cn(
     "w-full text-left px-4 py-3 rounded-full",
     "bg-foreground text-background",
     "hover:bg-foreground/90",
     "transition-all duration-200"
   )}
   ```
2. Update icon and text colors to white (`text-background`)
3. Adjust timestamp text to semi-transparent white

### File: `src/contexts/SectorContext.tsx`

**Changes (lines 97-102):**
Update `DOMAIN_STARTERS.all` to cross-sector trending topics:
```typescript
all: [
  "Top sustainability shifts in luxury fashion",
  "AI-driven beauty personalization trends",
  "Emerging materials disrupting textiles",
  "Consumer wellness influencing style",
]
```

---

## Color Reference (matching Beauty section)

- Background: Black (`bg-foreground` or `bg-black`)
- Title: White (`text-background` or `text-white`)
- Subtitle: White/60 (`text-white/60`)
- Search bubble: White/10 background, white/20 border (`bg-white/10 border-white/20`)
- Suggestion chips: White/30 border, white/80 text
- Powered by text: Muted (`text-white/60` with accent)

