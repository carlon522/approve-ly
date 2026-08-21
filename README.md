# Approve.ly

Approve.ly is a mobile-first social media content approval portal for multiple companies. It supports Creative, Approver, Assistant, and Super Admin workflows across Instagram, TikTok, and YouTube Shorts review previews.

The current repo contains the Next.js app, product contract docs, Supabase-backed API routes, and Cloudflare R2 signed upload/download wiring. Without environment variables it still opens in demo mode; with credentials it runs as a live approval portal.

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
4. Create a Cloudflare R2 bucket and S3 API token, then add the R2 env vars to Render.
5. Configure R2 CORS to allow `PUT` from your Render domain with the `Content-Type` header.

Required production env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `APP_BASE_URL`

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
- `npm run build`: production Next.js build.
- `npm run start`: run the live Next.js server, using `PORT` for Render Web Services.
- `npm run sites:dist`: legacy static Sites packaging helper.
- `npm run lint`: lint checks.

## Render Deploy

Use a Render Web Service, not a Static Site:

- Build Command: `npm run build`
- Start Command: `npm run start`
- Node: `22` or newer
