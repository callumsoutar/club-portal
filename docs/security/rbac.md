# Roles and permissions

## Source of truth

| Fact | Stored in | Not stored in |
| --- | --- | --- |
| Flight role | `profiles.role` (`app_role`) | JWT, `user_metadata`, local storage |
| Safety admin | `user_roles` where `role = 'admin'` | `profiles.role` |
| Permission | Derived by `hasPermission` and `public.has_permission` | Its own table |

Safety admin does not make someone a flight admin. Flight admin does not make someone a safety admin. There are no per-user overrides and no inheritance beyond the rank `member < instructor < admin`.

Grant a flight role in the member directory (`updateMemberProfile`). That action checks `members.manage` and writes with the service role. Grant safety admin with SQL:

```sql
insert into public.user_roles (user_id, role) values ('<auth user id>', 'admin');
```

Revoke by deleting that row, or by setting `profiles.role` back through the member directory. A user cannot update their own `role` or `is_active`. Unknown permissions are denied.

## Catalog

Defined in `lib/flight/permissions.ts`. The SQL function must use the same names.

| Permission | Member | Instructor | Flight admin | Safety admin |
| --- | --- | --- | --- | --- |
| `flights.read`, `profile.update` | yes | yes | yes | only with a flight role |
| `authorisations.review`, `authorisations.approve`, `training.record` | | yes | yes | |
| `authorisations.archive`, `training.manage`, `fleet.manage`, `instructors.manage`, `forms.manage`, `traffic.read` | | | yes | |
| `members.manage`, `club.settings` | | | yes | yes |
| `safety.manage`, `briefing.tv` | | | | yes |

Close-out of an approved flight uses `authorisations.archive`, so only a flight admin can do it.

## Helpers

| Function | File | Use |
| --- | --- | --- |
| `hasPermission(subject, permission)` | `lib/flight/permissions.ts` | Pure check. Tests and navigation. |
| `userHasPermission(permission)` | `lib/flight/auth.ts` | Server actions. Returns false when signed out or denied. |
| `requirePermission(permission)` | `lib/flight/auth.ts` | Pages. Redirects to `/login` or `/fly`. |
| `requireUser`, `requireRole`, `requireStaff`, `requireAdmin` | `lib/flight/auth.ts` | Older page gates. `requireAdmin` is flight admin only. |
| `requireMemberAdmin` | `lib/flight/members.ts` | `members.manage`. |
| `public.has_permission(text)` | Postgres | RLS. Security invoker. Granted to `authenticated` only. |

Server-only helpers import `server-only`. Do not call `userHasPermission` from a client component. The client may receive a boolean the server already computed, such as `canArchive` on the review page.

`requireAdmin()` and `requireAdminActor()` remain on fleet, instructors, the form builder, and answer correction. They still mean flight admin. New work should take a permission so a future split does not require another role comparison.

## Adding a permission

1. Add the name to `PERMISSIONS` and to the `switch` in `hasPermission`.
2. Add the same `when` branch in `public.has_permission`.
3. Add a row to `lib/flight/permissions.test.ts`. The test fails if the catalog and the matrix disagree.
4. Check it in the server action and, if the user-scoped client reads or writes the table, in an RLS policy that calls `has_permission`.
5. Hide the nav item by adding the href to `NAV_PERMISSION` in `lib/flight/nav.ts`. A href that is missing returns false.
6. Update this table.

Do not compare `profile.role === "admin"` in the new code.

## Administrative access

Flight admin runs the club's flying records: fleet, instructors, forms, member roles, archive.

Safety admin edits articles, opens the briefing-room TV, and shares member directory and club settings. They do not approve flights unless their `profiles.role` is instructor or admin.

The `/admin` layout lets either admin in. A safety-only admin who opens a flight-admin page is redirected to `/fly` by `requireAdmin()`. That split is deliberate. See [ADR 002](adr/002-keep-dual-role-stores.md).
