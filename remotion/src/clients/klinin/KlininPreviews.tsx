/**
 * Klinin (laundry pickup & delivery, Agadir) — marketing video concept previews.
 * A: "Comment ça marche ?" 3D washing machine, musical how-it-works (hook + slow-mo inside the drum)
 * B: "Ton dimanche" before/after
 * C: 8-bit mini-game (level screen + -50% power-up)
 * All claims come from klinin.ma: récupéré/nettoyé/livré, 4 à 24h, -50% 1ère commande, 10 000+ clients, 4.9/5, Agadir.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { Pixels, Px, rect, disc, ring, rnd } from "../../brand/pixels";

loadFont({ family: "PoppinsX", url: staticFile("fonts/Poppins-ExtraBold.ttf"), weight: "800" });
loadFont({ family: "PoppinsS", url: staticFile("fonts/Poppins-SemiBold.ttf"), weight: "600" });
loadFont({ family: "PressStart2P", url: staticFile("fonts/PressStart2P-Regular.ttf") });

export const K = { navy: "#003367", blue: "#137fec", machine: "#3e6fd8", sky: "#e8f3ff", amber: "#f59e0b", ink: "#0f172a", white: "#ffffff", green: "#22c55e" };

// ---------- 3D helpers ----------
export function roundedBox(w: number, h: number, d: number, r: number, hole?: { x: number; y: number; r: number }) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  if (hole) { const p = new THREE.Path(); p.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 0.4, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -(d - 0.4) / 2);
  return g;
}
export const toy = (color: string, extra: Record<string, unknown> = {}) => <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={1} clearcoatRoughness={0.15} {...extra} />;

export const CLOTH = ["#ffffff", "#ffd166", "#ef476f", "#06d6a0", "#8ecae6", "#f4a261", "#cdb4db"];

/** Washing machine in the Klinin logo style: blue body, white door ring, panel strip + 2 knobs, clothes + bubbles. */
export const WashingMachine: React.FC<{ drumA: number }> = ({ drumA }) => {
  const g = useMemo(() => ({ body: roundedBox(6, 7.4, 5.4, 0.6, { x: 0, y: -0.6, r: 2.05 }), ring: new THREE.TorusGeometry(2.15, 0.36, 20, 64), glass: new THREE.CircleGeometry(1.95, 48),
    drum: new THREE.CylinderGeometry(2.05, 2.05, 5.2, 40, 1, true).rotateX(Math.PI / 2), back: new THREE.CircleGeometry(1.95, 40),
    strip: roundedBox(2.6, 0.38, 0.2, 0.1), knob: new THREE.CylinderGeometry(0.3, 0.3, 0.2, 24).rotateX(Math.PI / 2), cloth: new THREE.SphereGeometry(0.62, 16, 12) }), []);
  return (
    <group>
      <mesh geometry={g.body}>{toy(K.machine)}</mesh>
      <mesh geometry={g.strip} position={[-1.15, 2.95, 2.75]}>{toy(K.white)}</mesh>
      <mesh geometry={g.knob} position={[1.35, 2.95, 2.72]}>{toy(K.white)}</mesh>
      <mesh geometry={g.knob} position={[2.1, 2.95, 2.72]}>{toy(K.white)}</mesh>
      <mesh position={[0, 2.35, 2.71]}><boxGeometry args={[5.4, 0.08, 0.05]} />{toy("#2f58b8")}</mesh>
      {/* drum (seen through the glass) */}
      <group position={[0, -0.6, 0]}>
        <mesh geometry={g.drum}><meshStandardMaterial color="#163b86" side={THREE.BackSide} roughness={0.6} /></mesh>
        <mesh geometry={g.back} position={[0, 0, -1.2]} scale={1.06}><meshStandardMaterial color="#0f2b66" /></mesh>
        <group rotation={[0, 0, drumA]}>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2, r = 0.7 + rnd(i) * 0.7;
            return <mesh key={i} geometry={g.cloth} position={[Math.cos(a) * r, Math.sin(a) * r - 0.2, 0.2 + rnd(i + 3) * 1.6]} scale={[1, 0.55, 0.7]} rotation={[0, 0, a * 2]}>{toy(CLOTH[i % CLOTH.length])}</mesh>;
          })}
        </group>
      </group>
      <mesh geometry={g.glass} position={[0, -0.6, 2.72]}><meshPhysicalMaterial color="#bfe3ff" transparent opacity={0.28} roughness={0.05} clearcoat={1} /></mesh>
      <mesh geometry={g.ring} position={[0, -0.6, 2.75]}>{toy(K.white)}</mesh>
      {/* feet */}
      {[-2.2, 2.2].map((x) => <mesh key={x} position={[x, -3.85, 1.5]}><cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />{toy("#2f58b8")}</mesh>)}
    </group>
  );
};

