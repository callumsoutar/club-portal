#!/usr/bin/env bash
# Boot a local Supabase stack, then the Next.js dev server.
# Hosted credentials already in the environment are left untouched.
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" && -f supabase/config.toml ]]; then
  supabase start --runtime native --eager --frozen \
    --exclude studio,mail,analytics,pooler,realtime,functions

  status_env="$(mktemp)"
  supabase status --env --output-format text \
    --override-name API_URL=NEXT_PUBLIC_SUPABASE_URL,PUBLISHABLE_KEY=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SECRET_KEY=SUPABASE_SECRET_KEY \
    > "$status_env"
  grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY)=' "$status_env" > .env.local
  rm -f "$status_env"
  printf 'NEXT_PUBLIC_APP_URL=http://localhost:3000\n' >> .env.local
fi

exec pnpm dev --hostname 0.0.0.0 --port 3000
