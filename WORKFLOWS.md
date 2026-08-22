# Workflows

## Creative Upload

1. Creative selects company, campaign, and folder.
2. Creative chooses video, image, or carousel.
3. Creative enters title, platform, caption, hashtags, tags, and due date.
4. App requests a signed direct upload.
5. Browser uploads original file to storage or video provider.
6. App records the uploaded file and creates version 1.
7. Status becomes submitted.
8. Assigned approvers receive a notification.
9. Activity log records upload and submission.

## First Login Role Setup

1. A user authenticates with email/password or Google.
2. If the profile is not confirmed, the portal opens the dedicated role setup page before dashboard access.
3. The user chooses Creative, Approver, or Assistant.
4. `PATCH /api/profile/role` saves the role and marks `role_confirmed` true.
5. The workspace refreshes with the role-specific dashboard and permissions.
6. Existing confirmed profiles skip the setup page.

## Workspace Sync

1. Authenticated users receive the last workspace snapshot from the current browser session when it is still fresh.
2. The portal renders that snapshot immediately and refreshes it in the background.
3. The server fetches independent workspace slices in parallel and uses the content result to derive folder counts.
4. The fresh response replaces the cached snapshot and records no demo data in live mode.

## Campaign Approver Assignment

1. A Creative opens a campaign and selects Add approver from the Campaign team panel.
2. The portal loads the current Approver assignments for that campaign.
3. The Creative enters the email of an existing Approve.ly account confirmed as Approver.
4. The server validates Creative ownership capability, finds the profile, and upserts the `campaign_members` assignment.
5. The assigned user sees the campaign in their Approver workspace after the next workspace refresh.
6. Duplicate assignments are rejected in the interface and remain idempotent at the database boundary.

## Account and Campaign Team

1. The Account navigation opens the signed-in user profile, role, capability summary, and workspace snapshot.
2. A campaign page shows its assigned approvers in the Campaign team panel.
3. Assigned reviewers can view the panel for campaigns in their workspace.
4. Only Creatives can add approvers or change campaign access.

## Commenting

1. Reviewer opens content detail.
2. Reviewer selects a timestamp, image point/area, or carousel slide anchor.
3. Reviewer writes a comment.
4. Status becomes changes_requested if the author is an approver.
5. Rapid comments are bundled into a single email notification window.
6. Creative replies, updates, or uploads a new version.
7. Comments are resolved when the requested issue is handled.

## Approval

1. Approver opens assigned content.
2. App checks campaign membership and can_approve.
3. App checks unresolved comment count for the current version.
4. If unresolved comments exist, approval is disabled.
5. If clear, approver clicks Approve.
6. Content status becomes approved.
7. Current version locks.
8. Creatives are notified immediately.
9. Activity log records approval.

## Immersion Approval Review

1. Reviewer opens a content item and turns on Immersion from the fixed switch.
2. The portal presents one vertical content preview at a time with touch, wheel, and keyboard navigation.
3. Reviewer can use the right-side heart to approve, the comment action to open review notes, or share the item.
4. Up and down navigation preserves immersion mode while changing content.
5. Turning the switch off returns to the standard approval workspace.

## Unapproval and Deletion

1. A Creative or assigned Approver opens approved content.
2. Unapprove clears the approval timestamp and returns the item to `In Review`.
3. If open comments remain, the item returns to `Changes Requested` instead.
4. Unapproving an archive-scheduled item also cancels its deletion hold.
5. A Creative can choose Delete content from the review header.
6. The confirmation permanently removes the stored file, content record, and related comments while logging the action.

## Revision

1. Creative chooses Create Revision on approved or changes requested content.
2. App creates the next content version.
3. New files upload through the same direct upload flow.
4. Status becomes submitted.
5. Approval and comment history remain visible by version.

## Share Link

1. Creative or Approver creates a private or public link.
2. Private link requires login.
3. Public link can download and expires after 7 days.
4. Link events are logged for views and downloads.
5. Expired or revoked links show a clear unavailable state.

## Archive

1. Approved content shows Final Download.
2. Creative downloads final assets.
3. Creative marks content To Archive.
4. Status becomes archive_scheduled.
5. Files are scheduled for deletion in 7 days.
6. App sends archive scheduled notification.
7. App sends warning 24 hours before deletion.
8. If not cancelled, files are deleted.
9. Status becomes archived and metadata remains visible.

## Due Date Reminders

Use the most specific reminder policy available:

1. Content-level override.
2. Campaign policy.
3. Company policy.
4. Global default.

Recommended default reminders:

- 3 days before due date.
- 1 day before due date.
- Morning of due date.
- Every 24 hours while overdue.
