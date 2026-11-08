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
