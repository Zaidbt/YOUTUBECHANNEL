/**
 * Video 012 · Chameleon — Kurzgesagt-inspired drawing + animation, rendered through our pixel-art pipeline.
 * Everything is FLAT 2D vector-style shapes (rounded spline shapes and ribbons, flat colours, no outlines, light rim on
 * top, darker back, lighter belly), seen side-on with parallax layers, animated with bouncy easing (squash on every
 * colour change, pop-ins with overshoot). A crisp colour wave sweeps head → tail on each change (clipping planes).
 * The inside is a flat infographic: white light = all colours (waves) → the gap between crystal rows picks the colour
 * that bounces back → small gap: blue, through the yellow pigment = green → excited: big gap = red.
 * 30 s, 144 BPM "funk 150", seamless loop. Timing from c30k.json (videos/12-chameleon/build_k.py).
 * (The earlier 3D attempt is kept in ChameleonK3D.tsx.)
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import HK from "./c30k.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";
import { STATE, setTimeline, stateAt, useAssets, Timeline } from "./ChameleonVideo";

export const FPS = 60;
export const DURATION = Math.round(HK.duration * FPS);
type V3 = [number, number, number];
type P2 = [number, number];
const D = HK.duration, BAR = HK.bar;
const b = (n: number) => n * BAR;
const TL: Timeline = { colors: HK.colors, tongue: HK.tongue, flyBack: HK.tongue + 1.0, lw: (2 * Math.PI) / D, beamN: 30, dur: D };
const LW = (2 * Math.PI) / D;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; }; // overshoot pop
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;

export const K_PALETTE = [
  "#090d2b", "#121a4a", "#1c2a6e", "#2b3f99",
  "#0f6e6a", "#1fb5a8", "#6ee6cf",
  "#ff4f8b", "#7a4dff", "#b48cff",
  "#4a2a5a", "#7a4a6a",
  "#1f8a4a", "#3fcf6a", "#9bf08a",
  "#c8a010", "#ffd23f", "#fff08a",
  "#c85a10", "#ff8a1f", "#ffbf6a",
  "#8a1414", "#ff3a2a", "#ff8a7a",
  "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#fff3b0", "#05060f",
];
const BG = "#090d2b";

// ---------------- flat-shape helpers ----------------
function blob(pts: P2[], seg = 32) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  s.splineThru([...pts.slice(1), pts[0]].map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ShapeGeometry(s, seg);
}
function ribbon(pts: P2[], w: (u: number) => number) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    let tx = c[0] - a[0], ty = c[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const hw = w(i / (pts.length - 1)) / 2;
    pos.push(pts[i][0] - ty * hw, pts[i][1] + tx * hw, 0, pts[i][0] + ty * hw, pts[i][1] - tx * hw, 0);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
const curve = (pts: P2[], n = 40): P2[] => new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(n).map((v) => [v.x, v.y]);
const Flat: React.FC<{ g: THREE.BufferGeometry; c: string; z?: number; o?: number; clip?: THREE.Plane[] }> = ({ g, c, z = 0, o, clip }) => (
  <mesh geometry={g} position={[0, 0, z]}><meshBasicMaterial color={c} transparent={o !== undefined} opacity={o ?? 1} depthWrite={o === undefined} clippingPlanes={clip ?? null} side={THREE.DoubleSide} /></mesh>
);
const ClipOn: React.FC = () => { const { gl } = useThree(); gl.localClippingEnabled = true; return null; };

// ---------------- the chameleon (flat, side-on, cute) ----------------
type Role = "mid" | "light" | "dark";
type Part = { g: THREE.BufferGeometry; role: Role; z: number };
function buildChameleon(): Part[] {
  const P: Part[] = [];
  const add = (g: THREE.BufferGeometry, role: Role, z: number) => P.push({ g, role, z });
  // far legs (behind the body)
  add(ribbon(curve([[1.05, 1.0], [1.45, 0.5], [1.2, 0.06]], 16), (u) => 0.3 - 0.08 * u), "dark", -0.08);
  add(ribbon(curve([[-1.2, 0.95], [-1.65, 0.5], [-1.35, 0.06]], 16), (u) => 0.32 - 0.08 * u), "dark", -0.08);
  // tail: a tapering spiral
  const tail: P2[] = [[-2.3, 1.55], [-3.0, 1.3], [-3.55, 0.75]];
  for (let i = 0; i <= 30; i++) { const th = 0.6 + (i / 30) * Math.PI * 2.3, r = 0.8 * (1 - i / 38); tail.push([-3.7 + Math.cos(th) * r, -0.05 + Math.sin(th) * r]); }
  add(ribbon(curve(tail, 80), (u) => 0.55 * (1 - u) ** 0.8 + 0.07), "mid", 0);
  // body + head
  add(blob([[1.7, 1.0], [0.6, 0.55], [-0.9, 0.58], [-2.1, 0.98], [-2.55, 1.35], [-2.2, 2.15], [-1.2, 2.85], [0.0, 3.08], [1.1, 2.85], [1.75, 2.4]]), "mid", 0.02);
  add(blob([[1.35, 1.2], [2.3, 1.1], [3.15, 1.25], [3.85, 1.55], [3.35, 2.05], [2.7, 2.55], [2.0, 3.25], [1.55, 3.5], [1.25, 2.8]]), "mid", 0.03);
  // darker back + casque top, lighter belly + lip, stripes, lateral light stripe
  add(blob([[-2.45, 1.75], [-1.7, 2.45], [-0.6, 2.95], [0.4, 3.0], [1.3, 2.75], [1.6, 2.5], [0.9, 2.55], [-0.4, 2.6], [-1.6, 2.15]]), "dark", 0.05);
  add(blob([[1.6, 2.9], [1.95, 3.35], [1.6, 3.48], [1.3, 3.0]]), "dark", 0.06);
  add(blob([[2.0, 1.2], [0.6, 0.62], [-0.9, 0.66], [-2.1, 1.05], [-1.6, 1.12], [-0.5, 0.98], [0.7, 1.0], [1.8, 1.3]]), "light", 0.05);
  add(ribbon(curve([[1.6, 1.32], [2.4, 1.28], [3.2, 1.38], [3.78, 1.52]], 20), (u) => 0.14 * (1 - 0.6 * u)), "light", 0.07);
  for (const x of [-1.5, -0.4, 0.7]) add(blob([[x - 0.15, 2.6], [x + 0.2, 2.65], [x + 0.35, 1.3], [x, 1.2]]), "dark", 0.06);
  add(ribbon(curve([[-2.2, 1.55], [-1.0, 1.4], [0.3, 1.45], [1.4, 1.55]], 24), () => 0.13), "light", 0.07);
  // crest bumps along the back
  for (let i = 0; i < 9; i++) { const x = -1.9 + i * 0.4, y = 2.25 + 0.75 * Math.sin(((x + 2.3) / 3.6) * Math.PI) + (i < 2 ? -0.1 : 0); add(blob([[x - 0.13, y - 0.05], [x, y + 0.24], [x + 0.13, y - 0.05]], 6), "dark", 0.01); }
  // near legs (in front) + gripping feet
  add(ribbon(curve([[1.25, 1.05], [1.65, 0.5], [1.35, 0.06]], 16), (u) => 0.34 - 0.08 * u), "mid", 0.09);
  add(ribbon(curve([[-1.0, 1.0], [-1.5, 0.5], [-1.15, 0.06]], 16), (u) => 0.36 - 0.08 * u), "mid", 0.09);
  for (const x of [1.35, -1.15]) { add(blob([[x - 0.3, 0.12], [x - 0.12, -0.12], [x - 0.02, 0.05]], 8), "dark", 0.1); add(blob([[x + 0.3, 0.12], [x + 0.12, -0.12], [x + 0.02, 0.05]], 8), "dark", 0.1); }
  // the eye turret (skin) — the pupil is drawn separately
  add(new THREE.CircleGeometry(0.46, 32).translate(2.62, 2.08, 0), "mid", 0.11);
  add(new THREE.RingGeometry(0.4, 0.46, 32).translate(2.62, 2.08, 0), "dark", 0.12);
  // light rim along the top of the back and head (Kurzgesagt-style rim light)
  add(ribbon(curve([[-2.25, 2.1], [-1.2, 2.8], [0.0, 3.03], [1.05, 2.8], [1.55, 2.6]], 40), () => 0.07), "light", 0.13);
  add(ribbon(curve([[2.0, 3.22], [2.7, 2.52], [3.3, 2.03], [3.75, 1.62]], 30), () => 0.06), "light", 0.13);
  return P;
}
const WAVE_NEW = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), EDGE_HI = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
const TILT = 0.1;                                                          // climbing slightly: fills the portrait frame better
const MOUTH: P2 = [3.75, 1.48];
const flyPos = (t: number): P2 => [7.4 + 0.5 * Math.sin(6 * LW * t), 2.9 + 0.4 * Math.sin(9 * LW * t + 1)];
const tongueLen = (t: number) => { const d = t - (HK.tongue - 0.12); if (d < 0 || d > 0.7) return 0; return d < 0.12 ? d / 0.12 : Math.max(0, 1 - (d - 0.12) / 0.5); };
const flyAlive = (t: number) => t < HK.tongue || t > HK.tongue + 1.0;
const mouthG = ribbon(curve([[3.78, 1.5], [3.2, 1.42], [2.55, 1.46]], 16), (u) => 0.05 * (1 - 0.5 * u));
const Chameleon2D: React.FC<{ t: number }> = ({ t }) => {
  const parts = useMemo(buildChameleon, []);
  const { s: cur, prev, at } = stateAt(t);
  const S1 = STATE[cur], S0 = STATE[prev];
  const age = t - at, front = age * 34;                                     // wave: snout → tail tip in ~0.35 s
  const edge = 4.2 - front;                                                 // world x of the colour edge
  WAVE_NEW.constant = -edge; EDGE_HI.constant = edge + 0.28;
  const waving = edge > -6.5;
  const pop = age < 1 ? Math.exp(-age / 0.12) : 0;                          // squash on every change
  const bob = 0.035 * Math.sin(8 * LW * t);
  const yaw = 0.16 * Math.sin(7 * LW * t), pit = 0.12 * Math.sin(5 * LW * t + 1);
  const L = tongueLen(t), fly = flyPos(t), tip: P2 = [MOUTH[0] + (fly[0] - MOUTH[0]) * L, MOUTH[1] + (fly[1] - MOUTH[1]) * L];
  const tongue = L > 0 ? ribbon([MOUTH, tip], () => 0.14) : null;
  return (
    <group rotation={[0, 0, TILT]}>
      <group position={[0, bob, 0]} scale={[1 - 0.04 * pop, 1 + 0.07 * pop, 1]}>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {waving && <Flat g={p.g} c={S0[p.role]} z={p.z} />}
            <Flat g={p.g} c={S1[p.role]} z={p.z + 0.004} clip={waving ? [WAVE_NEW] : undefined} />
            {waving && p.role !== "dark" && <Flat g={p.g} c={S1.light} z={p.z + 0.006} clip={[WAVE_NEW, EDGE_HI]} />}
          </React.Fragment>
        ))}
        {/* pupil + shine */}
        <mesh position={[2.67 + 0.16 * Math.cos(yaw), 2.08 + 0.16 * pit, 0.14]}><circleGeometry args={[0.14, 20]} /><meshBasicMaterial color="#05060f" /></mesh>
        <mesh position={[2.72 + 0.16 * Math.cos(yaw), 2.14 + 0.16 * pit, 0.15]}><circleGeometry args={[0.045, 12]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <Flat g={mouthG} c="#05060f" z={0.14} />
        {tongue && <><Flat g={tongue} c="#ff8a7a" z={0.15} /><mesh position={[tip[0], tip[1], 0.16]}><circleGeometry args={[0.22, 20]} /><meshBasicMaterial color="#ff3a2a" /></mesh></>}
      </group>
      {flyAlive(t) && (
        <group position={[fly[0], fly[1], 0.2]}>
          <mesh><circleGeometry args={[0.18, 16]} /><meshBasicMaterial color="#05060f" /></mesh>
          {[1, -1].map((s) => <mesh key={s} position={[s * 0.08, 0.17, -0.01]} rotation={[0, 0, s * (0.5 + 0.4 * Math.sin(t * 90))]} scale={[0.12, 0.22, 1]}><circleGeometry args={[1, 12]} /><meshBasicMaterial color="#bfe6ff" transparent opacity={0.85} /></mesh>)}
        </group>
      )}
    </group>
  );
};

