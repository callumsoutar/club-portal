# Audit

Versions inspected: Next.js 16.3.3, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.2. Findings below distinguish what was already true, what this change fixed, and what is still open. No secret values are recorded here.

## 1. Authentication

**Current.** Sign-in is email and password (`app/login/actions.ts`) and Google (`app/auth/callback/route.ts`). Signup sends a code from `lib/flight/actions/signup.ts`. The browser confirms it in `components/flight/auth-form.tsx`, then `resolvePostAuthDestination` applies the same destination rules as password login (`safeNextPath`, member-login switch, safety admin, flight role).

There is no forgot-password page and no invite flow. A notification template mentions password reset, but nothing calls it.

**Fixed.** The signup code used to finish in the browser, with a weaker `next` check and a client-only member-login test. That path now calls the server helper.

## 2. Authorisation

**Current.** Two stores, both still the source of truth:

- `profiles.role` (`member`, `instructor`, `admin`) for flying.
- `user_roles` (`admin` only) for safety articles and the briefing-room TV.

`lib/flight/permissions.ts` and `public.has_permission(text)` derive capabilities from those stores. Pages and the review actions call `requirePermission` or `userHasPermission`. Some older flight-admin screens still call `requireAdmin()` or `requireAdminActor()`, which is the same as a flight-admin permission but is not yet expressed as one. See [RBAC](rbac.md).

**Fixed.** The review queue, home-page review shortcut, approve, decline, and review comments now allow instructors. Archive and close-out stay flight-admin only (`authorisations.archive`).

## 3. Roles that exist

| Store | Values | Who can change it |
| --- | --- | --- |
| `profiles.role` | `member`, `instructor`, `admin` | Service role after `members.manage`. Not the signed-in user. |
| `user_roles.role` | `admin` only | SQL by an operator. Clients have no insert policy. |

There is no permission override table and no organisation table.

## 4. Database security

**Current.** RLS is enabled on the application tables created in `supabase/migrations`. `user_roles` is select-own. Safety messages are public when published, and editable when `is_admin()`.

**Fixed in** `supabase/migrations/20261027103000_lock_profile_privileges_and_permissions.sql`.

- **Confirmed hole, now closed.** `authenticated` had `UPDATE` on all of `profiles`, and `profiles: update own` did not pin `role` or `is_active`. A member could set `role` to `admin` through the Data API. Column privileges now omit those two columns, and `profiles_protect_privileges` rejects the change unless the session is the service role, a database admin, or a flight admin.
- Instructor review policies were narrowed to flight admins in `20261016180000_admin_only_reads_and_signup_names.sql`. Select on authorisations, answers, approvals, comments, and the activity log is open to `authorisations.review` again. Approval insert requires `authorisations.approve` and `actor_id = auth.uid()`. Direct update of an authorisation row is still flight-admin or the owner's draft. `authorisations_protect_ownership` blocks a non-admin from changing `profile_id`, `is_guest`, or `access_token`.

`scripts/assert-auth-privileges.sql` checks the column privileges, the function grant, and those policy names. It does not turn RLS off.

## 5. Sessions

**Current.** `proxy.ts` calls `getUser()` so `@supabase/ssr` can refresh cookies, and redirects signed-out users from `/fly` and `/admin`. Server components load identity with `getClaims()` and then read `profiles`. Details are in [authentication](authentication.md).

`getSession()` is not used for access decisions. `user_metadata` is not used in policies.

## 6. Confirmed weaknesses

| Issue | Status |
| --- | --- |
| Self-service `profiles.role` / `is_active` | Fixed by the migration above |
| Signup code skipped server destination checks | Fixed |
| Instructors could not review or approve | Fixed in the app and in RLS reads/inserts |
| Safety admin can open `/admin` layout but not flight-admin mutations | Still true. The layout admits either admin. Flight mutations check a flight-admin permission or `requireAdminActor()`. |
| Service-role writes skip RLS | Still true, and intentional. The server action must check a permission first. |
| No automated auth tests | Permission matrix is covered by Vitest. RLS is checked by the SQL script, not by a test database in `pnpm test`. |

## 7. Inconsistencies that remain

- Two Supabase client modules, `lib/supabase` and `lib/flight/supabase`, share the same public env names.
- `getUser()` (proxy, safety admin) and `getClaims()` (flight session) both validate the caller. They are used for different jobs, documented in [ADR 001](adr/001-claims-stay-identity-only.md).
- Fleet, form builder, traffic, and answer correction still call `requireAdmin()` or compare `profiles.role` with `admin`. That matches flight admin. New code should use a permission.
- `/traffic` and `/tv` are enforced on the page, not in the proxy.
- Instructor review stats for expired medicals and BFRs stay empty. `pilot_profiles` is still own-row or flight-admin, so currency records are not opened to every instructor. The authorisation itself still carries the snapshot taken at submission.
- There is no generated `database.types.ts`. Domain types are handwritten in `lib/flight/types.ts`.

## 8. Target architecture

The target is what the documents in this folder describe: identity from Auth, permissions derived from the two role tables, enforcement in the server action and in RLS, and the UI only hiding links.

Not adopted: a custom access token hook, permissions inside the JWT, per-user overrides, or a second permissions table. See the ADRs.

## 9. What is still worth doing later

1. Move remaining `requireAdmin()` call sites onto named permissions.
2. Use one Supabase server client module.
3. Add password recovery if members need it.
4. Generate database types.
5. Run `scripts/assert-auth-privileges.sql` in CI against a non-production database.

Official references used while choosing this shape: [Supabase with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs), [user sessions](https://supabase.com/docs/guides/auth/sessions), [row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [custom access token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), and [Next.js proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). Dependencies were not upgraded to match newer examples.
