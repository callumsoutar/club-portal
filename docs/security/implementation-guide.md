# Implementation guide

Use this when adding a page, server action, or table. The samples use `authorisations.review`, which already exists. A new permission follows the same steps.

## 1. Decide the access

- Public or signed in?
- Which existing permission already fits? Reuse it if it does.
- Is it the whole club, or only the user's own rows?
- Safety admin, flight role, or both?

## 2. Add the permission

In `lib/flight/permissions.ts`, add the name and a branch. Default remains deny.

In a new migration, replace `public.has_permission` with the same branch. Do not edit an applied migration.

Add the row to `lib/flight/permissions.test.ts` and run `pnpm test`.

## 3. Protect the page

```tsx
import { requirePermission } from "@/lib/flight/auth";

export default async function Page() {
  await requirePermission("authorisations.review");
  // load with the user-scoped server client
}
```

`requirePermission` redirects. It does not return a user who failed the check. Do not rely on the admin layout alone.

Hide the nav link by mapping the href in `lib/flight/nav.ts`. If the href is missing from `NAV_PERMISSION`, the link stays hidden.

## 4. Protect the server action

```tsx
"use server";

export async function addNote(raw: unknown) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  if (!(await userHasPermission("authorisations.review"))) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  // write, then revalidatePath
}
```

Check the permission even if the button is hidden. Validate ids from the client, then load the row and confirm this user may touch it.

Use the service role only when RLS cannot express the write and the permission check above has passed. Say why in a comment.

## 5. Protect the table

```sql
create policy "notes: reviewer read"
  on public.notes for select to authenticated
  using ((select public.has_permission('authorisations.review')));
```

Enable RLS on the new table before granting `select`, `insert`, `update`, or `delete` to `authenticated`. Updates need `using` and `with check`.

If the owner may edit a column but must not reassign the row, follow `protect_authorisation_ownership`: a trigger that ignores the service role and flight admins, and rejects everyone else.

## 6. Test

- `pnpm test` for the matrix.
- A signed-out request cannot run the action.
- A member receives the error or the redirect.
- An instructor or admin, as appropriate, succeeds.
- A client-supplied user id does not widen access.
- `scripts/assert-auth-privileges.sql` on a non-production database after the migration.

Do not disable RLS to make a test pass.

## 7. Document

Update [RBAC](rbac.md) and [RLS](rls.md) if the catalog or a policy changed. Update an ADR only when the approach changes, not for every permission.
