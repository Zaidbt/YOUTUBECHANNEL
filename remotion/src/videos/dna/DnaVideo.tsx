/**
 * Video 008 · How does your DNA copy itself? — true pixel-art 3D, 48 s seamless loop @ 60 fps, 150 BPM.
 * Helix → nucleus (2 m of DNA) → the 4-letter code → helicase unzips (drop 1) → polymerase adds matching letters
 * (each letter is a note) → two helices, each 1 old + 1 new strand → proofreading → thousands of forks (drop 2)
 * → the cell divides → back to one helix. Event times + sequence from dna.json (videos/08-dna/build.py).
 *
 * Geometry: every half base pair has a backbone point on a circle (radius R) around its axis centre and points
 * toward that centre. Unzipping slides the old halves' centres apart (0 → ±4.5) and turns them flat; new halves
 * appear on the inner side; twisting rolls each ladder into its own helix. The left helix (old A + new strand)
 * ends exactly where the opening helix started, so the loop is seamless.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./dna.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const LW = (2 * Math.PI) / EV.duration;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const stepped = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 3) / 3;
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export const CELL_PALETTE = [
  "#030612", "#081226", "#0e1f3d", "#16305c", "#22457d", "#2a1a4a", "#4a2a7a", "#3ad6ff", "#1f8fbf", "#ff5cc8", "#b0308a", "#3ee06a",
  "#1f9a45", "#ff4a4a", "#a82020", "#ffd23f", "#c79a10", "#4a7dff", "#2a4ab8", "#ff9a1f", "#b05cff", "#ffffff", "#cfe6ff", "#0b0b14",
];
const BG = "#030612";
const LETTER: Record<string, string> = { A: "#3ee06a", T: "#ff4a4a", C: "#ffd23f", G: "#4a7dff" };
const PAIR: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
const STRAND = { a: "#3ad6ff", b: "#ff5cc8", fresh: "#ffffff" };
const R = 1.6, DY = 0.62, DELTA = (2 * Math.PI) / 10, N = EV.N, SEQ = EV.seq;
const yOf = (k: number) => (N / 2 - k) * DY;
const ROT_N = 6; // helix turns 6 times per loop
const rot = (t: number) => ROT_N * LW * t;

// ---------- per base-pair state ----------
const unzipU = (k: number, t: number) => (t < 14 ? 0 : ease((t - EV.unzip[k]) / 0.3));
const addC = (k: number, t: number) => (t < 17 ? 0 : ease((t - EV.add[k]) / 0.18));
const twistK = (t: number) => ease((t - EV.twist[0]) / (EV.twist[1] - EV.twist[0]));
function centers(t: number): [number, number] {
  if (t < 36.8) return [-4.5, 4.5];
  if (t < 44.8) { const k = ease((t - 36.8) / 2.4); return [-4.5 - 3.5 * k, 4.5 + 3.5 * k]; }
  const k = ease((t - 44.8) / 1.6);
  return [-8 + 8 * k, 8 + 26 * k];
}
type Half = { p: V3; c: V3; letter: string; strand: string; s: number; glow?: number };
function halves(t: number): Half[] {
  const out: Half[] = [];
  const [cl, cr] = centers(t);
  const tw = twistK(t), r = rot(t);
  const mature = ease((t - 40) / 2); // the new strands "settle" into the strand colours they'll have at the loop point
  const pos = (cx: number, ang: number, y: number): V3 => [cx + R * Math.cos(ang), y, R * Math.sin(ang)];
  for (let k = 0; k < N; k++) {
    const y = yOf(k), u = unzipU(k, t), c = addC(k, t), helixA = k * DELTA + r;
    const twistAng = tw * (k * DELTA + r + Math.PI);
    // old strand A → left ladder (faces +x: angle π), old strand B → right ladder (angle 0)
    const aAng = helixA + wrapPi(Math.PI - helixA) * u + twistAng;
    const bAng = helixA + Math.PI + wrapPi(0 - (helixA + Math.PI)) * u + twistAng;
    const ca = cl * u, cb = cr * u;
    out.push({ p: pos(ca, aAng, y), c: [ca, y, 0], letter: SEQ[k], strand: STRAND.a, s: 1 });
    out.push({ p: pos(cb, bAng, y), c: [cb, y, 0], letter: PAIR[SEQ[k]], strand: STRAND.b, s: 1 });
    if (c > 0) {
      let letterA = PAIR[SEQ[k]], sA = c, glow = 0;
      if (k === EV.errIdx && t >= EV.error[0] && t < EV.error[2]) { letterA = t < EV.error[1] ? "WRONG" : ""; sA = t < EV.error[1] ? 1 : 0; glow = 1; }
      const freshA = mature > 0.5 ? STRAND.b : STRAND.fresh, freshB = mature > 0.5 ? STRAND.a : STRAND.fresh;
      out.push({ p: pos(cl, 0 + twistAng, y), c: [cl, y, 0], letter: letterA, strand: freshA, s: sA, glow });
      out.push({ p: pos(cr, Math.PI + twistAng, y), c: [cr, y, 0], letter: SEQ[k], strand: freshB, s: c });
    }
  }
  return out;
}

// ---------- drawing ----------
function useToon() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 220, 220, 220, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
  }, []);
}
const X = new THREE.Vector3(1, 0, 0);
const HalfBase: React.FC<{ h: Half; toon: THREE.Texture }> = ({ h, toon }) => {
  if (h.s <= 0.01 || !h.letter) return null;
  const p = new THREE.Vector3(...h.p), c = new THREE.Vector3(...h.c);
  const dir = c.clone().sub(p); const len = dir.length() * 0.94; dir.normalize();
  const mid = p.clone().add(dir.clone().multiplyScalar(len / 2));
  const q = new THREE.Quaternion().setFromUnitVectors(X, dir);
  const col = h.letter === "WRONG" ? "#ff4a4a" : LETTER[h.letter];
  return (
    <group scale={h.s} position={[0, 0, 0]}>
      <mesh position={mid.toArray()} quaternion={q}><boxGeometry args={[len, 0.3, 0.2]} /><meshToonMaterial color={col} gradientMap={toon} emissive={col} emissiveIntensity={0.25} /></mesh>
      <mesh position={h.p}><sphereGeometry args={[0.3, 10, 8]} /><meshToonMaterial color={h.strand} gradientMap={toon} emissive={h.strand} emissiveIntensity={0.2} /></mesh>
    </group>
  );
};
const Backbone: React.FC<{ pts: V3[]; color: string }> = ({ pts, color }) => {
  if (pts.length < 2) return null;
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), pts.length * 4, 0.12, 5, false);
  return <mesh geometry={g}><meshBasicMaterial color={color} /></mesh>;
};

// ---------- nucleus scene (2 m of DNA in ~6 µm) ----------
const TANGLE: V3[] = (() => {
  const pts: V3[] = []; let p: V3 = [0, 0, 0]; const v = new THREE.Vector3(1, 0.3, 0.2);
  for (let i = 0; i < 520; i++) {
    v.add(new THREE.Vector3(rnd(i) - 0.5, rnd(i + 1e3) - 0.5, rnd(i + 2e3) - 0.5).multiplyScalar(0.9)).normalize();
    let n: V3 = [p[0] + v.x * 0.55, p[1] + v.y * 0.55, p[2] + v.z * 0.55];
    if (Math.hypot(...n) > 6.6) { v.multiplyScalar(-1); n = [p[0] + v.x * 0.55, p[1] + v.y * 0.55, p[2] + v.z * 0.55]; }
    pts.push(n); p = n;
  }
  return pts;
})();
const Nucleus: React.FC<{ t: number; toon: THREE.Texture }> = ({ t, toon }) => {
  const g = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(TANGLE.map((p) => new THREE.Vector3(...p))), 1600, 0.09, 4, false), []);
  return (
    <group rotation={[0.3, 2 * LW * t, 0]}>
      <mesh geometry={g}><meshToonMaterial color="#3ad6ff" gradientMap={toon} emissive="#1f8fbf" emissiveIntensity={0.5} /></mesh>
      <mesh><sphereGeometry args={[7.4, 32, 24]} /><meshToonMaterial color="#22457d" gradientMap={toon} transparent opacity={0.25} side={THREE.BackSide} depthWrite={false} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} rotation={[i * 1.05, i * 0.6, 0]}><torusGeometry args={[7.4, 0.06, 4, 64]} /><meshBasicMaterial color="#4a7dff" /></mesh>)}
    </group>
  );
};

// ---------- storm: thousands of forks (replication bubbles opening everywhere) ----------
const BUBBLES = EV.storm.map((t0, k) => ({ t0, y: -13 + rnd(k + 400) * 26, lane: k % 3 }));
const StormThread: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const out: React.ReactNode[] = [];
  for (let lane = 0; lane < 3; lane++) for (let i = 0; i < 120; i++) {
    const LX = (lane - 1) * 6.5;
    const y = -15 + (i / 119) * 30;
    let sep = 0, front = 0;
    for (const b of BUBBLES) {
      if (t < b.t0 || b.lane !== lane) continue;
      const w = (t - b.t0) * 2.6, d = Math.abs(y - b.y);
      const s = Math.max(0, Math.min(1, (w - d) / 0.8));
      if (s > sep) sep = s;
      if (s > 0 && s < 1) front = Math.max(front, 1 - Math.abs(s - 0.5) * 2);
    }
    const x0 = LX + 0.4 * Math.sin(y * 0.8 + lane * 2 + ROT_N * LW * t);
    out.push(<Glow key={`a${lane}-${i}`} map={map} at={[x0 - 1.1 * sep - 0.2, y, 0]} size={0.6} color={STRAND.a} opacity={0.9} />);
    out.push(<Glow key={`b${lane}-${i}`} map={map} at={[x0 + 1.1 * sep + 0.2, y, 0]} size={0.6} color={STRAND.b} opacity={0.9} />);
    if (sep > 0.6) out.push(<Glow key={`n${lane}-${i}`} map={map} at={[x0, y, 0.1]} size={0.45} color="#ffffff" opacity={0.6} />);
    if (front > 0.3) out.push(<Glow key={`f${lane}-${i}`} map={map} at={[x0, y, 0.2]} size={1.6} color="#ff9a1f" opacity={front} />);
  }
  return <>{out}</>;
};

// ---------- cameras ----------
const HOME = { p: [0, -1, 31] as V3, l: [0, 2.2, 0] as V3 };
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 1.4, ...HOME },
  { t: 4.8, p: [0, 0, 22], l: [0, 1.5, 0] },
  { t: 8.0, p: [5, 3.5, 13], l: [0, 3.5, 0] },                 // the letters
  { t: 11.2, p: [-4, 1, 12.5], l: [0, 1, 0] },
  { t: 14.4, p: [2.5, 6.5, 23], l: [0, 5, 0] },                 // the fork starts at the top
  { t: 16.4, p: [2, 3.5, 24], l: [0, 2.5, 0] },
  { t: 18.4, p: [0, 3, 27], l: [0, 1.5, 0] },                   // both ladders
  { t: 24.0, p: [0, 1, 30], l: [0, 0.5, 0] },                   // twist into two helices
  { t: 27.4, p: [-1.2, -1.4, 10.5], l: [-4.5, yOf(EV.errIdx), 0] }, // proofreading close-up
  { t: 30.4, p: [0, 0, 26], l: [0, 0, 0] },
  { t: 36.8, p: [0, 0, 34], l: [0, 0, 0] },
  { t: 39.4, p: [0, 0, 44], l: [0, 0, 0] },                     // the cell divides
  { t: 44.6, p: [-3, 0, 38], l: [-4, 1, 0] },
  { t: 46.4, ...HOME }, { t: 48, ...HOME },
];
const NUC_CAM: CamKey[] = [{ t: 4.8, p: [0, 0, 9], l: [0, 0, 0] }, { t: 8.0, p: [0, 2, 30], l: [0, 1.5, 0] }];
const STORM_CAM: CamKey[] = [{ t: 32, p: [0, 0, 44], l: [0, 1, 0] }, { t: 36.8, p: [0, 2, 36], l: [0, 1, 0] }];
const sceneAt = (t: number) => (t >= 4.8 && t < 8.0 ? "nucleus" : t >= 32 && t < 36.8 ? "storm" : "helix");
const flashAt = (t: number) => Math.max(...[4.8, 8.0, 32.0, 36.8].map((s) => Math.exp(-(((t - s) / 0.14) ** 2))));

// ---------- captions ----------
type Cue = { t: number; a?: string; b: string; c?: string };
const OUT = "4px 4px 0 #030612, -4px 0 0 #030612, 0 -4px 0 #030612, 4px 0 0 #030612, 0 4px 0 #030612";
const CUES: Cue[] = [
  { t: 2.4, a: "THE INSTRUCTIONS", b: "FOR YOU", c: "WRITTEN IN A MOLECULE" },
  { t: 4.8, a: "EVERY CELL HOLDS", b: "2 METERS", c: "OF DNA" },
  { t: 6.4, a: "PACKED INTO A NUCLEUS", b: "~6 µm", c: "WIDE" },
  { t: 9.6, a: "A ALWAYS PAIRS", b: "WITH T" },
  { t: 11.2, a: "C ALWAYS PAIRS", b: "WITH G" },
  { t: 12.8, a: "3 BILLION PAIRS", b: "= YOUR", c: "RECIPE" },
  { t: 14.4, a: "STEP 1", b: "UNZIP" },
  { t: 16.0, a: "HELICASE SPLITS", b: "EVERY", c: "PAIR" },
  { t: 17.6, a: "STEP 2", b: "MATCH" },
  { t: 19.2, a: "POLYMERASE GRABS", b: "FREE", c: "LETTERS" },
  { t: 20.8, a: "A FOR T", b: "C FOR G", c: "LETTER BY LETTER" },
  { t: 24.0, a: "STEP 3", b: "2 COPIES" },
  { t: 25.6, a: "EACH ONE =", b: "1 OLD", c: "+ 1 NEW STRAND" },
  { t: 27.2, a: "IT EVEN", b: "PROOFREADS" },
  { t: 28.8, a: "~1 MISTAKE", b: "PER", c: "BILLION LETTERS" },
  { t: 32.0, a: "~50 LETTERS", b: "PER SECOND" },
  { t: 33.6, a: "AT", b: "THOUSANDS", c: "OF FORKS AT ONCE" },
  { t: 35.2, a: "6 BILLION LETTERS", b: "IN ~8", c: "HOURS" },
  { t: 36.8, a: "THEN THE CELL", b: "SPLITS", c: "IN TWO" },
  { t: 38.4, a: "EACH GETS", b: "A FULL", c: "COPY" },
  { t: 40.0, a: "YOUR BODY MAKES", b: "~330", c: "BILLION NEW CELLS A DAY" },
  { t: 41.6, a: "EVERY ONE", b: "COPIED", c: "LIKE THIS" },
  { t: 43.2, a: "@HOWTOWITHZAY", b: "NOW YOU", c: "KNOW." },
  { t: 45.6, b: "" },
];
const CapBlock: React.FC<{ cue: Omit<Cue, "t">; o: number }> = ({ cue, o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#cfe6ff", opacity: o, textShadow: OUT, lineHeight: 1.5 }}>
    {cue.a && <div style={{ fontSize: 32 }}>{cue.a}</div>}
    <div style={{ fontSize: 64, lineHeight: 1.3, color: "#ffffff" }}>{cue.b}</div>
    {cue.c && <div style={{ fontSize: 32 }}>{cue.c}</div>}
  </div>
);
const Letters: React.FC<{ t: number }> = ({ t }) => {
  if (t < 8.0 || t >= 9.6) return null;
  const shown = EV.letters.filter((x) => t >= x).length;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", textShadow: OUT, lineHeight: 1.5 }}>
      <div style={{ fontSize: 32, color: "#cfe6ff" }}>IT'S A CODE WITH 4 LETTERS</div>
      <div style={{ fontSize: 96, letterSpacing: 24 }}>
        {"ATCG".split("").map((L, i) => <span key={L} style={{ color: LETTER[L], opacity: i < shown ? 1 : 0 }}>{L}</span>)}
      </div>
    </div>
  );
};

// ---------- composition ----------
export const DnaVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const toon = useToon();
  const map = useMemo(glowTexture, []);
  const sc = sceneAt(t);
  const cam = sc === "nucleus" ? camAt(NUC_CAM, t) : sc === "storm" ? camAt(STORM_CAM, t) : camAt(CAM, t);
  const hs = sc === "helix" ? halves(t) : [];
  const strands: Record<string, V3[]> = { a: [], b: [], na: [], nb: [] };
  // backbones: rebuild per strand in order
  const perK = (k: number) => hs.filter((h) => Math.abs(h.p[1] - yOf(k)) < 1e-6);
  for (let k = 0; k < N && sc === "helix"; k++) {
    const row = perK(k);
    strands.a.push(row[0].p); strands.b.push(row[1].p);
    if (row[2] && row[2].s > 0.99 && row[2].letter !== "") strands.na.push(row[2].p);
    if (row[3] && row[3].s > 0.99) strands.nb.push(row[3].p);
  }
  const fresh = ease((t - 40) / 2) > 0.5;
  const unzipping = t >= 14.4 && t < 17.9;
  const forkK = Math.min(N - 1, EV.unzip.filter((x) => x <= t).length);
  const addK = EV.add.filter((x) => x <= t).length;
  const [cl, cr] = centers(t);
  const tag = sc === "nucleus" ? "🧬 ONE NUCLEUS · ~6 µm" : sc === "storm" ? "▶ REAL SPEED · ALL AT ONCE" : t < 14.4 || t >= 36.8 ? "🧬 DNA · 2 NM WIDE" : "⌕ REPLICATION · SLOW-MO";
  let ci = -1; CUES.forEach((c, i) => { if (t >= c.t) ci = i; });
  const cue = ci >= 0 ? CUES[ci] : null;
  const nextT = ci + 1 < CUES.length ? CUES[ci + 1].t : 99;
  const cueO = cue ? stepped(Math.min((t - cue.t) / 0.25, (nextT - t) / 0.25)) : 0;
  const hook = t < 2.4 ? stepped((2.4 - t) / 0.3) : stepped((t - 46.4) / 0.5);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/08-dna/music.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={CELL_PALETTE} outlineColor="#030612">
        <CamAt p={cam.p} l={cam.l} />
        <ambientLight intensity={0.55} color="#4a2a7a" />
        <directionalLight position={[-8, 12, 14]} intensity={1.8} color="#cfe6ff" />
        <directionalLight position={[9, -4, -6]} intensity={0.8} color="#ff5cc8" />
        {Array.from({ length: 40 }, (_, i) => <Glow key={`m${i}`} map={map} at={[(rnd(i) - 0.5) * 60, (rnd(i + 1) - 0.5) * 70, -30 - rnd(i + 2) * 20]} size={1.2} color="#16305c" opacity={0.8} />)}
        {sc === "nucleus" && <Nucleus t={t} toon={toon} />}
        {sc === "storm" && <StormThread t={t} map={map} />}
        {sc === "helix" && (
          <group>
            {hs.map((h, i) => <HalfBase key={i} h={h} toon={toon} />)}
            <Backbone pts={strands.a} color={STRAND.a} />
            <Backbone pts={strands.b} color={STRAND.b} />
            {strands.na.length > 1 && <Backbone pts={strands.na} color={fresh ? STRAND.b : STRAND.fresh} />}
            {strands.nb.length > 1 && <Backbone pts={strands.nb} color={fresh ? STRAND.a : STRAND.fresh} />}
            {/* helicase: an orange ring at the fork */}
            {unzipping && (
              <group position={[0, yOf(forkK) - 0.3, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.1, 0.32, 6, 18]} /><meshToonMaterial color="#ff9a1f" emissive="#ff9a1f" emissiveIntensity={0.5} gradientMap={toon} /></mesh>
                <Glow map={map} at={[0, 0, 0]} size={4} color="#ff9a1f" opacity={0.6} />
              </group>
            )}
            {/* polymerases + incoming free letters */}
            {t >= 17.4 && t < 24.2 && addK < N && (
              <>
                {[cl, cr].map((cx, s) => (
                  <group key={s} position={[cx + (s ? -1 : 1) * 0.2, yOf(addK) - 0.1, 0.4]}>
                    <mesh><sphereGeometry args={[0.95, 12, 10]} /><meshToonMaterial color="#b05cff" gradientMap={toon} transparent opacity={0.85} /></mesh>
                    <Glow map={map} at={[0, 0, 0]} size={3} color="#b05cff" opacity={0.6} />
                  </group>
                ))}
                {[0, 1, 2].map((j) => {
                  const k = addK + j; if (k >= N) return null;
                  const u = Math.max(0, Math.min(1, 1 - (EV.add[k] - t) / 0.6));
                  return [cl, cr].map((cx, s) => {
                    const target: V3 = [cx + (s ? -1 : 1) * R * 0.5, yOf(k), 0];
                    const from: V3 = [cx + (s ? -1 : 1) * 4, yOf(k) - 3 + rnd(k + s) * 6, 3];
                    const p: V3 = [from[0] + (target[0] - from[0]) * u, from[1] + (target[1] - from[1]) * u, from[2] + (target[2] - from[2]) * u];
                    const L = s ? SEQ[k] : PAIR[SEQ[k]];
                    return <mesh key={`${k}-${s}`} position={p} rotation={[t * 0, LW * 20 * t + k, 0]}><boxGeometry args={[0.9, 0.3, 0.3]} /><meshToonMaterial color={LETTER[L]} gradientMap={toon} /></mesh>;
                  });
                })}
              </>
            )}
            {/* glowing hydrogen bonds where pairs are joined */}
            {/* one glow per joined pair: old strand A always marks its pair; the right-hand copy marks its own */}
            {Array.from({ length: N }, (_, k) => perK(k)).flatMap((row, k) => [row[0], row[3]].filter((h) => h && h.s > 0.99 && h.letter).map((h, j) => (
              <Glow key={`hb${k}-${j}`} map={map} at={h.c} size={0.5} color="#cfe6ff" opacity={0.5} />
            )))}
            {/* proofreading */}
            {t >= EV.error[0] && t < EV.error[2] + 0.4 && (
              <Glow map={map} at={[cl + R * 0.5, yOf(EV.errIdx), 0.3]} size={t < EV.error[2] ? 2.6 : 2.0} color={t < EV.error[2] ? "#ff4a4a" : "#3ee06a"} opacity={0.9} />
            )}
            {t >= EV.split && t < EV.split + 0.6 && <Glow map={map} at={[0, 0, 0]} size={16 * (1 - (t - EV.split) / 0.6)} color="#ffffff" opacity={1 - (t - EV.split) / 0.6} />}
          </group>
        )}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#cfe6ff", opacity: stepped(flashAt(t)) }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: "#cfe6ff", textShadow: OUT }}>{tag}</div>
      <Letters t={t} />
      {cue && cue.b && !(t >= 8.0 && t < 9.6) && <CapBlock cue={cue} o={cueO} />}
      {hook > 0 && <CapBlock cue={{ a: "HOW DOES YOUR", b: "DNA", c: "COPY ITSELF? 🎧" }} o={hook} />}
    </AbsoluteFill>
  );
};
const CamAt: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
