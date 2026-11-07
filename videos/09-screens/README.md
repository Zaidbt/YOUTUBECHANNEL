# 009 · How do screens work?

48 s · seamless loop · 9:16 · 60 fps · **170 BPM drum & bass** · true pixel-art 3D. Build: `npm run video:screens` (~4.5 min).

Text: crisp labels in solid panels, anchored to what they describe (projected from 3D), one per ~2 bars.
(A first version drew text with the screen's own pixels / voxel letters; it wasn't readable through the pixel pipeline.)

The animation plays the music: in the close-up the red sub-pixel flashes on every kick, green on every snare,
blue on every hat. Colours are chords (R = A, G = C, B = E): yellow = A+C, white = the full A-minor chord.
"256 levels" is a 16-step rising white chord; the drop changes colour on every 16th and plays it; each screen
refresh sweep is an up-sweep.

Facts: 1080x1920 = 2,073,600 pixels; each pixel = red, green, blue sub-pixels (most screens); 256 levels each →
16,777,216 colours; the eye blends dots too small to resolve; screens redraw 60–120 times a second.
