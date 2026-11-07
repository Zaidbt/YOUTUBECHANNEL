/**
 * Video 006 · How do bees build perfect hexagons? — 48 s seamless loop @ 60 fps, cinematic pixel-3D.
 * Finished comb → rewind to nothing → festoon chains → wax from 8 glands → comb grows (one note per cell)
 * → pixel diagrams: circles / squares / hexagons → cells tilt up → honey + wax caps → back to the finished comb.
 * Comb + timing from bees.json (videos/06-bees/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import DATA from "./bees.json";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamRig, CamKey, PixelLayer, GlowLayer, Captions, Vignette } from "../teasers/Majestic";
import { Pixels, Px, ring, line, disc, rect, rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(DATA.duration * FPS);
type V3 = [number, number, number];
/** Every idle motion uses whole multiples of this angular speed, so it is back where it started at t = 48 s (seamless loop). */
export const LW = (2 * Math.PI) / 48;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const R = DATA.R, TOP = DATA.top, D = 1.3, Z0 = -0.3, TILT = -0.22; // cells tilt up ~13°
const BG = "#0b0603";
const COL = { wax: "#e3b04b", waxDk: "#b8862c", honey: "#d9820f", cap: "#f3dc98", bar: "#5a3a1f", body: "#e6a21f", stripe: "#2a1a0c", thorax: "#6b4a1e" };

// ---------- comb state per cell ----------
export function cellState(c: (typeof DATA.cells)[number], t: number) {
  if (t < 5) return { grow: 1, fill: 1, cap: c.cap !== null ? 1 : 0, flash: 0 };
  if (t < 7.3) { const g = 1 - ease((t - c.vanish) / 0.25); return { grow: g, fill: g, cap: c.cap !== null ? g : 0, flash: 0 }; }
  const grow = ease((t - c.build) / 0.45);
  return { grow, fill: ease((t - c.fill) / 0.6), cap: c.cap !== null ? ease((t - c.cap) / 0.3) : 0, flash: t >= c.build && t - c.build < 0.35 ? 1 - (t - c.build) / 0.35 : 0 };
}

const Comb: React.FC<{ t: number }> = ({ t }) => {
  const m = useMemo(() => {
    const n = DATA.cells.length;
    const walls = new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, D, 6, 1, true).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, D / 2),
      new THREE.MeshStandardMaterial({ color: COL.wax, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide }), n);
    const backs = new THREE.InstancedMesh(new THREE.CircleGeometry(R, 6).rotateZ(Math.PI / 6), new THREE.MeshStandardMaterial({ color: COL.waxDk, roughness: 0.6 }), n);
    const honey = new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, D * 0.9, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, D * 0.45),
      new THREE.MeshStandardMaterial({ color: COL.honey, roughness: 0.15, metalness: 0.1, emissive: "#5a2a00", emissiveIntensity: 0.6 }), n);
    const caps = new THREE.InstancedMesh(new THREE.CircleGeometry(R * 0.95, 6).rotateZ(Math.PI / 6), new THREE.MeshStandardMaterial({ color: COL.cap, roughness: 0.7 }), n);
    return { walls, backs, honey, caps };
  }, []);
  const o = new THREE.Object3D();
  const set = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    o.position.set(x, y, z); o.rotation.set(TILT, 0, 0); o.scale.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
  };
  DATA.cells.forEach((c, i) => {
    const s = cellState(c, t);
    const g = s.grow;
    set(m.walls, i, c.x, c.y, Z0, g > 0 ? 1 : 0, g > 0 ? 1 : 0, g);
    set(m.backs, i, c.x, c.y, Z0, g, g, 1);
    set(m.honey, i, c.x, c.y, Z0 + 0.02, g > 0 && s.fill > 0 ? 1 : 0, g > 0 && s.fill > 0 ? 1 : 0, s.fill * g);
    // the cap sits at the mouth of the (tilted) cell
    set(m.caps, i, c.x, c.y - Math.sin(TILT) * (D - 0.05) * 1, Z0 + Math.cos(TILT) * (D - 0.05), s.cap, s.cap, 1);
  });
  Object.values(m).forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  return <group>{Object.values(m).map((mesh, i) => <primitive key={i} object={mesh} />)}</group>;
};

