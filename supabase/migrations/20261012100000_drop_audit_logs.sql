-- The admin audit log page and its writers have been removed.
-- Activity on an authorisation still lives in activity_log.

drop policy if exists "audit_logs: admin read" on public.audit_logs;
drop table if exists public.audit_logs;
