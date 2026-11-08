/**
 * Video 015 · What does LSD actually do to your brain? — scientific explainer in the ChameleonK flat style
 * (flat rounded shapes, indigo/teal/pink palette, stars + halo rings, bouncy pop-ins, clipping-plane colour wipes,
 * flat infographic with pop-in tags). 30 s loop, 112 BPM melodic afro house (lsd.json + music.wav from build.py).
 * Facts: LSD is a potent 5-HT2A receptor agonist (active at microgram doses); in the receptor a "lid" (extracellular
 * loop 2) closes over it, so it stays bound for a long time (Wacker et al., Cell 2017) → effects last ~8-12 h;
 * fMRI: more connectivity between normally separate networks, the default mode network loses integrity, which
 * correlates with "ego dissolution" (Carhart-Harris et al., PNAS 2016). Risks: anxiety/panic, psychosis in vulnerable people.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./lsd.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { P2, clamp01, ease, backOut, lerp, blob, rrect, rrectLine, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const b = (n: number) => n * BAR;
const LW = (2 * Math.PI) / D;
const FOV = 20;

export const LSD_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99", "#0f6e6a", "#1fb5a8", "#6ee6cf", "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a", "#1f8a4a", "#3fcf6a", "#9bf08a", "#c8a010", "#ffd23f", "#fff08a", "#c85a10", "#ff8a1f",
  "#ffbf6a", "#8a1414", "#ff3a2a", "#ff8a7a", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
  "#ffb3c9", "#d94a7a", "#5a2a9a", "#7a88d6", "#c8cdf0",
];
const BG = "#090d2b";

// ---------------- timing ----------------
const IN = b(3), OUT = b(7), BACK = b(12.85), FADE = 0.3;                // BACK: return to the hook scene for the loop
const scene = (t: number) => (t < IN || t >= BACK ? "hero" : t < OUT ? "syn" : "brain");
const beatK = (t: number) => Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 6);
const linkOn = (t: number, i: number) => { const on = EV.links[i]; if (t < on) return 0; const off = b(11) + (15 - i) * (BAR * 2 / 16); return t < off ? Math.min(1, backOut((t - on) / 0.25)) : 1 - ease((t - off) / 0.25); };
const dmn = (t: number) => (t < b(9) ? 1 : t < b(11) ? 1 - 0.75 * ease((t - b(9)) / BAR) : 0.25 + 0.75 * ease((t - b(11)) / (BAR * 2)));

/** cute Kurzgesagt-style eye: normal with blinks, or a spinning rainbow spiral when "tripping" */
const TRIP_COLS = ["#ff4f8b", "#ffd23f", "#6ee6cf", "#7a4dff", "#ff8a1f", "#b48cff"];
const Eye: React.FC<{ at: P2; r: number; t: number; trip: number; z?: number }> = ({ at, r, t, trip, z = 0.15 }) => {
  const blink = (t % (BAR * 2)) > BAR * 2 - 0.12 && trip < 0.5;
  if (blink) return <Flat g={ribbon([[at[0] - r, at[1]], [at[0] + r, at[1]]], () => r * 0.25)} c="#05060f" z={z} />;
  if (trip > 0.5) return (
    <group position={[at[0], at[1], z]} rotation={[0, 0, -t * 6 * LW * 4]}>
      <Disc at={[0, 0]} r={r * 1.15} c="#ffffff" />
      {[1, 0.78, 0.56, 0.34].map((f, i) => <Disc key={i} at={[(1 - f) * r * 0.25, 0]} r={r * f} c={TRIP_COLS[(i + Math.floor(t * 4)) % 6]} z={0.001 * (i + 1)} seg={20} />)}
      <Disc at={[r * 0.2, 0]} r={r * 0.14} c="#05060f" z={0.006} seg={10} />
    </group>);
  const lx = 0.2 * r * Math.sin(2 * LW * t), ly = 0.12 * r * Math.cos(3 * LW * t);
  return (
    <group position={[at[0], at[1], z]}>
      <Disc at={[0, 0]} r={r * 1.15} c="#ffffff" seg={20} />
      <Disc at={[lx, ly]} r={r * 0.62} c="#05060f" z={0.001} seg={16} />
      <Disc at={[lx - r * 0.2, ly + r * 0.2]} r={r * 0.2} c="#ffffff" z={0.002} seg={8} />
    </group>);
};
// ================= the brain (flat, side view) =================
const BRAIN = blob([[-2.3, 0.2], [-2.2, 1.3], [-1.6, 2.2], [-0.6, 2.75], [0.6, 2.8], [1.6, 2.4], [2.25, 1.6], [2.4, 0.6], [2.0, -0.2], [1.2, -0.45], [0.4, -0.3], [-0.6, -0.55], [-1.6, -0.45]], 40);
const SHADE = blob([[-2.25, 0.15], [-1.6, -0.45], [-0.6, -0.55], [0.4, -0.3], [1.2, -0.45], [2.0, -0.2], [2.38, 0.5], [1.4, 0.15], [0.2, 0.25], [-1.2, 0.1]], 30);
const CEREB = blob([[-2.15, -0.25], [-1.4, -0.35], [-0.9, -0.75], [-1.3, -1.25], [-2.0, -1.1], [-2.35, -0.7]], 24);
const STEM = ribbon(curve([[-0.6, -0.5], [-0.75, -1.2], [-0.8, -1.9]], 16), (u) => 0.5 - 0.15 * u);
const RIM = ribbon(curve([[-2.15, 1.3], [-1.6, 2.15], [-0.6, 2.7], [0.6, 2.75], [1.6, 2.35], [2.15, 1.6]], 40), () => 0.09);
const FOLDS = [
  [[-1.8, 1.6], [-1.2, 1.9], [-0.9, 1.4], [-0.3, 1.7]], [[-0.2, 2.3], [0.3, 1.9], [0.9, 2.2], [1.4, 1.8]], [[-1.6, 0.9], [-1.0, 1.1], [-0.5, 0.7], [0.1, 1.0]],
  [[0.4, 1.4], [0.9, 1.1], [1.5, 1.3], [2.0, 1.0]], [[-0.8, 0.35], [-0.2, 0.55], [0.4, 0.3], [1.0, 0.55], [1.7, 0.4]], [[-1.9, 0.3], [-1.5, 0.5], [-1.3, 0.25]],
].map((p) => ribbon(curve(p as P2[], 24), () => 0.08));
const CB_FOLDS = [[[-2.1, -0.5], [-1.5, -0.6], [-1.0, -0.6]], [[-2.15, -0.8], [-1.6, -0.9], [-1.1, -0.9]]].map((p) => ribbon(curve(p as P2[], 12), () => 0.06));
// brain regions (nodes): DMN (purple, midline), visual (teal, back), others (yellow)
const NODES: { p: P2; k: "dmn" | "vis" | "oth" }[] = [
  { p: [0.0, 2.2], k: "dmn" }, { p: [1.2, 1.5], k: "dmn" }, { p: [-0.6, 1.2], k: "dmn" },
  { p: [-1.8, 1.2], k: "vis" }, { p: [-1.9, 0.5], k: "vis" }, { p: [-1.4, 1.8], k: "vis" },
  { p: [1.9, 0.9], k: "oth" }, { p: [1.6, 2.0], k: "oth" }, { p: [0.6, 0.4], k: "oth" }, { p: [-0.6, 2.4], k: "oth" }, { p: [0.4, 1.0], k: "oth" }, { p: [-1.0, 0.4], k: "oth" },
];
const LOCAL: [number, number][] = [[0, 1], [1, 2], [0, 2], [3, 4], [3, 5], [6, 7], [8, 10], [9, 0]];
const LONG: [number, number][] = [[3, 6], [4, 7], [5, 8], [3, 10], [4, 9], [5, 11], [6, 11], [7, 4], [8, 3], [9, 6], [10, 5], [11, 7], [3, 1], [4, 8], [5, 6], [9, 11]];
const arc = (a: P2, c: P2): P2[] => { const m: P2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + 0.6]; return curve([a, m, c], 24); };
const NCOL = { dmn: "#b48cff", vis: "#6ee6cf", oth: "#ffd23f" };
const HUES = [{ mid: "#ff8a7a", dark: "#ff4f8b", light: "#ffb3c9" }, { mid: "#b48cff", dark: "#7a4dff", light: "#c8cdf0" }, { mid: "#6ee6cf", dark: "#1fb5a8", light: "#bfe6ff" }, { mid: "#ffbf6a", dark: "#ff8a1f", light: "#fff08a" }];
const WIPE = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const Brain: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = beatK(t), sq = 0.03 * k;
  // psychedelic colour waves on the beat (bars 9-10): new hue wipes across from the front, like the chameleon
  const w = EV.waves.filter((x) => t >= x).length, waving = w > 0 && t < b(11.5);
  const cur = waving ? HUES[w % 4] : HUES[0], prev = waving ? HUES[(w - 1) % 4] : HUES[0];
  const age = waving ? t - EV.waves[w - 1] : 9, edge = 2.6 - age * 14;
  WIPE.constant = -edge;
  const wiping = waving && edge > -2.6;
  const settle = t >= b(11) && t < b(11.5) ? 1 : 0;
  const pal = waving && !settle ? cur : HUES[0], pPrev = waving && !settle ? prev : HUES[0];
  const layer = (g: THREE.BufferGeometry, role: "mid" | "dark" | "light", z: number, key: string) => (
    <React.Fragment key={key}>
      {wiping && <Flat g={g} c={pPrev[role]} z={z} />}
      <Flat g={g} c={pal[role]} z={z + 0.003} clip={wiping ? [WIPE] : undefined} />
    </React.Fragment>
  );
  const dm = dmn(t), netK = t >= b(7) ? 1 : 0;
  return (
    <group position={[0, 0.03 * Math.sin(4 * LW * t), 0]}>
      <group scale={[1 + sq, 1 + sq * 0.7, 1]}>
        {layer(STEM, "dark", -0.05, "st")}
        {layer(CEREB, "mid", -0.02, "cb")}
        {CB_FOLDS.map((g, i) => layer(g, "dark", -0.01, `cbf${i}`))}
        {layer(BRAIN, "mid", 0, "br")}
        {layer(SHADE, "dark", 0.01, "sh")}
        {FOLDS.map((g, i) => layer(g, "dark", 0.02, `f${i}`))}
        {layer(RIM, "light", 0.03, "rim")}
        <Disc at={[-0.9, 2.1]} r={0.18} c="#ffffff" z={0.04} o={0.35} />
        {/* cute face on the frontal lobe: rainbow spiral eyes during the trip, blissed out while the 'self' fades */}
        <Eye at={[1.05, 0.1]} r={0.17} t={t} trip={t >= b(9) && t < b(11) ? 1 : 0} z={0.045} />
        <Eye at={[1.6, 0.18]} r={0.17} t={t} trip={t >= b(9) && t < b(11) ? 1 : 0} z={0.045} />
        <Flat g={ribbon(curve([[1.15, -0.2], [1.38, -0.32], [1.6, -0.18]], 10), () => 0.045)} c="#05060f" z={0.045} />
        {/* network: local links always, long-range links pop in on the notes, then fade with the trip */}
        {netK > 0 && <>
          {LOCAL.map(([a, c], i) => <Flat key={`lo${i}`} g={ribbon(arc(NODES[a].p, NODES[c].p), () => 0.05)} c="#fff3b0" z={0.05} o={0.55} />)}
          {LONG.map(([a, c], i) => { const on = linkOn(t, i); if (on <= 0.001) return null; const pts = arc(NODES[a].p, NODES[c].p), n = Math.max(2, Math.floor(pts.length * Math.min(1, on))); return (
            <React.Fragment key={`ln${i}`}>
              <Flat g={ribbon(pts.slice(0, n), () => 0.08)} c={i % 2 ? "#6ee6cf" : "#ffd23f"} z={0.06} o={Math.min(1, on)} />
              {t - EV.links[i] < 0.5 && <Glow map={map} at={[pts[n - 1][0], pts[n - 1][1], 0.2]} size={0.7} color="#fff08a" opacity={1 - (t - EV.links[i]) / 0.5} />}
            </React.Fragment>); })}
          {NODES.map((n, i) => { const isD = n.k === "dmn", s = (isD ? 0.55 + 0.45 * dm : 1) * (1 + 0.15 * k); return (
            <group key={`n${i}`} position={[n.p[0], n.p[1], 0.08]} scale={s}>
              <Disc at={[0, 0]} r={0.2} c="#05060f" o={0.35} />
              <Disc at={[0, 0]} r={0.15} c={isD ? (dm > 0.5 ? NCOL.dmn : "#5a2a9a") : NCOL[n.k]} z={0.01} />
              <Disc at={[-0.04, 0.04]} r={0.05} c="#ffffff" z={0.02} o={0.7} />
            </group>); })}
        </>}
      </group>
    </group>
  );
};
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 30, y: (rnd(i + 501) - 0.4) * 30, s: 0.04 + rnd(i + 502) * 0.07, ph: rnd(i + 503) * 6 }));
const Space: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const trip = t >= b(9) && t < b(11.5) ? 1 : 0;
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {/* halo rings behind the brain (the chameleon's moon rings) — kaleidoscope colours during the trip */}
      {[5.2, 4.2, 3.4].map((r, i) => { const hue = trip ? ["#b48cff", "#6ee6cf", "#ff4f8b", "#ffd23f"][(EV.waves.filter((x) => t >= x).length + i) % 4] : "#b48cff"; return <Disc key={`h${i}`} at={[0, 1.1]} r={r * (1 + 0.03 * beatK(t) * (i + 1))} c={hue} z={-10 + i * 0.1} o={0.08 + i * 0.05 + trip * 0.06} seg={56} />; })}
      {Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2 + LW * t * 2, r = 3.4 + 0.4 * Math.sin(3 * LW * t + i); return <Disc key={`o${i}`} at={[Math.cos(a) * r, 1.1 + Math.sin(a) * r]} r={0.05} c={i % 3 ? "#bfe6ff" : "#ffd23f"} z={-5} seg={6} />; })}
      {Array.from({ length: 10 }, (_, i) => <Glow key={`g${i}`} map={map} at={[(rnd(i + 60) - 0.5) * 9, (rnd(i + 61) - 0.3) * 12, -4]} size={0.5} color="#b48cff" opacity={0.4 + 0.5 * Math.max(0, Math.sin(5 * LW * t + i * 1.7))} />)}
    </group>
  );
};