// ---------- bees ----------
const Bee: React.FC<{ p: V3; heading: number; t: number; belly?: boolean; scale?: number }> = ({ p, heading, t, belly, scale = 1 }) => {
  const flap = Math.sin(t * 535 * LW + p[0] * 3) * 0.6;
  return (
    <group position={p} rotation={[0, belly ? Math.PI : 0, heading]} scale={scale}>
      <mesh position={[-0.6, 0, 0]} scale={[1.25, 0.78, 0.72]}><sphereGeometry args={[0.55, 14, 10]} /><meshStandardMaterial color={COL.body} roughness={0.6} /></mesh>
      {[-0.95, -0.6, -0.25].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.43 - Math.abs(x + 0.6) * 0.25, 0.43 - Math.abs(x + 0.6) * 0.25, 0.13, 14]} /><meshStandardMaterial color={COL.stripe} roughness={0.8} /></mesh>
      ))}
      <mesh position={[0.32, 0, 0.02]}><sphereGeometry args={[0.4, 12, 10]} /><meshStandardMaterial color={COL.thorax} roughness={0.9} /></mesh>
      <mesh position={[0.86, 0, 0]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#1a1008" roughness={0.6} /></mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0.25, s * 0.42, 0.35]} rotation={[s * (0.5 + flap), 0, s * 0.35]} scale={[1.1, 0.42, 1]}><circleGeometry args={[0.62, 12]} />
          <meshStandardMaterial color="#f4f1ff" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      ))}
    </group>
  );
};
export const CRAWLERS = Array.from({ length: 24 }, (_, i) => {
  const c = DATA.cells[Math.floor(rnd(i + 70) * DATA.cells.length)];
  return { x: c.x, y: c.y, a: rnd(i + 80) * Math.PI * 2, s: 0.75 + rnd(i + 90) * 0.15 };
});
export const crawlerPos = (i: number, t: number): { p: V3; h: number } => {
  const b = CRAWLERS[i], n = 1 + Math.floor(rnd(i) * 2), w1 = n * LW, w2 = (n + 1) * LW;
  const x = b.x + 0.7 * Math.sin(t * w1 + i), y = b.y + 0.6 * Math.sin(t * w2 + i * 2);
  const dx = 0.7 * w1 * Math.cos(t * w1 + i), dy = 0.6 * w2 * Math.cos(t * w2 + i * 2);
  return { p: [x, y, 1.25], h: Math.atan2(dy, dx) + b.a * 0.1 };
};
export const chainVis = (t: number) => Math.min(ease((t - 6.2) / 0.8), 1 - ease((t - 13.5) / 1.0));
export const crawlVis = (t: number) => (t < 24 ? 1 - ease((t - 4.6) / 0.6) : 1) * (t > 14 ? ease((t - 14.5) / 1.2) : t < 5.2 ? 1 : 0);
export const CHAIN_X = [-2.4, 0, 2.4];
export const chainBee = (ci: number, j: number, t: number): { p: V3; h: number } => {
  const sway = 0.25 * Math.sin(t * 1.1 + ci) * (j / 5);
  return { p: [CHAIN_X[ci] + sway, TOP - 0.9 - j * 1.85, 0.8], h: -Math.PI / 2 + 0.15 * Math.sin(t * 1.3 + j + ci) };
};
export const HERO = { ci: 1, j: 2 };

