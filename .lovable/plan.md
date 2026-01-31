

## Inverted L Layout with Bubble-Styled Controls

Restructure the dashboard layout so the white sidebar and domain bar form an inverted L shape with 90-degree alignment, and style the New Chat button and Search bar as bubbles.

---

## Visual Design

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  WHITE HEADER BAR (spans full width above sidebar + content)             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │    + New Chat           │  │ All Domains │ Fashion │ Beauty │ ... │   │
│  │    (bubble, same h)     │  │ (pill buttons row)                   │   │
│  └─────────────────────────┘  └──────────────────────────────────────┘   │
├──────────────────────┬───────────────────────────────────────────────────┤
│  SIDEBAR (white)     │                                                   │
│  ┌────────────────┐  │              BLACK CONTENT AREA                   │
│  │ Q Search...    │  │                                                   │
│  │ (bubble style) │  │         (All Domains hero / chat view)            │
│  └────────────────┘  │                                                   │
│                      │                                                   │
│  CHAT HISTORY        │                                                   │
│  ┌────────────────┐  │                                                   │
│  │ Chat bubble 1  │  │                                                   │
│  └────────────────┘  │                                                   │
│  ┌────────────────┐  │                                                   │
│  │ Chat bubble 2  │  │                                                   │
│  └────────────────┘  │                                                   │
└──────────────────────┴───────────────────────────────────────────────────┘
```

---

## Changes Overview

### 1. Extract New Chat Button to Top Bar
Move the "New Chat" button out of the sidebar and into a shared top bar that spans the full width. This creates the inverted L alignment.

### 2. Style New Chat as Bubble
Make the New Chat button a pill/bubble shape with the same height as the domain selector pills (~40px).

### 3. Style Search Bar as Bubble
Update the search input to have rounded-full (pill shape) styling.

### 4. Adjust Sidebar Layout
Remove the header section from sidebar, keep only search and chat history below the shared top bar.

---

## Technical Implementation

### File: `src/pages/Dashboard.tsx`

**Create unified top bar with New Chat + Domain Selector:**

Replace the separate sidebar header and domain bar with a single unified header row:

```tsx
{/* Unified Top Bar - forms horizontal part of inverted L */}
<div className="hidden lg:flex items-center gap-4 px-4 py-3 bg-background border-b border-border fixed top-[72px] left-0 right-0 z-30">
  {/* New Chat Button - bubble style, aligned with domain pills */}
  <Button
    onClick={createNewConversation}
    className="h-10 px-6 rounded-full gap-2 bg-foreground text-background hover:bg-foreground/90"
  >
    <Plus className="h-4 w-4" />
    New Chat
  </Button>
  
  {/* Domain Pills */}
  <DomainSelector variant="pills" className="flex-1" onDomainChange={handleDomainChange} />
  
  {/* Credits */}
  <CreditDisplay variant="compact" />
</div>
```

**Adjust main content margin:**
Account for the new unified top bar height.

### File: `src/components/dashboard/ChatSidebar.tsx`

**Remove header with New Chat button:**

The sidebar should now start below the unified top bar and only contain:
1. Search input (bubble style)
2. Chat history label
3. Conversation list

**Update search input to bubble style (line 140-145):**

```tsx
<Input
  placeholder="Search chats..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="pl-9 pr-9 h-10 text-sm bg-muted border-0 rounded-full placeholder:text-muted-foreground/60"
/>
```

**Adjust sidebar positioning:**

```tsx
<aside className="hidden lg:flex w-72 bg-sidebar flex-col fixed left-0 top-[120px] bottom-0 z-40">
```

The sidebar now starts at `top-[120px]` (below TopNavigation + unified bar).

### File: `src/components/dashboard/DomainSelector.tsx`

**Increase pill height to match New Chat button:**

```tsx
className={cn(
  "px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
  // ... rest
)}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `Dashboard.tsx` | Create unified top bar with New Chat button + Domain Selector in same row |
| `ChatSidebar.tsx` | Remove header section, adjust top position, style search as bubble |
| `DomainSelector.tsx` | Increase pill height to match New Chat button |

---

## Layout Measurements

- TopNavigation height: 72px
- Unified bar height: ~56px (py-3 + h-10 button)
- Sidebar starts at: 72px + 56px = 128px from top
- New Chat button: h-10 (40px), rounded-full
- Domain pills: h-10 (40px), rounded-full
- Search input: h-10 (40px), rounded-full

