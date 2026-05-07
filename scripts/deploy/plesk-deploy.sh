#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-$(pwd)}"
BRANCH="${2:-master}"
REMOTE="${3:-origin}"

cd "$ROOT_DIR"

if [[ ! -f "artisan" ]]; then
  echo "artisan not found in $ROOT_DIR"
  echo "Run this script from your Laravel project root (httpdocs)."
  exit 1
fi

echo "==> Running deploy in: $(pwd)"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  echo "==> Pulling latest code ($REMOTE/$BRANCH)"
  git pull --ff-only "$REMOTE" "$BRANCH"
else
  echo "==> SKIP_GIT_PULL=1, skipping git sync"
fi

if [[ ! -f ".env" ]]; then
  echo "==> .env missing, copying from .env.example"
  cp .env.example .env
fi

echo "==> Installing PHP dependencies"
if command -v composer >/dev/null 2>&1; then
  composer install --no-dev --optimize-autoloader --no-interaction
elif [[ -f "composer.phar" ]]; then
  php composer.phar install --no-dev --optimize-autoloader --no-interaction
else
  echo "Composer not found and composer.phar missing."
  exit 1
fi

if ! grep -Eq '^APP_KEY=base64:' .env; then
  echo "==> Generating APP_KEY"
  php artisan key:generate --force
fi

echo "==> Running migrations"
php artisan migrate --force

echo "==> Clearing and rebuilding caches"
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

if command -v npm >/dev/null 2>&1; then
  echo "==> Building frontend assets"
  npm ci
  npm run build
else
  echo "==> npm not found, skipping frontend build."
fi

echo "==> Fixing writable permissions"
chmod -R 775 storage bootstrap/cache || true

echo ""
echo "Deploy complete."
