/**
 * Video 012 · 30 s retention cut of the chameleon video. 144 BPM funk, 18 bars, seamless loop @ 60 fps.
 * Action from frame 0 · crash-zoom into the skin at 3.3 s · crystals explained · drop (13.3 s) · back to the
 * jungle (it's to talk) · tongue shot · hook again → loops. Timing from c30.json (build_30.py).
 */
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import HK from "./c30.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef } from "../../brand/Labels";
import { Chameleon, Jungle, Skin, JUNGLE_PALETTE, STATE, setTimeline, stateAt, useAssets, Timeline } from "./ChameleonVideo";

export const FPS = 60;
export const DURATION = Math.round(HK.duration * FPS);
type V3 = [number, number, number];
const D = HK.duration, BAR = HK.bar;
const TL: Timeline = { colors: HK.colors, tongue: HK.tongue, flyBack: HK.tongue + 1.0, lw: (2 * Math.PI) / D, beamN: 30, dur: D };
const BG = "#06110a";
const SKIN_FROM = 2 * BAR, SKIN_TO = 10 * BAR;

const HOME = { p: [3.6, 2.6, 10] as V3, l: [1.8, 1.8, 0] as V3 };
const JCAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.3, ...HOME },
  { t: SKIN_FROM - 0.1, p: [3.4, 2.3, 6.4], l: [2.3, 1.8, 0] },
  { t: SKIN_FROM, p: [3.4, 2.3, 6.2], l: [2.3, 1.8, 0] },
  { t: SKIN_TO, p: [3, 2.8, 12], l: [1.5, 1.6, 0] },
  { t: 20, p: [-1, 2.6, 14], l: [0.5, 1.5, 0] },
  { t: 23.0, p: [4.4, 3, 16], l: [4.4, 2.4, 0] },
  { t: 25.6, p: [4.4, 3, 15.5], l: [4.4, 2.4, 0] },
  { t: 28.4, ...HOME }, { t: D, ...HOME },
];
const SCAM: CamKey[] = [
  { t: SKIN_FROM, p: [0, 1.4, 3.8], l: [0, 1.2, 0] },
  { t: SKIN_FROM + 0.55, p: [0, 2.0, 10], l: [0, 1.4, 0] },
  { t: 6.67, p: [-1.5, 2.4, 10.5], l: [-0.3, 1.5, 0] },
  { t: 10, p: [0, 1.7, 9.5], l: [0, 1.1, 0] },
  { t: 13.33, p: [1.5, 2, 11.5], l: [0, 1.4, 0] },
  { t: SKIN_TO, p: [0, 2.1, 12], l: [0, 1.5, 0] },
];
const S = STATE;
const HOOK = [[{ t: "IT CHANGES COLOR" }], [{ t: "WITH " }, { t: "CRYSTALS", c: "#bfe6ff" }, { t: " 🤯" }]];
const b = (n: number) => n * BAR;
const LABELS: LabelDef[] = [
  { from: 0, to: b(2), anchor: [1.6, 3.5, 0], border: "#bfe6ff", lines: HOOK, hold: true },
  { from: b(2), to: b(4), anchor: [0, 5.2, 0], border: "#bfe6ff", lines: [[{ t: "ITS SKIN IS FULL OF" }], [{ t: "TINY CRYSTALS", c: "#bfe6ff" }]] },
  { from: b(4), to: b(6), anchor: [0, 5.2, 0], border: S[0].mid, lines: [[{ t: "CALM: CRYSTALS CLOSE" }], [{ t: "BLUE", c: "#4a9aff" }, { t: " + " }, { t: "YELLOW", c: "#ffd23f" }], [{ t: "= GREEN", c: S[0].mid }]] },
  { from: b(6), to: b(8), anchor: [0, 5.2, 0], border: S[3].mid, lines: [[{ t: "EXCITED: THEY SPREAD" }], [{ t: "= RED", c: S[3].mid }]] },
  { from: b(8), to: b(10), anchor: [0, 5.2, 0], border: "#ffffff", lines: [[{ t: "CALM", c: S[0].mid }, { t: " → GREEN" }], [{ t: "EXCITED", c: S[3].mid }, { t: " → RED" }]] },
  { from: b(10), to: b(12), anchor: [1.5, 3.4, 0], border: S[0].mid, lines: [[{ t: "NOT TO HIDE..." }], [{ t: "IT'S TO TALK", c: S[3].mid }]] },
  { from: b(12), to: b(14), anchor: [1.0, 3.4, 0], border: S[3].mid, lines: [[{ t: "TO RIVALS", c: S[3].mid }], [{ t: "& MATES" }]] },
  { from: b(14), to: b(16), anchor: [4.4, 4.6, 0], border: "#ff8a7a", lines: [[{ t: "BONUS: ITS TONGUE" }], [{ t: "UP TO 2X", c: "#ff8a7a" }], [{ t: "ITS BODY" }]] },
  { from: b(16), to: D + 0.01, anchor: [1.6, 3.5, 0], border: "#bfe6ff", lines: HOOK, hold: true },
];
const flashAt = (t: number) => Math.max(...[SKIN_FROM, SKIN_TO].map((s) => Math.exp(-(((t - s) / 0.1) ** 2))));

export const Chameleon30: React.FC = () => {
  setTimeline(TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const skin = t >= SKIN_FROM && t < SKIN_TO;
  const cam = skin ? camAt(SCAM, t) : camAt(JCAM, t);
  const st = STATE[stateAt(t).s];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/c30.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={skin ? 0.8 : 0.5} color={skin ? "#ffffff" : "#a8e05a"} />
        <directionalLight position={[-6, 14, 10]} intensity={1.9} color="#fff8d0" />
        <directionalLight position={[8, -2, -6]} intensity={0.6} color="#4a9aff" />
        {skin ? <Skin t={t} map={a.glow} /> : <><Jungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff8d0", opacity: Math.round(flashAt(t) * 3) / 3 }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: st.mid, textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" }}>● {st.name}</div>
      <div style={{ position: "absolute", right: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: "#fff08a", textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" }}>@HOWTOWITHZAY</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};

import { useThree } from "@react-three/fiber";
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
