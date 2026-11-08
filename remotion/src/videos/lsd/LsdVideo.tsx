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
import { P2, clamp01, ease, backOut, blob, rrect, ribbon, curve, Flat, Disc, ClipOn } from "../../brand/flat";

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
const IN = b(3), OUT = b(7), FADE = 0.3;
const scene = (t: number) => (t >= IN && t < OUT ? "syn" : "brain");
const beatK = (t: number) => Math.exp(-((t % (BAR / 4)) / (BAR / 4)) * 6);
const linkOn = (t: number, i: number) => { const on = EV.links[i]; if (t < on) return 0; const off = b(11) + (15 - i) * (BAR * 2 / 16); return t < off ? Math.min(1, backOut((t - on) / 0.25)) : 1 - ease((t - off) / 0.25); };
const dmn = (t: number) => (t < b(9) ? 1 : t < b(11) ? 1 - 0.75 * ease((t - b(9)) / BAR) : 0.25 + 0.75 * ease((t - b(11)) / (BAR * 2)));

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

// ================= the synapse (flat infographic) =================
const TERMINAL = blob([[-3.4, 4.5], [3.4, 4.5], [3.0, 2.2], [1.8, 1.3], [0, 1.0], [-1.8, 1.3], [-3.0, 2.2]], 30);
const MEMB = (() => { const pts: P2[] = []; for (let i = 0; i <= 60; i++) { const x = -4 + i * (8 / 60); pts.push([x, -1.6 + 0.08 * Math.sin(x * 2.2)]); } return pts; })();
const membG = ribbon(MEMB, () => 0.5), membTop = ribbon(MEMB.map(([x, y]) => [x, y + 0.22] as P2), () => 0.08);
const RECX = [-2.0, 0, 2.0];
const cupG = blob([[-0.55, 0.5], [-0.35, -0.35], [0.35, -0.35], [0.55, 0.5], [0.32, 0.5], [0.2, 0.0], [-0.2, 0.0], [-0.32, 0.5]], 16);
const lidG = rrect(-0.5, -0.07, 0.05, 0.07, 0.06);
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
      {/* the receiving membrane with receptors (the middle one is 5-HT2A with its lid) */}
      <Flat g={membG} c="#4a2a5a" z={-0.3} />
      <Flat g={membTop} c="#7a4a6a" z={-0.29} />
      {RECX.map((x, i) => { const k = Math.max(0.001, backOut((tin - 0.4 - i * 0.08) / 0.3)), glow = i === 1 && locked; return (
        <group key={`r${i}`} position={[x, -1.25, -0.2]} scale={k}>
          <Flat g={cupG} c={glow ? "#6ee6cf" : "#1fb5a8"} />
          <Disc at={[0, 0.1]} r={0.2} c="#0f6e6a" z={-0.01} />
          {i === 1 && <group position={[0.5, 0.5, 0.05]} rotation={[0, 0, -lid * (Math.PI * 0.5) + (1 - lid) * 0.2]}><Flat g={lidG} c="#6ee6cf" /></group>}
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
          {LSDG.map((g, i) => <Flat key={i} g={g} c={i % 2 ? "#7a4dff" : "#b48cff"} />)}
          <Flat g={lsdTail} c="#7a4dff" z={0.001} />
          <Disc at={[-0.05, 0.38]} r={0.05} c="#ffffff" z={0.01} o={0.7} />
        </group>
      )}
      {locked && t - EV.lsdLock < 0.8 && <mesh position={[RECX[1], -1.1, 0.3]} scale={0.3 + (t - EV.lsdLock) * 4}><ringGeometry args={[0.9, 1, 32]} /><meshBasicMaterial color="#b48cff" transparent opacity={1 - (t - EV.lsdLock) / 0.8} /></mesh>}
      {locked && Array.from({ length: 4 }, (_, k) => { const u = ((t - EV.lsdLock) * 0.9 + k / 4) % 1; return <Flat key={`sg${k}`} g={ribbon(curve([[-0.6 - u, -1.9 - u * 1.4], [0, -2.1 - u * 1.6], [0.6 + u, -1.9 - u * 1.4]], 16), () => 0.07)} c="#b48cff" z={0.1} o={1 - u} />; })}
    </group>
  );
};