// ---------------- the night jungle (flat parallax layers) ----------------
const sky = (() => { const g = new THREE.PlaneGeometry(200, 120, 1, 8); const c: number[] = []; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = clamp01((p.getY(i) + 20) / 70); const col = new THREE.Color("#090d2b").lerp(new THREE.Color("#2b3f99"), k); c.push(col.r, col.g, col.b); } g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; })();
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 500) - 0.5) * 90, y: 4 + rnd(i + 501) * 40, s: 0.06 + rnd(i + 502) * 0.12, ph: rnd(i + 503) * 6 }));
const clusters = (n: number, seed: number, y0: number, spread: number, rmin: number, rmax: number) => Array.from({ length: n }, (_, i) => ({ x: (rnd(seed + i) - 0.5) * spread, y: y0 + rnd(seed + i + 50) * 3, r: rmin + rnd(seed + i + 90) * (rmax - rmin) }));
const FAR = clusters(26, 600, -2, 120, 2.5, 5);
const MID = clusters(22, 700, -4, 80, 2, 3.6);
const leafG = blob([[0, 0], [0.9, 0.35], [2.0, 0], [0.9, -0.35]], 16);
const NEAR = Array.from({ length: 18 }, (_, i) => ({ p: [(rnd(i + 800) - 0.5) * 26, (rnd(i + 801) - 0.4) * 18, -4 - rnd(i + 802) * 4] as V3, s: 1.3 + rnd(i + 803) * 1.4, r: rnd(i + 804) * Math.PI * 2 }));
const branchG = ribbon(curve([[-30, -0.15], [0, -0.42], [30, -0.75]], 30), () => 0.85);
const branchTop = ribbon(curve([[-30, 0.17], [0, -0.1], [30, -0.43]], 30), () => 0.12);
const KJungle: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => (
  <group>
    <mesh geometry={sky} position={[0, 10, -60]}><meshBasicMaterial vertexColors /></mesh>
    {STARS.map((s, i) => <mesh key={`s${i}`} position={[s.x, s.y, -58]}><circleGeometry args={[s.s * (0.7 + 0.3 * Math.sin(6 * LW * t + s.ph)), 6]} /><meshBasicMaterial color="#fff3b0" /></mesh>)}
    {/* moon with halo rings */}
    {[5.5, 4.2, 3.2].map((r, i) => <mesh key={`h${i}`} position={[6, 13, -56 + i * 0.1]}><circleGeometry args={[r, 40]} /><meshBasicMaterial color="#b48cff" transparent opacity={0.07 + i * 0.05} /></mesh>)}
    <mesh position={[6, 13, -55.5]}><circleGeometry args={[2.4, 40]} /><meshBasicMaterial color="#fff3b0" /></mesh>
    <mesh position={[5.3, 13.6, -55.4]}><circleGeometry args={[0.5, 20]} /><meshBasicMaterial color="#fff08a" /></mesh>
    {/* rounded jungle silhouettes: far, mid */}
    {FAR.map((c, i) => <mesh key={`f${i}`} position={[c.x, c.y, -40]}><circleGeometry args={[c.r, 24]} /><meshBasicMaterial color="#121a4a" /></mesh>)}
    {MID.map((c, i) => <mesh key={`m${i}`} position={[c.x + 0.2 * Math.sin(2 * LW * t + i), c.y, -22]}><circleGeometry args={[c.r, 24]} /><meshBasicMaterial color="#1c2a6e" /></mesh>)}
    {/* near leaves with a light midrib */}
    {NEAR.map((l, i) => (
      <group key={`n${i}`} position={l.p} rotation={[0, 0, l.r + 0.08 * Math.sin(2 * LW * t + i)]} scale={l.s}>
        <Flat g={leafG} c={i % 3 === 0 ? "#1fb5a8" : "#0f6e6a"} />
        <mesh position={[1.0, 0, 0.01]}><planeGeometry args={[1.8, 0.05]} /><meshBasicMaterial color="#6ee6cf" /></mesh>
      </group>
    ))}
    {/* vines */}
    {Array.from({ length: 5 }, (_, i) => <Flat key={`v${i}`} g={ribbon(curve([[-7 + i * 3.4, 12], [-7.2 + i * 3.4 + 0.3 * Math.sin(2 * LW * t + i), 7], [-6.8 + i * 3.4, 3 + rnd(i + 900) * 2]], 20), () => 0.1)} c="#1fb5a8" z={-2 - i * 0.2} />)}
    {/* the branch */}
    <Flat g={branchG} c="#4a2a5a" z={-0.3} />
    <Flat g={branchTop} c="#7a4a6a" z={-0.29} />
    {/* flowers + fireflies */}
    {[[-3.2, -2.6, 0.6], [5.4, -2.2, 0.6]].map(([x, y, z], i) => (
      <group key={`fl${i}`} position={[x, y, z]} scale={1 + 0.06 * Math.sin(4 * LW * t + i)}>
        {Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[0.3 * Math.cos((k / 5) * Math.PI * 2), 0.3 * Math.sin((k / 5) * Math.PI * 2), 0]}><circleGeometry args={[0.24, 16]} /><meshBasicMaterial color="#ff4f8b" /></mesh>)}
        <mesh position={[0, 0, 0.01]}><circleGeometry args={[0.18, 16]} /><meshBasicMaterial color="#fff08a" /></mesh>
      </group>
    ))}
    {Array.from({ length: 22 }, (_, i) => <Glow key={`ff${i}`} map={map} at={[(rnd(i + 60) - 0.5) * 16 + 0.6 * Math.sin(3 * LW * t + i), (rnd(i + 61) - 0.3) * 13 + 0.5 * Math.cos(2 * LW * t + i), -1 + rnd(i + 62) * 2]} size={0.5} color="#fff08a" opacity={0.4 + 0.6 * Math.max(0, Math.sin(5 * LW * t + i * 1.7))} />)}
    {/* foreground framing leaves (parallax) */}
    <group position={[-4.6, 9.5, 4]} rotation={[0, 0, -0.9]} scale={2.6}><Flat g={leafG} c="#0f6e6a" /></group>
    <group position={[4.2, -5.6, 4]} rotation={[0, 0, 2.6]} scale={2.8}><Flat g={leafG} c="#0f6e6a" /></group>
  </group>
);

