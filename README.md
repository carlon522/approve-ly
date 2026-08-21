# Approve.ly

Approve.ly is a mobile-first social media content approval portal for multiple companies. It supports Creative, Approver, Assistant, and Super Admin workflows across Instagram, TikTok, and YouTube Shorts review previews.

The current repo contains the Next.js app, product contract docs, Supabase-backed API routes, and Supabase Storage signed upload/download wiring. Without environment variables it still opens in demo mode; with credentials it runs as a live approval portal.

## Getting Started

Run the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Live Backend Setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql), then optionally [supabase/seed.sql](supabase/seed.sql).
3. Add the Supabase URL, anon/publishable key, and service role key to Render.
4. Create a private Supabase Storage bucket named `approve-ly-content` with a 50MB per-file limit.
5. Add the same random value as `CRON_SECRET` in Render and as the GitHub Actions secret `APPROVE_LY_CRON_SECRET`. The scheduled workflow removes Supabase Storage objects seven days after a final download archive is requested.

Required production env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `APP_BASE_URL`
- `CRON_SECRET`

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
- Supabase Storage for original files.
- Cloudflare Stream for video previews.
- Inngest for jobs and reminders.
- Resend for email.
- Playwright and Vitest for verification.

## Important Constraint

Uploads are currently limited to 50MB on the Supabase Free plan and go directly to Storage with signed upload flows. Do not send file bodies through Next.js API route request bodies.

## Scripts

- `npm run dev`: local development.
- `npm run build`: production Next.js build.
- `npm run start`: run the live Next.js server, using `PORT` for Render Web Services.
- `npm run sites:dist`: legacy static Sites packaging helper.
- `npm run lint`: lint checks.

## Render Deploy

Use a Render Web Service, not a Static Site:

- Build Command: `npm run build`
- Start Command: `npm run start`
- Node: `22` or newer

The archive cleanup workflow also needs these GitHub Actions secrets:

- `APPROVE_LY_BASE_URL=https://approve-ly.onrender.com`
- `APPROVE_LY_CRON_SECRET` (the same value as Render's `CRON_SECRET`)
