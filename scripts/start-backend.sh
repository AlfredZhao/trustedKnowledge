#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

PID_FILE="$RUN_DIR/backend.pid"
LOG_FILE="$LOG_DIR/backend.log"

existing_pid="$(pid_from_file "$PID_FILE")"
if is_pid_running "$existing_pid"; then
  echo "Backend is already running on pid $existing_pid."
  exit 0
fi

if port_is_listening "$BACKEND_PORT"; then
  echo "Port $BACKEND_PORT is already listening. Stop the existing backend first or inspect it with scripts/status.sh."
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/backend/.env" ]]; then
  echo "Missing backend/.env. Copy backend/.env.example and fill the Oracle password first."
  exit 1
fi

echo "Starting backend on 0.0.0.0:$BACKEND_PORT..."
(
  cd "$PROJECT_ROOT/backend"
  nohup setsid "$CONDA_BIN/uvicorn" app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" \
    > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
)

sleep 1
pid="$(pid_from_file "$PID_FILE")"
if is_pid_running "$pid"; then
  echo "Backend started: pid $pid"
  echo "Log: $LOG_FILE"
else
  echo "Backend failed to start. Log:"
  tail -n 80 "$LOG_FILE" || true
  exit 1
fi
