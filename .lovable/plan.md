

## Remove White Line Between Header and Content

Add the beige background color to the header spacer so there's no white gap between the header and black content area.

---

## Issue

The header spacer (`<div className="h-14 lg:h-[72px]" />`) has no background color, so the white `bg-background` from the parent div shows through, creating a visible white line.

---

## Change Required

**File: `src/pages/Dashboard.tsx`**

Update line 93 from:
```tsx
<div className="h-14 lg:h-[72px]" />
```

To:
```tsx
<div className="h-14 lg:h-[72px] bg-sidebar" />
```

---

## Result

The spacer will have the same beige (`bg-sidebar`) color as the TopNavigation header, creating a seamless transition from the header to the black content area with no white line visible.

