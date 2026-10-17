#!/bin/bash

# Apply pending migrations first. A failing one stops the container here, before the API or
# the worker run against a schema they don't expect.
if ! npx prisma migrate deploy; then
  echo "prisma migrate deploy failed; not starting" >&2
  exit 1
fi

# Queues, rate limits and live RSVPs live in Redis. Point REDIS_HOST at a separate Redis so they
# survive redeploys; only without one does the container run its own. That one keeps an
# append-only file in /var/lib/redis, which survives only if a volume is mounted there.
case "${REDIS_HOST:-127.0.0.1}" in
  127.0.0.1 | localhost)
    redis-server --daemonize yes --appendonly yes --dir /var/lib/redis \
      --pidfile /run/redis/redis.pid --logfile /var/log/redis/redis.log
    ;;
  *)
    echo "Using Redis at $REDIS_HOST"
    ;;
esac

# Start all background workers (guest import + AI invite card) in one process and capture PID
node dist/src/workers/index.js &
WORKER_PID=$!

# Start the main server in the background and capture PID
node dist/src/index.js &
SERVER_PID=$!

# Trap termination signals to shut down both processes gracefully
trap "kill $WORKER_PID $SERVER_PID" TERM INT

# Wait for either process to exit (wait -n returns the exit code of the first to finish)
wait -n $WORKER_PID $SERVER_PID
EXIT_CODE=$?

# Exit with that code so Cloudflare/Docker knows the container crashed if it did
exit $EXIT_CODE
