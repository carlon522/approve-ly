# Test Plan

## Unit Tests

- Permission capability checks.
- Status transition rules.
- Approval blocked by unresolved comments.
- Approved content can be unapproved by Creative and assigned Approver users.
- Unapproving archive-scheduled content clears its archive deletion date.
- Share link expiry and access mode.
- Archive scheduling date math.
- Reminder policy inheritance.
- Storage usage calculations.

## Integration Tests

- New email/password account sees the role setup page before the dashboard and the selected role persists after refresh.
- New Google account sees the same role setup page; an existing confirmed Google account skips it.
- Creative can list campaign approvers and add an existing Approver account by email; the assignment appears in the Approver workspace.
- Assigned Approvers and Assistants can view the Campaign team section for campaigns they can access; unassigned users receive no team data.
- Non-Creative users cannot call the campaign members assignment API successfully.
- Creative creates company, campaign, folder, and content item.
- Approver assigned to campaign can comment and approve.
- Creative can delete content from the approval page; Assistants cannot.
- Assistant can view and download but cannot comment or approve.
- Public link works before expiry and fails after expiry.
- Private link requires login.
- Archive job deletes files but preserves metadata.

## UI Tests

- Login has no role dropdown; first login presents an accessible role choice page with a disabled saving state.
- Creative view switcher changes the navigation between Creative, Approver, and Assistant views without changing the persisted account role.
- Account navigation opens the signed-in profile and capability summary for Creative, Approver, and Assistant views.
- Campaign status exposes Add approver for Creatives, shows assigned approvers, loading, duplicate, and invalid-account states.
- Campaign pages show assigned approvers in a dedicated Campaign team panel; Add approver remains Creative-only.
- Dashboard deadline heat map renders late, close, on-time, and completed states with the correct red/green intensity; hover and focus reveal the content due details.
- Dashboard heat map month controls remain usable at mobile width and clicking a marked day opens its most urgent content.
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
- Workspace bootstrap returns companies, campaigns, and memberships in parallel, then loads folders, content, comments, and activity without duplicate content queries.
- Returning live users see the cached workspace immediately while the authoritative refresh runs in the background.
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
