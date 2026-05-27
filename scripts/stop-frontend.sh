#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

stop_pid_file "Frontend" "$RUN_DIR/frontend.pid"
stop_matching_processes "Frontend" "$PROJECT_ROOT/frontend/node_modules/.bin/vite --host 0.0.0.0"
