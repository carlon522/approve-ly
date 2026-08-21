# Approve.ly

Approve.ly is a mobile-first social media content approval portal for multiple companies. It supports Creative, Approver, Assistant, and Super Admin workflows across Instagram, TikTok, and YouTube Shorts review previews.

The current repo contains the Next.js foundation, product contract docs, and a polished prototype interface. Production storage/auth integrations are intentionally documented but not wired until credentials are available.

## Getting Started

Run the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Product Docs

- `PRODUCT_SPEC.md`: product decisions and scope.
- `DATA_MODEL.md`: relational schema shape.
- `PERMISSIONS.md`: role defaults and capability rules.
- `ROUTES.md`: app and API route map.
- `WORKFLOWS.md`: upload, approval, comments, sharing, archive, reminders.
- `DESIGN_SYSTEM.md`: UI standards.
- `TEST_PLAN.md`: test and QA plan.
- `AGENTS.md`: Codex/ChatGPT operating guide for this repo.

## Target Stack

- Next.js, TypeScript, Tailwind.
- Supabase Auth and Postgres with Row Level Security.
- Cloudflare R2 for original files.
- Cloudflare Stream for video previews.
- Inngest for jobs and reminders.
- Resend for email.
- Playwright and Vitest for verification.

## Important Constraint

Uploads can be up to 5GB, so large files must go directly to object or video storage with signed/resumable upload flows. Do not send large files through Next.js API route request bodies.

## Scripts

- `npm run dev`: local development.
- `npm run build`: production build.
- `npm run lint`: lint checks.
