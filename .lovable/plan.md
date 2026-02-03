
# McLeuker AI Redesign Plan

## Overview

This comprehensive redesign preserves the existing dark theme (black/white/grey, premium, minimal) while significantly improving UX, readability, consistency, and accessibility. The plan covers dashboard improvements, landing page refinements, new footer pages, and SEO/branding fixes.

---

## Part 1: Dashboard/Workspace Changes (`/dashboard`)

### A. Replace Logo Image with Text Wordmark
**File:** `src/components/layout/TopNavigation.tsx`

- Replace `<img src={mcleukerLogo}>` with a text-based wordmark
- Use `font-luxury` (Cormorant Garamond) to match the logo's serif style
- Style: `text-xl font-luxury text-white tracking-[0.02em]`
- Keep same positioning and spacing

### B. Rename "All Domains" to "Global"
**File:** `src/contexts/SectorContext.tsx`

- Update `SECTORS[0].label` from `"All Domains"` to `"Global"`
- Update associated placeholder text to match

### C. User Message Display: Text Only (No Avatar/Name/Time)
**File:** `src/components/dashboard/ChatMessage.tsx`

- Remove `<BubbleHeader>` component from user messages entirely
- Remove the bubble styling for user messages
- Render user text directly with subtle right alignment
- Keep minimal padding, remove graphite bubble styling

### D. AI Output: ChatGPT-like (No Bubble, No Metadata)
**File:** `src/components/dashboard/ChatMessage.tsx`

- Remove graphite bubble wrapper from AI messages
- Remove `<BubbleHeader>` (no avatar, name, timestamp)
- Remove credits line footer
- Remove per-message action icon rows from the content area
- Render AI text directly on black background with proper padding
- Keep full markdown rendering support

### E. Message Readability Improvements
**File:** `src/components/dashboard/ChatMessage.tsx` + `src/index.css`

- Add reading column max-width: `max-w-[720px]` or `max-w-[800px]`
- Increase line-height to `1.7` (currently 1.6)
- Add spacing between paragraphs: `mb-4` (currently mb-3)
- Ensure list items have comfortable spacing

### F. Sticky Composer
**File:** `src/pages/Dashboard.tsx`

- Change composer from `sticky bottom-0` to `fixed bottom-0`
- Add proper width calculations to account for sidebar
- Add `pb-[120px]` to message list to prevent overlap with composer
- Ensure chat messages scroll behind the composer

### G. Move "+ New Chat" Button into Sidebar
**Files:** `src/components/dashboard/ChatSidebar.tsx`, `src/components/layout/TopNavigation.tsx`

- Remove `showNewChat` and `onNewChat` from TopNavigation
- Add "+ New Chat" button to ChatSidebar between "Chat History" title and search input
- Center horizontally, maintain existing button styling
- Pass `onNewConversation` prop to ChatSidebar

### H. Chat List Must Scroll
**File:** `src/components/dashboard/ChatSidebar.tsx`

- Ensure sidebar has fixed height calculation: `calc(100vh - 72px)`
- Set chat list container to `overflow-y: auto` with `flex-1`
- Remove any max-height constraints that could truncate

### I. States & Accessibility
**Files:** Multiple component files

Interaction states:
- Add visible focus rings using `focus:ring-2 focus:ring-white/20 focus:ring-offset-2`
- Add hover states: `hover:bg-white/[0.08]` for buttons, `hover:border-white/[0.18]` for cards

Keyboard navigation:
- Add `tabIndex={0}` to chat list items
- Implement `onKeyDown` handler for Enter to select chat
- Ensure logical focus order: sidebar > tabs > chat content > composer

Contrast:
- Verify text maintains >4.5:1 contrast ratio on black
- Style links with underline or distinct color (`text-[#60A5FA]`)

### J. Typography & Spacing Consistency
**File:** `src/index.css`

- Document spacing scale: 4/8/12/16/24/32px
- Ensure serif only for wordmark
- Sans-serif (Inter) for all UI elements
- Normalize paddings across sidebar (px-4), chat area (px-6), composer (p-4)

### K. UX Enhancements

#### K.1 Copy Button for AI Responses
**File:** `src/components/dashboard/ChatMessage.tsx`

- Position copy button top-right of AI response area (not in bubble header)
- Minimal icon style: `<Copy className="h-4 w-4" />`
- Show on hover of AI message container
- Copy full text content respecting markdown

