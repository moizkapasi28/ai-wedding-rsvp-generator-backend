#!/bin/sh

# Start Redis in the background
redis-server --daemonize yes

# Start the worker in the background and capture PID
node dist/workers/guest.worker.js &
WORKER_PID=$!

# Start the main server in the background and capture PID
node dist/index.js &
SERVER_PID=$!

# Trap termination signals to shut down both processes gracefully
trap "kill $WORKER_PID $SERVER_PID" TERM INT

# Wait for either process to exit (wait -n returns the exit code of the first to finish)
wait -n $WORKER_PID $SERVER_PID
EXIT_CODE=$?

# Exit with that code so Cloudflare/Docker knows the container crashed if it did
exit $EXIT_CODE