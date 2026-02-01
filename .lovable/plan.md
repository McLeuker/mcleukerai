

## Fix Bubble Sizing & Fit All Controls Without Scrolling

Make all bubbles smaller, ensure "+ New Chat" is fully visible, and fit everything (all domain pills + credits) on one line without horizontal scroll.

---

## Problem Analysis

From the screenshot and code:
- The left column (`18rem` = 288px) is constraining the "+ New Chat" button, causing it to be cut off
- There are **10 domain sectors** (All Domains, Fashion, Beauty, Skincare, Sustainability, Fashion-Tech, Catwalks, Culture, Textile, Lifestyle)
- Current pill padding `px-5 py-2.5` is too large to fit everything on one screen
- Credits display also needs to fit in the same row

---

## Solution

### 1. Reduce Bubble Sizes (All Pills)

**File: `src/components/dashboard/DomainSelector.tsx`**

Change from:
```tsx
"px-5 py-2.5 rounded-full text-sm font-medium"
```

To smaller padding:
```tsx
"px-3 py-1.5 rounded-full text-xs font-medium"
```

This reduces:
- Horizontal padding: 20px → 12px (saves ~16px per pill × 10 = 160px)
- Vertical padding: 10px → 6px
- Font size: 14px → 12px

### 2. Fix Left Column Width for New Chat

**File: `src/pages/Dashboard.tsx`**

The left column is `18rem` (288px) but the New Chat button gets cut off. Options:
- Reduce left column width slightly to `16rem` (256px)
- OR make the sidebar narrower

Also make New Chat button match the new smaller size:
```tsx
"px-3 py-1.5 rounded-full text-xs font-medium"
```

### 3. Make Credits Display Smaller

**File: `src/components/dashboard/CreditDisplay.tsx`**

The compact variant uses `px-3 py-2`. Make it more compact to align:
```tsx
"px-2 py-1.5 rounded-full text-xs"
```

### 4. Reduce Gap Between Pills

**File: `src/components/dashboard/DomainSelector.tsx`**

Change gap from `gap-2` to `gap-1.5` to save more space.

---

## Summary of Changes

| File | Change |
|------|--------|
| `DomainSelector.tsx` | Reduce pill padding to `px-3 py-1.5`, font to `text-xs`, gap to `gap-1.5` |
| `Dashboard.tsx` | Match New Chat button to smaller size, adjust left column if needed |
| `CreditDisplay.tsx` | Make compact variant smaller to fit inline with pills |

---

## Visual Result

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [+ New Chat] │ [All] [Fashion] [Beauty] [Skincare] [Sust.] [...] [Credits] │
└─────────────────────────────────────────────────────────────────────────────┘
              ↑ All same small size, single line, no scroll
```

