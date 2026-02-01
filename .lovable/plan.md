
## Fix Enterprise Checkout + Enable Credit Purchases for All Users

### Root Cause Analysis

**Issue 1: Enterprise button not triggering checkout**
Looking at the current code in `Pricing.tsx` (lines 178-186), there's a condition `id === "enterprise"` that renders a "Contact Sales" link, which happens BEFORE the checkout button logic. This is why Enterprise shows "Contact Sales" instead of checkout.

Since you want Enterprise to trigger checkout like Starter/Pro, we need to REMOVE this special Enterprise condition entirely.

**Issue 2: Free users blocked from purchasing credits**
Multiple places block free users:
1. `purchase-credits/index.ts` lines 96-105: Returns 403 error for free plan users
2. `useSubscription.tsx` lines 248-256: `canRefill()` returns false for free plan
3. `pricing.ts`: No `free` tier in `CREDIT_REFILLS`

---

### Changes Required

#### 1. `src/pages/Pricing.tsx` - Fix Enterprise Button

**Remove the Enterprise special case** (delete lines 178-186):

```text
Lines 178-186 to DELETE:
) : id === "enterprise" ? (
  // Enterprise: Always show Contact Sales
  <Button
    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
    variant="secondary"
    asChild
  >
    <Link to="/contact">Contact Sales</Link>
  </Button>
```

This allows Enterprise to fall through to the regular checkout button logic (lines 196-212).

#### 2. `src/config/pricing.ts` - Add Free Tier Credit Refill

Add `free` tier to `CREDIT_REFILLS` (after line 194):

```typescript
export const CREDIT_REFILLS = {
  free: {
    credits: 250,
    price: 5,
    perCredit: 5 / 250,
  },
  starter: {
    credits: 500,
    price: 9,
    perCredit: 9 / 500,
  },
  // ... existing pro and enterprise
};
```

#### 3. `src/hooks/useSubscription.tsx` - Allow Free Users to Refill

Update `canRefill()` function (lines 248-256):

```typescript
// Check if user can purchase refills (ALL users can now)
const canRefill = () => {
  const planConfig = SUBSCRIPTION_PLANS[state.plan as keyof typeof SUBSCRIPTION_PLANS];
  if (!planConfig || !('maxRefillsPerMonth' in planConfig)) return true; // Default to allowing
  
  const maxRefills = planConfig.maxRefillsPerMonth as number;
  if (maxRefills === 0) return true; // 0 means unlimited for free users
  return state.refillsThisMonth < maxRefills;
};
```

#### 4. `src/pages/Pricing.tsx` - Update Credit Refill UI

Update the refill section (lines 242-330) to:
- Show a "Free" tier card
- Remove the `canRefill` restriction based on subscription
- Update messaging from "Paid subscribers can purchase" to "Purchase additional credits anytime"
- Remove the "Upgrade to a paid plan" warning

#### 5. `supabase/functions/purchase-credits/index.ts` - Allow Free Users

Update the edge function:

1. Add free tier to `CREDIT_REFILLS` config (after line 33):
```typescript
const CREDIT_REFILLS = {
  free: {
    credits: 250,
    priceId: "NEED_NEW_STRIPE_PRICE_ID", // Will need to create
    price: 5,
  },
  starter: {
    credits: 500,
    priceId: "price_xxx",
    price: 9,
  },
  // ... existing
};
```

2. Remove the free plan block (delete lines 96-105):
```typescript
// DELETE THIS BLOCK:
if (plan === "free" || userData?.subscription_status === "free") {
  logStep("User on free plan, denying refill");
  return new Response(JSON.stringify({ 
    error: "Credit refills are only available for Pro and Studio subscribers" 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 403,
  });
}
```

3. Update `MAX_REFILLS` to include free tier:
```typescript
const MAX_REFILLS: Record<string, number> = {
  free: 999, // unlimited refills for free users
  starter: 1,
  pro: 2,
  enterprise: 999,
};
```

---

### Stripe Price ID Required

For the free tier credit pack, we'll need a new Stripe price. I'll create one:
- Product: "Credit Refill - Free Plan"
- Price: $5 for 250 credits
- Type: One-time payment

---

### Summary Table

| File | Change |
|------|--------|
| `src/pages/Pricing.tsx` | Remove Enterprise special case, update refill UI |
| `src/config/pricing.ts` | Add `free` tier to `CREDIT_REFILLS` |
| `src/hooks/useSubscription.tsx` | Update `canRefill()` to allow all users |
| `supabase/functions/purchase-credits/index.ts` | Remove free user block, add free tier config |

### Expected Results

| Plan | Subscription Button | Credit Purchase |
|------|---------------------|-----------------|
| Free | "Get Started Free" link | Can purchase 250 credits for $5 |
| Starter | Checkout button | Can purchase 500 credits for $9 |
| Pro | Checkout button | Can purchase 1,500 credits for $19 |
| Enterprise | Checkout button | Can purchase 5,000 credits for $49 |
