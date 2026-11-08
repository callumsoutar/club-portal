# ADR 003: Instructors review and approve authorisations

## Status

Accepted.

## Context

The product copy says instructors and flight admins review flights. Migration `20261016180000_admin_only_reads_and_signup_names.sql` limited cross-user reads, approval inserts, and several other staff policies to `is_flight_admin()`. The review pages called `requireAdmin()`.

Training records were already instructor-capable and stay that way.

## Decision

`authorisations.review` and `authorisations.approve` are held by instructors and flight admins.

RLS lets them select authorisations, answers, approvals, comments, and activity, and insert an approval as themselves. It does not let them update every column on an authorisation. Status changes go through the server action, which checks the permission and uses the service role. `authorisations_protect_ownership` blocks other sessions from changing who owns the row or its access token.

Fleet, forms, traffic, article editing, archive, and close-out stay flight-admin or safety-admin as before. `pilot_profiles` is not opened to all instructors.

## Consequences

- An instructor sees the review queue, can approve or decline, and can leave an internal comment.
- An instructor cannot archive, close out, or correct submitted answers.
- A member still cannot read another member's authorisation.
- Direct Data API updates of status by an instructor fail RLS. The app path is the server action.

## Alternatives

- Restore every `is_flight_staff()` policy removed in `20261016180000`. Rejected: that reopened fleet, forms, and files the club had deliberately limited to flight admins.
- Leave review as flight-admin only and change the README. Rejected: instructors are expected to approve flights.
