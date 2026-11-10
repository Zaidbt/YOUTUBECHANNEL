# 021 · CAN YOU COUNT CARDS? (Hi-Lo, 3 levels)
43.8 s loop (23 bars), 126 BPM electro swing (walking bass, brass stabs, wah trumpet hook, stop-time + fanfare on each
reveal; every card is a note: +1 high pizzicato, -1 low brass, 0 rim click). `python3 videos/21-cardcount/build.py`
writes `remotion/src/videos/cardcount/cardcount.json` + `public/videos/21-cardcount/music.wav`.
Render: `npm run video:cardcount` (composition `CardCountVideo`). Speeds: L1 a card every 2 beats, L2 every beat and a half, L3 every beat (faster was "way too much"). Levels 1-2 reveal
their count (+3, +1); LEVEL 3 is never revealed on screen (label + flashing HUD line "comment your count"; value in the JSON).
When card timing changes, the music must be rebuilt and each card must land with an audible hit in the groove.
User feedback: "I like it", but the rules need time: one example card per bar, then a running-total demo, before LEVEL 1.
