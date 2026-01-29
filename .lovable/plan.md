
# Tool Execution System - Implementation Plan

## Overview

Build a comprehensive tool execution system that enables Deep Search and Quick Search to automatically generate downloadable files (Excel, PDF, Word, PowerPoint) and execute code when users request structured outputs.

## Architecture

```text
+------------------+     +-------------------+     +------------------+
|   Chat/Research  | --> |  Output Detector  | --> |  Tool Executor   |
|     Response     |     |  (AI Analysis)    |     |  Edge Function   |
+------------------+     +-------------------+     +------------------+
                                                           |
                    +----------------------------------+---+---+
                    |                |                |        |
              +---------+     +-----------+     +--------+  +------+
              |  Excel  |     |    PDF    |     |  Word  |  | Code |
              +---------+     +-----------+     +--------+  +------+
                    |
              +------------------+
              | Supabase Storage |
              +------------------+
```

## Phase 1: Enhanced File Generator (Core)

### 1.1 Upgrade file-generator Edge Function

**Changes to `supabase/functions/file-generator/index.ts`:**

- **PDF Generation**: Add `jsPDF` library for proper PDF documents with:
  - Headers, paragraphs, bullet lists
  - Tables with styling
  - Page breaks and pagination
  - Professional formatting

- **Real DOCX Generation**: Add `docx` library for proper Word documents with:
  - Styled headings (H1, H2, H3)
  - Formatted paragraphs
  - Bullet and numbered lists
  - Tables with borders
  - Professional styling

- **Real PPTX Generation**: Add `pptxgenjs` library for PowerPoint with:
  - Title slides
  - Content slides with bullets
  - Tables
  - Proper slide formatting

### 1.2 New File Types Schema

```typescript
interface ToolExecutionRequest {
  type: "excel" | "csv" | "pdf" | "docx" | "pptx" | "code";
  filename: string;
  data: {
    // For Excel/CSV
    sheets?: ExcelSheet[];
    // For PDF/Word
    sections?: DocumentSection[];
    // For PowerPoint
    slides?: SlideContent[];
    // For Code
    code?: { language: string; content: string };
  };
  styling?: {
    theme?: "professional" | "modern" | "minimal";
    primaryColor?: string;
  };
}
```

## Phase 2: AI Output Analysis & Auto-Generation

### 2.1 Output Detector Hook

**New file: `src/hooks/useOutputDetector.tsx`**

Analyzes AI responses to detect if output should be converted to a file:

- Tables with >5 rows → suggest Excel export
- Supplier lists → suggest Excel with structured columns
- Reports/analysis → suggest PDF or Word export
- Step-by-step guides → suggest PowerPoint
- Code blocks → offer code execution or download

### 2.2 Integration with Chat Flow

**Updates to `src/hooks/useConversations.tsx`:**

- After AI response completes, run output detection
- If structured data detected, auto-generate file in background
- Attach generated file to message as `generatedFiles` array

**Updates to `src/components/dashboard/ChatMessage.tsx`:**

- Display `FileDownloadCard` components below AI responses when files are generated
- Show "Export as..." quick actions for eligible responses

## Phase 3: Code Execution Sandbox

### 3.1 Code Runner Edge Function

**New file: `supabase/functions/code-runner/index.ts`**

Secure code execution environment:

- **Supported languages**: JavaScript/TypeScript (Deno runtime)
- **Safety**: Sandboxed execution with timeouts (30s max)
- **Output capture**: Console logs, return values, errors
- **Limitations**: No network access, no file system access

```typescript
// Example execution flow
{
  language: "javascript",
  code: "const data = [1,2,3]; return data.map(x => x * 2);",
  timeout: 30000
}
// Returns: { success: true, output: [2,4,6], logs: [] }
```

### 3.2 Code Block Enhancement

**Updates to `src/components/dashboard/ChatMessage.tsx`:**

- Add "Run Code" button on code blocks (JavaScript/TypeScript only)
- Display execution results inline
- Add "Download as file" option

## Phase 4: Smart Export UI

### 4.1 Export Actions Component

**New file: `src/components/dashboard/ExportActions.tsx`**

Floating action bar that appears below AI responses:

```text
+--------------------------------------------------+
|  📊 Export as Excel  |  📄 PDF  |  📝 Word  |  ▶️ Run |
+--------------------------------------------------+
```

### 4.2 Auto-Detection Indicators

Show subtle badges when export-worthy content is detected:
- "Contains table data" → Excel badge
- "Report format" → PDF badge
- "Code detected" → Run badge

## Phase 5: Google Workspace Integration (Optional/Future)

### 5.1 Requirements

- Google Cloud Console project with OAuth 2.0 credentials
- User consent flow for Google Drive/Docs/Sheets access
- Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### 5.2 Features (if credentials added)

- Export directly to Google Sheets
- Export directly to Google Docs
- Create shared links

**Note**: This phase requires additional OAuth setup and user authorization flow. Can be implemented later if needed.

## Implementation Order

| Order | Task | Complexity | Credits Impact |
|-------|------|------------|----------------|
| 1 | Upgrade PDF generation with jsPDF | Medium | None |
| 2 | Upgrade DOCX generation with docx lib | Medium | None |
| 3 | Upgrade PPTX generation with pptxgenjs | Medium | None |
| 4 | Create Output Detector hook | Medium | None |
| 5 | Integrate file cards into ChatMessage | Low | None |
| 6 | Add Export Actions UI component | Low | None |
| 7 | Create Code Runner edge function | High | +2 credits/run |
| 8 | Add code execution UI to chat | Medium | None |
| 9 | Google Workspace (optional) | High | Requires OAuth |

## Technical Details

### Libraries to Import (Deno)

```typescript
// PDF
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

// Word Documents
import { Document, Packer, Paragraph, Table } from "https://esm.sh/docx@8.5.0";

// PowerPoint
import PptxGenJS from "https://esm.sh/pptxgenjs@3.12.0";
```

### File Storage

- Continue using `generated-files` bucket
- Signed URLs valid for 1 hour
- Path structure: `{userId}/{timestamp}_{filename}.{ext}`

### Credit Cost

| Action | Credits |
|--------|---------|
| Excel/CSV generation | 0 |
| PDF generation | 1 |
| DOCX generation | 1 |
| PPTX generation | 1 |
| Code execution | 2 |

## Success Criteria

1. Users can request "generate Excel" and receive real .xlsx files
2. AI responses with tables auto-suggest Excel export
3. Research reports can be exported as professional PDFs
4. Code blocks in responses can be executed with one click
5. Generated files appear below AI messages with download buttons

## Files to Create/Modify

**New Files:**
- `src/hooks/useOutputDetector.tsx` - Detects exportable content
- `src/components/dashboard/ExportActions.tsx` - Export action buttons
- `supabase/functions/code-runner/index.ts` - Code execution sandbox

**Modified Files:**
- `supabase/functions/file-generator/index.ts` - Add real PDF/DOCX/PPTX
- `src/hooks/useFileGeneration.tsx` - Add new file types
- `src/components/dashboard/ChatMessage.tsx` - Display files & export actions
- `src/hooks/useConversations.tsx` - Integrate output detection
- `src/components/dashboard/FileDownloadCard.tsx` - Add PDF icon