// ================= tags, camera, labels =================
type Tag = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const TAGS: Tag[] = [
  { txt: "SEROTONIN", at: [-1.8, 0.4, 0.5], from: IN + 1.0, to: b(5), col: "#ffd23f" },
  { txt: "RECEPTOR", at: [0, -0.5, 0.5], from: IN + 0.8, to: EV.lsdLock, col: "#6ee6cf" },
  { txt: "LSD", at: (t) => { const p = lsdPos(t); return [Math.max(-1.6, p[0]), p[1] + 0.75, 0.5]; }, from: EV.lsdIn + 0.1, to: EV.lsdLock - 0.2, col: "#b48cff" },
  { txt: "LID CLOSES 🔒", at: [0, -0.1, 0.5], from: EV.lsdLock + 0.1, to: OUT, col: "#b48cff" },
];
const NET_TAGS: Tag[] = [
  { txt: "VISION", at: [-1.85, 2.15, 0.5], from: b(7) + 0.4, to: b(9), col: "#6ee6cf" },
  { txt: "'SELF' NETWORK", at: [0.3, 2.6, 0.5], from: b(9) + 0.2, to: b(11), col: "#b48cff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 }; tags: Tag[] }> = ({ t, cam, tags }) => (
  <>{tags.filter((g) => t >= g.from && t < g.to).map((g, i) => { const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);
const HOME = { p: [0, 0.75, 29] as V3, l: [0, 0.75, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [0.2, 1.0, 22], l: [0.2, 1.0, 0] },
  { t: IN - 0.35, p: [0.5, 1.5, 7], l: [0.5, 1.5, 0] },
  { t: IN, p: [0.55, 1.55, 2], l: [0.55, 1.55, 0] },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0, 0.6, 6], l: [0, 0.6, 0] },
  { t: IN + 0.9, p: [0, 0.6, 28], l: [0, 0.6, 0] },
  { t: b(5), p: [-0.3, 0.4, 25], l: [-0.3, 0.4, 0] },
  { t: EV.lsdLock, p: [0, -0.3, 18], l: [0, -0.3, 0] },
  { t: OUT - 0.4, p: [0, -0.5, 9], l: [0, -0.5, 0] },
  { t: OUT, p: [0, -1.0, 2.5], l: [0, -1.0, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, p: [0.55, 1.55, 2], l: [0.55, 1.55, 0] },
  { t: OUT + 0.9, p: [0, 0.85, 24], l: [0, 0.85, 0] },
  { t: b(11), p: [0, 0.8, 25], l: [0, 0.8, 0] },
  { t: D - 1.4, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : t < OUT ? camAt(CAM_S, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));
const diveCol = (t: number) => (Math.abs(t - IN) < 1 ? "#ff8a7a" : "#b48cff");

const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "WHAT DOES " }, { t: "LSD", c: "#b48cff" }], [{ t: "ACTUALLY DO TO" }], [{ t: "YOUR BRAIN? 🧠", c: "#ff8a7a" }]];
const LABELS: LabelDef[] = [
  Lb(0, b(2), "#b48cff", HOOK, true),
  Lb(b(2), IN + 0.3, "#ffffff", [[{ t: "IT WORKS IN" }], [{ t: "MILLIONTHS", c: "#ffd23f" }], [{ t: "OF A GRAM 🤏" }]]),
  Lb(IN + 0.3, b(5), "#ffd23f", [[{ t: "NEURONS TALK" }], [{ t: "WITH SEROTONIN", c: "#ffd23f" }], [{ t: "VIA RECEPTORS" }]]),
  Lb(b(5), OUT, "#b48cff", [[{ t: "LSD MIMICS IT," }], [{ t: "GETS LOCKED IN", c: "#b48cff" }], [{ t: "FOR HOURS 🔒" }]]),
  Lb(OUT, b(9), "#6ee6cf", [[{ t: "BRAIN REGIONS" }], [{ t: "THAT RARELY TALK", c: "#6ee6cf" }], [{ t: "START CHATTING" }]]),
  Lb(b(9), b(11), "#b48cff", [[{ t: "THE 'SELF' NETWORK" }], [{ t: "QUIETS DOWN →", c: "#b48cff" }], [{ t: "EGO DISSOLUTION" }]]),
  Lb(b(11), b(13), "#ff3a2a", [[{ t: "LASTS 8–12 HOURS" }], [{ t: "RISK: PANIC &", c: "#ff8a7a" }], [{ t: "PSYCHOSIS ⚠️", c: "#ff8a7a" }]]),
  Lb(b(13), D + 0.01, "#b48cff", HOOK, true),
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
        {s === "brain" ? <><Space t={t} map={glow} /><Brain t={t} map={glow} /></> : <Synapse t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: diveCol(t), opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#b48cff" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} tags={s === "syn" ? TAGS : NET_TAGS} />
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
