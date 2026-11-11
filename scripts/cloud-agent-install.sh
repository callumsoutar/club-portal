#!/usr/bin/env bash
# Idempotent Cloud Agent install: Supabase CLI, pnpm dependencies, native stack artifacts.
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1

SUPABASE_VERSION="3.0.0"

if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version 2>/dev/null || true)" != "$SUPABASE_VERSION" ]]; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/supabase.tar.gz" \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_linux_amd64.tar.gz"
  tar -xzf "$tmp/supabase.tar.gz" -C "$tmp"
  sudo install -m 755 "$tmp/supabase" /usr/local/bin/supabase
  rm -rf "$tmp"
fi

corepack enable
corepack prepare pnpm@12.3.4 --activate
pnpm install --frozen-lockfile

if [[ -f supabase/config.toml ]]; then
  supabase stack install --runtime native --frozen
fi
