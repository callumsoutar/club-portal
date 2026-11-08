# Database and row level security

RLS is on for the application tables in `supabase/migrations`. A policy that only says `to authenticated` without a row check would allow every signed-in user to read every row. New policies need `to authenticated` (or `anon` when the data is public) and a predicate.

Helpers:

- `is_admin()` is security invoker and reads `user_roles`. Callers can only see their own row.
- `current_app_role()`, `is_flight_staff()`, and `is_flight_admin()` are security definer so a policy can read the caller's role without depending on the `profiles` policy.
- `has_permission(text)` is security invoker and calls those helpers. Unknown names return false. `anon` cannot execute it.

Do not put authorisation in `user_metadata`. Do not use `auth.role()` inside a policy. Prefer `to authenticated`.

## Profile privileges

`authenticated` may update `email`, `full_name`, `phone`, `avatar_url`, and `updated_at` on their own row (`profiles: update own`). They cannot update `role` or `is_active`.

`profiles_protect_privileges` still runs if a later grant widens those columns. It allows the change for `service_role`, `postgres`, `supabase_admin`, or `is_flight_admin()`. Member administration uses the service role, so role changes from `updateMemberProfile` still work. A normal session cannot promote itself.

## Authorisations

| Action | Who, in RLS |
| --- | --- |
| Insert guest | `anon`, guest row, no `profile_id` |
| Insert as member | Own `profile_id`, or flight admin |
| Select | Owner, or `authorisations.review` |
| Update | Owner while draft (and submit), or flight admin |
| Delete | Flight admin |
| Read answers, approvals, comments, activity | Owner, or `authorisations.review` (internal comments included for reviewers) |
| Insert approval | `authorisations.approve` and `actor_id` is the caller |
| Insert comment | Caller is `author_id`, and either they may review or they own the flight and the note is not internal |

`authorisations_protect_ownership` stops a non-admin session changing `profile_id`, `is_guest`, or `access_token`. Submitted answers, the template snapshot, and the signature stay immutable through `enforce_authorisation_immutability`, except the flight-admin correction RPC.

Approve and decline do not open `UPDATE` to instructors. The server action checks `authorisations.approve` and writes with the service role. That is the supported way to change status.

Fleet, forms, aircraft, and instructor rows stay flight-admin for inactive records. Active rows remain publicly readable where they already were. Training tables still use `is_flight_staff()` for instructor recording. `pilot_profiles` stays own-row or flight-admin, so the review queue does not list every member's medical expiry.

Storage signatures are read through a service-role signed URL after the page has already required `authorisations.review`. The storage policy itself is still flight-admin for direct downloads.

## Service role

`createServiceSupabase()` bypasses RLS. Use it only after a permission check, for Auth admin (signup codes), guest submit, notifications, and the review writes described above. Do not use it to "make a query work" on a table the user should not see.

## Security definer

Functions in `public` are executable by `PUBLIC` unless revoked. Keep trigger functions revoked from `anon` and `authenticated`. `get_authorisation_by_token` is granted to `anon` on purpose. The token is the credential. `correct_submitted_responses` checks `is_flight_admin()` inside the function.

`SECURITY DEFINER` is not a fix for a missing policy.

## Changing a policy

1. Add a new migration. Do not edit a migration that has already been applied.
2. `drop policy if exists` the old name, then create the new one with both `using` and `with check` on updates.
3. Call `has_permission` or an existing helper. Do not paste a role string in every policy.
4. Run `scripts/assert-auth-privileges.sql` on a non-production database.
5. Update [this document](rls.md) and [RBAC](rbac.md) if the permission meaning changed.

Views are not used. If you add one, create it `with (security_invoker = true)` so it does not bypass RLS. See [row level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
