# Routes

Use App Router routes and keep screens focused on real workflows.

## Public Routes

- `/login`: email/password login, password reset, Google login placeholder.
- `/share/[token]`: public or private content share link resolver.

## Authenticated Routes

- `/dashboard`: company selector, campaign selector, stats, due dates, recent activity.
- `/companies`: companies the user can access.
- `/companies/new`: create company for Creatives and Super Admin.
- `/companies/[companyId]`: company overview, branding, users, storage.
- `/companies/[companyId]/campaigns/new`: create campaign.
- `/campaigns/[campaignId]`: campaign workspace with folders, filters, status summaries.
- `/campaigns/[campaignId]/folders/[folderId]`: folder content list.
- `/campaigns/[campaignId]/upload`: upload flow for video, image, carousel.
- `/content/[contentId]`: approval workspace with preview, comments, versions, and actions.
- `/content/[contentId]/versions/[versionId]`: version detail and compare view.
- `/archive`: archive scheduled and archived content.
- `/settings/profile`: user profile and notifications.
- `/admin`: Super Admin global console.

## API Boundaries

- `/api/uploads/sign`: create signed upload or video direct-upload URL.
- `/api/uploads/complete`: record uploaded files and metadata.
- `/api/downloads/sign`: create signed download URL.
- `/api/share-links`: create, revoke, and inspect share links.
- `POST /api/content/[contentId]/unapprove`: remove approval and cancel a pending archive hold.
- `DELETE /api/content/[contentId]`: permanently delete content, stored media, and related comments.
- `/api/webhooks/storage`: storage/video processing callbacks.
- `/api/jobs/inngest`: background job endpoint.

Do not create API routes that accept large file bodies.
