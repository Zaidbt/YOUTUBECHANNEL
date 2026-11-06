# 01 · How does a car engine work? (8-bit)

- Format: 9:16, 32 s, 30 fps, 128 BPM, no voiceover
- Animation: `remotion/src/videos/CarEngine.tsx` (180x320 pixel grid, scaled 6x)
- Music: `music.py` (original chiptune, synthesized with `scripts/chiptune.py`)

Build: `npm run video:car-engine` → `out/car-engine.mp4`

Story beats (bars): REAL SPEED → SLOWING → SLOW-MO (suck, squeeze, bang, blow, one per bar)
→ RECAP → 2X FASTER / DOUBLE IT → IDLE → FLOOR IT → 6500 RPM → END.

Facts used: 4-stroke = 1 power stroke per 2 crank turns per cylinder,
so bangs/s per cylinder = RPM / 120 (3000 → 25, 800 → ~7, 6500 → 54; V8 at 6500 → 433).
Compression ratio ~10:1 is typical for petrol engines.
