/**
 * Video 004 · How does a sewing machine tie a knot it can't reach? — 48 s seamless loop @ 60 fps.
 * Lockstitch, driven by the stitch counter in sewing.json (videos/04-sewing/build.py). Phase θ of one stitch:
 *   0 pierce · 0.2 needle bottom, loop forms · 0.25 hook catches · 0.25-0.6 loop goes around the bobbin
 *   0.6-0.75 take-up pulls it tight (knot inside the fabric) · 0.78-0.95 fabric advances one stitch
 * Upper thread = pink, bobbin thread = gold. First frame == last frame.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import TL from "./sewing.json";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamRig, CamKey, PixelLayer, GlowLayer, Captions, Vignette } from "../teasers/Majestic";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(TL.duration * FPS);
type V3 = [number, number, number];
const C = { bg: "#071219", body: "#3f8f86", bodyDk: "#2b6862", trim: "#d9a441", steel: "#c9d2dc", hook: "#8f9aa6", fabric: "#2f4a8a", fabric2: "#5a3f86", wood: "#4a2f1c", up: "#ff5c8a", low: "#ffcc55" };
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const L = 0.5; // stitch length
const FAB_TOP = 0.23, FAB_MID = 0.11, FAB_BOT = -0.01;
const HOOK_C: V3 = [0, -1.7, -1.25];

// ---------- timeline ----------
const scAt = (t: number) => {
  const x = Math.max(0, Math.min(TL.sc.length - 1.001, t * TL.rate)), i = Math.floor(x);
  return TL.sc[i] + (TL.sc[i + 1] - TL.sc[i]) * (x - i);
};
/** Needle tip height through one stitch: down through the fabric, smooth stop at the bottom, back up, high arc above. */
function needleTip(th: number) {
  if (th < 0.2) return FAB_TOP - 1.68 * Math.sin((Math.PI / 2) * (th / 0.2));
  if (th < 0.5) return -1.45 + 1.68 * (1 - Math.cos((Math.PI / 2) * ((th - 0.2) / 0.3)));
  return FAB_TOP + 1.67 * Math.sin((Math.PI * (th - 0.5)) / 0.5);
}
const feedAt = (th: number) => ease((th - 0.78) / 0.17);
const hookAngle = (sc: number) => 4 * Math.PI * (sc - 0.25); // two turns per stitch, point at the needle at θ = 0.25