// ================= HOOK: a tiny paper square → zoom → the LSD molecule =================
const MOL_C: P2 = [0.3, 1.25];
/** a stylised LSD molecule (ergoline rings + diethylamide), ball-and-stick */
const MOL = (() => {
  const r = 0.42, hex = (cx: number, cy: number): P2[] => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos(Math.PI / 6 + (i * Math.PI) / 3), cy + r * Math.sin(Math.PI / 6 + (i * Math.PI) / 3)]);
  const A = hex(-0.73, -0.2), Cc = hex(-0.365, 0.43), Dd = hex(0.0, -0.2);
  const pent: P2[] = Array.from({ length: 5 }, (_, i) => [-1.25 + 0.36 * Math.cos(Math.PI + (i * 2 * Math.PI) / 5), -0.6 + 0.36 * Math.sin(Math.PI + (i * 2 * Math.PI) / 5)]);
  const rings = [A, Cc, Dd, pent];
  const atoms: { p: P2; e: "C" | "N" | "O" }[] = [];
  const add = (p: P2, e: "C" | "N" | "O" = "C") => { const f = atoms.find((a) => Math.hypot(a.p[0] - p[0], a.p[1] - p[1]) < 0.08); if (!f) atoms.push({ p, e }); else if (e !== "C") f.e = e; };
  rings.forEach((R) => R.forEach((p) => add(p)));
  add(pent[0], "N"); add(Dd[5], "N");
  const am: P2 = [Dd[1][0] + 0.45, Dd[1][1] + 0.28], O: P2 = [am[0] + 0.05, am[1] + 0.55], N2: P2 = [am[0] + 0.5, am[1] - 0.22];
  const e1: P2[] = [[N2[0] + 0.42, N2[1] + 0.28], [N2[0] + 0.85, N2[1] + 0.05]], e2: P2[] = [[N2[0] + 0.1, N2[1] - 0.48], [N2[0] + 0.55, N2[1] - 0.7]];
  const me: P2 = [Dd[5][0] + 0.32, Dd[5][1] - 0.35];
  [am, me, ...e1, ...e2].forEach((p) => add(p)); add(O, "O"); add(N2, "N");
  const bonds: [P2, P2][] = [];
  rings.forEach((R) => R.forEach((p, i) => bonds.push([p, R[(i + 1) % R.length]])));
  bonds.push([Dd[1], am], [am, O], [am, N2], [N2, e1[0]], [e1[0], e1[1]], [N2, e2[0]], [e2[0], e2[1]], [Dd[5], me]);
  return { atoms, bonds, dbl: [[am, O]] as [P2, P2][] };
})();
const ECOL = { C: ["#7a88d6", "#c8cdf0"], N: ["#1f4abf", "#4a9aff"], O: ["#8a1414", "#ff3a2a"] };
const Molecule: React.FC<{ t: number; s?: number }> = ({ t, s = 1 }) => {
  const k = beatK(t);
  const sticks = useMemo(() => MOL.bonds.map(([a, c]) => ribbon([a, c], () => 0.09)), []);
  return (
    <group scale={s * (1 + 0.04 * k)} rotation={[0, 0, 0.1 * Math.sin(2 * LW * t)]}>
      {sticks.map((g, i) => <Flat key={i} g={g} c="#c8cdf0" z={-0.01} />)}
      {MOL.dbl.map(([a, c], i) => <Flat key={`d${i}`} g={ribbon([[a[0] + 0.1, a[1]], [c[0] + 0.1, c[1]]], () => 0.06)} c="#c8cdf0" z={-0.01} />)}
      {MOL.atoms.map((a, i) => { const [d, l] = ECOL[a.e], r = a.e === "C" ? 0.13 : 0.17; return (
        <group key={`a${i}`} position={[a.p[0], a.p[1], 0]}>
          <Disc at={[0, 0]} r={r} c={d} />
          <Disc at={[-r * 0.15, r * 0.15]} r={r * 0.78} c={l} z={0.001} />
          <Disc at={[-r * 0.35, r * 0.35]} r={r * 0.25} c="#ffffff" z={0.002} o={0.8} />
        </group>); })}
    </group>
  );
};
const fingerG = rrect(-0.32, -4.5, 0.32, 0, 0.32), nailG = rrect(-0.2, -0.55, 0.2, -0.08, 0.16);
const PAPER: P2 = [-1.45, -2.15];
const STAMP_C: P2 = [0, -0.55];
const SH = 2.0; // stamp half-size
const tang = (deg: number): P2 => [MOL_C[0] + 2.3 * Math.cos((deg * Math.PI) / 180), MOL_C[1] + 2.3 * Math.sin((deg * Math.PI) / 180)];
/** hero phase: 0 = the big blotter stamp, 1 = shrunk in the fingertip with the molecule callout */
const SHRINK = b(1.5);
const heroK = (t: number) => (t >= BACK ? 0 : ease((t - SHRINK) / 0.6));
const bubbleK = (t: number) => (t >= BACK ? 0 : backOut((t - SHRINK - 0.35) / 0.45));
const Wedge: React.FC<{ r: number; a0: number; da: number; c: string; z: number }> = ({ r, a0, da, c, z }) => (
  <mesh position={[0, 0, z]}><circleGeometry args={[r, 8, a0, da]} /><meshBasicMaterial color={c} /></mesh>
);
/** a psychedelic blotter "stamp": perforated edges, sunburst, rainbow rings, an eye, 4x4 tab grid */
const Stamp: React.FC<{ t: number }> = ({ t }) => {
  const rot = LW * t * 2, n = 16, I = SH - 0.25;
  const perf = useMemo(() => { const pts: P2[] = []; const N = 14; for (let i = 0; i <= N; i++) { const u = -SH + (i * 2 * SH) / N; pts.push([u, SH], [u, -SH], [SH, u], [-SH, u]); } return pts; }, []);
  const px = 0.25 * Math.cos(3 * LW * t), py = 0.15 * Math.sin(2 * LW * t);
  return (
    <group>
      <Flat g={rrect(-SH + 0.12, -SH - 0.18, SH + 0.12, SH - 0.06, 0.04)} c="#05060f" z={-0.02} o={0.45} />
      <Flat g={rrect(-SH, -SH, SH, SH, 0.03)} c="#fff3b0" />
      {perf.map((p, i) => <Disc key={`pf${i}`} at={p} r={0.085} c={BG} z={0.05} seg={10} />)}
      <Flat g={rrect(-I, -I, I, I, 0.02)} c="#ff4f8b" z={0.005} />
      {Array.from({ length: n }, (_, i) => { const a0 = rot + (i * 2 * Math.PI) / n, pts: P2[] = [[0, 0]]; for (let j = 0; j <= 8; j++) { const a = a0 + (j / 8) * (Math.PI / n), r = I / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); pts.push([r * Math.cos(a), r * Math.sin(a)]); } return <Flat key={`w${i}`} g={new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))))} c={i % 2 ? "#ff8a1f" : "#ffd23f"} z={0.01} />; })}
      {[[1.45, "#7a4dff"], [1.2, "#1fb5a8"], [0.98, "#ff4f8b"], [0.78, "#ffd23f"]].map(([r, c], i) => <Disc key={`rg${i}`} at={[0, 0]} r={(r as number) * (1 + 0.025 * beatK(t))} c={c as string} z={0.03 + i * 0.001} seg={48} />)}
      {/* the eye */}
      <Flat g={blob([[-0.62, 0], [0, 0.4], [0.62, 0], [0, -0.4]], 32)} c="#ffffff" z={0.04} />
      <Disc at={[px, py]} r={0.3} c="#1fb5a8" z={0.041} seg={28} />
      <Disc at={[px, py]} r={0.19} c="#7a4dff" z={0.042} seg={24} />
      <Disc at={[px, py]} r={0.1} c="#05060f" z={0.043} seg={16} />
      <Disc at={[px - 0.08, py + 0.08]} r={0.05} c="#ffffff" z={0.044} seg={10} />
      {/* blotter tab grid (perforation lines) */}
      {[-0.9, 0, 0.9].map((u, i) => <React.Fragment key={`gl${i}`}>
        {Array.from({ length: 12 }, (_, j) => { const v = -SH + 0.15 + j * 0.3; return <React.Fragment key={j}><Flat g={rrect(u - 0.018, v, u + 0.018, v + 0.16, 0)} c="#05060f" z={0.06} o={0.35} /><Flat g={rrect(v, u - 0.018, v + 0.16, u + 0.018, 0)} c="#05060f" z={0.06} o={0.35} /></React.Fragment>; })}
      </React.Fragment>)}
      <Flat g={rrect(-SH + 0.1, SH - 0.5, -SH + 0.35, SH - 0.1, 0.05)} c="#ffffff" z={0.07} o={0.5} />
    </group>
  );
};
const Hero: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const k = heroK(t), bk = bubbleK(t);
  const sc = lerp(1, 0.13, k), cx = lerp(STAMP_C[0], PAPER[0], k), cy = lerp(STAMP_C[1], PAPER[1], k);
  const tilt = lerp(-0.1 + 0.04 * Math.sin(2 * LW * t), 0, k);
  return (
    <group>
      {STARS.map((s, i) => <Disc key={`s${i}`} at={[s.x, s.y]} r={s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph))} c="#fff3b0" z={-20} seg={6} />)}
      {[5.2, 4.2, 3.4].map((r, i) => <Disc key={`h${i}`} at={[lerp(STAMP_C[0], MOL_C[0], k), lerp(STAMP_C[1], MOL_C[1], k)]} r={r * (1 + 0.03 * beatK(t) * (i + 1))} c={k < 0.5 ? "#ff4f8b" : "#b48cff"} z={-10 + i * 0.1} o={0.07 + i * 0.05} seg={56} />)}
      {/* rotating rays behind the stamp */}
      {k < 1 && <group position={[STAMP_C[0], STAMP_C[1], -5]} scale={1 - k}>{Array.from({ length: 12 }, (_, i) => <Wedge key={`bw${i}`} r={6} a0={-LW * t + (i * Math.PI) / 6} da={Math.PI / 12} c="#7a4dff" z={0} />)}</group>}
      {k < 1 && <Glow map={map} at={[STAMP_C[0], STAMP_C[1], -1]} size={7 * (1 - k)} color="#ff4f8b" opacity={(0.45 + 0.2 * beatK(t)) * (1 - k)} />}
      {bk > 0.01 && <group position={[MOL_C[0], MOL_C[1], 0]} scale={bk}>
        <group position={[-MOL_C[0], -MOL_C[1], 0]}>
          {[200, 285].map((d, i) => <Flat key={`zl${i}`} g={ribbon([PAPER, tang(d)], () => 0.04)} c="#bfe6ff" z={-0.3} o={0.55} />)}
          <Disc at={MOL_C} r={2.3} c="#1c2a6e" z={-0.25} o={0.85} seg={64} />
          <mesh position={[MOL_C[0], MOL_C[1], -0.2]}><ringGeometry args={[2.26, 2.36, 64]} /><meshBasicMaterial color="#bfe6ff" /></mesh>
          <Glow map={map} at={[MOL_C[0], MOL_C[1], -0.15]} size={4.5} color="#7a4dff" opacity={0.5 + 0.2 * beatK(t)} />
          <group position={[MOL_C[0] + 0.15, MOL_C[1] + 0.05, 0]}><Molecule t={t} s={1.05} /></group>
          {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2 + LW * t * 2, r = 2.75 + 0.15 * Math.sin(3 * LW * t + i); return <Disc key={`o${i}`} at={[MOL_C[0] + Math.cos(a) * r, MOL_C[1] + Math.sin(a) * r]} r={0.05} c={i % 3 ? "#bfe6ff" : "#ffd23f"} z={-0.1} seg={6} />; })}
        </group>
      </group>}
      {/* fingertip holding the stamp by its bottom-left corner */}
      <group position={[cx, cy, 0.2]} rotation={[0, 0, tilt]} scale={sc * (1 + 0.04 * beatK(t))}>
        <group position={[-SH * 0.55, -SH - 0.2, -0.1]} rotation={[0, 0, 0.35]} scale={lerp(1.4, 1, k) / sc}>
          <Flat g={fingerG} c="#ffbf6a" />
          <Flat g={rrect(0.05, -4.5, 0.32, -0.3, 0.2)} c="#ff8a7a" z={0.001} o={0.5} />
          <Flat g={nailG} c="#fff3b0" z={0.002} />
        </group>
        <Stamp t={t} />
      </group>
      {k > 0 && <Glow map={map} at={[PAPER[0], PAPER[1], 0.35]} size={0.9} color="#fff08a" opacity={(0.6 + 0.3 * beatK(t)) * k} />}
    </group>
  );
};

