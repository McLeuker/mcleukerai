

# Remove "Or Try a Prompt" Box from Homepage Hero

## What Will Be Removed

The prompt input box in the hero section of the homepage, which includes:
- The "Or try a prompt" label text
- The text input field with placeholder "e.g., Analyze SS26 color trends..."

## Location

**File:** `src/pages/Landing.tsx`  
**Lines to remove:** 259-284

## Current Code (to be removed)

```tsx
{/* Try a prompt input */}
<div className="mt-12 max-w-xl mx-auto">
  <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Or try a prompt</p>
  <div className="relative">
    <input
      type="text"
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleSubmit(e);
        }
      }}
      placeholder="e.g., Analyze SS26 color trends..."
      className={...}
    />
  </div>
</div>
```

## Result

The hero section will have:
- ✅ "AI & Sustainability for Fashion" badge
- ✅ "The Future of Fashion Intelligence" headline
- ✅ Subheadline text
- ✅ "Open Dashboard" and "Explore Domains" CTA buttons
- ❌ No prompt input box (removed)

The hero will be cleaner and more focused on the primary CTAs.

