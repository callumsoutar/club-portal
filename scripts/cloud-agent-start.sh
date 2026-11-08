#!/usr/bin/env bash
# Boot a local Supabase stack, then the Next.js dev server.
# Hosted credentials already in the environment are left untouched.
# On a checkout that has not picked up supabase/config.toml yet, create a
# local config and skip the hosted-only rls_auto_enable revoke.
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1

migration="supabase/migrations/20261016180000_admin_only_reads_and_signup_names.sql"
if [[ -f "$migration" ]] && grep -q 'revoke all on function public.rls_auto_enable()' "$migration" && ! grep -q "to_regprocedure('public.rls_auto_enable()')" "$migration"; then
  python3 - "$migration" << 'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
old = "revoke all on function public.rls_auto_enable() from public, anon, authenticated;"
new = """do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;"""
text = path.read_text()
if old not in text:
    raise SystemExit(f"expected revoke statement missing from {path}")
path.write_text(text.replace(old, new, 1))
PY
fi

if [[ ! -f supabase/config.toml ]]; then
  supabase init --yes
  python3 - << 'PY'
import re
from pathlib import Path
path = Path("supabase/config.toml")
text = path.read_text()
text = re.sub(r'^project_id = ".*"$', 'project_id = "safetyhub"', text, count=1, flags=re.M)
text = text.replace('sql_paths = ["./seed.sql"]', 'sql_paths = ["./seed/safety_messages.sql"]', 1)
text = text.replace("[storage.vector]\nenabled = true", "[storage.vector]\nenabled = false", 1)
text = text.replace('site_url = "http://127.0.0.1:3000"', 'site_url = "http://localhost:3000"', 1)
text = text.replace(
    'additional_redirect_urls = ["https://127.0.0.1:3000"]',
    'additional_redirect_urls = ["http://localhost:3000"]',
    1,
)
path.write_text(text)
PY
fi

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" && -f supabase/config.toml ]]; then
  start_args=(--runtime native --eager --exclude studio,mail,analytics,pooler,realtime,functions)
  if [[ -f supabase/supabase.lock ]]; then
    start_args+=(--frozen)
  fi
  supabase start "${start_args[@]}"

  status_env="$(mktemp)"
  supabase status --env --output-format text \
    --override-name API_URL=NEXT_PUBLIC_SUPABASE_URL,PUBLISHABLE_KEY=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SECRET_KEY=SUPABASE_SECRET_KEY \
    > "$status_env"
  grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' "$status_env" > .env.local
  rm -f "$status_env"
  printf 'NEXT_PUBLIC_APP_URL=http://localhost:3000\n' >> .env.local
fi

exec pnpm dev --hostname 0.0.0.0 --port 3000
