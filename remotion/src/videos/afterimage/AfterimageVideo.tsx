/**
 * Video 018 · The afterimage game — "STARE AT THE DOT FOR 10 SECONDS": a parrot drawn in inverted colours, a countdown
 * HUD, then the picture turns 100 % grey and the viewer sees it in its true colours (negative afterimage). The video is
 * the game; the explanation that follows is ONE mechanism in 3 levels (cone types → the stimulated cones adapt/tire →
 * on grey only the rested cones answer fully, so the brain reads the opposite colour).
 * The image must stay perfectly still during the stare (no beat pulses) or the afterimage does not build up.
 * 40 s loop, 120 BPM (afterimage.json + music.wav from videos/18-afterimage/build.py): 1 second = 2 beats.
 */
import React from "react";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./afterimage.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { Labels, LabelDef } from "../../brand/Labels";
import { P2, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const FOV = 20;
const STARE0 = EV.stare0, REVEAL = EV.reveal, AGAIN = EV.again;

// ---------------- colours: true / inverted / grey ----------------
const TRUE = { sky: "#8fd0ff", red: "#e8402a", redD: "#b02a1a", yellow: "#ffd23f", blue: "#2a6fe8", green: "#3fbf5a", greenD: "#2a8f40", wood: "#8a5a2a", beak: "#f0e0c0", beakD: "#4a4a4a", white: "#ffffff" };
type CK = keyof typeof TRUE;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (v: number[]) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
const invert = (h: string) => hex(rgb(h).map((x) => 255 - x));
const grey = (h: string) => { const [r, g, b] = rgb(h), y = (0.299 * r + 0.587 * g + 0.114 * b) * 0.6 + 255 * 0.4; return hex([y, y, y]); };
const INV = Object.fromEntries(Object.entries(TRUE).map(([k, v]) => [k, invert(v)])) as Record<CK, string>;
const GREY = Object.fromEntries(Object.entries(TRUE).map(([k, v]) => [k, grey(v)])) as Record<CK, string>;
type Mode = "inv" | "grey";
const modeAt = (t: number): Mode => (t >= REVEAL && t < AGAIN ? "grey" : "inv");
export const AFTER_PALETTE = [...new Set([...Object.values(INV), ...Object.values(GREY), "#101010", "#ffffff"])];

// ================= the parrot (flat, perfectly still) =================
const BODY = blob([[-0.2, 1.0], [0.7, 0.6], [1.0, -0.6], [0.6, -1.9], [-0.2, -2.4], [-0.9, -1.6], [-1.0, -0.2], [-0.7, 0.7]], 40);
const BELLY = blob([[-0.85, -0.2], [-0.5, 0.4], [-0.2, -0.6], [-0.3, -2.0], [-0.85, -1.5]], 24);
const WING = blob([[0.15, 0.55], [1.1, 0.2], [1.2, -1.3], [0.65, -2.3], [0.05, -1.1]], 30);
const WING_Y = blob([[0.15, 0.55], [1.1, 0.2], [1.12, -0.45], [0.12, -0.25]], 20);
const WING_G = blob([[0.12, -0.25], [1.12, -0.45], [1.16, -0.95], [0.08, -0.75]], 20);
const TAIL = ribbon(curve([[0.15, -2.1], [0.5, -3.1], [1.0, -4.3]], 20), (u) => 0.32 - 0.2 * u);
const TAIL_B = ribbon(curve([[-0.1, -2.2], [0.05, -3.2], [0.35, -4.1]], 20), (u) => 0.22 - 0.14 * u);
const BEAK = blob([[-0.8, 1.62], [-1.5, 1.4], [-1.62, 0.85], [-1.3, 0.7], [-0.95, 1.0]], 20);
const BEAK_L = blob([[-1.0, 1.0], [-1.3, 0.72], [-1.05, 0.55], [-0.8, 0.8]], 12);
const BRANCH = ribbon(curve([[-3.2, -2.75], [-1, -2.5], [1, -2.6], [3.2, -2.2]], 30), () => 0.3);
const LEAVES: [P2, number][] = [[[-2.3, -2.1], 0.5], [[-1.75, -2.9], -2.4], [[2.2, -1.95], 0.9], [[2.55, -2.75], -0.6], [[-2.6, 3.3], -0.6], [[2.5, 3.6], -2.4], [[1.9, 3.1], -2.0]];
const LEAF = blob([[0, 0], [0.45, 0.22], [0.95, 0], [0.45, -0.22]], 16);
const DOT: P2 = [0.0, -0.4];
const Parrot: React.FC<{ t: number }> = ({ t }) => {
  const C = modeAt(t) === "inv" ? INV : GREY;
  const pre = t < STARE0 || t >= AGAIN, ring = pre ? 0.2 + 0.1 * Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 5) : 0.2;
  return (
    <group>
      <Flat g={rrect(-6, -8, 6, 8, 0)} c={C.sky} z={-5} />
      {LEAVES.map(([p, r], i) => <group key={`lf${i}`} position={[p[0], p[1], -1]} rotation={[0, 0, r]}><Flat g={LEAF} c={i % 2 ? C.green : C.greenD} /></group>)}
      <Flat g={BRANCH} c={C.wood} z={-0.5} />
      <Flat g={TAIL_B} c={C.blue} z={-0.3} />
      <Flat g={TAIL} c={C.red} z={-0.2} />
      <Flat g={BODY} c={C.red} />
      <Flat g={BELLY} c={C.redD} z={0.01} />
      <Disc at={[-0.1, 1.25]} r={0.9} c={C.red} z={0.02} seg={40} />
      <Disc at={[-0.5, 1.3]} r={0.45} c={C.white} z={0.03} seg={28} />
      <Disc at={[-0.48, 1.4]} r={0.12} c={C.beakD} z={0.04} seg={14} />
      <Flat g={BEAK_L} c={C.beakD} z={0.035} />
      <Flat g={BEAK} c={C.beak} z={0.04} />
      <Flat g={WING} c={C.blue} z={0.05} />
      <Flat g={WING_G} c={C.green} z={0.055} />
      <Flat g={WING_Y} c={C.yellow} z={0.06} />
      {[-0.55, -0.15].map((x, i) => <Flat key={`ft${i}`} g={rrect(x - 0.14, -2.62, x + 0.14, -2.3, 0.08)} c={C.beakD} z={0.07} />)}
      {/* the fixation dot */}
      <Disc at={DOT} r={ring} c="#ffffff" z={0.2} seg={28} />
      <Disc at={DOT} r={0.1} c="#101010" z={0.21} seg={16} />
    </group>
  );
};

