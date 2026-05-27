#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

PID_FILE="$RUN_DIR/frontend.pid"
LOG_FILE="$LOG_DIR/frontend.log"

existing_pid="$(pid_from_file "$PID_FILE")"
if is_pid_running "$existing_pid"; then
  echo "Frontend is already running on pid $existing_pid."
  exit 0
fi

if port_is_listening "$FRONTEND_PORT"; then
  echo "Port $FRONTEND_PORT is already listening. Stop the existing frontend first or inspect it with scripts/status.sh."
  exit 1
fi

echo "Starting frontend on 0.0.0.0:$FRONTEND_PORT..."
(
  cd "$PROJECT_ROOT/frontend"
  nohup setsid "$CONDA_BIN/npm" run dev > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
)

sleep 1
pid="$(pid_from_file "$PID_FILE")"
if is_pid_running "$pid"; then
  echo "Frontend started: pid $pid"
  echo "Log: $LOG_FILE"
else
  echo "Frontend failed to start. Log:"
  tail -n 80 "$LOG_FILE" || true
  exit 1
fi
