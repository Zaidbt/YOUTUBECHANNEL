# 016 · How does a light bulb turn electricity into light?
40 s loop (20 bars), 120 BPM clean synthwave (`scripts/stereo.py`). `python3 videos/16-bulb/build.py` writes
`remotion/src/videos/bulb/bulb.json` + `public/videos/16-bulb/music.wav`. Render: `npm run video:bulb` (composition `BulbVideo`).
Story: glowing LED bulb (moth) → photons/s → dive into the chip: N (electrons) vs P (holes), a step = the energy gap →
3 V on → electrons fall into holes, one photon each (note pitch = colour) → bigger gap = bluer → Nobel 2014 (blue) →
package: blue chip + yellow phosphor = white → old tungsten bulb (2,500 °C, 90 % heat) → LED (75 % less power, 25x life).
(Not to be confused with the older `videos/05-light` / `LightVideo`.)
