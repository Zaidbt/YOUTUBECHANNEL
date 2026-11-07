# 011 · How do noise-cancelling headphones work?

48 s · seamless loop · 9:16 · 60 fps · **130 BPM UK garage (2-step)** · true pixel-art 3D. Build: `npm run video:anc` (~3 min).

The cancellation is real in the audio: an engine-drone layer (brown noise + 87 Hz hum, pulsing on 8ths) is
multiplied by (1 − anc(t)), the same anc(t) that flattens the red wave on screen. ANC toggles OFF/ON every bar in
bars 12–15 (measured: the 87 Hz hum drops ~6× when ON). The mic blinks on each engine pulse, every chip "flip" is an
organ stab, voices/clicks (bars 20–21) are high blips that only partly cancel. Bar 25 turns ANC off again so the end
flows into the start.

Facts: a mic on the cup picks up outside noise; a chip makes the inverted wave (anti-noise); the speaker plays it with
the music; peak + trough cancel (destructive interference); updated thousands of times a second; best on low steady
sounds (engines, trains); voices and sudden sounds partly get through, the ear pads (passive isolation) help.
