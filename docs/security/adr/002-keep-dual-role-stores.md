# ADR 002: Keep the two role stores

## Status

Accepted.

## Context

Safety articles were gated by `user_roles` before flight roles existed. Flying uses `profiles.role` with `member`, `instructor`, and `admin`. A person can be a safety admin without being a flight admin, and the reverse.

## Decision

Keep both tables. Derive permissions in `lib/flight/permissions.ts` and `public.has_permission`. Do not add a permissions table, a role-permission join, or per-user overrides until a permission must be granted independently of these roles.

`members.manage` and `club.settings` are the shared permissions. Everything else belongs to one side.

## Consequences

- Call sites ask for a permission instead of remembering which table to read.
- Granting safety admin is still a SQL insert. There is no screen for it.
- The admin layout continues to admit either admin. Pages underneath still check their own permission.
- Adding a fourth flight role means updating the rank, the SQL function, and the tests together.

## Alternatives

- Collapse safety admin into `profiles.role = 'admin'`. Rejected: it would give article editors flight-admin rights, or flight admins article rights, unless every check were rewritten anyway.
- Store each permission as a row. Rejected for now: nothing in the product assigns a permission outside a role.