export const Bubbles: React.FC<{ n?: number; spread?: [number, number, number]; seed?: number }> = ({ n = 18, spread = [9, 12, 4], seed = 0 }) => (
  <group>
    {Array.from({ length: n }, (_, i) => {
      const r = 0.15 + rnd(i + seed) * 0.55;
      return (
        <mesh key={i} position={[(rnd(i * 3 + seed) - 0.5) * spread[0], (rnd(i * 7 + seed) - 0.5) * spread[1], (rnd(i * 11 + seed) - 0.5) * spread[2] + 3]}>
          <sphereGeometry args={[r, 20, 16]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.45} roughness={0} clearcoat={1} transmission={0} />
        </mesh>
      );
    })}
  </group>
);

export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.85} />
    <directionalLight position={[-8, 12, 14]} intensity={1.7} />
    <directionalLight position={[9, -4, 6]} intensity={0.5} color="#cfe6ff" />
  </>
);

const Canvas3D: React.FC<{ z?: number; fov?: number; children: React.ReactNode }> = ({ z = 30, fov = 40, children }) => (
  <AbsoluteFill>
    <ThreeCanvas width={1080} height={1920} gl={{ alpha: true, antialias: true }} camera={{ fov, position: [0, 0, z], near: 0.1, far: 200 }}>
      <Lights />
      {children}
    </ThreeCanvas>
  </AbsoluteFill>
);

