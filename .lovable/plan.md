

## Consolidate All Domains Search & Restyle Chat History

Move the mode toggles and model selector into the All Domains hero, remove the duplicate white input area, and update chat history bubble styling.

---

## Changes Overview

### 1. DomainStarterPanel.tsx - Integrate Mode Toggles

Add the Quick/Deep toggle and Auto model selector above the search bubble, and add the credit hint below.

**Layout:**
```text
┌─────────────────────────────────────────────┐
│           Where is my mind?                 │
│  Powered by McLeuker AI • All Domains Mode  │
│                                             │
│      Quick 5   Deep 50   |   Auto           │  ← NEW: Mode toggles
│                                             │
│   ┌─────────────────────────────────┐       │
│   │  Grey search bubble...          │       │
│   └─────────────────────────────────┘       │
│                                             │
│   4-12 credits • Press Enter to send        │  ← NEW: Credit hint
│   Shift + Enter for new line                │
│                                             │
│   ○ Topic 1   ○ Topic 2   ○ Topic 3         │
└─────────────────────────────────────────────┘
```

**Code changes:**
- Import `ResearchModeToggle` and `ModelSelector` components
- Add state for `researchMode` and `selectedModel`
- Update `onSelectPrompt` prop to accept mode and model parameters
- Render toggles above search input with white/muted styling for dark background
- Add credit hint below input

### 2. Dashboard.tsx - Hide Bottom Input for All Domains

Conditionally hide the white ChatInput section when `currentSector === "all"`.

**Change:**
```tsx
{/* Input Area - hide when All Domains */}
{currentSector !== "all" && (
  <div className="border-t border-border bg-background/95...">
    <ChatInput ... />
  </div>
)}
```

### 3. ChatSidebar.tsx - Grey Bubbles with Black Text

Update conversation items from black bubbles to grey with black text.

**Style changes:**
- Background: `bg-muted` (grey) instead of `bg-foreground` (black)
- Text: `text-foreground` (black) instead of `text-background` (white)
- Icon: Center vertically with `items-center` instead of `items-start`
- Timestamp: `text-foreground/60` (black at 60% opacity)

**Layout:**
```text
┌──────────────────────────────────┐
│ [◻] Title of conversation...     │  ← Icon centered vertically
│     3 hours ago                  │  ← Black text
└──────────────────────────────────┘
```

---

## Technical Implementation

### File: `src/components/dashboard/DomainStarterPanel.tsx`

**Imports to add:**
```tsx
import { ResearchModeToggle, ResearchMode } from "./ResearchModeToggle";
import { ModelSelector, ModelId } from "./ModelSelector";
```

**New state:**
```tsx
const [researchMode, setResearchMode] = useState<ResearchMode>("quick");
const [selectedModel, setSelectedModel] = useState<ModelId>("auto");
```

**Update interface:**
```tsx
interface DomainStarterPanelProps {
  onSelectPrompt: (prompt: string, mode?: ResearchMode, model?: ModelId) => void;
  // ... rest
}
```

**Add above search bubble (inside All Domains section):**
- Mode toggle and model selector row with dark theme styling
- Use `bg-white/10` for toggle backgrounds to work on black

**Add below search bubble:**
- Credit hint: "4-12 credits • Press Enter to send"
- "Shift + Enter for new line" (hidden on mobile)

### File: `src/pages/Dashboard.tsx`

**Conditional rendering:**
Wrap the bottom input area with `{currentSector !== "all" && (...)}`

### File: `src/components/dashboard/ChatSidebar.tsx`

**Lines 179-230 - Update bubble styling:**
```tsx
className={cn(
  "group relative w-full text-left px-4 py-3 rounded-full transition-all duration-200",
  "bg-muted text-foreground",  // Grey bg, black text
  "hover:bg-muted/80",
  currentConversation?.id === conv.id &&
    "ring-2 ring-primary ring-offset-2 ring-offset-sidebar"
)}
```

**Icon centering:**
```tsx
<div className="flex items-center gap-2.5">  // Changed from items-start
  <MessageSquare className="h-4 w-4 text-foreground/60 flex-shrink-0" />
```

**Text colors:**
- Title: `text-foreground` (black)
- Timestamp: `text-foreground/60` (black at 60%)

**Actions menu button:**
- Update hover colors for light background: `text-foreground hover:bg-foreground/10`

