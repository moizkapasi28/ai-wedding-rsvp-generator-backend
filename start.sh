#!/bin/bash

# Start Redis in the background with explicit paths to avoid permission issues for non-root user
redis-server --daemonize yes --dir /var/lib/redis --pidfile /run/redis/redis.pid --logfile /var/log/redis/redis.log

# Start the worker in the background and capture PID
node dist/src/workers/guest.worker.js &
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