
## Fix Input Field Visibility and Landing Page Task Execution

### Summary of Issues

1. **ResearchModeToggle text invisible**: Uses `text-white/60` and `bg-white/15` which is invisible on light backgrounds like ChatInput
2. **Landing page "Run Task" doesn't execute**: Uses `navigate(state)` but Dashboard reads `sessionStorage` - mismatch causes prompt to be ignored
3. **Domain pages already have search**: No changes needed - DomainLanding pages already have their own search in DomainHero

---

### Changes Required

#### 1. Fix ResearchModeToggle Visibility

**File:** `src/components/dashboard/ResearchModeToggle.tsx`

The current styling uses white text which assumes a dark background:
```text
// Current (lines 25, 32-36, 42-43, 63-67, 73-74)
bg-white/15
text-white, text-white/60
```

**Solution:** Use theme-aware colors that work on both light and dark backgrounds:

```typescript
// Container - use muted background
<div className="inline-flex items-center rounded-full bg-muted p-1">

// Active button
"bg-background text-foreground shadow-sm"

// Inactive button  
"text-muted-foreground hover:text-foreground"

// Credit indicator
"text-muted-foreground/60"
```

---

#### 2. Fix Landing Page Task Execution

**File:** `src/pages/Landing.tsx`

**Current behavior (lines 26-35):**
```typescript
if (user) {
  navigate("/dashboard", { state: { initialPrompt: prompt } });
}
```

**Problem:** Dashboard reads from `sessionStorage`, not navigation state.

**Solution:** Store prompt in sessionStorage before navigating (matching DomainLanding pattern):

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (prompt.trim()) {
    if (user) {
      // Store prompt for immediate execution
      sessionStorage.setItem("domainPrompt", prompt);
      sessionStorage.setItem("domainContext", "all");
      navigate("/dashboard");
    } else {
      navigate("/login", { state: { redirectPrompt: prompt } });
    }
  }
};
```

Also update the suggestion button click handler (around line 209):
```typescript
onClick={() => {
  if (user) {
    sessionStorage.setItem("domainPrompt", suggestion.prompt);
    sessionStorage.setItem("domainContext", "all");
    navigate("/dashboard");
  } else {
    setPrompt(suggestion.prompt);
  }
}}
```

---

#### 3. Confirm Domain Pages Already Have Search

**No changes needed** - Domain landing pages (`/domain/fashion`, etc.) already have:
- `DomainHero` component with integrated search bar
- `DomainAskBar` at the bottom with starter suggestions
- Task submission routes to Dashboard via sessionStorage

The Dashboard's ChatInput at the bottom is only shown on the Dashboard page itself, which is correct.

---

### Technical Summary

| File | Change |
|------|--------|
| `src/components/dashboard/ResearchModeToggle.tsx` | Update colors from white-based to theme-aware (bg-muted, text-foreground) |
| `src/pages/Landing.tsx` | Use sessionStorage instead of navigation state for logged-in user task execution |

### Expected Behavior After Fix

| Scenario | Result |
|----------|--------|
| User types in Landing page search + clicks "Run Task" (logged in) | Directly runs the task in Dashboard |
| User clicks suggestion card (logged in) | Directly runs the task in Dashboard |
| Quick/Deep toggle in ChatInput | Text visible on light background |
| Domain landing page | Uses existing DomainHero search bar |

### Visual Changes

**Before (ResearchModeToggle on light background):**
- White text on transparent background = invisible

**After:**
- Muted background pill with foreground text = visible on all backgrounds
