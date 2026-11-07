# 003 · How does a watch tick? (majestic)

48 s · 9:16 · 60 fps · 120 BPM · cinematic pixel-3D (3D at 360x640 upscaled 3x, soft glow layer on top).

Build: `npm run video:watch-majestic` → `out/watch-majestic.mp4` (~5.5 min render)

- `build.py`: tick timeline + music from the same ticks (wooden 16ths at real speed, heartbeat kick / soft snare
  on every beat in slow-mo, pads + sub + bells, hall reverb).
- `remotion/src/videos/watch/WatchMajesticFull.tsx`: one continuous camera move through the chapters
  (mainspring → gears → pallet fork → balance → hairspring), energy pulse through the train, light trail on
  the balance, then the dial fades in over the movement.

Facts: 28,800 vph = 8 ticks/s → 691,200/day → ~252 million/year; each tick lets the 15-tooth escape wheel
advance half a tooth; the hairspring makes every swing take the same time (isochronism).