// ================= the synapse (flat infographic) =================
const TERMINAL = blob([[-3.4, 4.5], [3.4, 4.5], [3.0, 2.2], [1.8, 1.3], [0, 1.0], [-1.8, 1.3], [-3.0, 2.2]], 30);
const MEMB = (() => { const pts: P2[] = []; for (let i = 0; i <= 60; i++) { const x = -4 + i * (8 / 60); pts.push([x, -1.6 + 0.08 * Math.sin(x * 2.2)]); } return pts; })();
const membG = ribbon(MEMB, () => 0.5), membTop = ribbon(MEMB.map(([x, y]) => [x, y + 0.22] as P2), () => 0.08);
const RECX = [-2.0, 0, 2.0];
const NEURON2 = blob([[-4.5, -1.7], [4.5, -1.7], [4.0, -4.2], [2.0, -5.6], [-2.0, -5.6], [-4.0, -4.2]], 30);
const NEURON2B = blob([[-3.6, -1.9], [3.6, -1.9], [3.0, -3.0], [0, -3.4], [-3.0, -3.0]], 24);
const SMILE = ribbon(curve([[-0.3, -3.55], [0, -3.72], [0.3, -3.55]], 12), () => 0.06);
const SMILE_BIG = blob([[-0.4, -3.5], [0.4, -3.5], [0.25, -3.85], [0, -3.95], [-0.25, -3.85]], 16);
const cupG = blob([[-0.55, 0.5], [-0.35, -0.35], [0.35, -0.35], [0.55, 0.5], [0.32, 0.5], [0.2, 0.0], [-0.2, 0.0], [-0.32, 0.5]], 16);
const lidG = rrect(-1.05, -0.08, 0.05, 0.08, 0.07);
const seroG = blob([[-0.14, 0.08], [0, 0.16], [0.14, 0.08], [0.14, -0.08], [0, -0.16], [-0.14, -0.08]], 6);
const HEX = (cx: number, cy: number, r: number) => blob(Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 3 + Math.PI / 6), cy + r * Math.sin(i * Math.PI / 3 + Math.PI / 6)] as P2), 6);
const LSDG = [HEX(-0.28, 0.12, 0.17), HEX(0.0, 0.0, 0.17), HEX(0.0, 0.3, 0.17), HEX(0.28, 0.18, 0.17)];
const lsdTail = ribbon([[0.28, 0.18], [0.55, 0.0], [0.7, 0.12]], () => 0.06);
const lsdPos = (t: number): P2 => { const a = clamp01((t - EV.lsdIn) / (EV.lsdLock - EV.lsdIn)); return t < EV.lsdIn ? [-5.5, 1.2] : [-5.5 + (RECX[1] + 5.5) * ease(a), 1.2 + (-1.1 - 1.2) * ease(a) + 0.4 * Math.sin(a * Math.PI)]; };
const Synapse: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const tin = t - IN;
  const lsdA = clamp01((t - EV.lsdIn) / (EV.lsdLock - EV.lsdIn));
  const lsdP = lsdPos(t);
  const locked = t >= EV.lsdLock, lid = locked ? Math.min(1.1, backOut((t - EV.lsdLock) / 0.3)) : 0;
  return (
    <group>
      <Disc at={[0, 0.5]} r={9} c="#121a4a" z={-6} seg={48} />
      <Disc at={[0, 0.5]} r={6} c="#1c2a6e" z={-5.9} o={0.6} seg={48} />
      {Array.from({ length: 24 }, (_, i) => <Disc key={`pa${i}`} at={[(rnd(i + 400) - 0.5) * 9 + 0.3 * Math.sin(2 * LW * t + i), (rnd(i + 410) - 0.5) * 10 + 0.3 * Math.cos(3 * LW * t + i)]} r={0.05} c="#6ee6cf" z={-1} seg={8} />)}
      {/* the sending neuron's terminal with vesicles */}
      <Flat g={TERMINAL} c="#b48cff" z={-0.4} />
      <Flat g={ribbon(curve([[-2.9, 2.3], [-1.8, 1.4], [0, 1.1], [1.8, 1.4], [2.9, 2.3]], 30), () => 0.1)} c="#c8cdf0" z={-0.39} />
      {[[-1.6, 2.4], [-0.5, 2.0], [0.7, 2.3], [1.7, 2.6], [-0.2, 3.1], [1.0, 3.3]].map(([x, y], i) => { const k = Math.max(0.001, backOut((tin - 0.2 - i * 0.05) / 0.3)); return (
        <group key={`ve${i}`} position={[x, y + 0.04 * Math.sin(4 * LW * t + i), -0.3]} scale={k}>
          <Disc at={[0, 0]} r={0.36} c="#7a4dff" />
          {[[-0.12, 0.08], [0.1, -0.06], [0.05, 0.15]].map(([a, c], j) => <Disc key={j} at={[a, c]} r={0.07} c="#ffd23f" z={0.01} seg={6} />)}
        </group>); })}
      {/* the receiving neuron's body (cute face: eyes go rainbow once LSD locks in) */}
      <Flat g={NEURON2} c="#0f6e6a" z={-0.35} />
      <Flat g={NEURON2B} c="#1fb5a8" z={-0.34} />
      <Disc at={[2.3, -3.6]} r={0.55} c="#6ee6cf" z={-0.33} o={0.6} />
      <Disc at={[2.3, -3.6]} r={0.25} c="#0f6e6a" z={-0.32} />
      <Eye at={[-0.6, -3.05]} r={0.26} t={t} trip={locked ? 1 : 0} />
      <Eye at={[0.6, -3.05]} r={0.26} t={t} trip={locked ? 1 : 0} />
      <Flat g={locked ? SMILE_BIG : SMILE} c="#05060f" z={0.15} />
      <Disc at={[-1.15, -3.45]} r={0.17} c="#ff4f8b" z={0.14} o={0.6} /><Disc at={[1.15, -3.45]} r={0.17} c="#ff4f8b" z={0.14} o={0.6} />
      {locked && <Glow map={map} at={[0, -3.0, 0.1]} size={4} color={TRIP_COLS[Math.floor(t * 4) % 6]} opacity={0.25 + 0.2 * beatK(t)} />}
      {/* the receiving membrane with receptors (the middle one is 5-HT2A with its lid) */}
      <Flat g={membG} c="#4a2a5a" z={-0.3} />
      <Flat g={membTop} c="#7a4a6a" z={-0.29} />
      {RECX.map((x, i) => { const k = Math.max(0.001, backOut((tin - 0.4 - i * 0.08) / 0.3)), glow = i === 1 && locked; return (
        <group key={`r${i}`} position={[x, -1.25, -0.2]} scale={k}>
          <Flat g={cupG} c={glow ? "#6ee6cf" : "#1fb5a8"} />
          <Disc at={[0, 0.1]} r={0.2} c="#0f6e6a" z={-0.01} />
          {i === 1 && <group position={[0.5, 0.5, 0.05]} rotation={[0, 0, -(1 - lid) * (Math.PI * 0.5)]}><Flat g={lidG} c="#6ee6cf" /></group>}
        </group>); })}
      {/* serotonin: released, docks for a moment, leaves (a note each) */}
      {EV.sero.map((st, i) => { const a = t - st + 0.5; if (a < 0 || a > 1.4) return null; const rx = RECX[i % 3 === 1 && t > EV.lsdIn - 0.6 ? 0 : i % 3]; const from: P2 = [-1.0 + (i % 3) * 0.9, 1.6];
        const p: P2 = a < 0.5 ? [from[0] + (rx - from[0]) * ease(a / 0.5), from[1] + (-1.0 - from[1]) * ease(a / 0.5)] : a < 0.9 ? [rx, -1.0] : [rx + (a - 0.9) * 2, -1.0 + (a - 0.9) * 2.4];
        const pop = a >= 0.5 && a < 0.9 ? 1 + 0.25 * Math.sin(((a - 0.5) / 0.4) * Math.PI) : 1, o = a > 0.9 ? 1 - (a - 0.9) / 0.5 : 1; return (
        <group key={`se${i}`} position={[p[0], p[1], 0.2]} scale={pop * 1.4}>
          <Flat g={seroG} c="#ffd23f" o={o} />
          <Flat g={ribbon([[0.14, 0], [0.32, 0.12]], () => 0.06)} c="#ffd23f" z={0.001} o={o} />
          {a >= 0.5 && a < 0.7 && <Glow map={map} at={[0, 0, 0.1]} size={1.0} color="#fff08a" opacity={1 - (a - 0.5) / 0.2} />}
        </group>); })}
      {/* LSD: drifts in, fits the receptor, the lid closes over it */}
      {t >= EV.lsdIn - 0.5 && (
        <group position={[lsdP[0], lsdP[1], 0.25]} rotation={[0, 0, (1 - ease(lsdA)) * 1.5 + 0.1 * Math.sin(6 * LW * t)]} scale={1.1 * Math.max(0.001, backOut((t - EV.lsdIn + 0.5) / 0.35))}>
          <Glow map={map} at={[0, 0, -0.05]} size={1.6} color="#7a4dff" opacity={0.5} />
          <group position={[0.05, -0.05, 0]}><Molecule t={t} s={0.22} /></group>
        </group>
      )}
      {locked && t - EV.lsdLock < 0.8 && <mesh position={[RECX[1], -1.1, 0.3]} scale={0.3 + (t - EV.lsdLock) * 4}><ringGeometry args={[0.9, 1, 32]} /><meshBasicMaterial color="#b48cff" transparent opacity={1 - (t - EV.lsdLock) / 0.8} /></mesh>}
      {locked && Array.from({ length: 4 }, (_, k) => { const u = ((t - EV.lsdLock) * 0.9 + k / 4) % 1; return <Flat key={`sg${k}`} g={ribbon(curve([[-0.6 - u, -1.9 - u * 0.5], [0, -2.0 - u * 0.6], [0.6 + u, -1.9 - u * 0.5]], 16), () => 0.07)} c={TRIP_COLS[k % 6]} z={0.1} o={1 - u} />; })}
    </group>
  );
};