// ---------- threads ----------
function upperLoop(th: number): V3[] | null {
  if (th < 0.2 || th > 0.76) return null;
  const pull = ease((th - 0.6) / 0.15); // shrinking into the knot
  let pts: V3[];
  if (th < 0.25) {
    const k = (th - 0.2) / 0.05; // the loop bulges out beside the rising needle
    pts = [[0.02, FAB_BOT, 0], [0.05, -0.7, -0.03], [0.05 + 0.2 * k, -1.32, -0.06 - 0.25 * k], [0.02, -1.25, -0.04], [-0.02, -0.7, -0.02], [-0.02, FAB_BOT, 0]];
  } else {
    const span = Math.min(1.75 * Math.PI, hookAngle(th));
    pts = [[0.03, FAB_BOT, 0], [0.14, -0.8, 0.05]];
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * span;
      const r = 1.05 * Math.min(1, 0.35 + a * 1.2);
      pts.push([HOOK_C[0] + Math.sin(a) * r, HOOK_C[1] + 0.28 + 0.08 * Math.sin(a * 2), HOOK_C[2] + Math.cos(a) * r]);
    }
    pts.push([-0.14, -0.8, 0.05], [-0.03, FAB_BOT, 0]);
  }
  const knot: V3 = [0, FAB_MID, 0];
  return pts.map((p) => [lerp(p[0], knot[0], pull), lerp(p[1], knot[1], pull), lerp(p[2], knot[2], pull)] as V3);
}
/** Finished stitches along the top / bottom of the fabric, dipping to the knot in the middle at every hole. */
function stitchRow(top: boolean, x0: number, count = 16): V3[] {
  const pts: V3[] = [];
  const surf = top ? FAB_TOP + 0.03 : FAB_BOT - 0.03;
  for (let j = count; j >= 1; j--) {
    const x = x0 - j * L;
    pts.push([x - L * 0.5, surf, 0], [x - 0.08, surf, 0], [x, FAB_MID, 0], [x + 0.08, surf, 0]);
  }
  return pts;
}
const curveOf = (pts: V3[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.35);
const Tube: React.FC<{ pts: V3[]; color: string; r?: number }> = ({ pts, color, r = 0.045 }) => {
  if (pts.length < 2) return null;
  const g = new THREE.TubeGeometry(curveOf(pts), Math.min(220, pts.length * 8), r, 5, false);
  return <mesh geometry={g}><meshBasicMaterial color={color} /></mesh>;
};
const TubeGlow: React.FC<{ map: THREE.Texture; pts: V3[]; color: string; n?: number; size?: number; o?: number }> = ({ map, pts, color, n = 40, size = 0.55, o = 0.38 }) => {
  if (pts.length < 2) return null;
  const c = curveOf(pts);
  return <>{Array.from({ length: n }, (_, i) => { const p = c.getPoint(i / (n - 1)); return <Glow key={i} map={map} at={[p.x, p.y, p.z]} size={size} color={color} opacity={o} />; })}</>;
};

// ---------- machine (fades away for the x-ray close-ups) ----------
const Mat: React.FC<{ c: string; o: number; metal?: number; rough?: number }> = ({ c, o, metal = 0.15, rough = 0.45 }) => (
  <meshStandardMaterial color={c} metalness={metal} roughness={rough} transparent={o < 0.999} opacity={o} depthWrite={o > 0.98} />
);
function armShape() {
  // side profile of a vintage machine arm (C-shape), extruded along z
  const s = new THREE.Shape();
  s.moveTo(-1.9, 1.3); s.lineTo(-1.9, 5.2); s.quadraticCurveTo(-1.9, 6.1, -1.0, 6.1); s.lineTo(8.6, 6.1); s.quadraticCurveTo(9.5, 6.1, 9.5, 5.2);
  s.lineTo(9.5, -0.2); s.lineTo(6.9, -0.2); s.lineTo(6.9, 3.8); s.quadraticCurveTo(6.9, 4.1, 6.6, 4.1); s.lineTo(0.9, 4.1); s.quadraticCurveTo(0.6, 4.1, 0.6, 3.8); s.lineTo(0.6, 1.3); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 4, curveSegments: 12 });
  g.translate(0, 0, -2.8);
  return g;
}
const Machine: React.FC<{ o: number; wheelA: number }> = ({ o, wheelA }) => {
  const arm = useMemo(armShape, []);
  if (o < 0.01) return null;
  return (
    <group>
      <mesh geometry={arm}><Mat c={C.body} o={o} /></mesh>
      <mesh position={[3.5, 6.0, -1.6]}><boxGeometry args={[11.2, 0.1, 2.7]} /><Mat c={C.trim} o={o} metal={0.6} /></mesh>
      <mesh position={[3.2, -0.55, -1.0]}><boxGeometry args={[13, 0.6, 5.6]} /><Mat c={C.body} o={o} /></mesh>
      <mesh position={[3.2, -0.88, -1.0]}><boxGeometry args={[13.2, 0.08, 5.8]} /><Mat c={C.trim} o={o} metal={0.6} /></mesh>
      <mesh position={[3, -1.4, -1]}><boxGeometry args={[24, 0.9, 10]} /><Mat c={C.wood} o={o} rough={0.8} /></mesh>
      {/* handwheel turns once per stitch */}
      <group position={[9.95, 4.4, -1.6]} rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[0, 0, -wheelA]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.7, 1.7, 0.5, 32]} /><Mat c={C.trim} o={o} metal={0.7} rough={0.3} /></mesh>
          <mesh position={[1.2, 0, 0.3]}><boxGeometry args={[0.35, 0.35, 0.3]} /><Mat c={C.bodyDk} o={o} /></mesh>
        </group>
      </group>
      {/* gold decal stripes + dial */}
      <mesh position={[3.8, 5.1, -0.32]}><boxGeometry args={[5.5, 0.12, 0.05]} /><Mat c={C.trim} o={o} metal={0.6} /></mesh>
      <mesh position={[7.9, 2.0, -0.32]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.15, 24]} /><Mat c="#efe4cf" o={o} /></mesh>
      {/* spool */}
      <mesh position={[5.5, 6.75, -1.6]}><cylinderGeometry args={[0.55, 0.55, 1.0, 20]} /><Mat c="#7a1e3c" o={o} /></mesh>
      <mesh position={[5.5, 6.75, -1.6]}><cylinderGeometry args={[0.62, 0.62, 0.12, 20]} /><Mat c={C.wood} o={o} /></mesh>
    </group>
  );
};
const NeedleBar: React.FC<{ tip: number; takeUp: number }> = ({ tip, takeUp }) => (
  <group>
    <group position={[0, tip, 0]}>
      <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.05, 2.6, 8]} /><meshStandardMaterial color={C.steel} metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0.06, 0]}><coneGeometry args={[0.05, 0.14, 8]} /><meshStandardMaterial color={C.steel} metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[0.13, 0.13, 2.2, 12]} /><meshStandardMaterial color={C.steel} metalness={0.7} roughness={0.3} /></mesh>
    </group>
    <mesh position={[-0.45, 1.8, 0]}><cylinderGeometry args={[0.1, 0.1, 2.6, 10]} /><meshStandardMaterial color={C.steel} metalness={0.7} roughness={0.3} /></mesh>
    <mesh position={[0, 0.32, -0.3]}><boxGeometry args={[0.9, 0.08, 1.1]} /><meshStandardMaterial color={C.steel} metalness={0.7} roughness={0.3} /></mesh>
    <group position={[0.35, 5.0 + takeUp, 0.2]} rotation={[0, 0, 0.5]}><mesh><boxGeometry args={[0.22, 1.5, 0.18]} /><meshStandardMaterial color={C.steel} metalness={0.7} roughness={0.3} /></mesh></group>
  </group>
);
/** Throat plate + two layers of fabric. The front half (z > 0) fades out for the cut-away. */
const Bed: React.FC<{ front: number }> = ({ front }) => {
  const part = (z0: number, z1: number, o: number, key: string) => o > 0.01 && (
    <group key={key}>
      <mesh position={[0, -0.12, (z0 + z1) / 2]}><boxGeometry args={[9, 0.14, z1 - z0]} /><Mat c={C.steel} o={o} metal={0.6} rough={0.3} /></mesh>
      <mesh position={[0, 0.05, (z0 + z1) / 2]}><boxGeometry args={[8.6, 0.12, z1 - z0]} /><Mat c={C.fabric} o={o} metal={0} rough={0.9} /></mesh>
      <mesh position={[0, 0.17, (z0 + z1) / 2]}><boxGeometry args={[8.6, 0.12, z1 - z0]} /><Mat c={C.fabric2} o={o} metal={0} rough={0.9} /></mesh>
    </group>
  );
  return <>{part(-3.4, 0, 1, "back")}{part(0, 3, front, "front")}</>;
};
const Hook: React.FC<{ a: number }> = ({ a }) => (
  <group position={HOOK_C}>
    <group rotation={[0, a, 0]}>
      <mesh><cylinderGeometry args={[1.25, 1.25, 0.55, 40, 1, true]} /><meshStandardMaterial color={C.hook} metalness={0.75} roughness={0.25} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[1.25, 40]} /><meshStandardMaterial color="#6d7682" metalness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0.32, 0.22, 1.22]} rotation={[0, Math.PI / 2, Math.PI / 2]}><coneGeometry args={[0.12, 0.95, 10]} /><meshStandardMaterial color={C.trim} metalness={0.8} roughness={0.2} /></mesh>
    </group>
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.82, 0.82, 0.08, 32]} /><meshStandardMaterial color={C.steel} metalness={0.8} /></mesh>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.62, 0.62, 0.3, 32]} /><meshBasicMaterial color={C.low} /></mesh>
    <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.82, 0.82, 0.08, 32]} /><meshStandardMaterial color={C.steel} metalness={0.8} /></mesh>
  </group>
);

