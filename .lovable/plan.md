

## Merge Dashboard Headers into Single Unified Bar

Remove the separate TopNavigation header and combine all elements into one single header row, matching the layout shown in the domain landing page screenshot.

---

## Current Structure (Two Headers)

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│  [Logo]                                                    [Credits] [Avatar]  │  ← TopNavigation (REMOVE)
├────────────────────┬───────────────────────────────────────────────────────────┤
│   [+ New Chat]     │   [Domain Pills]                    [Export] [Credits]    │  ← Desktop Unified Top Bar
└────────────────────┴───────────────────────────────────────────────────────────┘
```

---

## Target Structure (Single Header)

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] [+ New Chat]  [All] [Fashion] [Beauty] [...]  [Export] [Credits] [👤]  │
├────────────────────┬───────────────────────────────────────────────────────────┤
│                    │                                                           │
│ Chat History       │              BLACK CONTENT AREA                           │
│                    │                                                           │
└────────────────────┴───────────────────────────────────────────────────────────┘
```

---

## Changes

### 1. Remove TopNavigation from Dashboard

**File: `src/pages/Dashboard.tsx`**

- Remove the `<TopNavigation showSectorTabs={false} showCredits={false} />` component
- Remove the spacer div `<div className="h-14 lg:h-[72px]" />`

### 2. Create Single Unified Header

**File: `src/pages/Dashboard.tsx`**

Replace the current "Desktop Unified Top Bar" (2-column grid) with a single full-width header row containing:

- **Left**: Logo + New Chat button
- **Center**: Domain pills (centered)
- **Right**: Export dropdown + Credits + Profile avatar dropdown

This header will be:
- Fixed position at top (`fixed top-0`)
- Full width
- Single row layout using flexbox
- Background: `bg-sidebar` (beige) to match the sidebar

### 3. Move Profile Avatar & Dropdown to Dashboard

Since we're removing TopNavigation from Dashboard, we need to bring the profile avatar and its dropdown menu into the new unified header. This requires:
- Importing the necessary auth hooks and components
- Adding the Avatar and DropdownMenu for the user profile

### 4. Update Sidebar Position

**File: `src/components/dashboard/ChatSidebar.tsx`**

The sidebar currently starts at `top-[72px]`. With the new single header (approx `h-14`), we need to adjust:
- Change `top-[72px]` to `top-14` (56px)

### 5. Update Main Content Top Offset

**File: `src/pages/Dashboard.tsx`**

- Add spacer after header: `<div className="h-14" />` (only one spacer now)
- Update sticky position for any sub-elements if needed

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `Dashboard.tsx` | Remove TopNavigation, remove extra spacer, create single unified header with logo, new chat, domain pills, export, credits, and profile avatar |
| `ChatSidebar.tsx` | Update `top-[72px]` to `top-14` |

---

## Technical Details

### New Unified Header Structure (Dashboard.tsx)

```tsx
{/* Single Unified Header */}
<header className="fixed top-0 left-0 right-0 z-50 bg-sidebar h-14">
  <div className="h-full flex items-center px-4 lg:px-6">
    {/* Left: Logo + New Chat */}
    <div className="flex items-center gap-4 shrink-0">
      <Link to="/">
        <img src={mcleukerLogo} alt="McLeuker AI" className="h-8 w-auto" />
      </Link>
      <Button onClick={createNewConversation} className="...">
        <Plus /> New Chat
      </Button>
    </div>

    {/* Center: Domain Pills */}
    <div className="flex-1 flex justify-center">
      <DomainSelector variant="pills" onDomainChange={handleDomainChange} />
    </div>

    {/* Right: Export + Credits + Profile */}
    <div className="flex items-center gap-3 shrink-0">
      {/* Export dropdown (if messages) */}
      {/* Credits display */}
      {/* Profile avatar dropdown */}
    </div>
  </div>
</header>
```

### ChatSidebar Position Update

```tsx
// Before
<aside className="... top-[72px] ...">

// After  
<aside className="... top-14 ...">
```

