# 014 · How does an air fryer actually work?

30 s · seamless loop · 9:16 · 60 fps · 120 BPM stereo nu-disco / funk-house · Kurzgesagt-style illustration through
the pixel pipeline at 2x pixels (540x960) with a 48-colour palette. Build: `npm run video:airfryer-v2`.

v2 (`AirFryerV2.tsx`, `build_v2.py`, shared shaders in `remotion/src/brand/kz.tsx`): gradient shader on every shape,
halos/bloom, light cone, rim lights, cel shadows, gloss; night-kitchen hero; infographic cutaway (heater bloom, fan
blur, hot air as comet trails); Kurzgesagt-style scale change INTO a fry (H2O molecules blown off on the bloops, crust
turning golden piece by piece on the drop). Music: layered swung drums, funky octave bass, Rhodes, strings, a whistle
hook with ping-pong delay, events as notes (`scripts/stereo.py` = stereo bus mixer).

Facts: air fryers are small convection ovens (heater + fan, typically up to ~200°C); fast air strips the boundary
layer and dries the surface; the Maillard reaction browns food quickly above ~140°C.

Final (`AirFryerK.tsx`, `npm run video:airfryer-k`): the same story in the exact flat ChameleonK style (night window, moon halo rings, silhouettes, fireflies, bouncy pop-ins, golden crust as a clipping-plane wipe) with music_v2.wav.
