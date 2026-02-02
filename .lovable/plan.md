
## Fix Chat Input Response - Callback Type Mismatch

### Root Cause
The `onSelectPrompt` callback chain has mismatched function signatures:

```text
DomainStarterPanel → calls with (prompt, mode, model)
                  ↓
ChatView interface → expects only (prompt: string)
                  ↓  
Dashboard handler → ignores mode/model, hardcodes "quick"
```

**Result:** User selections for Quick/Deep mode and model are lost.

---

### Technical Fix

#### 1. Update ChatView Interface
**File:** `src/components/dashboard/ChatView.tsx`

Update the `onSelectPrompt` type to accept all parameters:

```typescript
// Line 20 - Change from:
onSelectPrompt?: (prompt: string) => void;

// To:
onSelectPrompt?: (prompt: string, mode?: "quick" | "deep", model?: string) => void;
```

---

#### 2. Update Dashboard Handler
**File:** `src/pages/Dashboard.tsx`

Update the `onSelectPrompt` prop to pass mode and model:

```typescript
// Line 129 - Change from:
onSelectPrompt={(prompt) => handleSendMessage(prompt, "quick")}

// To:
onSelectPrompt={(prompt, mode, model) => handleSendMessage(prompt, mode || "quick", model)}
```

---

### Summary Table

| File | Line | Change |
|------|------|--------|
| `src/components/dashboard/ChatView.tsx` | 20 | Update `onSelectPrompt` type signature |
| `src/pages/Dashboard.tsx` | 129 | Pass `mode` and `model` to `handleSendMessage` |

### Expected Result After Fix

| User Action | Before Fix | After Fix |
|-------------|------------|-----------|
| Type in All Domains + select Deep + press Enter | Sent as "quick" | Sent as "deep" |
| Type in All Domains + select model + press Enter | Model ignored | Model passed to backend |
| Click starter suggestion with Deep mode | Sent as "quick" | Sent as "deep" |
