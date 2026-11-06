# 002 · How does a watch tick?

32 s · 9:16 · 120 BPM · seamless loop (last frame = first frame, last bar flows into the first).

Build: `npm run video:watch` → `out/watch.mp4` (about 2.5 min)

- `build.py` is the single source of truth: it writes the tick timeline
  (`remotion/src/videos/watch/timeline.json`) and the music from the same ticks,
  so every tick on screen is a hit in the music (16th-note hats at real speed,
  kick/snare in slow-mo).
- `remotion/src/videos/watch/WatchVideo.tsx`: 3D candy watch outside → dive inside (3D) →
  dissolve to pixels → 2D blueprint slow-mo → back to 3D → zoom out (= frame 0).

Facts: 28,800 vph = 8 ticks/s (4 Hz balance) → 691,200/day → ~252 million/year.
Swiss lever escape wheel: 15 teeth; each tick releases half a tooth.
