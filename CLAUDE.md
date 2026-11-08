# How It Works with Zay — video workspace

Short-form explainer videos (YouTube Shorts, TikTok, Instagram Reels), 9:16, 1080x1920.

## How to report a finished video (user preference)
Keep the reply minimal: send the video file, then only the YouTube copy (title, description, tags), the Instagram
copy (caption + hashtags) and the TikTok copy (caption + hashtags). No process notes, no checks summary, nothing else.
Put every copy-paste piece (YouTube title, YouTube description, YouTube tags, Instagram caption, TikTok caption)
in its own fenced code block so the user can copy it with one click. Save the copy in `social/youtube.md`,
`social/instagram.md`, `social/tiktok.md`.

## Art direction that works best (user: "Perfection !!")
**Kurzgesagt-style drawing + animation, rendered through our pixel pipeline** — reference
`remotion/src/videos/chameleon/ChameleonK.tsx`: flat 2D vector-style shapes (spline blobs + ribbons, `meshBasicMaterial`,
no outlines: `outline={false}`, low dither 0.05), side-on near-orthographic camera (fov ~20), parallax layers (gradient sky,
stars, moon with halo rings, rounded silhouettes, framing leaves), cute rounded characters (big eye, lighter belly,
darker back, light rim), vivid indigo/teal/pink palette, bouncy animation (squash on beats, back-ease pop-ins, idle
wobbles), crisp colour wipes via clipping planes, and flat infographic insides with pop-in tags explaining step by step.

**Fidelity upgrade (air fryer v2, `videos/airfryer/AirFryerV2.tsx`)**: the user wants it "identical to Kurzgesagt, just
in pixels" — flat shapes alone are NOT enough. Use `brand/kz.tsx` (`G` gradient shader on every shape, `Halo` bloom),
render at `scale={2}` (finer pixels) with a 48-colour palette, cel-shadow shapes + gloss + rim lights, light cones,
rich multi-layer scenes with props, and Kurzgesagt scale changes (dive into a single object).
Air fryer final: the user rejected both gradient versions and asked for the exact chameleon-K flat style again
(`AirFryerK.tsx`, "pas mal") with the v2 stereo music. Default to the ChameleonK flat look. Music: `scripts/stereo.py`
stereo productions (layered drums, swing, bass, keys, pads, a hook), clean.

## Format that works (user-approved, chameleon 30 s — follow this)
- **30 s** (not 48), seamless loop. Reference: `remotion/src/videos/chameleon/Chameleon30.tsx` + `videos/12-chameleon/build_30.py`.
- **Frame 0 = the subject, whole and instantly recognisable** (clear hero shot), already doing the "wow" thing on the
  beat, with a simple question hook ("HOW DOES A CHAMELEON CHANGE COLOR? 🤯"). Never open on an extreme close-up/zoom,
  never split-screen or two scenes at once (user: confusing / awkward).
- **One scene at a time, one smooth continuous camera, no hard cuts.** Go inside the mechanism with a smooth "dive"
  (glide in, screen fills with the surface colour, open on the inside), and come back out the same way.
- **Labels always at the same spot at the top** (`screen` position in `LabelDef`), one idea at a time, ≤ 3 short lines.
- Make every inside/mechanism scene beautiful too (glows, sparkles, real biological/mechanical detail).
- Show 10 s sneak peeks (`--frames=0-599`) before rendering the full video.

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
  - verify: compare the first and last frames and the audio level at both ends after rendering. With fast motion
    on screen, compare the seam against a normal frame-to-frame difference (frame 0 vs frame 1), not against 0.
- **Music-driven, no voiceover.** On-screen actions are timed to the beat from one shared timeline (a Python
  `build.py` writes the timeline JSON and the music from the same data).
- **Facts on screen must be correct.** Double-check numbers before rendering.
- **Text must be readable** (feedback history: overlay captions at the top were too fast; text drawn with in-scene
  pixels / voxel letters was NOT readable after the pixel pipeline). Use crisp HTML labels (Press Start 2P, ~44/58 px)
  in a solid dark panel with a coloured 8-px border, anchored next to the thing being explained by projecting its 3D
  position — use `Labels` / `LabelDef` from `remotion/src/brand/Labels.tsx` (anchors can be functions of t; `hold: true` for the loop hook). Never render text through
  `PixelArtCanvas`. 1–3 short lines, one label per ~2 bars (≥ 2.5 s), colour-code words to match what's on screen.
- **Every video gets a different hyped rhythm/genre** (done so far: 120 BPM chiptune, 150 BPM four-on-the-floor
  hyper, 170 BPM drum & bass, 140 BPM jersey club / trap with 808s, 130 BPM UK garage 2-step,
  130 BPM funk carioca, 144 BPM "funk 150", 128 BPM phonk, 128 BPM clean melodic house, 120 BPM stereo nu-disco. User wants bold but NOT noisy: they hated a distorted rave mix (hoover, acid, noise sweeps,
  master saturation) as "so noisy" — keep mixes clean: punchy clean kick, warm filtered chords, round bass, quiet hats, bell leads). Pick a BPM where `48 s × BPM / 240` is a whole number of bars.
- **The animation plays the music**: map visual events to instruments/notes (parts = drums, colours/letters = notes)
  from the shared timeline, so what you see is what you hear.

## Current style: TRUE pixel-art 3D (use this)
3D scene rendered at 270x480 through `remotion/src/brand/PixelPipeline.tsx` (`PixelArtCanvas`): 1-px depth outlines,
4x4 Bayer dithering, every pixel snapped to a fixed palette (glows too), toon (MeshToonMaterial) shading, pixel
textures (DataTexture, NearestFilter), upscaled 4x. Text: anchored `Labels` panels (see the text rule above).
Brand on screen: @HOWTOWITHZAY. References: `remotion/src/videos/chameleon/ChameleonVideo.tsx` (user's favourite so far: rich scene, colour = chord,
zoom into the mechanism, quality bar to match), `remotion/src/videos/dna/DnaVideo.tsx` (labels + hyper music), `remotion/src/videos/bees/BeesPixelVideo.tsx`.
Instagram copy lives in `social/instagram.md`.

## Previous style: cinematic pixel-3D ("majestic")
60 fps · 3D rendered at 360x640 and upscaled 3x with hard pixels · soft glows in a separate full-res layer ·
continuous Catmull-Rom camera · small / BIG / small pixel captions that fade · warm pads, sub, bells, hall reverb.
Reference implementation: `remotion/src/videos/watch/WatchMajesticFull.tsx` + `videos/03-watch-majestic/build.py`.

## Commands
- Setup: `./setup.sh`
- Render 3D videos with `--gl=swangle`, e.g. `npm run video:watch-majestic`
- Typecheck: `npx tsc --noEmit -p .`
