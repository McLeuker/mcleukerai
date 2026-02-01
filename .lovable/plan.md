

## Unify Header Height Across All Pages

Match the dashboard header spacer to the domain landing page height so the black content area starts at the same vertical position on all pages.

---

## Current State

| Page | Header Spacer | Desktop Height |
|------|--------------|----------------|
| Domain Landing (`/domain/fashion`) | `h-14 lg:h-[72px]` | 72px |
| Dashboard (`/dashboard`) | `h-14` | 56px |

---

## Change Required

**File: `src/pages/Dashboard.tsx`**

Update line 93 from:
```tsx
<div className="h-14" />
```

To:
```tsx
<div className="h-14 lg:h-[72px]" />
```

---

## Result

Both pages will have the same header height:
- Mobile: 56px (`h-14`)
- Desktop: 72px (`lg:h-[72px]`)

The black content area will start at the exact same vertical position on both the dashboard and domain landing pages.

