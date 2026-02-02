

## Fix Google OAuth 403 Error

### Problem
Google Sign-In returns a 403 error because the current code uses `supabase.auth.signInWithOAuth()` directly, but this project runs on **Lovable Cloud** which manages Google OAuth automatically and requires a different approach.

### Solution
Use Lovable Cloud's managed Google OAuth solution by configuring the social auth integration.

---

### Step 1: Configure Social Auth

I'll use the `configure-social-auth` tool to set up Google OAuth for Lovable Cloud. This will:
- Generate the required `src/integrations/lovable/` module
- Install the `@lovable.dev/cloud-auth-js` package
- Configure the managed OAuth credentials

---

### Step 2: Update Authentication Code

**File: `src/hooks/useAuth.tsx`**

Update the `signInWithGoogle` function to use Lovable Cloud's auth instead of direct Supabase calls:

```typescript
// Before (causes 403):
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});

// After (uses Lovable Cloud managed OAuth):
import { lovable } from "@/integrations/lovable/index";

const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
});
```

---

### Step 3: Update Login & Signup Pages

**Files: `src/pages/Login.tsx` and `src/pages/Signup.tsx`**

The Google sign-in buttons already call `signInWithGoogle()` from the auth hook, so they will automatically use the updated implementation once the hook is fixed.

---

### Why This Fixes the 403 Error

| Issue | Root Cause | Fix |
|-------|------------|-----|
| 403 Forbidden | Direct Supabase OAuth lacks proper Lovable Cloud configuration | Use `lovable.auth.signInWithOAuth()` which has managed credentials |
| Missing redirect URIs | Supabase OAuth settings don't include preview domains | Lovable Cloud automatically handles all redirect URIs |
| OAuth consent issues | Custom OAuth requires Google Cloud Console setup | Lovable Cloud provides pre-configured managed OAuth |

---

### Expected Behavior After Fix

1. User clicks "Continue with Google"
2. Redirects to Google's consent screen (managed by Lovable Cloud)
3. After approval, redirects back to `/dashboard`
4. User is authenticated and session is established

