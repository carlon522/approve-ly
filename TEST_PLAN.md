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
- Structured due date normalization preserves the selected date/time and uses legacy labels only as a fallback.
- Content stats invariants: status buckets include all content types, bucket totals equal visible content totals, and completion percentage equals approved plus archive-scheduled content divided by total.
- Dashboard Pending approval and Workflow pulse Pending approval use the same pending-decision content count; Open comments uses the same content-item count as Workflow pulse and separately explains the underlying comment-record count.

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
- Primary navigation labels render as Dashboard, Campaigns, Messages, Archive, and Account; legacy comments/inbox paths redirect to Messages.
- Immersion mode opens from approval review, hides workspace chrome, keeps the fixed exit switch visible, and supports next/previous content by touch, wheel, and keyboard.
- Immersion approval heart respects permissions and unresolved-comment blocking; comment and share controls remain available.
- Campaign status exposes Add approver for Creatives, shows assigned approvers, loading, duplicate, and invalid-account states.
- Folder creation keeps its modal open during saving, disables duplicate submits, renders an empty folder immediately, persists it after refresh, and treats duplicate names as an existing folder.
- Campaign pages show assigned approvers in a dedicated Campaign team panel; Add approver remains Creative-only.
- Campaign header total, status split, campaign status panel, dashboard project progress, dashboard metrics, and account summary agree for the same campaign content set.
- Campaign counts remain correct when content is an image or carousel, and archive-scheduled content remains included in approved totals.
- Dashboard deadline heat map renders late, close, on-time, and completed states with the correct red/green intensity; hover and focus reveal the content due details.
- Dashboard heat map month controls remain usable at mobile width and clicking a marked day opens its most urgent content.
- Upload and campaign due date controls open a native date/time picker; creating either record sends a structured `dueAt` value.
- Talent input filters existing names while typing, commits an existing match with Tab, locks the tag after commit, and labels unmatched text as `Adding new talent`.
- Dashboard renders at mobile, tablet, and desktop sizes.
- Mobile app shell keeps the bottom navigation fixed, clears page content, and preserves sign-out/reset actions in the sticky header.
- Mobile navigation maps to the correct role-specific destinations and uses full accessible names for shortened labels.
- The top bar exposes company and campaign selectors on Dashboard, Campaigns, Messages, Archive, Account, and standard approval pages; changing either updates the workspace and persists company, campaign, and folder context across navigation and refresh.
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
