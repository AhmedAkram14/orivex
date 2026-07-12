#!/bin/sh
# Production startup script (Sprint 13). Runs migrations safely before the
# application ever starts accepting traffic, then execs the real process as
# PID 1's child (via dumb-init, see Dockerfile) so SIGTERM reaches Node
# directly for a graceful shutdown (app.enableShutdownHooks() in main.ts).
set -e

echo "[docker-entrypoint] running database migrations (prisma migrate deploy)..."
node_modules/.bin/prisma migrate deploy
echo "[docker-entrypoint] migrations applied. starting application..."

exec "$@"
