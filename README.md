# SafetyHub

The member portal for Kapiti Aero Club. One app, one navigation shell, covering:

- **Flight authorisation**: pilots submit an authorisation before they fly, and instructors review and approve it.
- **Safety Hub**: the club's library of safety articles, with topic browsing, search, and shareable article links.
- **Club admin**: fleet, instructors, the form builder, club settings, the audit log, and the article editor.
- **Briefing room TV**: a full-screen slideshow of published safety articles for the clubhouse display.

The club name and logo come from club settings (`/admin/settings`).

## Who can see what

Access is enforced on the server in layouts, pages, and server actions, and by Supabase RLS. The sidebar only reflects those rules; it does not enforce them.

| Area | Who |
| --- | --- |
| Home (`/`), Safety Hub (`/safety`), Authorise a flight (`/authorise`), tracking links (`/a/[token]`) | Everyone, including guests without an account |
| My flights, profile and currency (`/fly`, `/fly/profile`) | Signed-in pilots |
| Review queue (`/fly/instructor`) | Instructors and flight admins |
| Fleet, instructors, form builder, audit log | Flight admins (`profiles.role = 'admin'`) |
| Article editor (`/admin`), Briefing room TV (`/tv`) | Safety admins (`user_roles`) |
| Club settings | Flight admins and safety admins |

If a club turns off member login, members are sent to `/authorise`. Guests can still submit and track authorisations.

## Stack

- Next.js 16 (App Router) and React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui
- Supabase (Auth, Postgres with RLS, Storage) via `@supabase/ssr`
- React Hook Form and Zod for the authorisation wizard, TanStack Query on the client
- Resend for notification email

## Project structure

```text
app/
  (portal)/                 Everything inside the shared sidebar shell
    layout.tsx              Resolves the viewer once and renders the shell
    page.tsx                Home
    safety/                 Safety Hub index and article pages
    authorise/page.tsx      Form picker
    (account)/              Pages that need a signed-in user (gated in layout.tsx)
      fly/                  My flights, profile, instructor review queue
      admin/                Club admin and the article editor
  authorise/[id]/           Full-screen authorisation wizard (public)
  authorise/submitted/      Submission confirmation
  a/[token]/                Public tracking page for a submitted authorisation
  login/, signup/, auth/    Authentication
  tv/                       Briefing room slideshow
components/
  portal/                   Page layout primitives (Page, PageHeader, SectionHeading)
  safety/                   Safety Hub list and browser
  flight/                   App shell, navigation, wizard, admin managers, ui/ primitives
lib/
  portal/viewer.ts          Who is looking: session, role, safety admin, club settings
  flight/nav.ts             Navigation definition and role filtering
  flight/                   Authorisation queries, actions, auth helpers
  supabase/                 Supabase clients and session proxy
proxy.ts                    Refreshes the session; sends signed-out users away from /fly and /admin
supabase/migrations/        Database schema and RLS policies
```

## Getting started

Requirements: Node.js 20.9 or later (24 LTS recommended) and pnpm (the repo pins `pnpm@12.3.4`).

```bash
pnpm install
cp .env.example .env.local   # then fill in the values below
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm build       # Production build
pnpm start       # Serve the production build
```

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable key (`sb_publishable_...`). Safe in the browser. |
| `SUPABASE_SECRET_KEY` | Yes, for authorisations | Server-only. Used for authorisation writes and notifications. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Absolute URL used in notification links |
| `RESEND_API_KEY` | No | When unset, notification emails are logged instead of sent |
| `RESEND_FROM_EMAIL` | No | Sender address for notifications |

`.env.local` is gitignored. Do not commit real credentials.

## Working on the database

Schema and policies live in `supabase/migrations/`. Every public table has RLS enabled. The Safety Hub is readable anonymously; flight authorisation data is not, apart from the security-definer lookup behind `/a/[token]`.

Review migrations before applying them, and don't apply or delete database objects through MCP tooling without checking them first.