#### K.2 Table of Contents for Long AI Outputs
**File:** `src/components/dashboard/ChatMessage.tsx`

- Detect "long" responses: >1500 characters OR >3 headings
- Auto-generate TOC from H2/H3 headings in the response
- Render collapsible TOC at top of message
- Clicking jumps to section within that message
- Subtle dark-themed styling

#### K.3 Empty State Design
**File:** `src/components/dashboard/EmptyState.tsx` (update) + `src/components/dashboard/ChatView.tsx`

- Show when no chat selected or first load
- Include:
  - Clean dark-themed design
  - Welcome message: "Start a new conversation"
  - 4-6 example prompts relevant to McLeuker AI:
    - "Analyze SS26 womenswear trends from Milan Fashion Week"
    - "Find sustainable denim suppliers in Europe with low MOQ"
    - "Compare luxury handbag pricing across global markets"
    - "Map sustainability certifications for European brands"
    - "Research AI adoption in fashion supply chains"
    - "Create a trend forecast report for Resort 2026"
  - CTA button: "Start a new chat" that triggers new conversation

---

## Part 2: Landing Page Changes (`/`)

### A. Remove First "Ready to Transform" CTA Section
**File:** `src/pages/Landing.tsx`

- Lines ~491-509: Remove the "Secondary CTA Section" that contains:
  - "Ready to transform your research?"
  - "Join leading fashion brands..."
  - Single "Start Free Trial" button
- Keep the final CTA section (lines 511-541) with dual buttons

### B. Add Full Footer with Newsletter Signup
**File:** `src/components/layout/Footer.tsx` (major update)

Create comprehensive footer with:

**Footer Navigation Columns:**
- **Product:** Dashboard, Domains, How it Works
- **Solutions:** Trend Forecasting, Supplier Research, Market Analysis, Sustainability Insights
- **Resources:** Insights (Blog), Help/FAQ, Contact
- **Company:** About, Careers, Press
- **Legal:** Privacy Policy, Terms, Cookie Policy

**Newsletter Signup:**
- Headline: "Get McLeuker insights in your inbox"
- Email input + Subscribe button
- Privacy note: "No spam. Unsubscribe anytime."

**Footer Extras:**
- LinkedIn social link (primary)
- Copyright: "© 2026 McLeuker AI. All rights reserved."

---

## Part 3: New Pages for Footer Links

All pages follow the existing dark theme design system with:
- `bg-[#070707]` base background
- Graphite cards (`from-[#1A1A1A] to-[#141414]`)
- White text with appropriate opacity levels
- TopNavigation with `variant="marketing"`
- Footer component

### Product Pages

#### `/domains` - Domains Overview
- Hero explaining domain concept
- Grid of domain cards (Global, Fashion, Beauty, etc.)
- Each domain: description, example questions, use cases
- CTA to dashboard

#### `/how-it-works` - How It Works
- 3-step workflow: Ask → Analyze → Deliver
- Visual diagram of the process
- Example prompts and output types
- Methodology/trust section (brief)
- CTA to start free trial

### Solutions Pages

#### `/solutions/trend-forecasting`
- Who it's for: Creative directors, buyers, merchandisers
- What you get: Runway analysis, color trends, silhouette forecasts
- Use cases (4-6)
- CTA to try in dashboard

#### `/solutions/supplier-research`
- Who it's for: Sourcing teams, procurement managers
- What you get: Supplier profiles, MOQ data, certification info
- Use cases (4-6)
- CTA to try in dashboard

#### `/solutions/market-analysis`
- Who it's for: Strategy teams, brand managers
- What you get: Competitive intelligence, pricing analysis, market sizing
- Use cases (4-6)
- CTA to try in dashboard

#### `/solutions/sustainability-insights`
- Who it's for: Sustainability officers, compliance teams
- What you get: Certification mapping, impact metrics, regulatory updates
- Use cases (4-6)
- CTA to try in dashboard

### Resources Pages

#### `/insights` - Blog/Insights
- Structured grid of blog posts linking to mcleuker.com/blog
- Each card: title, excerpt, date, "Read more" link (external)
- Native look but all links are outbound

#### `/help` - Help/FAQ
- 10-15 FAQs covering:
  - How domains work
  - Credit system
  - Export formats
  - Prompt best practices
  - Data reliability
  - Privacy basics
  - Troubleshooting
  - Contacting support

