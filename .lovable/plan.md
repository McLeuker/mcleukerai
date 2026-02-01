

## Fix Top Bar Alignment & Centering

Address the centering issues for "+ New Chat" button, domain pills, and the black content area.

---

## Issues from Screenshot

1. **"+ New Chat" button** - Left-aligned in the white box, should be CENTERED
2. **Domain pills** - Not starting at left edge of black area, not centered properly relative to credits box
3. **Black area content** - Still not properly centered (the "Where is my mind?" section)

---

## Visual Target

```text
┌────────────────────┬──────────────────────────────────────────────────────────┐
│                    │                                                          │
│   [+ New Chat]     │   [All] [Fashion] [Beauty] [...centered...] │ [Credits] │
│    (centered)      │   ↑ starts at left edge, centered in available space     │
│                    │                                                          │
├────────────────────┼──────────────────────────────────────────────────────────┤
│  WHITE SIDEBAR     │  BLACK CONTENT AREA                                      │
│                    │                                                          │
│                    │              ┌─────────────────────┐                     │
│                    │              │ Where is my mind?   │                     │
│                    │              │   (centered here)   │                     │
│                    │              └─────────────────────┘                     │
└────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## Changes

### 1. Center "+ New Chat" in White Column

**File: `src/pages/Dashboard.tsx`**

Current (line 136):
```tsx
<div className="bg-sidebar border-r border-border flex items-center px-3 py-2">
```

Change to:
```tsx
<div className="bg-sidebar border-r border-border flex items-center justify-center px-3 py-2">
```

Adding `justify-center` will center the button horizontally within the white column.

### 2. Fix Domain Pills Centering

**File: `src/pages/Dashboard.tsx`**

Current right column (line 157):
```tsx
<div className="bg-background flex items-center gap-3 px-3 py-2">
  <DomainSelector variant="pills" className="flex-1" ... />
  {/* Export */}
  <CreditDisplay ... />
</div>
```

The issue is that `flex-1` on DomainSelector makes it expand to fill space, but the pills inside aren't centered.

Change to structure where:
- Pills are in a centered container
- Credits are pushed to the right with `ml-auto`

```tsx
<div className="bg-background flex items-center px-3 py-2">
  {/* Domain Pills - centered in available space */}
  <div className="flex-1 flex justify-center">
    <DomainSelector variant="pills" onDomainChange={handleDomainChange} />
  </div>
  
  {/* Credits fixed at right */}
  <CreditDisplay variant="compact" />
</div>
```

Wait, this won't work perfectly because the pills need to be centered relative to the space between start and credits.

Better approach - use CSS to center pills within the full width minus credits:
```tsx
<div className="bg-background flex items-center py-2 pl-3 pr-3">
  {/* Domain Pills - flex-1 to take remaining space, justify-center to center content */}
  <DomainSelector variant="pills" className="flex-1 flex justify-center" onDomainChange={handleDomainChange} />
  
  {/* Credits at the end */}
  <CreditDisplay variant="compact" className="flex-shrink-0" />
</div>
```

Also need to update **DomainSelector.tsx** to center its content:

Current:
```tsx
<div className="flex gap-1.5 pb-2">
```

Change to:
```tsx
<div className="flex gap-1.5 pb-2 justify-center">
```

### 3. Remove Horizontal Scroll on Domain Pills

**File: `src/components/dashboard/DomainSelector.tsx`**

The `ScrollArea` wrapper is causing issues. Since we've shrunk the pills to fit, we can:
- Remove `ScrollArea` wrapper for the pills variant
- Just use a simple `div` with `flex-wrap` or trust they'll fit

Change from:
```tsx
<ScrollArea className={cn("w-full", className)}>
  <div className="flex gap-1.5 pb-2">
    {/* pills */}
  </div>
  <ScrollBar orientation="horizontal" ... />
</ScrollArea>
```

To:
```tsx
<div className={cn("flex gap-1.5 items-center justify-center", className)}>
  {/* pills */}
</div>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `Dashboard.tsx` (line 136) | Add `justify-center` to white column for centered New Chat button |
| `Dashboard.tsx` (line 157) | Restructure right column so pills are centered, credits at end |
| `DomainSelector.tsx` | Remove ScrollArea, use simple flex with `justify-center` for pills |

---

## Technical Details

### Layout Structure After Fix

```tsx
{/* Left Column - WHITE */}
<div className="... flex items-center justify-center ...">
  <Button>+ New Chat</Button>  {/* Centered */}
</div>

{/* Right Column - BLACK */}
<div className="... flex items-center ...">
  {/* Pills container - centered */}
  <div className="flex-1 flex justify-center">
    <div className="flex gap-1.5">
      {pills}
    </div>
  </div>
  
  {/* Credits - fixed at end */}
  <CreditDisplay className="flex-shrink-0" />
</div>
```

This ensures:
1. New Chat is centered in the white box
2. Domain pills are centered in the space between left edge and credits
3. Credits stay anchored at the right edge

