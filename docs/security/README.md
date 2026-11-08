# Authentication and authorisation

This is the reference for how Safety Hub decides who someone is and what they can do. Read [the audit](audit.md) for what was already in the app and what changed, then use [the implementation guide](implementation-guide.md) when adding a feature.

| Document | What it covers |
| --- | --- |
| [Architecture](architecture.md) | Request path from the proxy to Postgres |
| [Authentication](authentication.md) | Clients, sessions, `getClaims`, `getUser`, redirects |
| [RBAC](rbac.md) | Roles, permissions, and how to add one |
| [Routes](routes.md) | Pages, server actions, and the traffic API |
| [RLS](rls.md) | Database policies, triggers, and the service role |
| [Implementation guide](implementation-guide.md) | Steps for a new protected feature |
| [Review checklist](checklist.md) | Questions for every change |
| [Decisions](adr/001-claims-stay-identity-only.md) | Why claims, role stores, and instructor review are shaped this way |

The club is a single organisation. There is no tenant id to pass from the client.
