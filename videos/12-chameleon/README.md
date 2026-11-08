# 012 · How does a chameleon change color?

48 s · seamless loop · 9:16 · 60 fps · **130 BPM funk carioca** (tamborzão drums, 808, whistles, vocal-ish chops) ·
true pixel-art 3D. Build: `npm run video:chameleon`.

The chameleon plays the chords: one colour timeline (`build.py` → `chameleon.json`) drives the skin colour, the
crystal spacing inside the skin AND the harmony. GREEN = Am, YELLOW = C, ORANGE = F, RED = G; every colour change
fires a chord chop, and the sustained chord bed follows the current colour. In the drop (bars 12–15) the colour
changes on every beat, with a whistle each. The tongue shot (bar 20, beat 2) is a whip + impact. Bar 25 returns to
green so the end flows into the start.

Story: jungle → dive into the skin (iridophore cell with its nanocrystal lattice above the dark melanophore layer,
yellow pigment cells on top; white light in, coloured light out; a spacing gauge under the crystals) → back to the
jungle ("not to hide… it's to talk") → tongue catch → hook again.

Facts (Teyssier et al., Nature Communications 2015, panther chameleon): iridophore cells hold a lattice of guanine
nanocrystals; relaxed = crystals tightly packed → reflect blue, which with the yellow pigment above looks green;
excited = the lattice expands → reflects longer wavelengths (yellow, orange, red). Colour change is mainly social
signalling (rivals, mates) and temperature, not camouflage. The tongue can reach up to ~2× the body length.

## 30 s retention cut (`npm run video:chameleon30`, `build_30.py` + `Chameleon30.tsx`)
144 BPM funk ("funk 150" feel), 18 bars = 30 s. One scene at a time, one continuous camera: hero 3/4 shot (a colour
wave rolls head → tail on every beat) → glide + dive into the skin (screen fills with the skin colour) → hexagonal
guanine crystals (close = green, spread = red) → back out for the drop → it's to talk → tongue → hero (loop).
Labels always at the same spot at the top. The colour timeline wraps, so frame 0 continues the last colour.

## Kurzgesagt-style pixel remake (`npm run video:chameleon-k`, `build_k.py` + `ChameleonK.tsx`) — user: "Perfection !!"
Flat 2D vector-style drawing and bouncy animation through the pixel pipeline (no outlines). The inside explains it in
4 steps: white light = all colours (waves) → the gap between crystal rows picks the colour that bounces back → small
gap: blue, through the yellow pigment = green → excited: the cell stretches, big gap = red. Every light wave is a pluck
note (blue high, red low). Facts: Teyssier et al. 2015 (guanine nanocrystal lattice in iridophores, tuned by spacing).
