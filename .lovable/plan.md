

## Fix Layout Alignment & Centering

Address the size mismatch between bubbles, congested chat history, and off-center AI section.

---

## Issues Identified

1. **New Chat bubble size mismatch** - Currently `h-10 px-6` while domain pills have `px-5 py-2.5` - they look different
2. **Chat history too congested** - Starts immediately after the top bar with minimal spacing
3. **AI section not centered** - The black content area should center its content in the remaining space (after sidebar)

---

## Visual Target

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌────────────┐ ┌─────────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐       │
│  │ + New Chat │ │ All Domains │ │ Fashion │ │ Beauty │ │ Textile │  ...  │
│  └────────────┘ └─────────────┘ └─────────┘ └────────┘ └─────────┘       │
│  ↑ ALL SAME HEIGHT & PADDING, IN ONE STRAIGHT LINE                       │
├──────────────────┬───────────────────────────────────────────────────────┤
│  SIDEBAR         │                                                       │
│                  │                                                       │
│  (more spacing)  │          ┌─────────────────────────┐                  │
│                  │          │   Where is my mind?     │                  │
│  Chat History    │          │   (centered in black    │                  │
│  ┌────────────┐  │          │    area, not offset)    │                  │
│  │ Search...  │  │          └─────────────────────────┘                  │
│  └────────────┘  │                                                       │
└──────────────────┴───────────────────────────────────────────────────────┘
```

---

## Changes

### 1. Dashboard.tsx - Match New Chat Button Styling

**Current (line 131-137):**
```tsx
<Button
  onClick={createNewConversation}
  className="h-10 px-6 rounded-full gap-2 bg-foreground text-background hover:bg-foreground/90"
>
```

**Updated:**
```tsx
<Button
  onClick={createNewConversation}
  className="px-5 py-2.5 h-auto rounded-full gap-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium"
>
```

This matches the domain pill styling exactly: `px-5 py-2.5 rounded-full text-sm font-medium`

### 2. ChatSidebar.tsx - Add Top Spacing

**Current (line 92):**
```tsx
<aside className="hidden lg:flex w-72 border-r border-border bg-sidebar flex-col fixed left-0 top-[128px] bottom-0 z-40">
```

**Updated:**
```tsx
<aside className="hidden lg:flex w-72 border-r border-border bg-sidebar flex-col fixed left-0 top-[128px] bottom-0 z-40">
  {/* Add top padding inside */}
```

**Also update header section (lines 94-104):**
- Change `p-4` to `px-4 pt-6 pb-4` for more top breathing room
- Or add a spacer div at the top

### 3. DomainStarterPanel.tsx - Center in Available Space

The black AI section needs to account for the sidebar width when centering.

**Current (line 52-53):**
```tsx
<div className={cn("flex flex-col min-h-screen bg-black", className)}>
  <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
```

**Updated:**
Add padding-left to offset the sidebar width so content centers in the remaining black area:
```tsx
<div className={cn("flex flex-col min-h-screen bg-black", className)}>
  <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:pl-0">
```

Since the DomainStarterPanel is rendered inside the main content area (which already has margin for sidebar), we need to ensure centering works correctly. The issue is that the content centers in the full black area, but the black area itself is offset by the sidebar.

Actually, looking at Dashboard.tsx, the ChatSidebar is rendered separately and the main content area starts after it. So the centering should work - but we should verify the main content area properly accounts for sidebar width.

**Dashboard.tsx - Add left margin for sidebar (line 121):**
```tsx
<div className="flex-1 flex flex-col min-h-screen lg:ml-72">
```

When sidebar is open (w-72 = 288px), add matching left margin to main content.

---

## Summary of Changes

| File | Change |
|------|--------|
| `Dashboard.tsx` | Match New Chat button to domain pill styling; add sidebar margin to main content |
| `ChatSidebar.tsx` | Increase top padding in header for breathing room |
| `DomainStarterPanel.tsx` | Verify centering works with sidebar offset |

---

## Technical Details

### Button Alignment
All bubbles will use the same Tailwind classes:
- `px-5 py-2.5` - horizontal and vertical padding
- `rounded-full` - pill shape
- `text-sm font-medium` - typography
- `h-auto` - let padding determine height (not fixed)

### Sidebar Offset Centering
The main content area needs `lg:ml-72` when sidebar is open, and `lg:ml-14` when collapsed. This ensures the black AI area occupies the correct space and centers content properly within it.

