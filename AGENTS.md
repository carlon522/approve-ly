<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Approve.ly Agent Guide

Approve.ly is a mobile-first social media content approval portal for multiple companies. Keep every implementation choice easy for Codex/ChatGPT to inspect, test, and extend.

## Product Anchors

- Roles are Creative, Approver, Assistant, and Super Admin.
- Creatives have full control inside their own projects: companies, campaigns, folders, users, uploads, public links, archive actions, and metadata.
- Approvers are assigned to campaigns. They can view, download, comment, request changes, approve, and create share links.
- Assistants are view-only and can download assigned content.
- Super Admin can view and administer all companies, users, storage, archives, and audit logs.
- Approval is one-click, but unresolved comments block approval.
- Any assigned approver can approve a content item.
- Content types are video, image, and carousel.
- Platform previews are Instagram, TikTok, and YouTube Shorts.
- Private share links require login. Public share links can download and expire after 7 days.
- Approved content can be marked for archive. Files delete after 7 days, while metadata and history remain visible.

## Engineering Anchors

- Stack target: Next.js, TypeScript, Tailwind, Supabase Auth/Postgres/RLS, Cloudflare R2, Cloudflare Stream, Inngest, Resend, Playwright, Vitest.
- Do not route large files through Next.js handlers. Use direct-to-storage uploads with signed or resumable upload flows.
- Model permissions as capabilities instead of hardcoding role names throughout the UI.
- Keep product decisions mirrored in the docs:
  - `PRODUCT_SPEC.md`
  - `DATA_MODEL.md`
  - `PERMISSIONS.md`
  - `ROUTES.md`
  - `WORKFLOWS.md`
  - `DESIGN_SYSTEM.md`
  - `TEST_PLAN.md`
- When behavior changes, update the relevant doc in the same change.
- Prefer small, typed, easily tested modules over implicit global behavior.
- Use mock data only in prototype UI. Production data access must go through typed data-layer functions and permission checks.

## UI Standards

- Build the actual portal experience as the first screen after login, not a landing page.
- Mobile approval should be first-class: sticky review actions, readable previews, fast filters, and no hover-only affordances.
- Use icons for common actions, visible labels where the action is important, and stable dimensions for toolbars, cards, previews, and status chips.
- Avoid oversized marketing hero layouts. This is an operational approval tool.
- Every file/content row should show status, platform, due date, comments, version, and download/archive state.
- Platform previews should be polished and faithful, while remaining clearly inside Approve.ly.

## Done Criteria

- The feature is typed, responsive, and lint-clean.
- Permissions and edge cases are covered in implementation or explicitly noted.
- Important state transitions write activity events.
- Large-file behavior never depends on app-server payload uploads.
- The UI works at mobile and desktop widths.
