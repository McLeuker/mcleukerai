

## Full Dark Theme + Unified Bubble Styling

Transform the entire dashboard to a black background theme with light grey bubbles and properly aligned grid lines.

---

## Visual Design

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (BLACK BG)              │  MAIN AREA (BLACK BG)                 │
│                                  │                                        │
│  ┌────────────────────────────┐  │        Where is my mind?              │
│  │ + New Chat (grey bubble)   │  │   Powered by McLeuker AI              │
│  └────────────────────────────┘  │                                        │
│                                  │   ┌─────────────────────────┐          │
│  ┌────────────────────────────┐  │   │ Quick 5 | Deep 50       │          │
│  │ Q  Search chats...         │  │   └─────────────────────────┘          │
│  └────────────────────────────┘  │                                        │
│                                  │   ┌─────────────────────────┐          │
│  Chat History                    │   │ Ask anything...         │          │
│  ┌────────────────────────────┐  │   └─────────────────────────┘          │
│  │ ■ Chat title (grey bubble) │  │                                        │
│  │   1 hour ago               │  │   ○ Topic 1  ○ Topic 2  ○ Topic 3      │
│  └────────────────────────────┘  │                                        │
│                                  │                                        │
│  ───────────────────────────────────────────────────────────────────────  │
│                    │                                                      │
│   PERFECT 90° ALIGNMENT - No crushing lines                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Changes Overview

### 1. Global Black Background
Change all white backgrounds to black across the dashboard:
- Sidebar background: `bg-black` instead of `bg-sidebar`
- Main content area: `bg-black` instead of `bg-background`
- TopNavigation: Black background
- Domain bar: Black background
- Mobile header: Black background

### 2. Sidebar Styling (ChatSidebar.tsx)

**New Chat Button - Convert to Grey Bubble:**
```tsx
// From rectangular button to rounded grey bubble
<Button
  onClick={onNewConversation}
  className="w-full gap-2 justify-center h-10 rounded-full bg-muted text-foreground hover:bg-muted/80 border-0"
>
  <Plus className="h-4 w-4" />
  New Chat
</Button>
```

**Chat History Bubbles:**
Already styled as grey (`bg-muted`) with black text (`text-foreground`) - verify consistency.

**Search Input:**
Update to match dark theme with grey background.

### 3. Domain Selector Pills (DomainSelector.tsx)

Update pills to be light grey with black text:
```tsx
// Inactive state:
"bg-muted text-foreground border-muted hover:bg-muted/80"

// Active state:
"bg-muted/90 text-foreground ring-2 ring-white/20"
```

### 4. Border Alignment Fix

The issue in the screenshot shows misaligned separator lines. Fix by:
- Remove redundant border elements
- Use single consistent border styling
- Ensure sidebar border and content borders meet at exact points

**Current Problem:**
- Sidebar has `border-r border-border`
- Content areas have `border-b border-border`
- These don't align properly creating a "crushed" look

**Solution:**
- Use clean, single-line borders
- Position borders to align at 90° intersections
- Remove any overlapping or double borders

---

## Technical Implementation

### File: `src/pages/Dashboard.tsx`

**Line 109 - Main container:**
```tsx
// Change from:
<div className="min-h-screen bg-background flex w-full">

// To:
<div className="min-h-screen bg-black flex w-full">
```

**Lines 135, 152, 221 - Update backgrounds:**
- Mobile header: `bg-black` instead of `bg-background/95`
- Domain bar: `bg-black` instead of `bg-background/50`
- Input area: `bg-black` instead of `bg-background/95`

### File: `src/components/dashboard/ChatSidebar.tsx`

**Lines 78, 105 - Sidebar background:**
```tsx
// Change from:
<aside className="... bg-sidebar ...">

// To:
<aside className="... bg-black ...">
```

**Lines 126-133 - New Chat button as grey bubble:**
```tsx
<Button
  onClick={onNewConversation}
  className="w-full gap-2 justify-center h-10 rounded-full bg-muted text-foreground hover:bg-muted/80 border-0"
>
  <Plus className="h-4 w-4" />
  New Chat
</Button>
```

**Lines 140-145 - Search input dark theme:**
```tsx
<Input
  className="pl-9 pr-9 h-9 text-sm bg-muted border-0 text-foreground placeholder:text-muted-foreground/60"
/>
```

**Lines 159-160 - Chat History label:**
```tsx
// Update text color for visibility on black
<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
```

### File: `src/components/dashboard/DomainSelector.tsx`

**Lines 69-75 - Update pill styling:**
```tsx
className={cn(
  "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
  currentSector === sector.id
    ? "bg-muted text-foreground ring-2 ring-white/20"
    : "bg-muted text-foreground hover:bg-muted/80"
)}
```

### File: `src/components/layout/TopNavigation.tsx`

**Line 100 - Header background:**
```tsx
// Change from:
<header className="... bg-background/95 ...">

// To:
<header className="... bg-black ...">
```

**Lines 118-122 - Sector tabs styling:**
```tsx
// Update for dark theme
className={cn(
  "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
  currentSector === sector.id
    ? "bg-muted text-foreground"
    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
)}
```

**Lines 137-143 - Credits badge:**
```tsx
className="... bg-muted text-foreground ..."
```

### File: `src/index.css`

**Update CSS variables for dark-first theme:**
```css
/* Override sidebar colors for black theme */
--sidebar-background: 0 0% 0%;
--sidebar-foreground: 0 0% 90%;
--sidebar-border: 0 0% 20%;
--sidebar-accent: 0 0% 15%;
```

**Update border alignment:**
```css
/* Ensure consistent border alignment */
.border-aligned {
  border-color: hsl(0 0% 20%);
}
```

---

## Border Alignment Fix Details

The key issue is the intersection of horizontal and vertical borders. To fix:

1. **Sidebar right border**: Keep as single `border-r` with consistent color
2. **Content top borders**: Use same border color, positioned to meet sidebar border exactly
3. **Remove backdrop-blur effects** that can cause visual misalignment
4. **Use consistent border width** (1px) everywhere

```tsx
// Consistent border styling
const borderStyle = "border-border/50"; // Semi-transparent for subtle look
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `Dashboard.tsx` | Black backgrounds for main container, mobile header, domain bar, input area |
| `ChatSidebar.tsx` | Black sidebar bg, rounded grey New Chat button, grey search input |
| `DomainSelector.tsx` | Grey pill styling with black text |
| `TopNavigation.tsx` | Black header, grey sector tabs, grey credits badge |
| `index.css` | Dark sidebar CSS variables, border alignment utilities |

---

## Color Reference

- **Background**: Black (`bg-black` or `hsl(0 0% 0%)`)
- **Grey bubbles**: `bg-muted` (`hsl(0 0% 94%)` light / `hsl(0 0% 12%)` dark)
- **Text on bubbles**: `text-foreground` (black in light mode)
- **Borders**: `border-border/50` (subtle, semi-transparent)
- **Muted text**: `text-muted-foreground`

