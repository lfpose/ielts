#!/bin/bash
# SSH into this repo's GitHub Codespace
# Usage: ./ssh.sh

CODESPACE=$(gh codespace list --repo lfpose/ielts --json name -q '.[0].name' 2>/dev/null)

if [ -z "$CODESPACE" ]; then
  echo "No codespace found for lfpose/ielts. Creating one..."
  CODESPACE=$(gh codespace create --repo lfpose/ielts --machine basicLinux32gb)
fi

STATUS=$(gh codespace list --json name,state -q ".[] | select(.name==\"$CODESPACE\") | .state")
if [ "$STATUS" = "Shutdown" ]; then
  echo "Starting codespace..."
fi

echo "Connecting to $CODESPACE..."
gh codespace ssh --codespace "$CODESPACE"
