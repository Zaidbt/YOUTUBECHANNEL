/**
 * Video 012 · 30 s retention cut of the chameleon video. 144 BPM funk, 18 bars, seamless loop @ 60 fps.
 * SPLIT SCREEN from frame 0: top = the whole chameleon changing colour on every beat (a colour wave rolls head → tail),
 * bottom = inside its skin, in sync (crystals close = green, spread = red). Full-screen moments in between:
 * the skin close-up (bars 6-7), the jungle "it's to talk" + tongue (bars 10-15). Split again for the drop and the loop.
 * Timing from c30.json (build_30.py).
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
const W = (2 * Math.PI) / D;

type Mode = "split" | "skin" | "jungle";
const modeAt = (t: number): Mode => (t >= b(6) && t < b(8) ? "skin" : t >= b(10) && t < b(16) ? "jungle" : "split");

// split-screen layout (px)
const TOP_Y = 310, PANEL_H = 780, DIV_Y = TOP_Y + PANEL_H, DIV_H = 40, BOT_Y = DIV_Y + DIV_H;
const topCam = (t: number) => ({ p: [-0.6 + 0.3 * Math.sin(W * t), 2.4, 9.3] as V3, l: [-0.6, 1.5, 0] as V3 });
const botCam = (t: number) => ({ p: [0.3 * Math.sin(W * t + 1), 1.6, 6.2] as V3, l: [0, 1.4, 0] as V3 });
const SKINCAM: CamKey[] = [{ t: b(6), p: [0, 2.0, 10], l: [0, 1.4, 0] }, { t: b(8), p: [0.4, 1.7, 8.6], l: [0, 1.2, 0] }];
const JCAM: CamKey[] = [
  { t: b(10), p: [3, 2.8, 12], l: [1.5, 1.6, 0] },
  { t: 20, p: [-1, 2.6, 14], l: [0.5, 1.5, 0] },
  { t: 23.0, p: [4.4, 3, 16], l: [4.4, 2.4, 0] },
  { t: b(16), p: [4.4, 3, 15.5], l: [4.4, 2.4, 0] },
];

const S = STATE;
const TOPZ: [number, number] = [540, 290];
const HOOK = [[{ t: "HOW IT ACTUALLY" }], [{ t: "CHANGES COLOR", c: S[0].mid }, { t: " 🤯" }]];
const LABELS: LabelDef[] = [
  { from: 0, to: b(2), anchor: [0, 0, 0], screen: TOPZ, border: S[0].mid, lines: HOOK, hold: true },
  { from: b(2), to: b(4), anchor: [0, 0, 0], screen: TOPZ, border: "#bfe6ff", lines: [[{ t: "ITS SKIN IS FULL OF" }], [{ t: "TINY CRYSTALS", c: "#bfe6ff" }]] },
  { from: b(4), to: b(6), anchor: [0, 0, 0], screen: TOPZ, border: "#ffffff", lines: [[{ t: "CLOSE = " }, { t: "GREEN", c: S[0].mid }], [{ t: "SPREAD = " }, { t: "RED", c: S[3].mid }]] },
  { from: b(6), to: b(8), anchor: [0, 5.2, 0], border: S[0].mid, lines: [[{ t: "CLOSE = " }, { t: "BLUE LIGHT", c: "#4a9aff" }], [{ t: "+ " }, { t: "YELLOW", c: "#ffd23f" }], [{ t: "= GREEN", c: S[0].mid }]] },
  { from: b(8), to: b(10), anchor: [0, 0, 0], screen: TOPZ, border: "#ffffff", lines: [[{ t: "CALM", c: S[0].mid }, { t: " → GREEN" }], [{ t: "EXCITED", c: S[3].mid }, { t: " → RED" }]] },
  { from: b(10), to: b(12), anchor: [1.5, 3.4, 0], border: S[0].mid, lines: [[{ t: "NOT TO HIDE..." }], [{ t: "IT'S TO TALK", c: S[3].mid }]] },
  { from: b(12), to: b(14), anchor: [1.0, 3.4, 0], border: S[3].mid, lines: [[{ t: "TO RIVALS", c: S[3].mid }], [{ t: "& MATES" }]] },
  { from: b(14), to: b(16), anchor: [4.4, 4.6, 0], border: "#ff8a7a", lines: [[{ t: "BONUS: ITS TONGUE" }], [{ t: "UP TO 2X", c: "#ff8a7a" }], [{ t: "ITS BODY" }]] },
  { from: b(16), to: D + 0.01, anchor: [0, 0, 0], screen: TOPZ, border: S[0].mid, lines: HOOK, hold: true },
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const JungleLights: React.FC = () => (<><ambientLight intensity={0.55} color="#a8e05a" /><directionalLight position={[-6, 14, 10]} intensity={1.9} color="#fff8d0" /><directionalLight position={[8, -2, -6]} intensity={0.6} color="#4a9aff" /></>);
const SkinLights: React.FC = () => (<><ambientLight intensity={0.8} color="#ffffff" /><directionalLight position={[-6, 14, 10]} intensity={1.9} color="#fff8d0" /><directionalLight position={[8, -2, -6]} intensity={0.6} color="#4a9aff" /></>);
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05080a, -4px 0 0 #05080a, 0 -4px 0 #05080a" };

export const Chameleon30: React.FC = () => {
  setTimeline(TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const mode = modeAt(t);
  const st = STATE[stateAt(t).s];
  if (mode === "split") {
    const tc = topCam(t), bc = botCam(t);
    return (
      <AbsoluteFill style={{ background: BG }}>
        <Audio src={staticFile("videos/12-chameleon/c30.wav")} />
        <div style={{ position: "absolute", left: 0, top: TOP_Y, width: 1080, height: PANEL_H, overflow: "hidden" }}>
          <PixelArtCanvas width={1080} height={PANEL_H} bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
            <CamSet p={tc.p} l={tc.l} /><JungleLights /><Jungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} />
          </PixelArtCanvas>
        </div>
        <div style={{ position: "absolute", left: 0, top: BOT_Y, width: 1080, height: PANEL_H, overflow: "hidden" }}>
          <PixelArtCanvas width={1080} height={PANEL_H} bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
            <CamSet p={bc.p} l={bc.l} /><SkinLights /><Skin t={t} map={a.glow} />
          </PixelArtCanvas>
        </div>
        {/* divider: OUTSIDE / INSIDE THE SKIN, in the current colour */}
        <div style={{ position: "absolute", left: 0, top: DIV_Y, width: 1080, height: DIV_H, background: "#05080a", borderTop: `6px solid ${st.mid}`, borderBottom: `6px solid ${st.mid}`, boxSizing: "border-box" }} />
        <div style={{ ...tag, position: "absolute", left: 36, top: DIV_Y + 9, color: "#ffffff" }}>▲ OUTSIDE</div>
        <div style={{ ...tag, position: "absolute", right: 36, top: DIV_Y + 9, color: "#bfe6ff" }}>INSIDE ITS SKIN ▼</div>
        <div style={{ ...tag, fontSize: 18, position: "absolute", right: 30, top: 1920 - 50, color: "#fff08a" }}>@HOWTOWITHZAY</div>
        <Labels t={t} cam={tc} labels={LABELS} />
      </AbsoluteFill>
    );
  }
  const cam = mode === "skin" ? camAt(SKINCAM, t) : camAt(JCAM, t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/c30.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={JUNGLE_PALETTE} outlineColor="#05080a">
        <CamSet p={cam.p} l={cam.l} />
        {mode === "skin" ? <><SkinLights /><Skin t={t} map={a.glow} /></> : <><JungleLights /><Jungle t={t} map={a.glow} /><Chameleon t={t} map={a.glow} /></>}
      </PixelArtCanvas>
      <div style={{ ...tag, position: "absolute", left: 48, top: 72, color: st.mid }}>● {st.name}</div>
      <div style={{ ...tag, position: "absolute", right: 48, top: 72, color: "#fff08a" }}>@HOWTOWITHZAY</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