#### `/contact` - Contact
Already exists, but update to include:
- Inquiry type dropdown (General, Partnerships, Support)
- Keep email: info@mcleuker.com

### Company Pages

#### `/about` - About (Update existing)
- Adapt content from mcleuker.com/about:
  - Mission: sustainable fashion + AI intelligence
  - Vision: fashion as force for positive change
  - Capabilities: strategy, sustainability, circularity, traceability, sourcing, market intelligence
  - Show roles/capabilities rather than individual names
- Keep existing design language

#### `/careers` - Careers
- Simple page with:
  - "We're always interested in hearing from talented people..."
  - Areas of interest: Engineering, AI/ML, Fashion Industry, Design
  - Email CTA: info@mcleuker.com
  - No form required

#### `/press` - Press
- Short company boilerplate
- Brand assets placeholder section
- Media contact: info@mcleuker.com

### Legal Pages

#### `/privacy` - Privacy Policy
Already well-structured, update styling:
- Apply dark theme (`bg-[#070707]`)
- Update TopNavigation variant to "marketing"

#### `/terms` - Terms of Service
Already well-structured, update styling same as Privacy

#### `/cookies` - Cookie Policy (New)
- Structure similar to Privacy/Terms
- Cover: what cookies used, purposes, how to manage
- Dark themed

---

## Part 4: SEO/Branding - Favicon Fix

### Files to Update:
- `index.html` - Update `<link rel="icon">` tags
- Upload new favicon files to `/public/`:
  - `favicon.ico`
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `apple-touch-icon.png`

### Implementation:
- Use McLeuker logo (M) as favicon
- Remove all Lovable branding references
- Ensure OG/Twitter meta images don't reference Lovable

---

## Part 5: Global Layout Consistency

### Shared Components
Ensure all pages reuse:
- `TopNavigation` (with appropriate variant)
- `Footer` (new comprehensive version)

### Design Tokens (document in CSS)
- Typography: Inter for UI, Cormorant Garamond for serif accents
- Spacing scale: 4/8/12/16/24/32px
- Colors: strict black/white/grey palette
- Button styles: primary (white), outline (graphite)
- Input styles: graphite gradient inputs

### Responsive Behavior
- Consistent breakpoints
- Same mobile navigation pattern across all pages
- Consistent container max-widths

---

## Technical Summary

### New Files to Create:
1. `src/pages/Domains.tsx`
2. `src/pages/HowItWorks.tsx`
3. `src/pages/solutions/TrendForecasting.tsx`
4. `src/pages/solutions/SupplierResearch.tsx`
5. `src/pages/solutions/MarketAnalysis.tsx`
6. `src/pages/solutions/SustainabilityInsights.tsx`
7. `src/pages/Insights.tsx`
8. `src/pages/Help.tsx`
9. `src/pages/Careers.tsx`
10. `src/pages/Press.tsx`
11. `src/pages/Cookies.tsx`

### Files to Significantly Update:
1. `src/components/layout/TopNavigation.tsx` - Logo text, remove New Chat
2. `src/components/layout/Footer.tsx` - Full redesign with columns + newsletter
3. `src/components/dashboard/ChatMessage.tsx` - ChatGPT-like styling, TOC, copy button
4. `src/components/dashboard/ChatSidebar.tsx` - Add New Chat button, scroll fix
5. `src/components/dashboard/ChatView.tsx` - Sticky composer handling
6. `src/components/dashboard/EmptyState.tsx` - New empty state design
7. `src/pages/Dashboard.tsx` - Composer positioning, prop changes
8. `src/pages/Landing.tsx` - Remove secondary CTA
9. `src/contexts/SectorContext.tsx` - "All Domains" → "Global"
10. `src/App.tsx` - Add new routes
11. `src/index.css` - TOC styles, reading column styles
12. `src/pages/Privacy.tsx` - Dark theme
13. `src/pages/Terms.tsx` - Dark theme
14. `src/pages/About.tsx` - Content update from mcleuker.com
15. `src/pages/Contact.tsx` - Add inquiry type dropdown
16. `index.html` - Favicon updates

### Routes to Add in App.tsx:
```text
/domains
/how-it-works
/solutions/trend-forecasting
/solutions/supplier-research
/solutions/market-analysis
/solutions/sustainability-insights
/insights
/help
/careers
/press
/cookies
```
