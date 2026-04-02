#!/usr/bin/env bash
# Ralph build monitor — runs the morphing orb animation while ralph builds
# Watches a tmux pane for ralph completion, updates label dynamically
# Usage: ./ralph-monitor.sh [tmux-pane-id]
set -euo pipefail

PANE="${1:-%75}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

get_status() {
  local cap
  cap=$(tmux capture-pane -t "$PANE" -p 2>/dev/null || echo "")
  if echo "$cap" | grep -q "Ralph completed"; then
    echo "complete"
  elif echo "$cap" | grep -q "reached max"; then
    echo "maxed"
  else
    echo "running"
  fi
}

get_label() {
  local cap current total done_count
  cap=$(tmux capture-pane -t "$PANE" -p 2>/dev/null || echo "")
  current=$(echo "$cap" | grep -oE 'Ralph Iteration ([0-9]+)' | tail -1 | grep -oE '[0-9]+' || echo "?")
  total=$(echo "$cap" | grep -oE 'of ([0-9]+)' | tail -1 | grep -oE '[0-9]+' || echo "15")
  echo "Ralph ${current}/${total}"
}

ANIM_PID=""

stop_anim() {
  if [[ -n "$ANIM_PID" ]] && kill -0 "$ANIM_PID" 2>/dev/null; then
    kill "$ANIM_PID" 2>/dev/null
    sleep 0.1
    kill -9 "$ANIM_PID" 2>/dev/null || true
    wait "$ANIM_PID" 2>/dev/null || true
  fi
  ANIM_PID=""
  printf '\033[?2026l\033[?25h\033[0m'
}

trap 'stop_anim' EXIT INT TERM

# Main loop: run animation in 30s bursts, re-check status between
while true; do
  STATUS=$(get_status)

  if [[ "$STATUS" == "complete" ]]; then
    stop_anim
    clear
    ANIM_LABEL="✓ All stories done!" ANIM_PALETTE="green" bash "$SCRIPT_DIR/anim.sh" &
    ANIM_PID=$!
    wait "$ANIM_PID" 2>/dev/null || true
    break
  elif [[ "$STATUS" == "maxed" ]]; then
    stop_anim
    printf "\n\033[31;1m  ✗ Ralph hit max iterations\033[0m\n"
    break
  fi

  # Running — start animation with current label
  LABEL=$(get_label)
  stop_anim
  ANIM_LABEL="$LABEL" bash "$SCRIPT_DIR/anim.sh" &
  ANIM_PID=$!

  # Let it run for 30s, then refresh the label
  sleep 30

  # Check if ralph finished during the animation
  STATUS=$(get_status)
  if [[ "$STATUS" != "running" ]]; then
    stop_anim
    continue  # Loop back to handle complete/maxed
  fi
done
