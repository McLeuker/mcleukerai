
# Request Lovable Support Feature

## Overview
Add a support request feature that allows users to request security features (like Leaked Password Protection) to be enabled on their project. This will be integrated into the Security settings page and backed by a database table to track requests.

## Implementation Plan

### 1. Create Support Requests Database Table
Create a new table to store feature requests from users:
- **Table**: `support_requests`
- **Columns**:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `request_type` (text) - e.g., "leaked_password_protection", "2fa_enablement"
  - `status` (text) - "pending", "in_progress", "completed", "declined"
  - `message` (text, optional) - additional context from user
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **RLS Policies**:
  - Users can insert their own requests
  - Users can view their own requests
  - Block anonymous access

### 2. Update Security Component
Modify `src/components/profile/Security.tsx` to add a new "Request Security Feature" section:
- Display a card explaining the Leaked Password Protection feature
- Show current request status if one exists (pending/in progress/completed)
- Add a "Request This Feature" button that:
  - Opens a dialog/modal for confirmation
  - Allows optional message input
  - Submits request to database
  - Shows success toast with expected response time

### 3. Create SupportRequest Component
Create a reusable component `src/components/profile/SupportRequest.tsx`:
- Props: `featureType`, `title`, `description`, `icon`
- Handles the request submission logic
- Shows different states: available to request, pending, completed
- Includes email fallback link to contact@mcleuker.com

### 4. Add Request Dialog Component
Create `src/components/profile/RequestFeatureDialog.tsx`:
- Dialog with feature description
- Optional message textarea for user context
- Submit and cancel buttons
- Loading state during submission

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/` | Create | New migration for `support_requests` table |
| `src/components/profile/Security.tsx` | Modify | Add Leaked Password Protection request card |
| `src/components/profile/SupportRequest.tsx` | Create | Reusable support request component |
| `src/components/profile/RequestFeatureDialog.tsx` | Create | Dialog for submitting requests |

## User Experience Flow
1. User navigates to Profile > Security tab
2. User sees "Leaked Password Protection" card (currently showing it needs manual enablement)
3. User clicks "Request This Feature" button
4. Dialog opens explaining the feature and allowing optional message
5. User submits request
6. Toast shows confirmation: "Request submitted! We'll review and respond within 24-48 hours"
7. Card updates to show "Request Pending" status
8. (Future) Admin can update request status in database

## Technical Notes
- The feature integrates with existing authentication hooks (`useAuth`)
- Uses existing UI components (Card, Button, Dialog, Badge)
- Request status is fetched on component mount and cached
- Email fallback ensures users can still reach support directly