// ---------------- inside the skin: a flat infographic ----------------
const SURF_Y = 4.4, PIG_Y = 3.5, ROW0 = 2.2, NROWS = 5;
const WCOL = ["#4a9aff", "#3fcf6a", "#ffd23f", "#ff3a2a"];
const WLEN = [0.5, 0.62, 0.75, 0.95];
const DIR = new THREE.Vector2(0.62, -1).normalize();
const E: P2 = [-0.9, SURF_Y], H: P2 = [-0.9 + (SURF_Y - ROW0) * 0.62, ROW0], X: P2 = [H[0] + (SURF_Y - ROW0) * 0.62, SURF_Y];
const S0: P2 = [E[0] - DIR.x * 4.5, E[1] - DIR.y * 4.5], O: P2 = [X[0] + DIR.x * 4.5, X[1] - DIR.y * 4.5], T0: P2 = [H[0] + DIR.x * 5, H[1] + DIR.y * 5];
const IN = b(3), OUT = b(11), FADE = 0.28;
/** a thick travelling sine ribbon from a to c */
const WaveR: React.FC<{ a: P2; c: P2; lam: number; color: string; t: number; w?: number; amp?: number; off?: number; o?: number; draw?: number }> = ({ a, c, lam, color, t, w = 0.1, amp = 0.16, off = 0, o, draw = 1 }) => {
  if (draw <= 0.001) return null;
  const dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const n = Math.max(2, Math.floor((len * draw) / 0.05));
  const pts: P2[] = Array.from({ length: n }, (_, i) => { const s = (i / (n - 1)) * len * draw, q = amp * Math.sin(2 * Math.PI * (s / lam - t * 1.6)) + off; return [a[0] + ux * s + px * q, a[1] + uy * s + py * q]; });
  return <Flat g={ribbon(pts, () => w)} c={color} z={0.3} o={o} />;
};
const hexG = new THREE.CircleGeometry(0.2, 6);
const hexShade = new THREE.CircleGeometry(0.2, 6, Math.PI, Math.PI);
const cellG = blob([[-0.66, 0], [-0.3, 0.38], [0.35, 0.36], [0.68, 0.02], [0.32, -0.36], [-0.34, -0.35]], 20);
const surfG = (() => { const pts: P2[] = []; for (let i = 0; i <= 60; i++) { const x = -10 + i / 3; pts.push([x, SURF_Y + 0.25 + 0.06 * Math.sin(x * 3)]); } return ribbon(pts, () => 0.5); })();
const rise = (y: number): P2 => [lerp(H[0], X[0], (y - ROW0) / (SURF_Y - ROW0)), y];
const KSkin: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const { s: cur, prev, at } = stateAt(t);
  const sp = lerp(STATE[prev].s, STATE[cur].s, ease((t - at) / 0.15));
  const gap = 0.5 + 0.45 * sp, ri = cur, st = STATE[cur];
  const step = t < b(5) ? 1 : t < b(7) ? 2 : 3;
  const tin = t - IN;                                                        // time since we arrived inside (pop-ins)
  const rows = Array.from({ length: NROWS }, (_, r) => ROW0 - r * gap);
  const notes = HK.waves.filter(([wt]) => t >= wt), last = notes[notes.length - 1], nAge = last ? t - last[0] : 9;
  return (
    <group>
      {/* backdrop: soft rounded glows and drifting particles */}
      <mesh position={[0, 2, -6]}><circleGeometry args={[9, 40]} /><meshBasicMaterial color="#121a4a" /></mesh>
      <mesh position={[0, 2, -5.9]}><circleGeometry args={[6, 40]} /><meshBasicMaterial color="#1c2a6e" transparent opacity={0.6} /></mesh>
      {Array.from({ length: 26 }, (_, i) => <mesh key={`p${i}`} position={[(rnd(i + 300) - 0.5) * 12 + 0.3 * Math.sin(2 * LW * t + i), (rnd(i + 310) - 0.5) * 10 + 2 + 0.3 * Math.cos(3 * LW * t + i), -1]}><circleGeometry args={[0.05 + 0.04 * rnd(i + 320), 8]} /><meshBasicMaterial color="#6ee6cf" /></mesh>)}
      {/* skin surface: a wavy band in the colour we see, with a light rim */}
      <Flat g={surfG} c={st.mid} z={0.05} />
      <mesh position={[0, SURF_Y + 0.48, 0.06]}><planeGeometry args={[20, 0.08]} /><meshBasicMaterial color={st.light} /></mesh>
      {/* yellow pigment cells (pop in) */}
      {Array.from({ length: 10 }, (_, i) => { const k = backOut((tin - 0.3 - i * 0.04) / 0.35); return (
        <group key={`y${i}`} position={[-6.75 + i * 1.5, PIG_Y + 0.05 * Math.sin(3 * LW * t + i), 0.1]} scale={[Math.max(0.001, k * (1 + 0.04 * Math.sin(4 * LW * t + i))), Math.max(0.001, k), 1]}>
          <Flat g={cellG} c="#ffd23f" />
          <mesh position={[-0.2, 0.12, 0.01]} scale={[0.35, 0.12, 1]}><circleGeometry args={[1, 16]} /><meshBasicMaterial color="#fff08a" /></mesh>
          <mesh position={[0.18, -0.03, 0.02]}><circleGeometry args={[0.12, 16]} /><meshBasicMaterial color="#c85a10" /></mesh>
        </group>); })}
      {/* crystal rows: rounded hexagons with a shaded half and a shine, popping in row by row */}
      {rows.map((y, r) => Array.from({ length: 19 }, (_, i) => {
        const k = Math.max(0.001, backOut((tin - 0.5 - r * 0.08 - Math.abs(i - 9) * 0.015) / 0.3)), tw = Math.max(0, Math.sin((11 + ((i + r) % 7)) * LW * t + i * 2.1 + r)) ** 24;
        return (
          <group key={`c${r}-${i}`} position={[-5.4 + i * 0.6, y, 0.15]} scale={k} rotation={[0, 0, 0.1 * Math.sin(3 * LW * t + i + r)]}>
            <mesh geometry={hexG}><meshBasicMaterial color="#4a9aff" /></mesh>
            <mesh geometry={hexShade} position={[0, 0, 0.01]}><meshBasicMaterial color="#1f4abf" /></mesh>
            <mesh position={[-0.07, 0.07, 0.02]}><circleGeometry args={[0.045, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
            {tw > 0.05 && <Glow map={map} at={[0.05, 0.05, 0.1]} size={0.2 + 0.4 * tw} color="#ffffff" opacity={tw} />}
          </group>
        );
      }))}
      {/* melanophores: dark cells with arms, soaking up what passes through */}
      {Array.from({ length: 6 }, (_, i) => { const x = -6.25 + i * 2.5, y = rows[NROWS - 1] - 0.95; return (
        <group key={`m${i}`}>
          {[-0.9, -0.35, 0.35, 0.9].map((dx, k2) => <Flat key={k2} g={ribbon([[x + dx * 0.3, y], [x + dx, y + 0.55]], () => 0.12)} c="#4a2a5a" z={0.08} />)}
          <mesh position={[x, y, 0.09]} scale={[0.8, 0.4, 1]}><circleGeometry args={[1, 24]} /><meshBasicMaterial color="#4a2a5a" /></mesh>
          <mesh position={[x + 0.15, y, 0.1]}><circleGeometry args={[0.13, 12]} /><meshBasicMaterial color="#7a4a6a" /></mesh>
        </group>); })}
      {/* the gap gauge */}
      {step >= 2 && (
        <group position={[1.95, (rows[0] + rows[1]) / 2, 0.4]} scale={Math.max(0.001, backOut((t - b(5) - 0.2) / 0.3))}>
          <mesh position={[0, gap / 2, 0]}><planeGeometry args={[0.5, 0.07]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh position={[0, -gap / 2, 0]}><planeGeometry args={[0.5, 0.07]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh><planeGeometry args={[0.09, gap]} /><meshBasicMaterial color={WCOL[ri]} /></mesh>
        </group>
      )}
      {/* light: white in → all colours → only the colour that fits the gap comes back out */}
      <WaveR a={S0} c={E} lam={0.55} color="#ffffff" t={t} w={0.12} draw={clamp01(tin / 0.5)} />
      {WCOL.map((col, i) => (step === 1 || i !== ri) && <WaveR key={`d${i}`} a={E} c={step === 1 ? T0 : H} lam={WLEN[i]} color={col} t={t} w={0.07} amp={0.12} off={(i - 1.5) * 0.17} o={step === 1 ? undefined : 0.45} draw={step === 1 ? clamp01((tin - 0.4) / 0.6) : 1} />)}
      {step >= 2 && WCOL.map((col, i) => i !== ri && <WaveR key={`th${i}`} a={H} c={T0} lam={WLEN[i]} color={col} t={t} w={0.05} amp={0.12} off={(i - 1.5) * 0.17} o={0.3} />)}
      {step >= 2 && <WaveR a={E} c={H} lam={WLEN[ri]} color={WCOL[ri]} t={t} w={0.13} />}
      {step >= 2 && <WaveR a={H} c={rise(PIG_Y - 0.4)} lam={WLEN[ri]} color={WCOL[ri]} t={t} w={0.14} amp={0.2} draw={clamp01((t - b(5)) / 0.5)} />}
      {step >= 2 && t > b(5) + 0.4 && <WaveR a={rise(PIG_Y + 0.4)} c={O} lam={0.62} color={step >= 3 ? st.mid : WCOL[ri]} t={t} w={0.14} amp={0.2} draw={clamp01((t - b(5) - 0.4) / 0.5)} />}
      {step >= 2 && <Glow map={map} at={[H[0], H[1], 0.5]} size={1.2 + 0.8 * Math.exp(-(t - at) / 0.2)} color={WCOL[ri]} opacity={0.8} />}
      {last && nAge < 0.3 && <mesh position={[E[0], E[1], 0.5]} scale={0.3 + nAge * 3}><ringGeometry args={[0.85, 1, 24]} /><meshBasicMaterial color={WCOL[last[1]]} transparent opacity={1 - nAge / 0.3} /></mesh>}
    </group>
  );
};
const FOV = 20;
type Tag = { txt: string; at: (t: number) => V3; from: number; to: number; col: string };
const gapAt = (t: number) => { const { s: cur, prev, at } = stateAt(t); return 0.5 + 0.45 * lerp(STATE[prev].s, STATE[cur].s, ease((t - at) / 0.15)); };
const TAGS: Tag[] = [
  { txt: "WHITE LIGHT", at: () => [E[0] + 1.0, E[1] + 0.8, 0.5], from: IN + 0.7, to: b(5), col: "#ffffff" },
  { txt: "CRYSTALS", at: (t) => [1.35, ROW0 - 3 * gapAt(t) - 0.1, 0.5], from: b(5), to: OUT, col: "#4a9aff" },
  { txt: "GAP", at: () => [1.95, ROW0 + 0.25, 0.5], from: b(5) + 0.3, to: OUT, col: "#ffffff" },
  { txt: "YELLOW PIGMENT", at: () => [-1.0, PIG_Y + 0.55, 0.5], from: b(7), to: b(9), col: "#ffd23f" },
];
const Tags: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g) => { const [x, y] = project(g.at(t), cam, FOV); const k = backOut((t - g.from) / 0.25); return (
    <div key={g.txt} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 28, color: "#ffffff", background: "rgba(9,13,43,0.92)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #05060f", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{g.txt}</div>); })}</>
);

