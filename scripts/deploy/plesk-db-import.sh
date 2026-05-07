#!/usr/bin/env bash
set -euo pipefail

DUMP_FILE="${1:-}"
ENV_FILE="${2:-.env}"

if [[ -z "$DUMP_FILE" ]]; then
  echo "Usage: ./scripts/deploy/plesk-db-import.sh /path/to/dump.sql [env-file]"
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "SQL dump file not found: $DUMP_FILE"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

read_env() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | head -n1 | cut -d'=' -f2- || true)"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  echo "$value"
}

DB_HOST="$(read_env DB_HOST)"
DB_PORT="$(read_env DB_PORT)"
DB_NAME="$(read_env DB_DATABASE)"
DB_USER="$(read_env DB_USERNAME)"
DB_PASS="$(read_env DB_PASSWORD)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

if [[ -z "$DB_NAME" || -z "$DB_USER" ]]; then
  echo "DB_DATABASE/DB_USERNAME are required in $ENV_FILE"
  exit 1
fi

echo "==> Importing $DUMP_FILE into $DB_NAME"
if [[ -n "$DB_PASS" ]]; then
  MYSQL_PWD="$DB_PASS" mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME" < "$DUMP_FILE"
else
  mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME" < "$DUMP_FILE"
fi

echo "==> Database import complete"
