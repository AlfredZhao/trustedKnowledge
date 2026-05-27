#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$PROJECT_ROOT/.run"
LOG_DIR="$PROJECT_ROOT/logs"

CONDA_ENV="${CONDA_ENV:-alfred}"
FRONTEND_PORT="${FRONTEND_PORT:-8021}"
BACKEND_PORT="${BACKEND_PORT:-8022}"
CONDA_BIN="$(
  conda run -n "$CONDA_ENV" python -c 'import pathlib, sys; print(pathlib.Path(sys.executable).parent)'
)"

mkdir -p "$RUN_DIR" "$LOG_DIR"

is_pid_running() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

pid_from_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    tr -d '[:space:]' < "$file"
  fi
  return 0
}

port_is_listening() {
  local port="$1"
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$port$"
}

stop_pid_file() {
  local name="$1"
  local pid_file="$2"
  local pid
  pid="$(pid_from_file "$pid_file")"

  if is_pid_running "$pid"; then
    echo "Stopping $name (pid $pid)..."
    kill "$pid"
    for _ in {1..20}; do
      if ! is_pid_running "$pid"; then
        rm -f "$pid_file"
        echo "$name stopped."
        return 0
      fi
      sleep 0.25
    done

    echo "$name did not stop gracefully; sending SIGKILL..."
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$pid_file"
    echo "$name stopped."
    return 0
  fi

  rm -f "$pid_file"
  echo "$name is not running from pid file."
}

stop_matching_processes() {
  local name="$1"
  local pattern="$2"
  local pids

  pids="$(pgrep -u "$(id -u)" -f "$pattern" || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  echo "Stopping unmanaged $name process(es): $pids"
  # shellcheck disable=SC2086
  kill $pids
  sleep 1

  pids="$(pgrep -u "$(id -u)" -f "$pattern" || true)"
  if [[ -n "$pids" ]]; then
    echo "Unmanaged $name did not stop gracefully; sending SIGKILL..."
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
}
