
## What’s actually broken (based on current code)
Your app is still calling the Railway backend **directly from the browser**:

- `src/lib/mcLeukerAPI.ts` sets `baseUrl` to `import.meta.env.VITE_RAILWAY_API_URL` (Railway direct).
- All chat/task/search calls use `fetch(`${this.baseUrl}/api/...`)`.

That will still fail in production browsers if Railway CORS isn’t allowing your site origin — which is exactly why you created the `proxy-railway` backend function.

Also, your backend function is currently not configured in `supabase/config.toml`, and it’s not being called at all (no network logs show `/proxy-railway` traffic). So the “proxy fix” exists, but the frontend is not using it.

## Goal
Route ALL Railway API calls (chat, deep chat, tasks, search, status/health/config) through the `proxy-railway` backend function so the browser never talks to Railway directly.

## Implementation Plan (what I will change)

### 1) Update the frontend API client to use the proxy base URL
**File:** `src/lib/mcLeukerAPI.ts`

- Change `API_BASE_URL` from Railway direct to:
  - `PROXY_BASE_URL = ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-railway`
- Keep a separate `RAILWAY_DIRECT_URL` only if needed (see file downloads below).
- Ensure every request uses the proxy base:
  - `/health`
  - `/api/chat`
  - `/api/chat/deep`
  - `/api/tasks/*`
  - `/api/search*`
  - `/api/status`, `/api/config/status`, etc.

**Why this fixes chat:** the browser will call your own backend endpoint (`/functions/v1/proxy-railway/...`) which is same-origin-safe and returns CORS headers.

### 2) Make sure the proxy backend function is configured correctly
**File:** `supabase/config.toml`

- Add:
  - `[functions.proxy-railway]`
  - `verify_jwt = false`

Reason: Your project uses the “verify_jwt = false + validate manually” pattern for stability. Without this entry, the function may behave inconsistently depending on default settings.

### 3) Improve the proxy function so it can handle BOTH JSON and file downloads safely
Right now your proxy always:
- sets `Content-Type: application/json`
- reads the upstream response as `text()`
- tries to `JSON.parse` and wraps it

That’s fine for chat JSON responses, but it will **break any binary downloads** and can also break non-JSON responses.

**File:** `supabase/functions/proxy-railway/index.ts`

I will update it to:
- Use `RAILWAY_BASE_URL` from environment (so you can change it without code changes):
  - `const RAILWAY_BASE_URL = Deno.env.get("VITE_RAILWAY_API_URL") ?? "https://web-production-29f3c.up.railway.app";`
- Forward request method + headers more faithfully (especially `content-type`, `accept`, and optionally `range`).
- Return the upstream response **as-is** (status, body, content-type), while still adding the proxy’s CORS headers.
- Avoid forcing JSON formatting. (If upstream returns JSON, it stays JSON; if it returns a file, it stays a file.)

### 4) (Optional but recommended) Add lightweight auth protection to the proxy
Because proxying Railway effectively exposes your AI endpoints, I’ll add a simple “logged-in check” inside the proxy function (same style you use elsewhere):
- Read `Authorization: Bearer <token>` from the request
- Validate user via the auth API
- If missing/invalid: return `401`

This prevents random anonymous abuse of your Railway endpoints.

If you want chat to work even while logged out on landing pages, we can skip this or add a limited “public allowlist” (e.g., allow `/health` unauthenticated, but require auth for `/api/chat`, `/api/tasks`, etc.). I’ll implement the safer default: allow `/health` without auth, require auth for the rest.

### 5) Ensure file downloads work from the UI
Your `FileDownloadCard` currently downloads like this:
- `fetch(file.url)` → `blob()` → createObjectURL → download

That **requires CORS** if `file.url` points directly to Railway.

After step (3), we can safely point file URLs to the proxy instead (recommended), because the proxy will now support binary passthrough. I’ll update `getFileDownloadUrl()` to generate a proxy URL so downloads work reliably.

## Testing checklist (end-to-end)
1) Go to `/login`, sign in, then go to `/dashboard`.
2) Send a quick message:
   - Confirm you see the assistant response.
3) Send a deep message:
   - Confirm it returns and the UI updates.
4) Open DevTools → Network:
   - Confirm requests go to `/functions/v1/proxy-railway/api/chat` (not Railway directly).
5) Generate a file and click Download:
   - Confirm the download succeeds (no CORS error).
6) Check the status badge / health indicator:
   - Should show “Connected” (because health now goes through proxy too).

## If it still fails after these changes
I will add targeted logs in:
- frontend (log the exact URL being requested)
- proxy function (log path, status codes, and upstream error bodies)

That will make the next debugging iteration deterministic.

## “Next” feature ideas (optional, after chat works)
- Add a “Connection diagnostics” panel in the dashboard that shows proxy status + Railway status + last error.
- Add retry/backoff and better user-facing error messages (distinguish “network blocked” vs “backend error”).
- Add per-user rate limiting at the proxy layer to prevent abuse/spikes.
- Add streaming responses (SSE) for faster “typing” effect.
- Add a “Report issue” button that attaches recent logs/request IDs for support.
