#!/usr/bin/env bash
# Converts every rendered PNG sequence in motion/out/<id>/ to a ProRes 422 HQ .mov (DaVinci Resolve on macOS
# does not import WebM). Needs Homebrew ffmpeg.  Usage, from marketing/video-marketing:  bash mac/to-prores.sh
set -euo pipefail
cd "$(dirname "$0")/../motion/out"
for dir in */; do
  id="${dir%/}"
  [ -f "$id/0001.png" ] || continue
  echo "-> $id.mov"
  ffmpeg -y -loglevel error -framerate 30 -i "$id/%04d.png" \
    -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -vendor apl0 "$id.mov"
done
ls -la *.mov
