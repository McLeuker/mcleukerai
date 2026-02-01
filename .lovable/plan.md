
## Fix Pricing Page Checkout Buttons

### Issues Found

1. **Enterprise plan button does nothing**: Line 29 in `handleSubscribe` returns early for enterprise:
   ```js
   if (planId === "enterprise" || planId === "free") return;
   ```
   This silently blocks the checkout without any feedback.

2. **Starter plan button may not be clickable**: The button rendering logic is correct, but the `handleSubscribe` is missing error handling and user feedback for edge cases.

---

## Changes Required

### File: `src/pages/Pricing.tsx`

#### 1. Remove Enterprise block from handleSubscribe (Line 29)

**Before:**
```tsx
const handleSubscribe = async (planId: string) => {
  if (planId === "enterprise" || planId === "free") return;
  // ...
};
```

**After:**
```tsx
const handleSubscribe = async (planId: string) => {
  if (planId === "free") return; // Only block free plan
  // ...
};
```

#### 2. Update CTA Button section (Lines 163-202)

Handle Enterprise plan separately with a "Contact Sales" link, and ensure all other paid plans (Starter, Pro) use the checkout button:

```tsx
{/* CTA Button */}
{isCurrentPlan ? (
  <Button variant="outline" className="w-full" disabled>
    Current Plan
  </Button>
) : isFree ? (
  user ? (
    <Button variant="outline" className="w-full" disabled>
      Included Free
    </Button>
  ) : (
    <Button variant="outline" className="w-full" asChild>
      <Link to="/signup">Get Started Free</Link>
    </Button>
  )
) : id === "enterprise" ? (
  // Enterprise: Always show Contact Sales
  <Button
    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
    variant="secondary"
    asChild
  >
    <Link to="/contact">Contact Sales</Link>
  </Button>
) : !user ? (
  // Not logged in: Show signup link
  <Button
    className={`w-full ${isPopular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
    variant={isPopular ? "default" : "secondary"}
    asChild
  >
    <Link to="/signup">Sign up to subscribe</Link>
  </Button>
) : (
  // Logged in: Show checkout button for Starter and Pro
  <Button
    className={`w-full ${isPopular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
    variant={isPopular ? "default" : "secondary"}
    onClick={() => handleSubscribe(id)}
    disabled={loadingPlan === id}
  >
    {loadingPlan === id ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Processing...
      </>
    ) : (
      currentPlan !== "free" ? "Switch Plan" : "Subscribe Now"
    )}
  </Button>
)}
```

---

## Summary

| Plan | Non-logged-in User | Logged-in User |
|------|-------------------|----------------|
| Free | Link to /signup | Disabled "Included Free" |
| Starter | Link to /signup | **Checkout button (works)** |
| Pro | Link to /signup | **Checkout button (works)** |
| Enterprise | Link to /contact | **Link to /contact** |

This ensures:
- Starter and Pro checkout buttons work for logged-in users
- Enterprise shows "Contact Sales" linking to /contact
- Free plan shows appropriate messaging
- All buttons are functional and clickable
