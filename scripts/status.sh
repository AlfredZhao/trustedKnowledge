#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

show_service() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local pid
  pid="$(pid_from_file "$pid_file")"

  if is_pid_running "$pid"; then
    echo "$name: running pid=$pid port=$port"
  elif port_is_listening "$port"; then
    echo "$name: port $port is listening, but no managed pid file was found"
  else
    echo "$name: stopped port=$port"
  fi
}

show_service "Frontend" "$RUN_DIR/frontend.pid" "$FRONTEND_PORT"
show_service "Backend " "$RUN_DIR/backend.pid" "$BACKEND_PORT"

echo
echo "URLs:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend:  http://localhost:$BACKEND_PORT/health"
echo
echo "Logs:"
echo "  $LOG_DIR/frontend.log"
echo "  $LOG_DIR/backend.log"

