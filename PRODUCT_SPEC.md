# Approve.ly Product Spec

Approve.ly is a polished, mobile-first social media content approval portal for multiple companies. It centralizes uploads, review comments, due dates, approvals, downloads, and cautious archive cleanup for short-form social media content.

## Goals

- Let Creative users create and manage companies, campaigns, folders, users, content, due dates, share links, and archives.
- Give Approvers a fast campaign-focused approval workspace.
- Give Assistants a read-only view into relevant content.
- Keep all company data securely separated.
- Make the review experience feel close to Instagram, TikTok, and YouTube Shorts publishing contexts.
- Keep the technical system simple enough for ChatGPT/Codex to maintain most day-to-day workload.

## Roles

- Creative: ultimate access to their own projects and companies.
- Approver: assigned to campaigns and can approve any assigned content item when comments are resolved.
- Assistant: view-only access to assigned companies or campaigns, with download access.
- Super Admin: global owner account for all companies, users, storage, archive state, and audit logs.
- New accounts choose Creative, Approver, or Assistant on a dedicated first-login setup page before entering the dashboard.
- Creatives can switch between Creative, Approver, and Assistant interface views for review and handoff checks; this does not change their persisted permissions.
- The Account section shows the signed-in profile, current role, capability summary, and accessible workspace snapshot.

## Content Types

- Video
- Image
- Carousel

## Platforms

- Instagram
- TikTok
- YouTube Shorts

## Approval Rules

- Approval is one-click.
- Multiple approvers can be assigned to a campaign.
- Any assigned approver approval marks the content item approved.
- Approval is blocked while unresolved comments exist.
- Approved content is locked unless a deliberate new revision is created.
- New revisions return content to submitted or in-review state.

## Comments

- Video comments can attach to exact timestamp or frame.
- Image comments can attach to a point or rectangular area.
- Carousel comments attach to a slide and can also include point or area anchors.
- Comments support replies, resolved state, author, version, timestamp, and optional attachments.
- Multiple comments in a short window can be bundled into one email notification.

## Storage

- Whole-app storage target: 10GB for now.
- Maximum upload size: 5GB per file.
- Original files should live in object storage.
- Video previews should use a video service optimized for streaming.
- Use storage meters, warnings, and archive prompts because two max-size files can fill the app.

## Sharing

- Private share links require login.
- Public share links are deliberately created, can download, and expire after 7 days.
- Public links should expose only the selected content item or selected explicit scope.
- Link creation, views, downloads, expiry, and revocation should be logged.

## Campaign Access

- Creatives can add an existing Approve.ly Approver account to a campaign by email.
- The assignment is stored in `campaign_members` and immediately makes the campaign visible in that Approver's workspace.
- Approvers receive review, comment, and approval access for assigned campaign content only.
- Each campaign shows its assigned approvers in a dedicated Campaign team section; assigned reviewers can view the team without managing access.

## Archive

- Approved content shows Final Download.
- After final download, authorized users can mark content To Archive.
- Archive Scheduled means files will delete after 7 days.
- Users can cancel during the 7-day window.
- Archived metadata remains visible forever with file state clearly marked.
- Comments, approvals, versions, and activity logs remain.

## Notifications

- New upload submitted: notify assigned approvers.
- Approval: notify creatives.
- Changes requested: notify creatives.
- Comment bundles: group rapid comments before emailing.
- Due date reminders: configurable.
- Archive scheduled: notify relevant creatives.
- Archive deletion warning: 24 hours before deletion.

## Dashboard Deadlines

- The dashboard shows open approval due dates in a month heat map.
- Due dates become progressively red as they approach, with late items using the strongest red.
- Hovering or focusing a marked day reveals the expiring content and due label; selecting it opens the approval page.
- Late, running-close, and on-time summaries count open approvals only. Approved and archive-scheduled content remains visible as completed green markers.

## Recommended Technical Stack

- Next.js, TypeScript, Tailwind, shadcn-style components.
- Supabase Auth and Postgres with Row Level Security.
- Cloudflare R2 for original files.
- Cloudflare Stream for video previews.
- Inngest for durable background jobs.
- Resend for transactional email.
- Playwright for responsive UI checks.
- Vitest for business logic.
