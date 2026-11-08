# 013 · How does a camera take a photo?

30 s · seamless loop · 9:16 · 60 fps · **128 BPM phonk** (cowbell melody, distorted 808, hat rolls) · true pixel-art 3D.
Build: `npm run video:camera`.

The camera plays the music: every flash / shutter click is the snare, every group of sensor cells that lights up is a
cowbell note. One scene at a time, one smooth camera: hero shot (flash on the snares) → glide to a 3/4 side view and the camera is sliced open
(clipping plane) with tags LENS / SHUTTER / SENSOR / CHIP → the light goes through the lens onto the shutter (a tiny
door that drops on each snare) and lights the sensor → dive into the sensor for the drop: the sensor cells fill from the centre (the apple appears) → red/green/blue (Bayer) filters → out through the
back: the photo is revealed on the screen on the cowbell → orbit back to the hero shot (loop).

Facts: a lens forms an inverted image on the sensor; a typical shutter speed on a bright day is ~1/1000 s; a sensor has
millions of photosites; each sits under a red, green or blue filter (Bayer mosaic, 2 green : 1 red : 1 blue) and the
image processor (demosaicing) fills in the missing colours.

## Kurzgesagt x pixel restyle + rave (`npm run video:camera-kz`, `CameraKZ.tsx`, `build_rave.py`)
The approved 3D camera video, same scenes and camera moves, restyled (flat two-tone shading, indigo palette, moon window
with halo rings, bokeh discs, pink rim light, no outlines, bouncy pop-ins), 37.5 s with an extra shutter step (a door
that blocks the light → CLICK, it opens for 1/1000 s). Music: 128 BPM rave (distorted four-on-the-floor, offbeat bass,
supersaw stabs, hoover lead in the drop, acid 303 breakdown with a snare roll); stabs land on the cells / filters /
photo rows, hits on every flash / shutter click. Timeline: camerak.json (build_k.py).

Music v3 (`build_clean.py`, used now): clean 128 BPM melodic house — the rave version was too noisy. Bell notes on the cells / filters / photo rows, clap + tick on every flash / click.
