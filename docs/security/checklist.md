# Security review checklist

Use this for a new page, route, server action, or table, and again in review.

1. Is the resource public or authenticated?
2. Which users are allowed?
3. Which permission is required? Name it. Do not rely on "they can see the page".
4. Is ownership relevant, or is this club-wide for that permission?
5. Where does the server check the permission: page, action, route handler?
6. Which queries run, and which client runs them?
7. Does RLS allow that read or write, and deny the others?
8. Is the service role required? If yes, what is checked immediately before it?
9. Is the input parsed with Zod, including ids?
10. Do errors stay short, with no SQL, tokens, or other people's data?
11. Are logs free of secrets and message bodies that are not needed?
12. Do tests cover an allowed caller and a denied caller?
13. Did the catalog, policies, or decisions change? Are [RBAC](rbac.md), [RLS](rls.md), and the ADRs updated?

Fail closed. If the permission cannot be loaded, deny the action.

UI checks are for hiding links and buttons. Repeat the check on the server and in Postgres.