// ================= HUD + labels =================
const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "STARE AT THE DOT" }], [{ t: "FOR 10 SECONDS", c: "#ffd23f" }], [{ t: "DON'T BLINK 👁️" }]];
const LABELS: LabelDef[] = [
  Lb(0, STARE0, "#ffd23f", HOOK, true),
  Lb(REVEAL + 2, REVEAL + 4.2, "#ffffff", [[{ t: "DID YOU SEE COLOURS?" }], [{ t: "THIS PICTURE IS", c: "#ffd23f" }], [{ t: "100% GREY 🤯", c: "#ffd23f" }]]),
  Lb(REVEAL + 4.2, REVEAL + 6, "#6ee6cf", [[{ t: "YOUR TIRED EYES" }], [{ t: "MADE THEM UP.", c: "#6ee6cf" }], [{ t: "HERE'S HOW 👇" }]]),
  Lb(AGAIN, D + 0.01, "#ffd23f", HOOK, true),
];
const px: React.CSSProperties = { fontFamily: "PressStart2P", color: "#ffffff" };
/** countdown HUD: no pop animations (anything moving pulls the eyes off the dot) */
const Countdown: React.FC<{ t: number }> = ({ t }) => {
  if (t < STARE0 || t >= REVEAL + 2) return null;
  const left = Math.max(0, 10 - Math.floor(t - STARE0)), done = t >= REVEAL;
  return (
    <div style={{ position: "absolute", left: 540, top: 420, transform: "translate(-50%, -50%)", width: 900, background: "rgba(9,13,43,0.94)", border: `8px solid ${done ? "#ffffff" : "#ffd23f"}`, boxShadow: "8px 8px 0 #05060f", padding: "26px 30px 22px", textAlign: "center" }}>
      <div style={{ ...px, fontSize: 40, marginBottom: 20 }}>{done ? "KEEP STARING..." : "EYES ON THE DOT"}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {Array.from({ length: 10 }, (_, i) => <div key={i} style={{ width: 52, height: 52, background: !done && i < left ? "#ffd23f" : "#1c2a6e", border: "5px solid #05060f" }} />)}
        <div style={{ ...px, fontSize: 64, color: "#ffd23f", width: 150, textAlign: "right" }}>{done ? "0" : left}</div>
      </div>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };
const CAM = { p: [0, 0.3, 29] as V3, l: [0, 0.3, 0] as V3 };

export const AfterimageVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const bg = modeAt(t) === "inv" ? INV.sky : GREY.sky;
  return (
    <AbsoluteFill style={{ background: bg }}>
      <Audio src={staticFile("videos/18-afterimage/music.wav")} />
      <PixelArtCanvas bg={bg} fov={FOV} palette={AFTER_PALETTE} outline={false} dither={0}>
        <ClipOn />
        <CamSet p={CAM.p} l={CAM.l} />
        <Parrot t={t} />
      </PixelArtCanvas>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ffffff" }}>@HOWTOWITHZAY</div>
      <Countdown t={t} />
      <Labels t={t} cam={CAM} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
