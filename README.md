# SafetyHub

A public-facing safety information platform for aero clubs and flight schools. The first release is a site for Kapiti Aero Club, with a homepage, message archive, article view and clubhouse TV slideshow. Club name and logo are configured in admin settings.

The public website does not require authentication.

## Stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui (Base UI / `base-nova` style)
- Lucide icons
- Supabase (client foundations only; no schema yet)

## Project structure

```text
app/
  layout.tsx          Root layout, metadata and Vercel Analytics
  page.tsx            Public homepage, archive, article and slideshow UI
  globals.css         Theme tokens and v0 screenshot-faithful styles
components/ui/        shadcn/ui primitives (Button is present, unused by the homepage)
lib/utils.ts          `cn()` class helper
lib/supabase/         Browser and server Supabase clients
public/               Icons, placeholders and the aviation safety image
```

The current UI lives in a single client page with in-memory mock messages. That is intentional: the v0 design is preserved so routes, data fetching and admin can be added without a redesign.

Suggested future layout (not created yet):

- `app/` — public pages
- `app/admin/` — authenticated content management
- `app/tv/` — dedicated slideshow route
- `app/messages/[slug]/` — individual message pages

## Requirements

- Node.js 20+
- pnpm (the repo is locked to `pnpm@12.3.4`; pnpm 11+ also works)

## Install

```bash
pnpm install
```

Copy the environment template if you are connecting Supabase:

```bash
cp .env.example .env.local
```

The app runs without Supabase credentials while it still uses mock data.

## Local development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm lint        # ESLint (Next.js 16 no longer provides `next lint`)
pnpm typecheck   # TypeScript
pnpm build       # Production build
pnpm start       # Serve the production build
```

`npm run dev`, `npm run build`, `npm run start` and `npm run lint` also work if the scripts are run from this directory after `pnpm install`.

## Environment variables

| Name | Required now | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Project URL from the Supabase Connect dialog |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Publishable key (`sb_publishable_...`). Safe in the browser. Never use a secret or service-role key here. |
| `SUPABASE_SECRET_KEY` | No | Optional, server-only, for later admin jobs. Keep it commented until needed. |

`.env.local` is gitignored. Do not commit real credentials.

## Supabase

Clients follow the current `@supabase/ssr` App Router pattern:

- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server client (Server Components, Server Actions, Route Handlers)
- `lib/supabase/env.ts` — reads public env vars and fails clearly if they are missing when a client is created

No auth proxy, login flow or database schema has been added. The homepage does not import these clients, so missing credentials do not break local development.

When a SafetyHub Supabase project exists:

1. Create the project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Copy the project URL and publishable key into `.env.local`.
3. Generate types:

   ```bash
   pnpm dlx supabase gen types typescript --project-id <project-id> > lib/supabase/database.types.ts
   ```

4. Add tables and storage later, with RLS enabled on every public table.

Do not point this app at an existing unrelated project (for example `flight-desk`) without an explicit decision.

### Cursor Supabase MCP

The Supabase MCP connector is already available in Cursor and can list your account's projects. Use it to inspect schema, run SQL and generate types once a SafetyHub project exists.

If tools are missing in a new machine:

1. Confirm the Supabase plugin is enabled.
2. Authenticate the MCP server when Cursor prompts for OAuth.
3. Reload the agent session.

Do not apply migrations or delete database objects through MCP without reviewing them first.

## Notes on the v0 export

- Package manager is pnpm (`pnpm-lock.yaml`).
- shadcn/ui is configured in `components.json` with style `base-nova` and Tailwind v4 CSS variables.
- The homepage is one `'use client'` page; article and slideshow views are client-side state, not separate routes.
- `components/ui/button.tsx` is installed but unused by the current page.
- `next.config.mjs` leaves images unoptimized, matching the v0 export.