// ---------------- camera (near-orthographic, side-on), labels ----------------
const inSkin = (t: number) => t >= IN && t < OUT;
const HOME = { p: [-0.25, 1.9, 42] as V3, l: [-0.25, 1.9, 0] as V3 };
const FLANKP = { p: [-0.4, 1.75, 4] as V3, l: [-0.4, 1.75, 0] as V3 };
const CAM_A: CamKey[] = [
  { t: 0, ...HOME }, { t: 0.4, ...HOME },
  { t: b(2), p: [-0.3, 1.85, 36], l: [-0.3, 1.85, 0] },
  { t: IN - 0.35, p: [-0.4, 1.78, 10], l: [-0.4, 1.78, 0] },
  { t: IN, ...FLANKP },
];
const CAM_S: CamKey[] = [
  { t: IN, p: [0.4, 4.7, 6], l: [0.4, 4.6, 0] },
  { t: IN + 1.0, p: [0.4, 3.4, 30], l: [0.4, 3.4, 0] },
  { t: b(5) + 0.4, p: [0.6, 3.2, 27], l: [0.6, 3.2, 0] },
  { t: b(7) + 0.4, p: [0.6, 3.5, 28.5], l: [0.6, 3.5, 0] },
  { t: b(9) + 0.2, p: [0.6, 3.2, 30], l: [0.6, 3.2, 0] },
  { t: OUT - 0.7, p: [0.5, 3.4, 29], l: [0.5, 3.4, 0] },
  { t: OUT, p: [0.4, 4.7, 6], l: [0.4, 4.6, 0] },
];
const CAM_B: CamKey[] = [
  { t: OUT, ...FLANKP },
  { t: OUT + 0.5, p: [-0.4, 1.8, 14], l: [-0.4, 1.8, 0] },
  { t: OUT + 1.4, p: [-0.2, 1.9, 40], l: [-0.2, 1.9, 0] },
  { t: b(12.6), p: [3.6, 2.6, 40], l: [3.6, 2.6, 0] },
  { t: b(14.6), p: [3.6, 2.6, 40], l: [3.6, 2.6, 0] },
  { t: 28.4, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => (t < IN ? camAt(CAM_A, t) : inSkin(t) ? camAt(CAM_S, t) : camAt(CAM_B, t));
const diveAt = (t: number) => Math.max(...[IN, OUT].map((x) => (t < x ? 1 - Math.min(1, (x - t) / FADE) : 1 - Math.min(1, (t - x) / FADE))));

const S = STATE;
const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "HOW DOES A" }], [{ t: "CHAMELEON", c: S[0].mid }], [{ t: "CHANGE COLOR? 🤯" }]];
const RAINBOW = [{ t: "A", c: "#ff3a2a" }, { t: "L", c: "#ff8a1f" }, { t: "L", c: "#ffd23f" }, { t: " " }, { t: "C", c: "#3fcf6a" }, { t: "O", c: "#1fb5a8" }, { t: "L", c: "#4a9aff" }, { t: "O", c: "#7a4dff" }, { t: "R", c: "#ff4f8b" }, { t: "S", c: "#ff3a2a" }];
const LABELS: LabelDef[] = [
  Lb(0, b(2), S[0].mid, HOOK, true),
  Lb(b(2), b(3) + 0.3, S[0].mid, [[{ t: "THE SECRET IS" }], [{ t: "IN ITS SKIN 👀", c: S[0].mid }]]),
  Lb(b(3) + 0.3, b(5), "#ffffff", [[{ t: "LIGHT IS A MIX" }], [{ t: "OF " }, ...RAINBOW]]),
  Lb(b(5), b(7), "#4a9aff", [[{ t: "THE GAP BETWEEN" }], [{ t: "CRYSTAL ROWS", c: "#4a9aff" }], [{ t: "PICKS ONE COLOR" }]]),
  Lb(b(7), b(9), S[0].mid, [[{ t: "SMALL GAP → " }, { t: "BLUE", c: "#4a9aff" }], [{ t: "+ " }, { t: "YELLOW", c: "#ffd23f" }, { t: " PIGMENT" }], [{ t: "= " }, { t: "GREEN", c: S[0].mid }]]),
  Lb(b(9), b(11), S[3].mid, [[{ t: "EXCITED:" }], [{ t: "IT STRETCHES" }], [{ t: "BIG GAP → " }, { t: "RED", c: S[3].mid }]]),
  Lb(b(11), b(13), S[3].mid, [[{ t: "NOT TO HIDE..." }], [{ t: "IT'S TO TALK", c: S[3].mid }], [{ t: "TO RIVALS, MATES" }]]),
  Lb(b(13), b(15), "#ff8a7a", [[{ t: "BONUS: ITS TONGUE" }], [{ t: "UP TO 2X", c: "#ff8a7a" }], [{ t: "ITS BODY" }]]),
  Lb(b(15), D + 0.01, S[0].mid, HOOK, true),
];

const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const ChameleonK: React.FC = () => {
  setTimeline(TL);
  const t = useCurrentFrame() / FPS;
  const a = useAssets();
  const skin = inSkin(t);
  const cam = camFor(t);
  const st = STATE[stateAt(t).s];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/12-chameleon/c30k.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={K_PALETTE} outline={false} dither={0.05}>
        <ClipOn />
        <CamSet p={cam.p} l={cam.l} />
        {skin ? <KSkin t={t} map={a.glow} /> : <><KJungle t={t} map={a.glow} /><Chameleon2D t={t} /></>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: st.mid, opacity: diveAt(t) }} />
      <div style={{ ...tag, position: "absolute", left: 48, top: 60, color: st.mid }}>● {st.name}</div>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#fff08a" }}>@HOWTOWITHZAY</div>
      {skin && <Tags t={t} cam={cam} />}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
