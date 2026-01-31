

## Remove Redundant Sources Section

The collapsible "SOURCES" section at the bottom of the "What's Happening Now" area will be removed since each intelligence card already displays its source inline.

---

## Change

**File:** `src/components/domain/DomainInsights.tsx`

Remove the entire collapsible Sources section (lines 299-356):

```jsx
{/* This entire block will be removed */}
{uniqueSources.length > 0 && (
  <Collapsible
    open={sourcesExpanded}
    onOpenChange={setSourcesExpanded}
    ...
  >
    ...
  </Collapsible>
)}
```

---

## Cleanup

Also remove unused code that was only needed for the Sources section:

1. **Line 131**: Remove `const [sourcesExpanded, setSourcesExpanded] = useState(false);`
2. **Lines 149-167**: Remove `uniqueSources` and `compactSourceList` calculations
3. **Line 3**: Remove unused imports: `ChevronDown`, `ChevronUp` from lucide-react
4. **Lines 8-12**: Remove unused `Collapsible` imports

---

## Result

Each intelligence card still shows its source in the metadata row:
```
CURATED · TODAY · THE INDUSTRY BEAUTY · Brand Campaigns
                    ↑ source shown here
```

The redundant expandable "Sources" section at the bottom is removed.

