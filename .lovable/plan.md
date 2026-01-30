
# Updated Plan: Replace Hooks/API with Railway Backend Integration

## Overview
This plan replaces the current Supabase Edge Function-based API with your Railway backend, with special attention to the **file download URL construction** you specified.

---

## Critical Addition: File Download URL Handling

When mapping Railway's `TaskResult` response to the existing `Task` interface, all generated files will have their download URLs constructed using the Railway file endpoint:

```typescript
// In src/lib/mcLeukerAPI.ts
const API_BASE_URL = import.meta.env.VITE_RAILWAY_API_URL || 'https://your-backend.railway.app';

// Method to construct download URLs
getFileDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/api/files/${filename}`;
}
```

This URL construction will be applied in:
1. **useTasks.tsx** - When mapping `TaskResult.files` to `Task.generated_files`
2. **FileDownloadCard.tsx** - Already uses `file.url` directly, so mapping handles it

---

## Files to Create

### 1. `src/lib/mcLeukerAPI.ts` - API Client

Core API client class with all endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getHealth()` | `GET /health` | Health check |
| `getStatus()` | `GET /api/status` | System status |
| `getConfigStatus()` | `GET /api/config/status` | Configuration status |
| `createTask(prompt, userId)` | `POST /api/tasks/sync` | Synchronous task execution |
| `createTaskAsync(prompt, userId)` | `POST /api/tasks` | Async task creation |
| `getTaskStatus(taskId)` | `GET /api/tasks/{taskId}` | Poll task status |
| `chat(message, conversationId)` | `POST /api/chat` | Chat interaction |
| `search(query, options)` | `POST /api/search` | AI-powered search |
| `quickAnswer(question)` | `POST /api/search/quick` | Quick Q&A |
| `research(topic, depth)` | `POST /api/research` | Deep research |
| `interpret(prompt)` | `POST /api/interpret` | Task interpretation |
| `getFileDownloadUrl(filename)` | Returns URL | **File download URL construction** |

### 2. `src/types/mcLeuker.ts` - TypeScript Interfaces

```text
Interfaces:
- Message (id, role, content, timestamp, files)
- GeneratedFile (filename, filepath, format, size_bytes, download_url)
- TaskInterpretation (intent, domain, complexity, required_outputs, requires_research, confidence)
- TaskResult (task_id, status, interpretation, files, message, error)
- SearchResult (title, url, snippet, source)
- AISearchResponse (query, expanded_queries, results, summary, follow_up_questions)
- ConfigStatus (status, services, default_llm)
```

### 3. `src/hooks/useMcLeukerChat.tsx`

Hook for chat functionality:
- `messages` state
- `isLoading` state
- `error` state
- `sendMessage(content)` - calls Railway `/api/chat`
- `clearMessages()` - reset state

### 4. `src/hooks/useMcLeukerTask.tsx`

Hook for task processing:
- `isProcessing` state
- `result` state (TaskResult)
- `error` state
- `submitTask(prompt)` - calls Railway `/api/tasks/sync`
- Maps `TaskResult.files` to include proper download URLs

### 5. `src/hooks/useMcLeukerSearch.tsx`

Hook for search functionality:
- `isSearching` state
- `results` state (AISearchResponse)
- `error` state
- `search(query, options)` - calls Railway `/api/search`
- `quickAnswer(question)` - calls Railway `/api/search/quick`

### 6. `src/hooks/useMcLeukerStatus.tsx`

Hook for backend status monitoring:
- `status` state
- `configStatus` state (ConfigStatus)
- `isConnected` state
- `isLoading` state
- Auto-fetches status on mount

### 7. `src/components/dashboard/McLeukerStatusIndicator.tsx`

Status indicator component showing:
- Connected (green)
- Disconnected (red)
- Connecting (yellow/loading)
- Default LLM model info

---

## Files to Modify

### 8. `src/hooks/useTasks.tsx` - Critical File Download URL Mapping

Current flow:
```
User prompt → Supabase Edge Function (fashion-ai) → Stream response
```

New flow:
```
User prompt → Railway /api/tasks/sync → Map response with download URLs
```

Key changes in `createTask()`:
1. Replace Supabase Edge Function call with Railway API call
2. **Map generated files with correct download URLs**:

