#!/bin/sh
set -eu

# Si .env.prod trae localhost (típico al copiar desde el host), reescribe a la red Docker.
if [ -n "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -e 's/@localhost:/@postgres:/g' -e 's/@127\.0\.0\.1:/@postgres:/g')"
  export DATABASE_URL
fi

export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export NODE_ENV="${NODE_ENV:-production}"

exec node dist/main
