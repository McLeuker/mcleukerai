

## Unify All Page Headers - Use TopNavigation Everywhere

Make all pages share the exact same header layout by using `TopNavigation` consistently. The only difference on the Dashboard page will be an additional "New Chat" button.

---

## Current vs Target

**Current state:**
- Domain pages (`/domain/fashion`) use `TopNavigation`
- Dashboard (`/dashboard`) uses a custom inline header

**Target state:**
- ALL pages use `TopNavigation`
- Dashboard passes a prop to show "New Chat" button

---

## Changes

### 1. Add "New Chat" support to TopNavigation

**File: `src/components/layout/TopNavigation.tsx`**

Add new props:
```tsx
interface TopNavigationProps {
  showSectorTabs?: boolean;
  showCredits?: boolean;
  showNewChat?: boolean;           // NEW
  onNewChat?: () => void;          // NEW
}
```

Add "New Chat" button next to the logo (only when `showNewChat` is true):

```tsx
{/* Left: Logo + optional New Chat */}
<div className="flex items-center gap-4 shrink-0">
  <Link to="/" className="flex items-center gap-2.5">
    <img src={mcleukerLogo} alt="McLeuker AI" className="h-8 w-auto" />
  </Link>
  
  {showNewChat && onNewChat && (
    <Button
      onClick={onNewChat}
      className="hidden lg:flex px-3 py-1.5 h-auto rounded-full gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium"
    >
      <Plus className="h-3.5 w-3.5" />
      New Chat
    </Button>
  )}
</div>
```

### 2. Simplify Dashboard to use TopNavigation

**File: `src/pages/Dashboard.tsx`**

Remove:
- The entire custom `<header>` block (lines 166-304)
- Redundant imports (Avatar, DropdownMenu, User, CreditCard icons that are only used in header)
- The `userProfile` state and `fetchUserProfile` logic (TopNavigation handles this)
- The `getInitials` function

Add:
- Import `TopNavigation`
- Use `<TopNavigation showSectorTabs={true} showCredits={true} showNewChat={true} onNewChat={createNewConversation} />`
- Add the standard spacer `<div className="h-14 lg:h-[72px]" />`

The Dashboard will become much simpler - just using TopNavigation like all other pages.

---

## Result

| Page | Header Layout |
|------|---------------|
| Landing | Logo --- [Sign in] [Get started] |
| Domain pages | Logo --- [All] [Fashion] [Beauty]... --- [Credits] [Avatar] |
| Dashboard | Logo [+ New Chat] --- [All] [Fashion] [Beauty]... --- [Credits] [Avatar] |
| Profile/Billing/etc | Logo --- [Credits] [Avatar] |

All pages use the same `TopNavigation` component. Dashboard is the only one with `showNewChat={true}`.

---

## Files to Change

| File | Changes |
|------|---------|
| `TopNavigation.tsx` | Add `showNewChat` and `onNewChat` props, render New Chat button conditionally |
| `Dashboard.tsx` | Remove custom header, use `TopNavigation` with new props, remove redundant code |