// ---------- 2D UI in Klinin style ----------
const Pill: React.FC<{ x: number; y: number; bg: string; color?: string; size: number; children: React.ReactNode; tilt?: number; font?: string }> = ({ x, y, bg, color = K.white, size, children, tilt = 0, font = "PoppinsX" }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${tilt}deg)`, background: bg, color, fontFamily: font, fontSize: size,
    padding: `${size * 0.28}px ${size * 0.6}px`, borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 18px 40px rgba(0,51,103,0.25)" }}>{children}</div>
);
const Head: React.FC<{ y: number; lines: { t: string; c?: string; s: number }[] }> = ({ y, lines }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: "PoppinsX", lineHeight: 1.02, letterSpacing: -2 }}>
    {lines.map((l, i) => <div key={i} style={{ fontSize: l.s, color: l.c ?? K.navy }}>{l.t}</div>)}
  </div>
);
const Logo: React.FC<{ size?: number; x?: number; y?: number }> = ({ size = 190, x = 60, y = 60 }) => (
  <Img src={staticFile("clients/klinin/logo.png")} style={{ position: "absolute", left: x, top: y, width: size, height: size, filter: "drop-shadow(0 10px 20px rgba(0,51,103,0.25))" }} />
);
const StoreBar: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, display: "flex", justifyContent: "center", gap: 24 }}>
    {["App Store", "Google Play"].map((s) => (
      <div key={s} style={{ background: K.ink, color: K.white, fontFamily: "PoppinsS", fontSize: 36, padding: "20px 38px", borderRadius: 22 }}>{s}</div>
    ))}
  </div>
);
const SkyBG: React.FC = () => <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, #ffffff 0%, #e8f3ff 45%, #b9dbff 100%)" }} />;

// ---------- A1: hook ----------
const A1 = () => (
  <AbsoluteFill>
    <SkyBG />
    <Canvas3D z={30}>
      <group position={[0, -1.6, 0]} rotation={[0.12, -0.38, 0]} scale={0.82}><WashingMachine drumA={0.6} /></group>
      <Bubbles seed={1} />
    </Canvas3D>
    <Logo />
    <Pill x={760} y={150} bg={K.navy} size={34}>● DISPO À AGADIR</Pill>
    <Head y={300} lines={[{ t: "Ton linge ?", s: 120 }, { t: "On s'en occupe.", s: 96, c: K.blue }]} />
    <Pill x={540} y={1520} bg={K.amber} color={K.ink} size={54} tilt={-3}>Récupéré. Nettoyé. Livré.</Pill>
    <StoreBar />
  </AbsoluteFill>
);

// ---------- A2: slow-mo inside the drum ----------
const A2 = () => (
  <AbsoluteFill>
    <SkyBG />
    <Canvas3D z={12} fov={50}>
      <group position={[0, 0.6, 0]} rotation={[0.02, -0.05, 0]}><WashingMachine drumA={1.9} /></group>
      <Bubbles n={26} spread={[7, 10, 3]} seed={9} />
    </Canvas3D>
    <Pill x={250} y={110} bg={K.blue} size={36}>❚❚ SLOW-MO</Pill>
    <div style={{ position: "absolute", left: 60, top: 200, display: "flex", alignItems: "center", gap: 26, background: "rgba(255,255,255,0.94)", borderRadius: 999, padding: "18px 56px 18px 22px", boxShadow: "0 20px 50px rgba(0,51,103,0.25)" }}>
      <div style={{ width: 120, height: 120, borderRadius: 60, background: K.amber, fontFamily: "PoppinsX", fontSize: 72, color: K.ink, display: "grid", placeItems: "center" }}>2</div>
      <div style={{ fontFamily: "PoppinsX", fontSize: 110, color: K.navy, letterSpacing: -3 }}>Nettoyé</div>
    </div>
    <div style={{ position: "absolute", left: 90, right: 90, bottom: 260, background: "rgba(255,255,255,0.92)", borderRadius: 40, padding: "36px 46px", fontFamily: "PoppinsS", fontSize: 44, color: K.ink, boxShadow: "0 20px 50px rgba(0,51,103,0.2)" }}>
      Lavé, séché et plié par nos partenaires experts, avec des détergents écologiques.
    </div>
    <Logo size={150} x={880} y={1690} />
  </AbsoluteFill>
);

// ---------- B: ton dimanche (before / after) ----------
const Pile: React.FC<{ neat: boolean }> = ({ neat }) => (
  <group>
    {Array.from({ length: neat ? 6 : 11 }, (_, i) => {
      const c = CLOTH[(i + 2) % CLOTH.length];
      return neat
        ? <mesh key={i} position={[0, -1.5 + i * 0.62, 0]}><boxGeometry args={[3.6, 0.55, 2.6]} />{toy(c)}</mesh>
        : <mesh key={i} position={[(rnd(i) - 0.5) * 5, -1.6 + rnd(i + 5) * 2.4, (rnd(i + 9) - 0.5) * 2]} rotation={[rnd(i) * 3, rnd(i + 1) * 3, rnd(i + 2) * 3]} scale={[1.6, 0.4, 1.1]}>
            <sphereGeometry args={[1, 16, 12]} />{toy(c, { color: new THREE.Color(c).lerp(new THREE.Color("#9aa3b2"), 0.55) })}
          </mesh>;
    })}
  </group>
);
const B1 = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{ background: "linear-gradient(#dfe3ea 0%, #dfe3ea 50%, #e8f3ff 50%, #ffffff 100%)" }} />
    <Canvas3D z={34}>
      <group position={[0, 3.2, 0]} rotation={[0.3, 0.3, 0]}><Pile neat={false} /></group>
      <group position={[-3.2, -8.6, 0]} rotation={[0.25, -0.45, 0]}><Pile neat /></group>
      <group position={[3.6, -8.4, -1]} rotation={[0.1, -0.4, 0]} scale={0.62}><WashingMachine drumA={0.3} /></group>
    </Canvas3D>
    <Pill x={250} y={120} bg="#64748b" size={40}>AVANT</Pill>
    <Head y={180} lines={[{ t: "Tout ton dimanche", s: 84, c: "#334155" }, { t: "à faire la lessive ?", s: 84, c: "#334155" }]} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 940, height: 10, background: K.amber }} />
    <Pill x={300} y={1030} bg={K.blue} size={40}>AVEC KLININ</Pill>
    <Head y={1090} lines={[{ t: "3 étapes.", s: 96, c: K.navy }, { t: "Week-end rendu.", s: 72, c: K.blue }]} />
    <Pill x={540} y={1780} bg={K.navy} size={36}>★ 4.9/5 · +10 000 clients</Pill>
  </AbsoluteFill>
);

// ---------- C: 8-bit mini-game (180x320 pixel grid) ----------
const PX = { sky1: "#7cc4ff", sky2: "#a9d8ff", sky3: "#d4ecff", cloud: "#ffffff", wall: "#f6efe2", wallDk: "#e3d6bf", ochre: "#e9b872", road: "#4b5563", line: "#f8fafc",
  blue: K.machine, navy: K.navy, amber: K.amber, ink: "#0f172a", skin: "#c98a5a", white: "#ffffff", green: "#22c55e", red: "#ef4444" };

function scooter(x: number, y: number): Px[] {
  return [
    // wheels
    ...disc(x + 4, y + 18, 4, PX.ink), ...disc(x + 4, y + 18, 2, "#9ca3af"), ...disc(x + 26, y + 18, 4, PX.ink), ...disc(x + 26, y + 18, 2, "#9ca3af"),
    // body
    rect(x + 2, y + 11, 28, 5, PX.blue), rect(x + 22, y + 4, 4, 9, PX.blue), rect(x + 21, y + 2, 7, 2, PX.ink), rect(x + 4, y + 9, 12, 3, PX.navy),
    // driver
    rect(x + 10, y - 6, 7, 10, PX.blue), rect(x + 11, y - 13, 6, 6, PX.skin), rect(x + 10, y - 15, 8, 3, PX.navy), rect(x + 16, y - 3, 7, 2, PX.blue), rect(x + 12, y + 4, 3, 6, PX.navy),
    // laundry bag on the back (blue, with white "K")
    rect(x - 4, y - 4, 12, 13, PX.blue), rect(x - 2, y - 7, 8, 3, PX.blue), rect(x, y - 9, 4, 2, PX.white), rect(x - 1, y, 2, 6, PX.white), rect(x + 1, y + 2, 2, 2, PX.white), rect(x + 3, y, 2, 2, PX.white), rect(x + 3, y + 4, 2, 2, PX.white),
  ];
}
function coin(x: number, y: number, r = 6): Px[] {
  return [...disc(x, y, r, PX.amber), ...ring(x, y, r, "#b45309", 1), rect(x - 1, y - r + 3, 2, 2 * r - 6, "#fde68a")];
}
function city(): Px[] {
  const px: Px[] = [rect(0, 0, 180, 110, PX.sky1), rect(0, 110, 180, 60, PX.sky2), rect(0, 170, 180, 40, PX.sky3)];
  [[20, 40], [110, 28], [150, 70]].forEach(([cx, cy], i) => px.push(rect(cx, cy, 22, 6, PX.cloud), rect(cx + 5, cy - 4, 12, 4, PX.cloud), rect(cx - 4 + i, cy + 6, 30, 3, PX.cloud)));
  // Agadir-style white & ochre houses
  for (let i = 0; i < 7; i++) {
    const w = 22 + Math.round(rnd(i) * 10), h = 36 + Math.round(rnd(i + 4) * 34), x = i * 27 - 6, y = 236 - h;
    px.push(rect(x, y, w, h, i % 3 === 1 ? PX.ochre : PX.wall), rect(x, y, w, 2, PX.wallDk));
    for (let wy = y + 6; wy < 226; wy += 11) for (let wx = x + 4; wx < x + w - 5; wx += 8) px.push(rect(wx, wy, 4, 5, i % 2 ? PX.blue : "#60a5fa"));
  }
  px.push(rect(0, 236, 180, 4, "#9ca3af"), rect(0, 240, 180, 44, PX.road));
  for (let x = 4; x < 180; x += 22) px.push(rect(x, 261, 12, 2, PX.line));
  px.push(rect(0, 284, 180, 36, "#334155"));
  return px;
}
const Txt8: React.FC<{ x: number; y: number; s: number; c?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({ x, y, s, c = PX.white, anchor = "middle", children }) => (
  <text x={x} y={y} fontFamily="PressStart2P" fontSize={s} fill={c} textAnchor={anchor} dominantBaseline="hanging">{children}</text>
);
const HUD: React.FC<{ level: string }> = ({ level }) => (
  <>
    <rect x={0} y={0} width={180} height={22} fill={PX.navy} />
    <Txt8 x={5} y={4} s={4} anchor="start" c={PX.amber}>KLININ QUEST</Txt8>
    <Txt8 x={5} y={12} s={4} anchor="start">{level}</Txt8>
    <Txt8 x={175} y={4} s={4} anchor="end">★ 4.9</Txt8>
    <Pixels px={[0, 1, 2].flatMap((i) => [rect(152 + i * 8, 12, 2, 2, PX.red), rect(155 + i * 8, 12, 2, 2, PX.red), rect(151 + i * 8, 13, 7, 2, PX.red), rect(152 + i * 8, 15, 5, 1, PX.red), rect(153 + i * 8, 16, 3, 1, PX.red)])} />
  </>
);
const C1 = () => (
  <AbsoluteFill style={{ background: PX.sky1 }}>
    <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges">
      <Pixels px={city()} />
      <Pixels px={[...coin(118, 214), ...coin(136, 206), ...coin(154, 214)]} />
      <Pixels px={scooter(64, 238)} />
      <Pixels px={[rect(52, 252, 6, 2, PX.white), rect(46, 248, 4, 2, PX.white), rect(40, 254, 5, 2, PX.white)]} />
      <HUD level="NIV.1 · COLLECTE" />
      <rect x={20} y={40} width={140} height={62} fill={PX.ink} opacity={0.9} />
      <rect x={20} y={40} width={140} height={62} fill="none" stroke={PX.amber} strokeWidth={1.5} />
      <Txt8 x={90} y={48} s={6} c={PX.amber}>NIVEAU 1</Txt8>
      <Txt8 x={90} y={60} s={10}>COLLECTE</Txt8>
      <Txt8 x={90} y={76} s={4}>LE CHAUFFEUR ARRIVE</Txt8>
      <Txt8 x={90} y={84} s={4}>A TA PORTE</Txt8>
      <Txt8 x={90} y={292} s={5} c={PX.amber}>▶ APPUIE SUR START</Txt8>
      <Txt8 x={90} y={304} s={4} c="#cbd5e1">KLININ.MA</Txt8>
    </svg>
  </AbsoluteFill>
);
const C2 = () => {
  const spark: Px[] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; spark.push(rect(90 + Math.cos(a) * 52, 150 + Math.sin(a) * 52, 3, 3, i % 2 ? PX.amber : PX.white)); }
  return (
    <AbsoluteFill style={{ background: PX.navy }}>
      <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges">
        <Pixels px={city().map((p) => ({ ...p, o: 0.25 }))} />
        <Pixels px={[...spark, ...coin(90, 150, 40)]} />
        <Txt8 x={91} y={138} s={18} c="#7c2d12">-50%</Txt8>
        <Txt8 x={90} y={137} s={18} c={PX.ink}>-50%</Txt8>
        <HUD level="BONUS DEBLOQUE !" />
        <Txt8 x={90} y={44} s={8} c={PX.amber}>POWER-UP !</Txt8>
        <Txt8 x={90} y={210} s={6}>-50% SUR TA</Txt8>
        <Txt8 x={90} y={222} s={6}>1ERE COMMANDE</Txt8>
        <Pixels px={scooter(70, 262)} />
        <Txt8 x={90} y={300} s={4} c="#cbd5e1">TELECHARGE L'APP KLININ</Txt8>
      </svg>
    </AbsoluteFill>
  );
};

export const KLININ_SHOTS = [A1, A2, B1, C1, C2];
export const KlininPreviews: React.FC<{ shot: number }> = ({ shot }) => {
  const S = KLININ_SHOTS[shot] ?? A1;
  return <S />;
};
