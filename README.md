# AI Video Studio

Workspace for AI-made videos for YouTube, TikTok, Instagram Reels and Shorts.

## Setup
```bash
./setup.sh
```
This installs ffmpeg, yt-dlp, faster-whisper, Remotion and HyperFrames.

## Toolchain
| Tool | Used for | Quick start |
|---|---|---|
| **Remotion** | Videos written as React code (`remotion/src`) | `npm run studio` (preview) · `npx remotion render HelloShort out/short.mp4` |
| **HyperFrames** | Videos written as HTML + GSAP (`hyperframes-starter/`) | `npm run hf:preview` · `npm run hf:render` |
| **ffmpeg** | Cutting, joining, resizing, audio | `ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih" out.mp4` (16:9 → 9:16) |
| **faster-whisper** | Speech → captions (SRT + word timings) | `python3 scripts/transcribe.py video.mp4 --model small` |
| **Chatterbox** (voice) | Free, expressive voiceover + voice cloning (MIT license) | `.venv-tts/bin/python scripts/voice.py "text" --ref assets/voices/deep_storyteller.mp3 -o out/vo.wav` |
| **Kokoro** (voice) | Fast, free draft voiceover | `npx hyperframes tts "text" -v am_michael -o out/draft.wav` |
| **yt-dlp** | Fetching reference media, metadata and subtitles | `yt-dlp <url>` |

Remotion compositions: `HelloShort` (1080×1920, vertical) and `HelloWide` (1920×1080, YouTube).

## Layout
```
assets/      source audio, video, images
remotion/    Remotion (React) compositions
hyperframes-starter/  HyperFrames (HTML) composition
scripts/     helpers (transcription, etc.)
out/         renders (git-ignored)
```

> Note: in cloud sessions, YouTube blocks video downloads from datacenter IPs (HTTP 403).
> Metadata and subtitles still work. For full downloads, run yt-dlp locally or pass `--cookies-from-browser`.