// ================= tags, camera, labels =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "SEROTONIN", at: [-1.8, 0.4, 0.5], from: IN + 1.0, to: b(5), col: "#ffd23f" },
  { txt: "5-HT2A RECEPTOR", at: [0, -0.5, 0.5], from: IN + 0.8, to: EV.lsdLock, col: "#6ee6cf" },
  { txt: "LSD", at: (t) => { const p = lsdPos(t); return [Math.max(-1.6, p[0]), p[1] + 0.75, 0.5]; }, from: EV.lsdIn + 0.1, to: EV.lsdLock - 0.2, col: "#b48cff" },
  { txt: "LID CLOSES 🔒", at: [0, -0.1, 0.5], from: EV.lsdLock + 0.1, to: OUT, col: "#b48cff" },
];
const HERO_TAGS: Tag[] = [
  { txt: "1 TAB OF LSD", at: [STAMP_C[0], STAMP_C[1] - SH - 0.15, 0.5], from: 0, to: SHRINK, col: "#ff4f8b" },
  { txt: "1 TAB OF LSD", at: [STAMP_C[0], STAMP_C[1] - SH - 0.15, 0.5], from: BACK, to: D + 1, col: "#ff4f8b" },
  { txt: "LSD MOLECULE", at: [MOL_C[0], MOL_C[1] - 2.45, 0.5], from: SHRINK + 0.6, to: IN, col: "#b48cff" },
];
const NET_TAGS: Tag[] = [
  { txt: "VISION", at: [-1.85, 2.15, 0.5], from: b(7) + 0.4, to: b(9), col: "#6ee6cf" },
  { txt: "'SELF' NETWORK", at: [0.3, 2.6, 0.5], from: b(9) + 0.2, to: b(11), col: "#b48cff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = g.from === 0 || g.from === BACK ? (g.to < D && t > g.to - 0.2 ? clamp01((g.to - t) / 0.2) : 1) : backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.6, 29] as V3, l: [0, 0.6, 0] as V3 };
const BRAINV = { p: [0, 0.75, 29] as V3, l: [0, 0.75, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: SHRINK + 0.6, ...HOME },
  { t: b(2.5), p: [0.35, 1.1, 20], l: [0.35, 1.1, 0] },
  { t: IN - 0.35, p: [0.4, 1.25, 7], l: [0.4, 1.25, 0] },
  { t: IN, p: [0.45, 1.3, 1.6], l: [0.45, 1.3, 0] },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, 0.6, 6], l: [0, 0.6, 0] },
  { t: IN + 0.9, p: [0, 0.6, 28], l: [0, 0.6, 0] },
  { t: b(5), p: [-0.3, 0.4, 25], l: [-0.3, 0.4, 0] },
  { t: EV.lsdLock, p: [0, -1.2, 21], l: [0, -1.2, 0] },
  { t: OUT - 0.5, p: [0, -1.2, 19], l: [0, -1.2, 0] },
  { t: OUT, p: [0, -1.0, 2.5], l: [0, -1.0, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, p: [0.55, 1.55, 2], l: [0.55, 1.55, 0] },
  { t: OUT + 0.9, p: [0, 0.85, 24], l: [0, 0.85, 0] },
  { t: b(11), p: [0, 0.8, 25], l: [0, 0.8, 0] },
  { t: BACK - 0.4, p: [0, 0.8, 27], l: [0, 0.8, 0] },
  { t: BACK, ...BRAINV },
];
const CAM_H: CamKey[] = [{ t: BACK, p: [0, 0.6, 32], l: [0, 0.6, 0] }, { t: BACK + 0.8, ...HOME }, { t: D, ...HOME }];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_S, t) : t < BACK ? camAt(CAM_B, t) : camAt(CAM_H, t));
const diveAt = (t: number) => Math.max(...[IN, OUT, BACK].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (_t: number) => "#7a4dff";

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "THIS TINY STAMP" }], [{ t: "OF " }, { t: "LSD", c: "#b48cff" }, { t: " HACKS" }], [{ t: "YOUR BRAIN 🤯", c: "#ff8a7a" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#b48cff", HOOK, true),
  Lb(b(2), IN + 0.3, "#ffffff", [[{ t: "IT WORKS IN" }], [{ t: "MILLIONTHS", c: "#ffd23f" }], [{ t: "OF A GRAM 🤏" }]]),
  Lb(IN + 0.3, b(5), "#ffd23f", [[{ t: "NEURONS TALK" }], [{ t: "WITH SEROTONIN", c: "#ffd23f" }], [{ t: "VIA RECEPTORS" }]]),
  Lb(b(5), OUT, "#b48cff", [[{ t: "LSD MIMICS IT," }], [{ t: "GETS LOCKED IN", c: "#b48cff" }], [{ t: "FOR HOURS 🔒" }]]),
  Lb(OUT, b(9), "#6ee6cf", [[{ t: "BRAIN REGIONS" }], [{ t: "THAT RARELY TALK", c: "#6ee6cf" }], [{ t: "START CHATTING" }]]),
  Lb(b(9), b(11), "#b48cff", [[{ t: "THE 'SELF' NETWORK" }], [{ t: "QUIETS DOWN →", c: "#b48cff" }], [{ t: "EGO DISSOLUTION" }]]),
  Lb(b(11), BACK, "#ff3a2a", [[{ t: "LASTS 8–12 HOURS" }], [{ t: "RISK: PANIC &", c: "#ff8a7a" }], [{ t: "PSYCHOSIS ⚠️", c: "#ff8a7a" }]]),
  Lb(BACK, D + 0.01, "#b48cff", HOOK, true),
];
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const LsdVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const s = scene(t), cam = camFor(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/15-lsd/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={LSD_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {s === "hero" ? <Hero t={t} map={glow} /> : s === "brain" ? <><Space t={t} map={glow} /><Brain t={t} map={glow} /></> : <Synapse t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#b48cff" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "syn" ? TAGS : s === "brain" ? NET_TAGS : HERO_TAGS} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