// ---------- camera: HOME is both the first and the last frame ----------
const HOME = { p: [-3.5, 7.5, 31] as V3, l: [3.4, 1.2, -1] as V3 };
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 1.4, ...HOME },
  { t: 4.5, p: [-1.6, 4.2, 15], l: [1.0, 0.9, -0.5] },
  { t: 7.2, p: [-2.4, 1.9, 6.2], l: [0, 0.2, -0.3] },
  { t: 9.6, p: [-2.0, 1.2, 4.4], l: [0, -0.1, -0.3] },        // the needle pierces
  { t: 12.5, p: [2.6, 0.5, 5.8], l: [0, -0.7, -0.7] },        // under the fabric: the loop + the hook
  { t: 15.5, p: [3.1, 0.9, 6.0], l: [0, -0.7, -0.8] },
  { t: 18.5, p: [1.6, 2.7, 6.0], l: [0, -0.85, -1.0] },       // around the bobbin
  { t: 21.5, p: [-1.8, 0.7, 4.6], l: [-0.4, 0.0, -0.4] },     // pulled tight
  { t: 25.5, p: [-1.4, 0.25, 3.1], l: [-1.3, 0.12, 0] },      // cross-section: the knot inside the fabric
  { t: 29.5, p: [-1.6, 1.3, 6.2], l: [-0.4, -0.1, -0.5] },
  { t: 33.5, p: [-2.6, 3.0, 11], l: [0.6, 0.5, -0.6] },
  { t: 38, p: [-3.2, 5.2, 19], l: [2.2, 1.0, -1] },
  { t: 42, p: [-3.9, 6.8, 27], l: [3.2, 1.2, -1] },
  { t: 45.6, ...HOME }, { t: 48, ...HOME },
];
const cutAt = (t: number) => Math.min(ease((t - 9.6) / 1.6), 1 - ease((t - 29.5) / 2.0)); // x-ray amount