```typescript
// Inside useTasks.tsx createTask function
const taskResult = await mcLeukerAPI.createTask(prompt, user.id);

// Map Railway's GeneratedFile format to existing format with proper URLs
const generatedFiles: GeneratedFile[] = (taskResult.files || []).map(file => ({
  name: file.filename,
  type: mapFileFormat(file.format), // excel, csv, docx, pptx, pdf
  url: `${import.meta.env.VITE_RAILWAY_API_URL || 'https://your-backend.railway.app'}/api/files/${file.filename}`,
  size: file.size_bytes || 0,
  path: file.filepath,
  created_at: new Date().toISOString(),
}));
```

3. Update task in Supabase database with result and files
4. Keep existing realtime subscription for UI updates

### 9. `src/hooks/useConversations.tsx` - Chat Mode Integration

Current flow:
```
Quick mode → fashion-ai Edge Function
Deep mode → research-agent Edge Function
```

New flow:
```
Quick mode → Railway /api/chat
Deep mode → Railway /api/research
```

Key changes in `sendMessage()`:
1. Replace Edge Function calls with Railway API calls
2. Keep Supabase database persistence for conversation history
3. Map Railway response to existing `ChatMessage` interface
4. **Map any generated files with download URLs**

### 10. `src/components/dashboard/FileDownloadCard.tsx` - No Changes Needed

The component already uses `file.url` directly:
```typescript
const response = await fetch(file.url);
```

Since the URL mapping happens in `useTasks.tsx` during response processing, the FileDownloadCard will automatically receive the correct Railway download URLs.

---

## Implementation Flow

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Input    │────▶│  useTasks.tsx    │────▶│  Railway API    │
│   (Dashboard)   │     │  or              │     │  /api/tasks/sync│
└─────────────────┘     │  useConversations│     │  /api/chat      │
                        └──────────────────┘     │  /api/research  │
                                │                └────────┬────────┘
                                │                         │
                                ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Supabase DB     │     │  Response with  │
                        │  (persist data)  │◀────│  files array    │
                        └──────────────────┘     └────────┬────────┘
                                │                         │
                                ▼                         ▼
                        ┌──────────────────────────────────────────┐
                        │  Map files with Railway download URLs:   │
                        │  /api/files/{filename}                   │
                        └──────────────────────────────────────────┘
                                │
                                ▼
                        ┌──────────────────────────────────────────┐
                        │  FileDownloadCard uses file.url directly │
                        │  → User can download from Railway        │
                        └──────────────────────────────────────────┘
```

---

## File Format Mapping

Railway uses format strings; existing UI expects specific types:

| Railway Format | UI Type |
|----------------|---------|
| `xlsx`, `excel` | `excel` |
| `csv` | `csv` |
| `docx`, `doc` | `docx` |
| `pptx`, `ppt` | `pptx` |
| `pdf` | `pdf` |

---

## Environment Variable Required

Add to your environment:
```
VITE_RAILWAY_API_URL=https://your-actual-railway-backend.railway.app
```

---

## Summary of Changes

| File | Action | Key Changes |
|------|--------|-------------|
| `src/lib/mcLeukerAPI.ts` | CREATE | API client with `getFileDownloadUrl()` method |
| `src/types/mcLeuker.ts` | CREATE | TypeScript interfaces from uploaded file |
| `src/hooks/useMcLeukerChat.tsx` | CREATE | Chat hook wrapping Railway API |
| `src/hooks/useMcLeukerTask.tsx` | CREATE | Task hook wrapping Railway API |
| `src/hooks/useMcLeukerSearch.tsx` | CREATE | Search hook wrapping Railway API |
| `src/hooks/useMcLeukerStatus.tsx` | CREATE | Status monitoring hook |
| `src/components/dashboard/McLeukerStatusIndicator.tsx` | CREATE | Connection status indicator |
| `src/hooks/useTasks.tsx` | MODIFY | Railway API + **file URL mapping** |
| `src/hooks/useConversations.tsx` | MODIFY | Railway API for chat/research |
| `src/components/dashboard/FileDownloadCard.tsx` | NO CHANGE | Already uses `file.url` |

---

## Technical Notes

1. **Authentication**: Railway API doesn't require Supabase auth tokens; requests are made directly
2. **Database Persistence**: Supabase still stores conversations, messages, and tasks
3. **File Downloads**: All file downloads go through Railway's `/api/files/{filename}` endpoint
4. **Backward Compatibility**: Existing UI components work without changes
5. **Error Handling**: Both Railway API errors and network errors are handled gracefully
6. **CORS**: Ensure your Railway backend allows requests from your Lovable domain
