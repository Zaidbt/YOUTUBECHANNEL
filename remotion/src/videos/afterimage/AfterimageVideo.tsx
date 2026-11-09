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
// The TRUE picture is a warm sunset (what the viewer ends up "seeing"); it is chosen so that its INVERSE — what is
// actually shown during the stare — is our indigo / teal / pink night look.
const TRUE = {
  sky0: "#ffe3b8", sky1: "#ffc98a", sky2: "#ffab5c", sky3: "#ff8f3a", sun: "#ff6a2a", sunL: "#ff8a4a", speck: "#7a3a1a",
  hillFar: "#ffbf80", hillNear: "#ffe9c8", leaf: "#a8e68a", leaf2: "#7fd66a", wood: "#b8804a", woodD: "#9a6a3a",
  red: "#e83a2a", redD: "#b82a1e", redL: "#ff6a50", yellow: "#ffd23f", yellowD: "#e8b020",
  green: "#3fbf5a", blue: "#2a6fe8", blueD: "#1f4fb8", beak: "#fff2d0", beakD: "#5a4a40", white: "#ffffff", black: "#101010", foot: "#6a5a50",
};
type CK = keyof typeof TRUE;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (v: number[]) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
const invert = (h: string) => hex(rgb(h).map((x) => 255 - x));
const grey = (h: string) => { const [r, g, b] = rgb(h), y = Math.round(((0.299 * r + 0.587 * g + 0.114 * b) * 0.6 + 255 * 0.4) / 12) * 12; return hex([y, y, y]); };
const INV = Object.fromEntries(Object.entries(TRUE).map(([k, v]) => [k, invert(v)])) as Record<CK, string>;
const GREY = Object.fromEntries(Object.entries(TRUE).map(([k, v]) => [k, grey(v)])) as Record<CK, string>;
type Mode = "inv" | "grey";
const modeAt = (t: number): Mode => (t >= REVEAL && t < AGAIN ? "grey" : "inv");
export const AFTER_PALETTE = [...new Set([...Object.values(INV), ...Object.values(GREY), "#101010", "#ffffff"])].slice(0, 48);

// ================= the scene (Kurzgesagt-flat, perfectly still) =================
const rndf = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SUN: P2 = [0.75, 1.0];
const SPECKS = Array.from({ length: 34 }, (_, i) => ({ x: (rndf(i) - 0.5) * 6, y: -1 + rndf(i + 50) * 6.5, r: 0.03 + rndf(i + 90) * 0.04 }));
const HILL_FAR = blob([[-4, -2.6], [-2.6, -1.9], [-1.2, -2.5], [0.4, -1.7], [1.8, -2.4], [3.0, -1.8], [4, -2.3], [4, -6], [-4, -6]], 40);
const HILL_NEAR = blob([[-4, -3.7], [-2.4, -3.2], [-0.8, -3.8], [0.8, -3.3], [2.4, -3.9], [4, -3.3], [4, -6], [-4, -6]], 40);
const BRANCH = ribbon(curve([[-3.4, -2.3], [-1.2, -2.05], [0.8, -2.2], [3.4, -1.75]], 30), (u) => 0.3 - 0.08 * u);
const BRANCH_L = ribbon(curve([[-3.4, -2.2], [-1.2, -1.95], [0.8, -2.1], [3.4, -1.68]], 30), () => 0.07);
const TWIG = ribbon(curve([[1.6, -2.05], [2.1, -1.5], [2.2, -1.0]], 12), (u) => 0.1 - 0.05 * u);
const LEAF = blob([[0, 0], [0.5, 0.26], [1.05, 0], [0.5, -0.26]], 16);
const LEAVES: [P2, number, number][] = [[[2.2, -1.0], 0.9, 0.8], [[2.2, -1.05], 2.3, 0.7], [[-2.6, -2.0], 2.0, 0.8], [[-2.2, -2.3], -2.2, 0.75],
  [[-3.1, 4.6], -0.5, 1.6], [[-3.1, 3.9], -0.15, 1.3], [[3.1, 4.7], -2.6, 1.6], [[3.1, 4.0], -3.0, 1.3], [[-3.0, 3.2], 0.3, 1.0], [[3.0, 3.3], 2.85, 1.0]];
