#!/usr/bin/env bash
# One-shot setup for the AI video toolchain. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg; }
pip install --break-system-packages -q -r requirements.txt
npm install --no-audit --no-fund
# Chatterbox TTS lives in its own venv (it pins torch/transformers versions).
if [ ! -x .venv-tts/bin/python ]; then
  python3 -m venv .venv-tts
  .venv-tts/bin/pip install -q torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
  .venv-tts/bin/pip install -q chatterbox-tts
fi
# yt-dlp needs a JS runtime to solve YouTube challenges; use Node.
mkdir -p ~/.config/yt-dlp && echo "--js-runtimes node" > ~/.config/yt-dlp/config
echo "ffmpeg: $(ffmpeg -version | head -1 | cut -d' ' -f3)  yt-dlp: $(yt-dlp --version)"
