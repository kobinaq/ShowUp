# Meridiqa product demo

A self-contained Remotion film for the Accra Technical University pitch. It does not change the Next.js app build. Screens are stills captured from a local run of the seeded app.

The film is silent. No royalty-free music track is bundled.

## Render

From this folder:

```bash
npm install
npm run render
```

Output: `demo-video/out/meridiqa-atu-demo.mp4` (1920×1080, 30 fps, about 2 minutes 50 seconds).

Chrome is expected at `/usr/local/bin/google-chrome`. If that path differs, change `browserExecutable` in `remotion.config.ts`.

Preview in the Remotion studio with `npm run studio`.

## Recapture the stills

The committed PNGs in `public/captures` are what the film uses. To shoot them again you need the app, a local Postgres database, and demo mode. No SMS or email provider keys should be set.

1. Copy `.env.local.example` to `.env.local`. Point `DATABASE_URL` and `DIRECT_URL` at local Postgres. Leave `RESEND_API_KEY`, `ARKESEL_API_KEY`, and `GROQ_API_KEY` empty.
2. Set `DEMO_ACCESS_TOKEN` and a different `DEMO_SESSION_SECRET`.
3. Create the `anon` and `authenticated` roles, and `auth.uid()`, if this is not Supabase. Then `npx prisma migrate deploy` and `npx prisma db seed`.
4. The class-rep flow needs a class on the capture machine’s local weekday, already inside the late-alert window (class start plus the 30-minute threshold, and before class end). The seed schedules are spread across Monday–Friday. For a Thursday capture, the seeded `CENG301` slot can be moved to Thursday 08:00–10:00 in the local database only. Do not commit that edit.
5. `npm run dev` in the repo root.
6. From the repo root, with `DEMO_ACCESS_TOKEN` set: `npx tsx demo-video/scripts/capture.ts`

On Next.js 16 dev, the middleware path header is not always visible to the dashboard layout. Without the layout guard in `src/app/(dashboard)/layout.tsx`, the Vice-Chancellor, HOD, and IT pages redirect-loop. The capture script signs in through `/api/demo/session`.

`GROQ_API_KEY` was not set for this film. “Which lecturers have been late this week?” still uses Meridiqa’s local query plan (`top_late`, period `week`). The six names beside the laptop are that query result, enlarged so they can be read. They are not a Groq completion. The assistant panel, including “Powered by Groq”, is the real interface.

## What the film does not claim

- Landing-page marketing figures are not shown. They are not computed from the database.
- No SMS or email was sent. The late alert and the “I’m on my way” confirmation are the in-app record.
- The discrepancy list in the seed is empty. The film says so. The app does not yet resolve a discrepancy.
- Reporter names are sealed. The film’s reveal card is the response from `GET /api/reps/identity` for the demo class rep, after a reason was supplied. The lookup page stores the reason. It does not print the name.
- Camera monitoring is labeled as a roadmap, not a current feature.