// parrot (a scarlet macaw), local coordinates, feet on the branch
const TAILS: [P2[], CK, number][] = [[[[0.25, -1.9], [0.75, -3.2], [1.45, -4.6]], "red", 0.34], [[[0.0, -1.95], [0.3, -3.2], [0.8, -4.4]], "blue", 0.26], [[[-0.2, -1.9], [-0.05, -2.9], [0.3, -3.8]], "redL", 0.22]];
const BODY = blob([[-0.25, 1.0], [0.7, 0.7], [1.05, -0.5], [0.7, -1.75], [-0.1, -2.2], [-0.85, -1.6], [-1.05, -0.3], [-0.8, 0.6]], 40);
const BELLY = blob([[-0.95, -0.3], [-0.6, 0.45], [-0.25, -0.4], [-0.3, -1.8], [-0.8, -1.5]], 24);
const RIMB = ribbon(curve([[-0.82, 0.55], [-1.03, -0.3], [-0.84, -1.55]], 20), () => 0.06);
const SCALLOPS: P2[] = [[-0.62, -0.1], [-0.42, -0.55], [-0.66, -0.9], [-0.44, -1.3]];
const WING_R = blob([[0.05, 0.6], [1.0, 0.45], [1.2, -0.2], [0.1, -0.1]], 20);
const WING_Y = blob([[0.08, -0.05], [1.2, -0.15], [1.25, -0.75], [0.1, -0.6]], 20);
const WING_G = blob([[0.1, -0.55], [1.25, -0.7], [1.22, -1.15], [0.16, -1.0]], 20);
const BLADES: [P2[], CK][] = [[[[0.2, -0.95], [0.5, -1.7], [0.75, -2.7]], "blue"], [[[0.55, -1.0], [0.85, -1.7], [1.1, -2.5]], "blueD"], [[[0.9, -1.0], [1.15, -1.6], [1.35, -2.2]], "blue"]];
const HEAD: P2 = [-0.15, 1.3];
const BEAK = blob([[-0.8, 1.72], [-1.55, 1.5], [-1.72, 0.9], [-1.4, 0.72], [-1.0, 1.05]], 20);
const BEAK_TIP = blob([[-1.6, 1.15], [-1.72, 0.9], [-1.4, 0.72], [-1.38, 0.95]], 10);
const BEAK_L = blob([[-1.05, 1.05], [-1.38, 0.78], [-1.12, 0.55], [-0.82, 0.82]], 12);
const DOT: P2 = [-0.3, -0.55];
const Parrot: React.FC<{ t: number }> = ({ t }) => {
  const C = modeAt(t) === "inv" ? INV : GREY;
  const pre = t < STARE0 || t >= AGAIN, ring = pre ? 0.15 + 0.1 * Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 5) : 0.15;
  return (
    <group>
      {/* sky: halo rings around the sun */}
      <Flat g={rrect(-6, -8, 6, 8, 0)} c={C.sky0} z={-9} />
      {[[4.6, C.sky1], [3.6, C.sky2], [2.75, C.sky3]].map(([r, c], i) => <Disc key={`rg${i}`} at={SUN} r={r as number} c={c as string} z={-8.9 + i * 0.01} seg={64} />)}
      <Disc at={SUN} r={2.0} c={C.sun} z={-8.8} seg={56} />
      <Disc at={[SUN[0] - 0.35, SUN[1] + 0.35]} r={1.35} c={C.sunL} z={-8.79} seg={48} />
      {SPECKS.map((p, i) => <Disc key={`sp${i}`} at={[p.x, p.y]} r={p.r} c={C.speck} z={-8.5} seg={6} />)}
      <Flat g={HILL_FAR} c={C.hillFar} z={-8} />
      <Flat g={HILL_NEAR} c={C.hillNear} z={-7.9} />
      {/* branch + leaves */}
      <Flat g={TWIG} c={C.wood} z={-1.1} />
      <Flat g={BRANCH} c={C.wood} z={-1} />
      <Flat g={BRANCH_L} c={C.woodD} z={-0.99} />
      {LEAVES.map(([p, r, sc], i) => <group key={`lf${i}`} position={[p[0], p[1], -0.9]} rotation={[0, 0, r]} scale={sc}><Flat g={LEAF} c={i % 2 ? C.leaf : C.leaf2} /><Flat g={ribbon([[0.1, 0], [0.95, 0]], () => 0.025)} c={i % 2 ? C.leaf2 : C.leaf} z={0.001} /></group>)}
      {/* the macaw */}
      <group position={[-0.1, 0.25, 0]} scale={1.08}>
        {TAILS.map(([pts, c, w], i) => <Flat key={`tl${i}`} g={ribbon(curve(pts, 20), (u) => w * (1 - 0.65 * u))} c={C[c]} z={-0.3 + i * 0.01} />)}
        <Flat g={BODY} c={C.red} />
        <Flat g={BELLY} c={C.redD} z={0.01} />
        <Flat g={RIMB} c={C.redD} z={0.012} />
        {SCALLOPS.map((p, i) => <Flat key={`sc${i}`} g={ribbon(curve([[p[0] - 0.14, p[1] + 0.06], [p[0], p[1] - 0.05], [p[0] + 0.14, p[1] + 0.06]], 8), () => 0.035)} c={C.red} z={0.015} />)}
        {[-0.5, -0.1].map((x, i) => <React.Fragment key={`ft${i}`}><Flat g={rrect(x - 0.16, -2.5, x + 0.16, -2.12, 0.1)} c={C.foot} z={0.07} />{[-0.1, 0, 0.1].map((d, j) => <Flat key={j} g={rrect(x + d - 0.035, -2.62, x + d + 0.035, -2.4, 0.03)} c={C.foot} z={0.071} />)}</React.Fragment>)}
        {/* wing: red shoulder, yellow, green, blue blades */}
        {BLADES.map(([pts, c], i) => <Flat key={`bl${i}`} g={ribbon(curve(pts, 16), (u) => 0.2 * (1 - 0.6 * u))} c={C[c]} z={0.04 + i * 0.001} />)}
        <Flat g={WING_G} c={C.green} z={0.05} />
        {[0.3, 0.6, 0.9, 1.15].map((x, i) => <Disc key={`gs${i}`} at={[x, -1.08 - i * 0.03]} r={0.16} c={C.green} z={0.05} seg={14} />)}
        <Flat g={WING_Y} c={C.yellow} z={0.055} />
        {[0.28, 0.58, 0.88, 1.15].map((x, i) => <Disc key={`ys${i}`} at={[x, -0.63 - i * 0.03]} r={0.17} c={C.yellow} z={0.055} seg={14} />)}
        {[0.4, 0.75, 1.05].map((x, i) => <Flat key={`yl${i}`} g={ribbon([[x, -0.15], [x + 0.04, -0.6]], () => 0.025)} c={C.yellowD} z={0.056} />)}
        <Flat g={WING_R} c={C.redL} z={0.06} />
        {[0.3, 0.62, 0.95].map((x, i) => <Disc key={`rs${i}`} at={[x, -0.1 - i * 0.03]} r={0.18} c={C.redL} z={0.06} seg={14} />)}
        {/* head */}
        <Disc at={HEAD} r={0.92} c={C.red} z={0.07} seg={44} />
        <Flat g={ribbon(curve([[-0.95, 1.0], [-0.98, 1.6], [-0.55, 2.1]], 14), () => 0.055)} c={C.redD} z={0.072} />
        <Disc at={[-0.55, 1.35]} r={0.5} c={C.white} z={0.08} seg={30} />
        {[1.12, 1.25, 1.0].map((y, i) => <Flat key={`fl${i}`} g={ribbon([[-0.3 + i * 0.03, y], [-0.12 + i * 0.03, y - 0.03]], () => 0.022)} c={C.red} z={0.081} />)}
        <Disc at={[-0.55, 1.45]} r={0.24} c={C.black} z={0.09} seg={22} />
        <Disc at={[-0.57, 1.45]} r={0.11} c={C.white} z={0.091} seg={14} />
        <Flat g={BEAK_L} c={C.beakD} z={0.085} />
        <Flat g={BEAK} c={C.beak} z={0.09} />
        <Flat g={BEAK_TIP} c={C.beakD} z={0.091} />
      </group>
      {/* the target to stare at */}
      <Disc at={DOT} r={ring + 0.05} c="#101010" z={0.2} seg={28} />
      <Disc at={DOT} r={ring} c="#ffffff" z={0.201} seg={28} />
      <Disc at={DOT} r={0.07} c="#101010" z={0.21} seg={16} />
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
  const bg = modeAt(t) === "inv" ? INV.sky0 : GREY.sky0;
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
