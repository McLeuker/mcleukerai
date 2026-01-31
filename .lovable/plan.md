

## Redesign Intelligence Cards

Simplify the card layout to reduce text density and improve readability.

---

## New Card Structure

```text
┌─────────────────────────────────────────────┐
│ High                                        │  ← Line 1: Confidence only
│                                             │
│ Boots Launches In-Store Wellness Zones      │  ← Title (spans full width,
│ Amid Beauty-From-Within Surge               │    multiple lines as needed)
│                                             │
│ Boots introduces dedicated Wellness Zones   │  ← Description text
│ and Health & Wellness Specialists...        │    (natural line wrapping)
│                                             │
│ 🕐 Today                                    │  ← Clock emoji + date only
│                                             │
│ The Industry Beauty                         │  ← Source name only
└─────────────────────────────────────────────┘
```

---

## Changes to `src/components/domain/DomainInsights.tsx`

### Card Structure (Lines 218-274)

**Current layout:**
- Title + Badge side by side
- Description
- Single metadata line with: Type · Date · Source · Category

**New layout:**
1. Confidence badge alone (top-left)
2. Title on its own lines (full width, clickable if URL exists)
3. Description paragraph
4. Clock emoji + formatted date (e.g., "🕐 Today")
5. Source name on separate line

---

## Implementation Details

### Remove from metadata:
- Data type label ("CURATED", "REAL-TIME", "PREDICTIVE")
- Category ("Brand Campaigns")
- All middle-dot separators

### Keep:
- Confidence level (moved to top, standalone)
- Title (full width)
- Description
- Date with clock emoji
- Source name (own line)

### Code changes:
- Remove `getDataTypeLabel` usage in card
- Remove `getDataTypeIcon` from metadata row
- Simplify Badge to show just confidence text without icon
- Split metadata into two separate lines

