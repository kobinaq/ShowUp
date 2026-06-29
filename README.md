# ShowUp

ShowUp is a production-oriented University Lecturer Quality Assurance Platform. It uses Next.js App Router, Supabase Auth, Prisma on Supabase Postgres, Vercel Cron, Resend, Arkesel, and Gemini.

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`.

## Environment

All required variables are documented in `.env.local.example`.

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser/server Supabase client.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only admin actions for staff and reporter provisioning.
- `DATABASE_URL`: Supabase pooled Postgres connection, usually port `6543`.
- `DIRECT_URL`: direct Postgres connection for Prisma migrations, usually port `5432`.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: email delivery.
- `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`: Arkesel SMS.
- `GEMINI_API_KEY`, `GEMINI_MODEL`: Gemini access for the ShowUp AI analytics assistant.
- `CRON_SECRET`: bearer token for `/api/cron/rotation`.

## Architecture

```text
Browser / PWA
  |
  | Supabase session cookies
  v
Next.js App Router + Middleware
  |
  +-- Route Handlers: REST API, validation, role checks
  +-- Server Components: dashboards and reporting screens
  |
  v
Service Layer
  +-- coverage.service.ts
  +-- flag.service.ts
  +-- notification.service.ts
  +-- rotation.service.ts
  +-- export.service.ts
  +-- ask.service.ts / ask.queries.ts
  |
  v
Prisma -> Supabase Postgres
Supabase Auth / Storage
Resend / Arkesel
Vercel Cron
```

## ShowUp AI

QA Officers, VCs, HODs, and HOD assistants get a floating `ShowUp AI` button in the dashboard. Questions are parsed by Gemini into a constrained query plan, executed against ShowUp data through Prisma, then summarized by Gemini in plain English. HOD and HOD assistant questions are forced to their own department before any query executes. The API is exposed at `POST /api/ask`.

## Security Notes

- Supabase Auth is the source of session identity.
- API routes call `withAuth` and enforce allowed roles.
- Middleware blocks unauthenticated pages and redirects users away from pages outside their role.
- Class rep real identities live only in `SealedRepIdentity` and are exposed through the audited identity lookup endpoint.
- Cron rotation requires `Authorization: Bearer $CRON_SECRET`.
- Enable Supabase RLS policies before production launch as defense in depth.

## Seed Accounts

The seed script creates staff accounts when Supabase admin credentials are configured. Without Supabase env vars, it creates deterministic local IDs so Prisma seed data can still be loaded.

Default seed password for staff: `Password123!`

## Production Checklist

- Create a Supabase project and set pooled/direct database URLs.
- Run Prisma migrations against Supabase.
- Configure Supabase Auth redirect URLs for your Vercel domain.
- Add Resend sender domain verification.
- Configure Arkesel production SMS credentials.
- Set `CRON_SECRET` in Vercel and verify cron execution logs.
- Add RLS policies for all Prisma tables.
- Run `npm run test`, `npm run lint`, and `npm run build` before deployment.