const Hook0: React.FC<{ o: number }> = ({ o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#f3efe6", opacity: o, textShadow: "0 0 26px rgba(255,92,138,0.45), 4px 4px 0 rgba(0,0,0,0.85)", lineHeight: 1.6 }}>
    <div style={{ fontSize: 30 }}>HOW DOES A SEWING MACHINE</div>
    <div style={{ fontSize: 64, lineHeight: 1.35 }}>TIE A KNOT</div>
    <div style={{ fontSize: 30 }}>IT CAN'T REACH?  🎧</div>
  </div>
);

export const SewingVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const cam = camAt(CAM, t);
  const sc = scAt(t);
  const th = sc - Math.floor(sc);
  const cut = cutAt(t);
  const tip = needleTip(th);
  const x0 = -feedAt(th) * L; // current hole slides left as the fabric feeds
  const eye: V3 = [0, tip + 0.18, 0];
  const takeUp = 0.6 * Math.sin(2 * Math.PI * (th - 0.62));
  const fast = (scAt(t + 1 / 60) - sc) * 60 > 6;
  // threads
  const loop = upperLoop(th);
  const upperIn: V3[] = [[0.35, 5.0 + takeUp, 0.2], [0.1, Math.max(eye[1] + 1.2, 1.5), 0.08], eye];
  const upperToFabric: V3[] = [eye, [x0 * 0.5, Math.min(eye[1], FAB_TOP) + 0.02, 0], [x0, FAB_TOP + 0.02, 0]];
  const bobbinUp: V3[] = [[HOOK_C[0] + 0.5, HOOK_C[1] + 0.25, HOOK_C[2] + 0.4], [0.3 + x0 * 0.3, -1.0, -0.4], [x0 + 0.05, -0.4, -0.05], [x0, FAB_BOT - 0.03, 0]];
  const rowTop = [...stitchRow(true, x0), [x0, FAB_TOP + 0.03, 0] as V3];
  const rowBot = [...stitchRow(false, x0), [x0, FAB_BOT - 0.03, 0] as V3];
  const ghosts = fast ? [1, 2, 3].map((k) => needleTip((th - k * 0.08 + 1) % 1)) : [];
  const tag = t < 6 || t >= 36 ? "▶ REAL SPEED" : t < 8 ? "❚❚ SLOWING..." : t < 28 ? "❚❚ SLOW-MO 1/32" : t < 32 ? "❚❚ SLOW-MO 1/8" : t < 34 ? "❚❚ SLOW-MO 1/4" : "❚❚ SLOW-MO 1/2";
  const hookGlow = th > 0.2 && th < 0.32 ? Math.exp(-Math.abs(th - 0.25) * 40) : 0;
  const tightGlow = th > 0.6 && th < 0.9 ? Math.exp(-Math.abs(th - 0.75) * 25) : 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("videos/04-sewing/music.wav")} />
      <PixelLayer bg={C.bg} fov={40}>
        <CamRig {...cam} />
        <hemisphereLight args={["#bfe7ff", "#0a1418", 0.9]} />
        <directionalLight position={[-6, 14, 12]} intensity={2.2} color="#fff0d8" />
        <directionalLight position={[8, -4, 6]} intensity={0.7} color="#ff7aa2" />
        <pointLight position={[0, -0.8, 1.6]} intensity={45 * cut} distance={8} color="#ffd9a0" />
        <Machine o={1 - cut} wheelA={2 * Math.PI * sc} />
        <NeedleBar tip={tip} takeUp={takeUp} />
        {ghosts.map((g, i) => (
          <mesh key={i} position={[0, g + 1.4, 0]}><cylinderGeometry args={[0.05, 0.05, 2.6, 6]} /><meshBasicMaterial color={C.steel} transparent opacity={0.25} /></mesh>
        ))}
        <Bed front={1 - cut} />
        {cut > 0.01 && <Hook a={hookAngle(sc)} />}
        <Tube pts={upperIn} color={C.up} r={0.04} />
        <Tube pts={upperToFabric} color={C.up} r={0.04} />
        <Tube pts={rowTop} color={C.up} r={0.045} />
        <Tube pts={rowBot} color={C.low} r={0.045} />
        {cut > 0.01 && <Tube pts={bobbinUp} color={C.low} r={0.04} />}
        {loop && cut > 0.01 && <Tube pts={loop} color={C.up} r={0.045} />}
      </PixelLayer>
      <GlowLayer fov={40}>
        <CamRig {...cam} />
        <TubeGlow map={map} pts={upperIn} color={C.up} n={18} size={0.5} o={0.3} />
        <TubeGlow map={map} pts={rowTop} color={C.up} n={60} size={0.45} o={0.3} />
        {cut > 0.01 && <TubeGlow map={map} pts={rowBot} color={C.low} n={60} size={0.45} o={0.3 * cut} />}
        {cut > 0.01 && <TubeGlow map={map} pts={bobbinUp} color={C.low} n={16} size={0.45} o={0.35 * cut} />}
        {loop && cut > 0.01 && <TubeGlow map={map} pts={loop} color={C.up} n={48} size={0.55} o={0.4 * cut} />}
        {cut > 0.01 && <Glow map={map} at={[0.3, -1.4, -0.3]} size={1.6} color="#fff2c8" opacity={0.85 * hookGlow * cut} />}
        <Glow map={map} at={[x0, FAB_MID, 0.05]} size={1.4} color="#ffffff" opacity={0.7 * tightGlow} />
        {Array.from({ length: 40 }, (_, i) => (
          <Glow key={i} map={map} at={[(rnd(i) - 0.5) * 22 + 0.3 * Math.sin(t * 0.3 + i), (rnd(i + 40) - 0.2) * 16 + 0.3 * Math.cos(t * 0.25 + i), (rnd(i + 80) - 0.5) * 16]} size={0.1 + rnd(i + 9) * 0.2} color="#cfeaff" opacity={0.2 + 0.35 * rnd(i + 3)} />
        ))}
      </GlowLayer>
      <Vignette s={0.8} />
      <div style={{ position: "absolute", left: 50, top: 70, fontFamily: "PressStart2P", fontSize: 22, color: "#f3efe6", opacity: 0.85, textShadow: "3px 3px 0 #000" }}>{tag}</div>
      <Captions t={t} end={48} color="#f3efe6" glow="rgba(255,92,138,0.45)" cues={[
        { t: 2.2, a: "ABOUT", b: "1,000", c: "STITCHES A MINUTE" },
        { t: 6, a: "LET'S", b: "SLOW IT", c: "DOWN" },
        { t: 8, a: "THE NEEDLE PUSHES", b: "THE THREAD", c: "THROUGH" },
        { t: 10, a: "BUT NOTHING CAN", b: "REACH", c: "UNDER THE FABRIC" },
        { t: 12, a: "SO A LOOP", b: "FORMS", c: "DOWN THERE" },
        { t: 14, a: "AND A SPINNING", b: "HOOK", c: "CATCHES IT" },
        { t: 16, a: "IT SWINGS THE LOOP", b: "AROUND", c: "THE BOBBIN" },
        { t: 18, a: "WRAPPING", b: "THE GOLD", c: "THREAD" },
        { t: 20, a: "THEN A LEVER", b: "PULLS", c: "IT TIGHT" },
        { t: 22, a: "TWO THREADS", b: "LOCKED" },
        { t: 24, a: "THE KNOT HIDES", b: "INSIDE", c: "THE FABRIC" },
        { t: 26, a: "NEAT ON", b: "BOTH", c: "SIDES" },
        { t: 28, a: "ONE STITCH", b: "PER BEAT" },
        { t: 30, a: "SAME DANCE", b: "EVERY", c: "STITCH" },
        { t: 32, a: "NOW", b: "FASTER" },
        { t: 36, a: "REAL SPEED", b: "1,000", c: "A MINUTE" },
        { t: 38, a: "EACH ONE", b: "A HIDDEN", c: "KNOT" },
        { t: 40, a: "PATENTED BY ELIAS HOWE", b: "1846" },
        { t: 42, a: "STILL THE MOST", b: "COMMON", c: "MACHINE STITCH" },
        { t: 44, b: "NOW YOU KNOW." },
        { t: 46, b: "" },
      ]} />
      <Hook0 o={t < 2.2 ? ease((2.2 - t) / 0.35) : ease((t - 46.2) / 0.6)} />
    </AbsoluteFill>
  );
};
