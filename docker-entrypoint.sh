#!/usr/bin/env bash
set -e
cd /app

# DATABASE_URL from the environment wins. Otherwise fall back to .env.prod, the
# per-competitor configuration; Next.js and prisma.config.ts both read .env.
if [ -z "${DATABASE_URL:-}" ]; then
  unset DATABASE_URL
  if [ -f .env.prod ]; then
    echo "DATABASE_URL not set in the environment — using .env.prod"
    cp .env.prod .env
  else
    echo "FATAL: no DATABASE_URL in the environment and no .env.prod present" >&2
    exit 1
  fi
fi

# Create-only migrations.
#
# NEVER run `prisma db push` or `prisma migrate dev` here. Every project a
# competitor creates shares ONE MySQL database, and both of those commands diff
# the whole database against schema.prisma and DROP every table they do not know
# about — which means another project's data. `migrate deploy` only runs the SQL
# committed under prisma/migrations and never computes a destructive diff.
#
# P3005 means the database already holds another project's tables but has no
# Prisma migration history yet. Baseline it: apply each migration's SQL directly
# (they are written CREATE TABLE IF NOT EXISTS) and record it as applied, so
# subsequent boots are an ordinary no-op.
if out=$(npx prisma migrate deploy 2>&1); then
  echo "$out"
else
  echo "$out"
  if grep -q 'P3005' <<<"$out"; then
    echo "Existing non-empty database detected — baselining Prisma migration history"
    for dir in prisma/migrations/*/; do
      [ -f "$dir/migration.sql" ] || continue
      name=$(basename "$dir")
      npx prisma db execute --file "$dir/migration.sql" || true
      npx prisma migrate resolve --applied "$name" || true
    done
  else
    echo "WARNING: migrations did not apply — starting anyway; the page will report the database as unreachable" >&2
  fi
fi

exec npm run dev
