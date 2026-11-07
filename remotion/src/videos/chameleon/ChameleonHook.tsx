/**
 * Video 012 · 10 s HOOK cut of the chameleon video (retention test). 144 BPM funk, 6 bars, seamless loop @ 60 fps.
 * 0 s: action from frame 0 (colour flips on every beat) + hook label · 3.3 s: crash-zoom into the skin crystals ·
 * 6.7 s: back out, tongue shot at 7.5 s · 8.75 s: hook again, camera home → loops. Timing from hook.json.
 */
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import HK from "./hook.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef } from "../../brand/Labels";
import { Chameleon, Jungle, Skin, JUNGLE_PALETTE, STATE, setTimeline, stateAt, useAssets, Timeline } from "./ChameleonVideo";

export const FPS = 60;
export const DURATION = Math.round(HK.duration * FPS);
type V3 = [number, number, number];
const D = HK.duration, BAR = HK.bar;
const TL: Timeline = { colors: HK.colors, tongue: HK.tongue, flyBack: HK.tongue + 1.0, lw: (2 * Math.PI) / D, beamN: 10, dur: D };
const BG = "#06110a";
const SKIN_FROM = 2 * BAR, SKIN_TO = 4 * BAR;

const HOME = { p: [3.6, 2.6, 10] as V3, l: [1.8, 1.8, 0] as V3 };
const JCAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.3, ...HOME },
  { t: SKIN_FROM - 0.1, p: [2.7, 2.2, 5.8], l: [1.7, 1.8, 0] },
  { t: SKIN_FROM, p: [2.7, 2.2, 5.6], l: [1.7, 1.8, 0] },
  { t: SKIN_TO, p: [4.6, 3, 16], l: [4.6, 2.4, 0] },
  { t: 8.4, p: [4.4, 3, 15.5], l: [4.4, 2.4, 0] },
  { t: 9.4, ...HOME }, { t: D, ...HOME },
];
const SCAM: CamKey[] = [
  { t: SKIN_FROM, p: [0, 1.4, 3.8], l: [0, 1.2, 0] },
  { t: SKIN_FROM + 0.55, p: [0, 2.0, 10], l: [0, 1.4, 0] },
  { t: SKIN_TO, p: [0.6, 2.1, 11.5], l: [0, 1.5, 0] },
];
const S = STATE;
const HOOK = [[{ t: "IT CHANGES COLOR" }], [{ t: "WITH " }, { t: "CRYSTALS", c: "#bfe6ff" }, { t: " 🤯" }]];
const LABELS: LabelDef[] = [
  { from: 0, to: SKIN_FROM, anchor: [1.6, 3.5, 0], border: "#bfe6ff", lines: HOOK, hold: true },
  { from: SKIN_FROM, to: SKIN_TO, anchor: [0, 5.2, 0], border: "#ffffff", lines: [[{ t: "CLOSE = " }, { t: "GREEN", c: S[0].mid }], [{ t: "SPREAD = " }, { t: "RED", c: S[3].mid }]] },
  { from: SKIN_TO, to: 8.75, anchor: [4.4, 4.6, 0], border: S[3].mid, lines: [[{ t: "NOT TO HIDE..." }], [{ t: "IT'S TO TALK", c: S[3].mid }]] },
  { from: 8.75, to: D + 0.01, anchor: [1.6, 3.5, 0], border: "#bfe6ff", lines: HOOK, hold: true },
];
const flashAt = (t: number) => Math.max(...[SKIN_FROM, SKIN_TO].map((s) => Math.exp(-(((t - s) / 0.1) ** 2))));

export const ChameleonHook: React.FC = () => {
  setTimeline(TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const skin = t >= SKIN_FROM && t < SKIN_TO;
  const cam = skin ? camAt(SCAM, t) : camAt(JCAM, t);
  const st = STATE[stateAt(t).s];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/hook.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={skin ? 0.8 : 0.5} color={skin ? "#ffffff" : "#a8e05a"} />
        <directionalLight position={[-6, 14, 10]} intensity={1.9} color="#fff8d0" />
        <directionalLight position={[8, -2, -6]} intensity={0.6} color="#4a9aff" />
        {skin ? <Skin t={t} map={a.glow} /> : <><Jungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff8d0", opacity: Math.round(flashAt(t) * 3) / 3 }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: st.mid, textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" }}>● {st.name}</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};

import { useThree } from "@react-three/fiber";
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
