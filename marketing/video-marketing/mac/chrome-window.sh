#!/usr/bin/env bash
# Opens the live demo in a Chrome guest window of exactly 1440 x 900 at the top-left of the screen.
# Usage:  bash mac/chrome-window.sh            (from marketing/video-marketing)
set -euo pipefail
URL="${1:-https://rbndchsn.github.io/digital-platform/}"
open -na "Google Chrome" --args --guest --new-window "$URL" --window-size=1440,900 --window-position=40,60
sleep 2
osascript -e 'tell application "Google Chrome" to set bounds of front window to {40, 60, 1480, 960}'
echo "Chrome guest window set to 1440 x 900. Now: Cmd+. -> Reset demo -> type reset. Hide the bookmarks bar with Cmd+Shift+B."
