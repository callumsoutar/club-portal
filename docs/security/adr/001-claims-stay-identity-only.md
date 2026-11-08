# ADR 001: JWT claims identify the user and nothing else

## Status

Accepted.

## Context

Supabase can put custom claims on the access token with a [custom access token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook). `getClaims()` verifies that token. `user_metadata` is writable by the user, so it must not drive RLS.

Safety Hub has two role stores and a short permission list. Permissions change when an admin edits a member, and that should apply on the next request.

## Decision

The access token proves identity (`sub`, and email when present). `getClaims()` is the flight session's identity check. `getUser()` stays in the proxy so cookies refresh, and in the safety-admin lookup.

Roles and permissions are read from `profiles` and `user_roles` on the request. They are not copied into the JWT. There is no access token hook.

## Consequences

- Revoking a flight role or a safety-admin row takes effect on the next request, without waiting for token expiry.
- An access token remains valid until it expires or the user signs out. It cannot preserve a role, because the role is not in the token.
- Every protected server path pays for a profile read. `getSessionUser` and `getAdminUser` are cached for the request.
- A future edge check that cannot read Postgres would need a new decision before claims are added.

## Alternatives

- Put the permission list in the token. Rejected: stale after a role change, and easy to treat as the source of truth.
- Put the role in `user_metadata`. Rejected: the user can edit it.
- Call only `getUser()` everywhere. Rejected for the flight session: `getClaims()` is the documented local verification path when signing keys are asymmetric, and the profile read is still required either way.
