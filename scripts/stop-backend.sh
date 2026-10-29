#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

stop_pid_file "Backend" "$RUN_DIR/backend.pid"
stop_matching_processes "Backend" "uvicorn app.main:app --host 127.0.0.1 --port $BACKEND_PORT"
