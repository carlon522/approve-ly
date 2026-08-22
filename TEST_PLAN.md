# Test Plan

## Unit Tests

- Permission capability checks.
- Status transition rules.
- Approval blocked by unresolved comments.
- Share link expiry and access mode.
- Archive scheduling date math.
- Reminder policy inheritance.
- Storage usage calculations.

## Integration Tests

- Creative creates company, campaign, folder, and content item.
- Approver assigned to campaign can comment and approve.
- Assistant can view and download but cannot comment or approve.
- Public link works before expiry and fails after expiry.
- Private link requires login.
- Archive job deletes files but preserves metadata.

## UI Tests

- Dashboard renders at mobile, tablet, and desktop sizes.
- Mobile app shell keeps the bottom navigation fixed, clears page content, and preserves sign-out/reset actions in the sticky header.
- Mobile navigation maps to the correct role-specific destinations and uses full accessible names for shortened labels.
- Campaign filters do not overflow on mobile.
- Approval page shows sticky mobile action bar.
- Platform previews fit inside the viewport.
- Comment anchors are visible and keyboard accessible.
- Download and share actions expose clear states.

## Manual QA

- Upload progress with a large file mock.
- Slow network behavior for previews and downloads.
- Empty company, campaign, and folder states.
- Storage at 70%, 85%, and 95% warnings.
- Due date overdue states.
- Archived content metadata view.

## Security Checks

- RLS policies for company and campaign isolation.
- Signed URLs expire.
- Public link tokens are stored hashed.
- Users cannot approve outside assigned campaigns.
- Assistants cannot mutate content through API calls.
- Large files never pass through app server payload bodies.
