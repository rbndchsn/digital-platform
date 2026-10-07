#!/usr/bin/env bash
# One-time set-up of a MacBook for the VERIFASSUR_X video kit.
# Run from anywhere:  bash marketing/video-marketing/mac/setup-mac.sh
set -euo pipefail

if ! command -v brew >/dev/null; then
  echo "Homebrew is missing. Install it first: https://brew.sh (one command, then re-run this script)."
  exit 1
fi

echo "== Command-line tools"
brew install node@22 ffmpeg pipx git gh 2>/dev/null || true
brew link --overwrite node@22 2>/dev/null || true

echo "== Desktop apps (skipped if already installed)"
brew install --cask google-chrome obs 2>/dev/null || true
# DaVinci Resolve is not on Homebrew; download it from blackmagicdesign.com/products/davinciresolve (free).
# Optional, recommended for dynamic cursor zooms: Screen Studio (screen.studio, paid) or Tella (tella.tv).

echo "== Whisper (captions, runs locally)"
pipx ensurepath >/dev/null 2>&1 || true
pipx install openai-whisper 2>/dev/null || true

echo "== Node and Playwright for the renderers"
here="$(cd "$(dirname "$0")/../../.." && pwd)"   # repo root
( cd "$here/demo" && npm install && npx playwright install chromium ffmpeg )

echo
echo "Done. Versions:"
node -v; ffmpeg -version | head -1; which whisper || echo "whisper: open a new terminal so pipx is on PATH"
