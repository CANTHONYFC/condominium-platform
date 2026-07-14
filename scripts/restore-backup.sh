#!/usr/bin/env bash
# Restaura el dump custom (pg_dump -Fc) usando credenciales de backend/.env.prod
# Requiere imagen postgres:17 porque el dump es formato 1.16 (pg_dump 17).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env.prod}"
DUMP_FILE="${1:-$ROOT_DIR/docs/dump-condominium_platform-202607132330.sql}"
cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No se encontró $ENV_FILE"
  echo "Copia backend/.env.prod.example → backend/.env.prod y ajusta secretos."
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "No se encontró el dump: $DUMP_FILE"
  echo "Uso: ./scripts/restore-backup.sh [ruta-al-dump]"
  exit 1
fi

# Carga variables de .env.prod
set -a
# shellcheck disable=SC1090
source <(grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
set +a

DB_HOST="${DB_HOST:-condominium-postgres}"
DB_USER="${POSTGRES_USER:-condominium}"
DB_NAME="${POSTGRES_DB:-condominium_platform}"
DB_PASSWORD="${POSTGRES_PASSWORD:-condominium_secret}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose --profile prod)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose --profile prod)
else
  echo "No se encontró docker compose"
  exit 1
fi

echo "==> Usando env: $ENV_FILE"
echo "==> Levantando Postgres/Redis (profile prod)..."
"${COMPOSE[@]}" up -d postgres redis

echo "==> Esperando healthy de Postgres..."
for _ in $(seq 1 30); do
  status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' condominium-postgres 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

NETWORK="$("${COMPOSE[@]}" ps -q postgres | xargs -I{} docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' {})"

echo "==> Restaurando $DUMP_FILE (user=$DB_USER db=$DB_NAME red=$NETWORK)..."
docker run --rm \
  --network "$NETWORK" \
  -e PGPASSWORD="$DB_PASSWORD" \
  -v "$DUMP_FILE:/tmp/dump.pgdump:ro" \
  postgres:17-alpine \
  pg_restore \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    /tmp/dump.pgdump

echo "==> Verificación rápida:"
docker exec -e PGPASSWORD="$DB_PASSWORD" condominium-postgres \
  psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT (SELECT COUNT(*) FROM tenants) AS tenants, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM condominiums) AS condominiums;"

echo "Listo."
