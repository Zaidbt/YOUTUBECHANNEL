/**
 * Video 012 · 30 s retention cut of the chameleon video. 144 BPM funk, 18 bars, seamless loop @ 60 fps.
 * ONE scene at a time, one continuous camera: a big clear chameleon changing colour on every beat (a colour wave
 * rolls head → tail) → the camera glides into its skin and dives through (screen fills with the skin colour) →
 * the crystals (close = green, spread = red) → back out for the drop → it's to talk → tongue → hero again (loop).
 * Labels always at the same spot at the top. Timing from c30.json (build_30.py).
 */
import React from "react";
import { useThree } from "@react-three/fiber";
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
const b = (n: number) => n * BAR;
const TL: Timeline = { colors: HK.colors, tongue: HK.tongue, flyBack: HK.tongue + 1.0, lw: (2 * Math.PI) / D, beamN: 30, dur: D };
const BG = "#06110a";

const IN = b(3), OUT = b(7), FADE = 0.28;                 // dive into the skin / come back out
const inSkin = (t: number) => t >= IN && t < OUT;

const HOME = { p: [8.5, 3.1, 12.5] as V3, l: [0.2, 2.0, 0] as V3 };
const FLANK = { p: [0.0, 1.8, 1.3] as V3, l: [-0.2, 1.75, 0] as V3 };
const CAM_A: CamKey[] = [                                  // hero → glide into the flank
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [6.5, 2.9, 12.0], l: [0.1, 1.6, 0] },
  { t: IN - 0.3, p: [1.6, 2.2, 5.6], l: [-0.1, 1.7, 0] },
  { t: IN, ...FLANK },
];
const CAM_S: CamKey[] = [                                  // inside the skin: pull back from the surface, drift, push back up
  { t: IN, p: [0, 3.1, 3.4], l: [0, 2.7, 0] },
  { t: IN + 0.9, p: [0, 1.8, 7.0], l: [0, 1.4, 0] },
  { t: b(5), p: [-1.0, 1.9, 7.4], l: [-0.2, 1.4, 0] },
  { t: OUT - 0.7, p: [0.8, 1.8, 7.0], l: [0, 1.4, 0] },
  { t: OUT, p: [0, 3.1, 3.4], l: [0, 2.7, 0] },
];
const CAM_B: CamKey[] = [                                  // back out of the flank → drop → talk → tongue → home
  { t: OUT, ...FLANK },
  { t: OUT + 0.35, p: [1.6, 2.2, 5.6], l: [-0.1, 1.7, 0] },
  { t: OUT + 1.3, p: [7.0, 3.0, 12.5], l: [0.2, 1.6, 0] },
  { t: b(10), p: [8.0, 3.0, 12.0], l: [0.3, 1.6, 0] },
  { t: 20, p: [-1.2, 2.7, 13.5], l: [0.4, 1.6, 0] },
  { t: 23.0, p: [4.4, 3, 15.5], l: [4.4, 2.5, 0] },
  { t: 25.6, p: [4.4, 3, 15.0], l: [4.4, 2.5, 0] },
  { t: 28.4, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inSkin(t) ? camAt(CAM_S, t) : camAt(CAM_B, t));
/** the dive: the screen fills with the skin colour right at the surface, then clears on the other side */
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));

const S = STATE;
const TOPZ: [number, number] = [540, 420];
const L = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CHAMELEON", c: S[0].mid }], [{ t: "CHANGE COLOR? 🤯" }]];
const LABELS: LabelDef[] = [
  L(0, b(2), S[0].mid, HOOK, true),
  L(b(2), b(4), "#bfe6ff", [[{ t: "THE SECRET:" }], [{ t: "TINY CRYSTALS", c: "#bfe6ff" }], [{ t: "IN ITS SKIN" }]]),
  L(b(4), b(7), "#ffffff", [[{ t: "CRYSTALS CLOSE" }], [{ t: "= " }, { t: "GREEN", c: S[0].mid }], [{ t: "SPREAD = " }, { t: "RED", c: S[3].mid }]]),
  L(b(7), b(10), "#ffffff", [[{ t: "CALM", c: S[0].mid }, { t: " → GREEN" }], [{ t: "EXCITED", c: S[3].mid }, { t: " → RED" }]]),
  L(b(10), b(12), S[0].mid, [[{ t: "NOT TO HIDE..." }], [{ t: "IT'S TO TALK", c: S[3].mid }]]),
  L(b(12), b(14), S[3].mid, [[{ t: "TO RIVALS", c: S[3].mid }], [{ t: "& MATES" }]]),
  L(b(14), b(16), "#ff8a7a", [[{ t: "BONUS: ITS TONGUE" }], [{ t: "UP TO 2X", c: "#ff8a7a" }], [{ t: "ITS BODY" }]]),
  L(b(16), D + 0.01, S[0].mid, HOOK, true),
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" };

export const Chameleon30: React.FC = () => {
  setTimeline(TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const skin = inSkin(t);
  const cam = camFor(t);
  const st = STATE[stateAt(t).s];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/c30.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={skin ? 0.8 : 0.6} color={skin ? "#ffffff" : "#a8e05a"} />
        <directionalLight position={[-6, 14, 10]} intensity={1.9} color="#fff8d0" />
        <directionalLight position={[8, -2, -6]} intensity={0.6} color="#4a9aff" />
        {skin ? <Skin t={t} map={a.glow} /> : <><Jungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: st.mid, opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", left: 48, top: 60, color: st.mid }}>● {st.name}</div>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#fff08a" }}>@HOWTOWITHZAY</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
