# Authentication and sessions

## Clients

| Client | File | Key |
| --- | --- | --- |
| Browser | `lib/supabase/client.ts`, `lib/flight/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| Server, user scoped | `lib/supabase/server.ts`, `lib/flight/supabase/server.ts` | Same public key, cookies from the request |
| Service role | `createServiceSupabase()` in `lib/flight/supabase/server.ts` | `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` |

The secret key is not a `NEXT_PUBLIC_` variable. Do not import `createServiceSupabase` from a client component. Both browser clients only read the public helpers.

There are two server factories. They use the same env names and the same cookie pattern. New code can use either user-scoped factory. Do not add a third.

Cookie writes from a Server Component are swallowed. `proxy.ts` refreshes the session on each matched request, which is the [Supabase SSR pattern](https://supabase.com/docs/guides/auth/server-side/nextjs). Server Actions can still set cookies.

## Identifying the user

`getSessionUser` in `lib/flight/auth.ts` calls `supabase.auth.getClaims()`. With asymmetric signing keys this verifies the JWT locally. With a legacy symmetric secret it falls back to the Auth server, same as `getUser()`. The user id is `claims.sub`. The function then loads `profiles` and `pilot_profiles`. No profile means no session, even if Auth has a user.

`getAdminUser` calls `getUser()` and looks up `user_roles`. Use that for safety admin. Do not infer safety admin from `profiles.role`.

`getSession()` is not used. The session object in the browser is not proof on the server.

## `getClaims` and `getUser`

| Call | Where | Why |
| --- | --- | --- |
| `getUser()` | `lib/supabase/proxy.ts` | Validates the user and lets `@supabase/ssr` write refreshed cookies. |
| `getClaims()` | `getSessionUser` | Validates identity for the flight app without a second Auth round-trip when the project uses JWKS. |
| `getUser()` | `getAdminUser`, login, OAuth callback | The safety and sign-in paths already have a server client and need a confirmed user before they read `user_roles`. |

Neither call reads a role from the token. Role and safety admin are loaded from Postgres on the request, so a change applies on the next request rather than when the access token expires. See [ADR 001](adr/001-claims-stay-identity-only.md).

## Session lifecycle

1. **Create.** `signInWithPassword`, Google `exchangeCodeForSession`, or `verifyOtp` after a signup code.
2. **Cookies.** The SSR client stores the session in cookies. The app does not set its own token store.
3. **Refresh.** The proxy's `getUser()` refreshes an expired access token when a refresh token is still valid.
4. **Use.** Server code calls `getClaims()` or `getUser()`, then loads roles from the database.
5. **Sign out.** `signOut` in `lib/flight/actions/profile.ts` calls `supabase.auth.signOut()` and redirects home. Failed login and OAuth paths also sign out so a half-created session is not left behind.
6. **Expiry.** A missing or rejected user is treated as signed out. Protected layouts redirect to `/login`.
7. **Password change and recovery.** Not implemented.
8. **Disabled user.** `profiles.is_active` is enforced by the member admin screens. Auth itself is not disabled by that flag. Do not treat `is_active` as a substitute for revoking the Auth user.
9. **Removed permission.** The next request reads `profiles` and `user_roles` again. An access token that has not expired can still identify the user until it expires or they sign out. It cannot keep a role that Postgres no longer has, because the role is not taken from the token.
10. **Several tabs.** They share the cookies. Signing out in one tab ends the cookie session for the others on their next request.

Deleting an Auth user does not, by itself, invalidate an access token that has not expired. Sensitive mutations re-read the profile. See [Supabase sessions](https://supabase.com/docs/guides/auth/sessions).

## Redirects

`safeNextPath` in `lib/auth.ts` allows only same-origin paths the app knows about. `resolveSignedInDestination` then checks member login, safety admin, and flight role. Password login, OAuth, and the signup code all use it.

`landingPath` sends an instructor back to `/fly/instructor` when that was the requested `next`. Traffic stays flight-admin only.

## Errors

Login returns a short message and does not echo the Auth provider's raw error for a bad password. Server actions return `{ ok: false, error }` for a denied permission. Pages redirect. Do not put tokens, service errors, or row contents in the message the user sees.

## Public pages

Public pages may call `getPortalViewer` to shape navigation. They must not require a session. Guest authorisation submit is a server action that rate-limits and then uses the service role on purpose. The tracking page uses `get_authorisation_by_token`. The token is the secret.