// ---------- camera ----------
const HOME = { p: [5, 0.5, 33] as V3, l: [0, 2.6, 0] as V3 };
const heroP = chainBee(HERO.ci, HERO.j, 10).p;
export const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: 1.4, ...HOME },
  { t: 4.6, p: [3, 2, 25], l: [0, 1.8, 0] },
  { t: 7.2, p: [0.5, 2.6, 24], l: [0, 2.2, 0] },
  { t: 9.6, p: [heroP[0] + 1.2, heroP[1] + 0.2, 6.8], l: [heroP[0], heroP[1] + 0.2, 0.6] },
  { t: 12.4, p: [heroP[0] + 0.8, heroP[1] + 0.4, 7.4], l: [heroP[0], heroP[1] + 0.3, 0.6] },
  { t: 15.2, p: [2, 5, 14], l: [0, 4.2, 0] },
  { t: 19, p: [4.5, 1.6, 24], l: [0, 1.6, 0] },
  { t: 27, p: [2.5, 1.2, 25], l: [0, 1.4, 0] },
  { t: 29.6, p: [17, 3, 5], l: [0, 2.4, 0.5] },        // side view: cells tilt up
  { t: 31.4, p: [9, 3.4, 13], l: [0, 2.8, 0] },
  { t: 33.4, p: [2, 4.6, 12], l: [0, 3.6, 0] },        // honey + caps
  { t: 36.5, p: [-3, 2, 21], l: [0, 1.5, 0] },
  { t: 40.5, p: [-6, 0.5, 37], l: [0, 1.2, 0] },
  { t: 45.6, ...HOME }, { t: 48, ...HOME },
];

// ---------- pixel diagrams: why hexagons? ----------
function hexOutline(cx: number, cy: number, r: number, c: string): Px[] {
  const out: Px[] = [];
  for (let i = 0; i < 6; i++) {
    const a0 = (i * Math.PI) / 3, a1 = ((i + 1) * Math.PI) / 3;
    out.push(...line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, c));
  }
  return out;
}
export const Diagram: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(ease((t - 18.8) / 0.5), 1 - ease((t - 26.8) / 0.5));
  if (o <= 0) return null;
  const mode = t < 21 ? "circle" : t < 23 ? "square" : "hex";
  const px: Px[] = [];
  const cream = "#f6e7c8", amber = "#ffb347", pink = "#ff5c8a";
  const cx = 90, cy = 172;
  if (mode === "circle") {
    const r = 9;
    for (let row = -3; row <= 3; row++) for (let col = -4; col <= 4; col++) {
      const x = cx + col * 2 * r + (row % 2 ? r : 0), y = cy + row * r * Math.sqrt(3);
      if (Math.abs(x - cx) > 62 || Math.abs(y - cy) > 48) continue;
      px.push(...ring(x, y, r, cream, 1));
      if (col < 4) px.push(...disc(x + r, y + r * 0.58, 1, pink), ...disc(x + r, y - r * 0.58, 1, pink));
    }
  } else if (mode === "square") {
    const s = 16;
    for (let x = cx - 64; x <= cx + 64; x += s) px.push(...line(x, cy - 48, x, cy + 48, cream));
    for (let y = cy - 48; y <= cy + 48; y += s) px.push(...line(cx - 64, y, cx + 64, y, cream));
  } else {
    const r = 9.9;
    for (let col = -5; col <= 5; col++) for (let row = -4; row <= 4; row++) {
      const x = cx + col * 1.5 * r, y = cy + Math.sqrt(3) * r * (row + (Math.abs(col) % 2) * 0.5);
      if (Math.abs(x - cx) > 60 || Math.abs(y - cy) > 46) continue;
      px.push(...hexOutline(x, y, r, amber));
    }
  }
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <AbsoluteFill style={{ background: "rgba(8,4,2,0.72)" }} />
      <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges" style={{ position: "absolute" }}>
        <rect x={20} y={118} width={140} height={108} fill="none" stroke="#6a4a2a" strokeWidth={0.6} />
        <Pixels px={px} />
        <Pixels px={[rect(20, 232, 140, 1, "#6a4a2a")]} />
        <text x={90} y={238} fontFamily="PressStart2P" fontSize={4} fill={mode === "hex" ? amber : cream} textAnchor="middle" dominantBaseline="hanging">
          {mode === "circle" ? "GAPS = WASTED SPACE (~9%)" : mode === "square" ? "WALL PER CELL: 4.00" : "WALL PER CELL: 3.72  (~7% LESS)"}
        </text>
        {mode === "hex" && <text x={90} y={247} fontFamily="PressStart2P" fontSize={3} fill={cream} textAnchor="middle" dominantBaseline="hanging">SAME CELL AREA · NO GAPS</text>}
      </svg>
    </AbsoluteFill>
  );
};

