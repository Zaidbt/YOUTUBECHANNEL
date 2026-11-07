# How It Works with Zay — video workspace

Short-form explainer videos (YouTube Shorts, TikTok, Instagram Reels), 9:16, 1080x1920.

## Hard rules for every video
- **Seamless loop.** The last frame must be identical to the first frame, and the music's last bar must flow
  into its first bar (no fade-out, no ending hit, no fade to black). Shorts/Reels loop forever, so the end is
  the beginning. Concretely:
  - camera: first and last camera keys are the same pose, with a short hold on both sides so velocity is ~0 at the seam;
  - captions: the opening hook is fully visible on frame 0 and settled again on the last frame;
  - any clock-like motion (second hands, counters) must land back where it started;
  - music: `Song(..., loop=True)` (exact length, tails wrap to the start), and an even tick/tock count;
  - verify: compare the first and last frames and the audio level at both ends after rendering.
- **Music-driven, no voiceover.** On-screen actions are timed to the beat from one shared timeline (a Python
  `build.py` writes the timeline JSON and the music from the same data).
- **Facts on screen must be correct.** Double-check numbers before rendering.

## Current style: cinematic pixel-3D ("majestic")
60 fps · 3D rendered at 360x640 and upscaled 3x with hard pixels · soft glows in a separate full-res layer ·
continuous Catmull-Rom camera · small / BIG / small pixel captions that fade · warm pads, sub, bells, hall reverb.
Reference implementation: `remotion/src/videos/watch/WatchMajesticFull.tsx` + `videos/03-watch-majestic/build.py`.

## Commands
- Setup: `./setup.sh`
- Render 3D videos with `--gl=swangle`, e.g. `npm run video:watch-majestic`
- Typecheck: `npx tsc --noEmit -p .`
