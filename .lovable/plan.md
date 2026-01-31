

## Make Intelligence Titles Clickable

Add click-through functionality to the "What's Happening Now" section so users can visit the original source.

---

## Change Summary

**File:** `src/components/domain/DomainInsights.tsx`

Make the title (`h3`) in each intelligence card clickable by wrapping it in an anchor tag that opens the source URL in a new tab.

---

## Implementation Details

### Current (Line 247-249)
```jsx
<h3 className="text-base font-medium text-foreground leading-snug flex-1">
  {item.title}
</h3>
```

### New
```jsx
{item.sourceUrl ? (
  <a
    href={item.sourceUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-base font-medium text-foreground leading-snug flex-1 hover:underline underline-offset-2 transition-colors"
  >
    {item.title}
  </a>
) : (
  <h3 className="text-base font-medium text-foreground leading-snug flex-1">
    {item.title}
  </h3>
)}
```

---

## Behavior

| Scenario | Behavior |
|----------|----------|
| Has `sourceUrl` | Title is clickable, underlines on hover, opens in new tab |
| No `sourceUrl` | Title displays as normal text (not clickable) |

---

## Visual Feedback

- Hover state: subtle underline appears
- Cursor changes to pointer when hoverable
- External link opens in new tab (`target="_blank"`)

