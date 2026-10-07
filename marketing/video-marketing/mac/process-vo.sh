#!/usr/bin/env bash
# Cleans and normalises narration WAVs: high-pass 80 Hz, gentle 3:1 compression, loudness -16 LUFS, true peak -1 dB.
# Usage, from marketing/video-marketing:  bash mac/process-vo.sh audio/raw/*.wav   -> writes audio/<name>.wav
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p audio
for f in "$@"; do
  out="audio/$(basename "${f%.*}").wav"
  echo "-> $out"
  ffmpeg -y -loglevel error -i "$f" \
    -af "highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=10:release=120:makeup=2,loudnorm=I=-16:TP=-1:LRA=9" \
    -ar 48000 -ac 1 -c:a pcm_s24le "$out"
done
