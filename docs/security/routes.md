# Routes, actions, and APIs

## Pages and layouts

| Surface | Rule |
| --- | --- |
| `proxy.ts` | Session refresh for matched paths. Signed-out users hitting `/fly` or `/admin` go to `/login?next=`. |
| `(account)/layout.tsx` | Flight session or safety admin. Members are sent to `/authorise` when member login is off. |
| `admin/layout.tsx` | Safety admin or flight admin. This is not the only check on the page inside. |
| Review queue | `requirePermission("authorisations.review")` |
| Fleet, instructors, form builder | `requireAdmin()` (flight admin) |
| Articles | `getAdminUser()` |
| TV | `getAdminUser()` |
| Traffic page and `GET /api/traffic` | Signed-in flight admin |

A layout is not the only boundary. The page and the action check again.

## Server actions

Pattern:

1. Parse input with Zod. Reject before any write.
2. `userHasPermission(...)` or an existing helper (`requireAdminActor`, `requireMemberAdmin`).
3. Load the row with the user-scoped client when the user must be allowed to see it.
4. Write with the user-scoped client when RLS expresses the rule, or with `createServiceSupabase()` when the action already checked the permission and RLS would block a legitimate staff write.
5. Return `{ ok: false, error }` with a short message. Do not include SQL or tokens.

Approve and decline check `authorisations.approve`, then update status with the service role. The direct-table update policy is still flight-admin or the owner's draft, so an instructor cannot change an authorisation's columns through the Data API. They can insert an approval row only as themselves.

Archive and close-out check `authorisations.archive`.

Comments check `authorisations.review` before an internal note or a comment on someone else's flight. A member can still comment on their own authorisation.

Guest submit is public. It rate-limits, validates the published template, and uses the service role. Do not copy that pattern onto a signed-in mutation.

## Route handlers

`app/api/traffic/route.ts` checks `getSessionUser` and flight admin. It returns 401 or 403. OAuth and email confirm live under `app/auth/` and create a session, then call `resolveSignedInDestination`.

New route handlers must not trust a user id from the query string.

## Checklist for a new entry point

Copy [the review checklist](checklist.md). The short version:

- Public or signed in?
- Which permission?
- Does the row belong to this user, or is a staff permission required?
- Is the check in the action, not only in the button?
- Does RLS agree?
- Is the service role actually required?
- Is the input parsed with Zod?
- Is the error safe to show?