// ---------- composition ----------
const Hook: React.FC<{ o: number }> = ({ o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#f6e7c8", opacity: o, textShadow: "0 0 26px rgba(255,170,60,0.5), 4px 4px 0 rgba(0,0,0,0.85)", lineHeight: 1.6 }}>
    <div style={{ fontSize: 30 }}>HOW DO BEES BUILD</div>
    <div style={{ fontSize: 64, lineHeight: 1.35 }}>PERFECT</div>
    <div style={{ fontSize: 30 }}>HEXAGONS?  🎧</div>
  </div>
);

export const BeesVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const cam = camAt(CAM, t);
  const cv = crawlVis(t), chv = chainVis(t);
  const tag = t < 5 ? "▶ REAL SPEED" : t < 7.2 ? "◀◀ REWIND" : t < 13 ? "▶ REAL SPEED" : t < 36 ? "⏩ TIME-LAPSE" : "▶ REAL SPEED";
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/06-bees/music.wav")} />
      <PixelLayer bg={BG} fov={40}>
        <CamRig {...cam} />
        <hemisphereLight args={["#ffd9a0", "#1a0c04", 0.75]} />
        <directionalLight position={[-8, 14, 14]} intensity={2.3} color="#ffd59a" />
        <directionalLight position={[10, -4, 6]} intensity={0.7} color="#ff8a3c" />
        <pointLight position={[0, 2, 8]} intensity={60} distance={30} color="#ffb347" />
        <mesh position={[0, TOP + 0.45, -0.1]}><boxGeometry args={[18, 0.9, 1.6]} /><meshStandardMaterial color={COL.bar} roughness={0.9} /></mesh>
        <mesh position={[0, 0, -40]}><planeGeometry args={[140, 140]} /><meshStandardMaterial color="#1c0f06" roughness={1} /></mesh>
        <Comb t={t} />
        {cv > 0.02 && CRAWLERS.map((b, i) => { const { p, h } = crawlerPos(i, t); return <Bee key={i} p={[p[0], p[1], p[2]]} heading={h} t={t} scale={b.s * cv} />; })}
        {chv > 0.02 && CHAIN_X.map((_, ci) => Array.from({ length: 5 }, (__, j) => {
          const { p, h } = chainBee(ci, j, t);
          const hero = ci === HERO.ci && j === HERO.j && t > 8.5 && t < 13;
          return <Bee key={`${ci}-${j}`} p={p} heading={h} t={t} belly={hero} scale={0.85 * chv} />;
        }))}
      </PixelLayer>
      <GlowLayer fov={40}>
        <CamRig {...cam} />
        {DATA.cells.map((c, i) => {
          const s = cellState(c, t);
          return s.grow > 0.05 ? (
            <group key={i}>
              {s.fill > 0.1 && <Glow map={map} at={[c.x, c.y + 0.15, 1.0]} size={1.3} color="#ff9a1f" opacity={0.16 * s.fill * (1 - 0.6 * s.cap)} />}
              {s.flash > 0 && <Glow map={map} at={[c.x, c.y + 0.15, 1.1]} size={1.8} color="#fff1c0" opacity={0.9 * s.flash} />}
            </group>
          ) : null;
        })}
        {/* wax flakes from the 8 glands of the hero bee */}
        {DATA.flakes.map((ft, i) => {
          if (t < ft || t > 12.8) return null;
          const p = chainBee(HERO.ci, HERO.j, t).p;
          const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
          const at: V3 = [p[0] + side * 0.32, p[1] + 0.2 - k * 0.32 - 0.1, p[2] + 0.75];
          return <Glow key={i} map={map} at={at} size={0.55 + 0.6 * Math.exp(-(t - ft) * 6)} color="#fffbe6" opacity={0.95} />;
        })}
        <Glow map={map} at={[-5, 9, -6]} size={34} color="#ff9a3c" opacity={0.14} />
        {Array.from({ length: 50 }, (_, i) => (
          <Glow key={`d${i}`} map={map} at={[(rnd(i) - 0.5) * 30 + 0.4 * Math.sin(t * 2 * LW + i), (rnd(i + 40) - 0.5) * 26 + 0.3 * Math.cos(t * 2 * LW + i), 2 + rnd(i + 80) * 12]} size={0.12 + rnd(i + 9) * 0.22} color="#ffd9a0" opacity={0.2 + 0.35 * rnd(i + 3)} />
        ))}
      </GlowLayer>
      <Vignette s={0.82} />
      <Diagram t={t} />
      <div style={{ position: "absolute", left: 50, top: 70, fontFamily: "PressStart2P", fontSize: 22, color: "#f6e7c8", opacity: 0.85, textShadow: "3px 3px 0 #000" }}>{tag}</div>
      <Captions t={t} end={48} color="#f6e7c8" glow="rgba(255,170,60,0.5)" cues={[
        { t: 2.2, a: "NO PLAN.", b: "NO TOOLS.", c: "NO BOSS." },
        { t: 5, a: "SO HOW DOES", b: "THIS", c: "HAPPEN?" },
        { t: 7.2, a: "IT STARTS", b: "WITH", c: "NOTHING" },
        { t: 8.6, a: "YOUNG BEES HANG", b: "IN CHAINS", c: "AND MAKE WAX" },
        { t: 10.2, a: "IT OOZES FROM", b: "8 GLANDS", c: "UNDER THEIR BELLY" },
        { t: 12, a: "THEY CHEW IT", b: "SOFT" },
        { t: 13.4, a: "AND PRESS IT", b: "INTO WALLS" },
        { t: 15.2, a: "CELL", b: "BY CELL" },
        { t: 17, a: "BUT", b: "WHY", c: "HEXAGONS?" },
        { t: 19, a: "CIRCLES", b: "LEAVE GAPS" },
        { t: 21, a: "SQUARES", b: "USE MORE", c: "WAX" },
        { t: 23, a: "HEXAGONS", b: "NO GAPS", c: "LEAST WAX" },
        { t: 25, a: "AND WAX", b: "IS COSTLY", c: "~8 KG OF HONEY PER KG" },
        { t: 27.2, a: "MATHEMATICIANS", b: "PROVED IT", c: "IN 1999" },
        { t: 29.4, a: "EACH CELL TILTS UP", b: "A LITTLE", c: "SO HONEY WON'T DRIP" },
        { t: 31.4, a: "THEN THEY FILL THEM", b: "WITH HONEY" },
        { t: 33.4, a: "AND SEAL THEM", b: "WITH WAX" },
        { t: 36, a: "THOUSANDS OF CELLS", b: "ZERO", c: "BLUEPRINTS" },
        { t: 39, a: "BEES", b: "KNEW IT", c: "ALL ALONG" },
        { t: 42, b: "NOW YOU KNOW." },
        { t: 45.5, b: "" },
      ]} />
      <Hook o={t < 2.2 ? ease((2.2 - t) / 0.35) : ease((t - 46.2) / 0.6)} />
    </AbsoluteFill>
  );
};
