#!/usr/bin/env bash
set -euo pipefail

# IELTS — Loop Orchestrator (TUI edition)
# Animation lives in anim.sh — edit it independently.
#
# Usage:
#   ./loop.sh plan    — Run one planning iteration
#   ./loop.sh build   — Run continuous build loop
#   ./loop.sh once    — Run one build iteration then stop

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-build}"
USE_MOCK=false
[[ "${2:-}" == "--mock" || "${LOOP_MOCK:-}" == "1" ]] && USE_MOCK=true
ITERATION=0
MAX_FAILURES=3
CONSECUTIVE_FAILURES=0

# ────────────────────────────────────────────
# Command config — the ONE thing you swap to go live
# ────────────────────────────────────────────
if $USE_MOCK; then
  COMMAND_BUILD="bash $SCRIPT_DIR/loop-sandbox/mock.sh build"
  COMMAND_PLAN="bash $SCRIPT_DIR/loop-sandbox/mock.sh plan"
else
  COMMAND_BUILD="cat PROMPT_build.md | claude -p --dangerously-skip-permissions"
  COMMAND_PLAN="cat PROMPT_plan.md | claude -p --dangerously-skip-permissions"
fi

# ────────────────────────────────────────────
# TUI
# ────────────────────────────────────────────

COLS=$(tput cols 2>/dev/null || echo 80)
BOLD=$(tput bold 2>/dev/null || true)
DIM=$(tput dim 2>/dev/null || true)
RESET=$(tput sgr0 2>/dev/null || true)
GREEN=$(tput setaf 2 2>/dev/null || true)
RED=$(tput setaf 1 2>/dev/null || true)
CYAN=$(tput setaf 6 2>/dev/null || true)
YELLOW=$(tput setaf 3 2>/dev/null || true)

ANIM_PID=""

cleanup() {
  anim_stop
  tput cnorm 2>/dev/null || true
  echo "${RESET}"
}
trap cleanup EXIT

log() {
  echo "${DIM}[$(date '+%H:%M:%S')]${RESET} $*"
}

separator() {
  printf '%*s\n' "$COLS" '' | tr ' ' '─'
}

banner() {
  local label="$1"
  echo ""
  echo "${BOLD}${CYAN}  $label${RESET}"
  separator
}

anim_start() {
  local label="$1"
  ANIM_LABEL="$label" bash "$SCRIPT_DIR/anim.sh" &
  ANIM_PID=$!
}

anim_stop() {
  if [ -n "$ANIM_PID" ] && kill -0 "$ANIM_PID" 2>/dev/null; then
    kill "$ANIM_PID" 2>/dev/null
    sleep 0.1
    kill -9 "$ANIM_PID" 2>/dev/null || true
    wait "$ANIM_PID" 2>/dev/null || true
  fi
  ANIM_PID=""
  printf '\033[?2026l\033[?25h\033[0m'
  printf "\r%*s\r" "$COLS" ""
}

# Run a command with animation
run_command() {
  local cmd="$1"
  local label="$2"
  local start_ts=$(date +%s)

  anim_start "$label"

  local output exit_code=0
  output=$(eval "$cmd" 2>&1) || exit_code=$?

  anim_stop

  local end_ts=$(date +%s)
  local elapsed=$(( end_ts - start_ts ))

  if [ $exit_code -eq 0 ]; then
    echo "  ${GREEN}✓${RESET} ${label} ${DIM}(${elapsed}s)${RESET}"
  else
    echo "  ${RED}✗${RESET} ${label} ${DIM}(${elapsed}s)${RESET}"
  fi

  if [ -n "$output" ]; then
    echo "$output" | tail -5 | while IFS= read -r line; do
      echo "    ${DIM}$line${RESET}"
    done
  fi

  return $exit_code
}

# ────────────────────────────────────────────
# Orchestration
# ────────────────────────────────────────────

run_plan() {
  banner "Plan"
  run_command "$COMMAND_PLAN" "Planning iteration"
  log "Planning complete."
}

run_build() {
  ITERATION=$((ITERATION + 1))
  banner "Build #$ITERATION"

  if run_command "$COMMAND_BUILD" "Build iteration #$ITERATION"; then
    CONSECUTIVE_FAILURES=0
  else
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    log "${YELLOW}Failed${RESET} (${CONSECUTIVE_FAILURES}/${MAX_FAILURES} consecutive)"

    if [ "$CONSECUTIVE_FAILURES" -ge "$MAX_FAILURES" ]; then
      log "${RED}${BOLD}Stopped — $MAX_FAILURES consecutive failures.${RESET}"
      exit 1
    fi
  fi
}

case "$MODE" in
  plan)
    run_plan
    ;;
  once)
    run_build
    ;;
  build)
    banner "Continuous Build Loop"
    log "Ctrl+C to stop."
    echo ""
    while :; do
      run_build
      echo ""
      log "${DIM}Next iteration in 5s...${RESET}"
      sleep 5
    done
    ;;
  *)
    echo "Usage: ./loop.sh [plan|build|once]"
    exit 1
    ;;
esac
