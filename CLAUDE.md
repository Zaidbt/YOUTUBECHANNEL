# How It Works with Zay — video workspace

Short-form explainer videos (YouTube Shorts, TikTok, Instagram Reels), 9:16, 1080x1920.

## Hard rules for every video
- **Seamless loop.** The last frame must be identical to the first frame, and the music's last bar must flow
  into its first bar (no fade-out, no ending hit, no fade to black). Shorts/Reels loop forever, so the end is
  the beginning. Concretely:
  - camera: first and last camera keys are the same pose, with a short hold on both sides so velocity is ~0 at the seam;
  - captions: the opening hook is fully visible on frame 0 and settled again on the last frame;
  - any clock-like motion (second hands, counters) must land back where it started;
  - every idle/ambient motion (crawling, wing flaps, dust, sways) must be periodic with the video length:
    use angular speeds that are whole multiples of 2π/duration, never arbitrary values like `t * 0.3`;
  - music: `Song(..., loop=True)` (exact length, tails wrap to the start), and an even tick/tock count;
  - verify: compare the first and last frames and the audio level at both ends after rendering.
- **Music-driven, no voiceover.** On-screen actions are timed to the beat from one shared timeline (a Python
  `build.py` writes the timeline JSON and the music from the same data).
- **Facts on screen must be correct.** Double-check numbers before rendering.
- **Text must be readable** (feedback history: overlay captions at the top were too fast; text drawn with in-scene
  pixels / voxel letters was NOT readable after the pixel pipeline). Use crisp HTML labels (Press Start 2P, ~44/58 px)
  in a solid dark panel with a coloured 8-px border, anchored next to the thing being explained by projecting its 3D
  position — use `Labels` / `LabelDef` from `remotion/src/brand/Labels.tsx` (anchors can be functions of t; `hold: true` for the loop hook). Never render text through
  `PixelArtCanvas`. 1–3 short lines, one label per ~2 bars (≥ 2.5 s), colour-code words to match what's on screen.
- **Every video gets a different hyped rhythm/genre** (done so far: 120 BPM chiptune, 150 BPM four-on-the-floor
  hyper, 170 BPM drum & bass, 140 BPM jersey club / trap with 808s). Pick a BPM where `48 s × BPM / 240` is a whole number of bars.
- **The animation plays the music**: map visual events to instruments/notes (parts = drums, colours/letters = notes)
  from the shared timeline, so what you see is what you hear.

## Current style: TRUE pixel-art 3D (use this)
3D scene rendered at 270x480 through `remotion/src/brand/PixelPipeline.tsx` (`PixelArtCanvas`): 1-px depth outlines,
4x4 Bayer dithering, every pixel snapped to a fixed palette (glows too), toon (MeshToonMaterial) shading, pixel
textures (DataTexture, NearestFilter), upscaled 4x. Text: anchored `Labels` panels (see the text rule above).
Brand on screen: @HOWTOWITHZAY. References: `remotion/src/videos/dna/DnaVideo.tsx` (labels + hyper music), `remotion/src/videos/bees/BeesPixelVideo.tsx`.
Instagram copy lives in `social/instagram.md`.

## Previous style: cinematic pixel-3D ("majestic")
60 fps · 3D rendered at 360x640 and upscaled 3x with hard pixels · soft glows in a separate full-res layer ·
continuous Catmull-Rom camera · small / BIG / small pixel captions that fade · warm pads, sub, bells, hall reverb.
Reference implementation: `remotion/src/videos/watch/WatchMajesticFull.tsx` + `videos/03-watch-majestic/build.py`.

## Commands
- Setup: `./setup.sh`
- Render 3D videos with `--gl=swangle`, e.g. `npm run video:watch-majestic`
- Typecheck: `npx tsc --noEmit -p .`
