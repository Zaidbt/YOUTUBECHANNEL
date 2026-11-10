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

## THE reference now (user: "Love it. This is the style of art, explanations and music i love")
`remotion/src/videos/lsd/LsdVideo.tsx` + `videos/15-lsd/build.py` (40.7 s, 112 BPM clean stereo afro house). Copy this:
- **Hook object** on frame 0 that makes people think "what is that?" (the psychedelic blotter stamp), then a zoom callout.
- **Explain step by step, cause → effect, one label per step** (~1.5-2 bars each): "NORMALLY X → Y", "LSD DOES Z → ...".
  Smart viewers (30+) want real mechanism + real numbers (0.0001 g = 1/5000 of an aspirin, 5-HT2A, ECL2 lid 2017,
  fMRI connectivity). Cartoon alone = "dessin animé, no plus for smart people". 40 s is fine when it needs it.
- **Infographic instruments** in the scene: an oscilloscope trace (one spike per event vs nonstop), a fMRI matrix,
  tags with the technical names. Cute flat Kurzgesagt drawing in the pixel pipeline.
- Music: clean stereo production (scripts/stereo.py), each visual event = a note.

## Inspiration: "gamify + musify the info" (user-shared reels, e.g. @science_in_8bit, ~93K likes)
Pixel-art body/science facts that turn the info into a game and a song. What to borrow:
- **Make the viewer play along**: a challenge or counter on screen ("you swallow ~585 times a day — try NOT to now"),
  HUD elements (score, lives, level, progress bars, timers, combo counters) that track the mechanism like a game.
- **Musify**: each fact/event is a beat or note of a catchy groove (we already do this — push it further: the
  "game" sounds are part of the song).
- Relatable everyday numbers (per day / per second), a playful CTA ("send this to someone who…"), sources in the caption.

## Why people leave (user: ~70 % drop-off) and the game format that answers it
User feedback (Nov): drawing style is good (LSD first frame = top) but "no sparkle": hooks are weak, explanations too
fast and superficial (10 ideas in 40 s = nothing learned), music not catchy enough (it is not about BPM: it needs an
earworm). Fix = **gamify the topic** (reference: `videos/pixelquiz/PixelQuizVideo.tsx` + `videos/20-pixelquiz/build.py`):
- The video is a game from frame 0: LEVEL n/3 question → 3-2-1 countdown → answer → SCORE. A game HUD (HTML panel at
  y≈1500: level, score, countdown, live values of the thing on screen) stays on all along.
- Few ideas, each shown properly (3 levels, not 10 labels). End with "comment your score".
- Music: ONE short riff (vocal-chop formant synth `chop()` + pluck) repeated from frame 0; suspense = lighter groove on
  questions, full groove drops on answers; countdown beeps / coin jingle are in key and on the beat.
- Real continuous zooms into the actual thing beat fill-dives when possible (phone picture = real pixel grid).
- Rejected: a static optical-illusion image (afterimage parrot: "visuel nul", "meh") — the picture must stay alive.
  Body challenges ("hold your breath"-style) only if original; the user asked for topic quizzes instead.

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
  130 BPM funk carioca, 144 BPM "funk 150", 128 BPM phonk, 128 BPM clean melodic house, 120 BPM stereo nu-disco, 112 BPM melodic afro house, 120 BPM clean synthwave, 96 BPM lo-fi neo-soul (music that goes under), 96 BPM dembow, 108 BPM electro-funk quiz. User wants bold but NOT noisy: they hated a distorted rave mix (hoover, acid, noise sweeps,
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
