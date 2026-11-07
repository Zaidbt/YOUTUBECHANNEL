/**
 * Video 005 · How does a light bulb make light? (LED) — 48 s seamless loop @ 60 fps, cinematic pixel-3D.
 * Three scales, joined by flashes of light: the bulb → inside the copper wire → inside the LED chip → back to the bulb.
 * Events from light.json (videos/05-light/build.py): "pushes" (the electric push racing down the wire, kick)
 * and "drops" (an electron falls into a hole and a photon flies out, one note each).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import TL from "./light.json";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamRig, CamKey, PixelLayer, GlowLayer, Captions, Vignette } from "../teasers/Majestic";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(TL.duration * FPS);
type V3 = [number, number, number];
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const BG = "#05070d";
const COL = { warm: "#fff1cf", copper: "#c8743c", electron: "#5ee7ff", photon: "#4f7dff", yellow: "#ffd23f", nAtom: "#5c7bd9", pAtom: "#d98a5c", hole: "#ffb070" };

/** Many identical spheres in one draw call. */
const Instances: React.FC<{ pos: V3[]; r: number; color: string; emissive?: string }> = ({ pos, r, color, emissive }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, emissive: emissive ?? "#000000", emissiveIntensity: 0.4 }), pos.length);
    const o = new THREE.Object3D();
    pos.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [pos, r, color, emissive]);
  return <primitive object={mesh} />;
};

// ===================== SCENE 1 · the bulb =====================
const xrayAt = (t: number) => (t < 24 ? ease((t - 2.5) / 2.0) : 1 - ease((t - 42) / 2.5));
const Bulb: React.FC<{ xray: number }> = ({ xray }) => {
  const shell = 1 - 0.82 * xray;
  const chips = useMemo(() => [[0, 0], ...Array.from({ length: 9 }, (_, i) => [Math.cos((i / 9) * Math.PI * 2) * 1.0, Math.sin((i / 9) * Math.PI * 2) * 1.0])], []);
  return (
    <group>
      <mesh position={[0, 23, 0]}><cylinderGeometry args={[0.12, 0.12, 34, 8]} /><meshStandardMaterial color="#141414" /></mesh>
      <mesh position={[0, 6.4, 0]}><cylinderGeometry args={[0.7, 0.9, 0.5, 20]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
      <mesh position={[0, 5.2, 0]}><cylinderGeometry args={[1.2, 1.2, 2.0, 28]} /><meshStandardMaterial color="#b9b9b0" metalness={0.7} roughness={0.3} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0, 4.4 + i * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.22, 0.1, 8, 28]} /><meshStandardMaterial color="#d6d6cc" metalness={0.7} roughness={0.3} /></mesh>)}
      <mesh position={[0, 3.4, 0]}><cylinderGeometry args={[1.25, 1.8, 1.6, 28]} /><meshStandardMaterial color="#e8e8e8" transparent opacity={shell} depthWrite={shell > 0.98} /></mesh>
      <mesh scale={[1, 1.1, 1]}><sphereGeometry args={[3, 40, 28]} /><meshStandardMaterial color="#fff6e0" emissive={COL.warm} emissiveIntensity={0.9 - 0.6 * xray} transparent opacity={shell} depthWrite={shell > 0.98} /></mesh>
      {/* inside: copper leads + LED board with chips (yellow phosphor) */}
      {[-0.5, 0.5].map((x) => <mesh key={x} position={[x, 3.4, 0]}><cylinderGeometry args={[0.07, 0.07, 1.8, 8]} /><meshStandardMaterial color={COL.copper} metalness={0.6} roughness={0.3} emissive="#5a2a10" emissiveIntensity={0.4} /></mesh>)}
      <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[1.55, 1.55, 0.12, 32]} /><meshStandardMaterial color="#d8dde3" metalness={0.5} roughness={0.4} /></mesh>
      {chips.map(([x, z], i) => <mesh key={i} position={[x, 2.4, z]}><boxGeometry args={[0.32, 0.08, 0.32]} /><meshBasicMaterial color={COL.yellow} /></mesh>)}
      <mesh position={[0, 0, -16]}><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#2a2018" roughness={1} /></mesh>
    </group>
  );
};
const BulbGlow: React.FC<{ map: THREE.Texture; xray: number }> = ({ map, xray }) => (
  <>
    <Glow map={map} at={[0, 0.3, 0]} size={20} color="#ffd9a0" opacity={0.5 - 0.38 * xray} />
    <Glow map={map} at={[0, 0.3, 0]} size={8} color="#fff4dc" opacity={0.75 - 0.65 * xray} />
    {[[0, 0], ...Array.from({ length: 9 }, (_, i) => [Math.cos((i / 9) * Math.PI * 2), Math.sin((i / 9) * Math.PI * 2)])].map(([x, z], i) => (
      <Glow key={i} map={map} at={[x, 2.3, z]} size={1.3} color="#fff1a8" opacity={0.85 * xray} />
    ))}
  </>
);
const BULB_HOME = { p: [0, 3.2, 19] as V3, l: [0, 4.2, 0] as V3 };
const BULB_CAM: CamKey[] = [
  { t: 0, ...BULB_HOME }, { t: 1.4, ...BULB_HOME },
  { t: 3.6, p: [0.6, 2.4, 10.5], l: [0, 3.2, 0] },
  { t: 5.6, p: [1.6, 2.8, 5.2], l: [0.4, 3.0, 0] },
  { t: 7.0, p: [0.85, 3.2, 1.9], l: [0.5, 3.3, 0] },       // dive into the copper lead
  { t: 38, p: [0.3, 1.3, 4.2], l: [0, 2.4, 0] },           // coming back out near the chips
  { t: 41.5, p: [0, 2.2, 10.5], l: [0, 3.0, 0] },
  { t: 45.6, ...BULB_HOME }, { t: 48, ...BULB_HOME },
];

// ===================== SCENE 2 · inside the copper wire =====================
const WIRE_ATOMS: V3[] = (() => {
  const out: V3[] = [];
  for (let x = -30; x <= 30; x += 1.2) for (let y = -2.4; y <= 2.41; y += 1.2) for (let z = -2.4; z <= 2.41; z += 1.2) if (y * y + z * z <= 7.3) out.push([x, y, z]);
  return out;
})();
const WIRE_E = Array.from({ length: 80 }, (_, i) => ({ x: (rnd(i) - 0.5) * 50, y: (rnd(i + 100) - 0.5) * 4.4, z: (rnd(i + 200) - 0.5) * 4.4 }));
const pushFront = (t: number) => {
  for (const p of TL.pushes) { const d = t - p; if (d >= 0 && d < 0.5) return -18 + d * 80; }
  return null;
};
const electronPos = (i: number, t: number): V3 => {
  const e = WIRE_E[i];
  return [e.x + 0.12 * (t - 7) + 0.22 * Math.sin(t * 9 + i * 1.7), e.y + 0.18 * Math.sin(t * 11 + i * 2.3), e.z + 0.18 * Math.cos(t * 10 + i)];
};
const WIRE_CAM: CamKey[] = [
  { t: 7.0, p: [-5.5, 2.4, 7.5], l: [0, 0, 0] },
  { t: 10, p: [-2.2, 1.4, 5.2], l: [1, 0, 0] },
  { t: 12.8, p: [-11, 4.5, 12], l: [4, 0, 0] },
  { t: 16, p: [5, 1.2, 4.2], l: [9, 0, 0] },
];

// ===================== SCENE 3 · inside the LED chip =====================
const N_ATOMS: V3[] = [], P_ATOMS: V3[] = [];
for (let x = -8; x <= 8; x += 1) for (let y = -3; y <= 0; y += 1) for (let z = -3; z <= 3; z += 1) (x < 0 ? N_ATOMS : P_ATOMS).push([x + 0.5, y, z]);
const FREE_E = Array.from({ length: 34 }, (_, i) => ({ x: -7 + rnd(i + 300) * 6, y: -2.6 + rnd(i + 400) * 2.4, z: -2.6 + rnd(i + 500) * 5.2 }));
const FREE_H = Array.from({ length: 34 }, (_, i) => ({ x: 1 + rnd(i + 600) * 6, y: -2.6 + rnd(i + 700) * 2.4, z: -2.6 + rnd(i + 800) * 5.2 }));
const dropPair = (k: number) => ({ y: -2.4 + rnd(k + 900) * 2.0, z: -2.2 + rnd(k + 950) * 4.4, dx: (rnd(k + 990) - 0.5) * 0.9, dz: (rnd(k + 1990) - 0.5) * 0.9 });
const PHOSPHOR_Y = 4.3;
const phosphorOn = (t: number) => ease((t - 29.5) / 1.2);
const CHIP_CAM: CamKey[] = [
  { t: 16, p: [-2, 6, 16], l: [0, -1, 0] },
  { t: 18.5, p: [-7, 3.2, 10], l: [-3.5, -1.2, 0] },     // N side: extra electrons
  { t: 20.5, p: [7, 3.2, 10], l: [3.5, -1.2, 0] },       // P side: holes
  { t: 22.5, p: [1.6, 1.8, 7.5], l: [0.3, -1.0, 0] },     // the junction
  { t: 26.5, p: [0.8, 2.6, 8.5], l: [0.3, 0.6, 0] },
  { t: 30.5, p: [0.2, 6.2, 10], l: [0, 4.0, 0] },         // the yellow coating
  { t: 34, p: [0, 7.5, 16], l: [0, 3.5, 0] },
  { t: 38, p: [0, 10, 27], l: [0, 4.5, 0] },
];

const ChipWorld: React.FC<{ t: number }> = ({ t }) => {
  const ph = phosphorOn(t);
  const flash = TL.drops.reduce((a, d) => a + (t >= d && t - d < 0.4 ? Math.exp(-(t - d) * 8) : 0), 0);
  const grains = useMemo(() => Array.from({ length: 260 }, (_, i) => [(rnd(i + 3000) - 0.5) * 14, PHOSPHOR_Y + (rnd(i + 3100) - 0.5) * 0.5, (rnd(i + 3200) - 0.5) * 6] as V3), []);
  return (
    <group>
      <hemisphereLight args={["#9fb6ff", "#0a0a14", 0.55]} />
      <directionalLight position={[-6, 12, 10]} intensity={1.4} color="#dfe8ff" />
      <pointLight position={[0.6, 0.5, 0]} intensity={20 + 260 * Math.min(2, flash)} distance={14} color="#7f9cff" />
      <Instances pos={N_ATOMS} r={0.15} color="#3f5aa8" />
      <Instances pos={P_ATOMS} r={0.15} color="#a8643f" />
      {FREE_H.map((h, i) => (
        <mesh key={i} position={[h.x + 0.12 * Math.sin(t * 5 + i), h.y, h.z + 0.12 * Math.cos(t * 6 + i)]}><torusGeometry args={[0.24, 0.06, 6, 16]} /><meshBasicMaterial color={COL.hole} /></mesh>
      ))}
      {TL.drops.map((d, k) => { const lead = t - d; if (lead < -0.6 || lead >= 0) return null; const p = dropPair(k);
        return <mesh key={`hd${k}`} position={[0.9, p.y, p.z]}><torusGeometry args={[0.26, 0.07, 6, 16]} /><meshBasicMaterial color={COL.hole} /></mesh>; })}
      {ph > 0.01 && (
        <group>
          <mesh position={[0, PHOSPHOR_Y, 0]}><boxGeometry args={[14.5, 0.6, 6.5]} /><meshStandardMaterial color="#ffe27a" transparent opacity={0.25 * ph} depthWrite={false} /></mesh>
          {ph > 0.5 && <Instances pos={grains} r={0.09} color={COL.yellow} emissive="#806000" />}
        </group>
      )}
    </group>
  );
};
const ChipGlow: React.FC<{ map: THREE.Texture; t: number }> = ({ map, t }) => {
  const ph = phosphorOn(t);
  const out: React.ReactNode[] = [];
  // junction line
  for (let i = 0; i < 9; i++) out.push(<Glow key={`j${i}`} map={map} at={[0, -1.5, -3 + i * 0.75]} size={1.2} color="#8fb0ff" opacity={0.12} />);
  // background electrons (N) and holes (P), jittering
  FREE_E.forEach((e, i) => out.push(<Glow key={`e${i}`} map={map} at={[e.x + 0.15 * Math.sin(t * 6 + i), e.y + 0.12 * Math.sin(t * 7 + i * 2), e.z]} size={0.95} color={COL.electron} opacity={0.9} />));
  FREE_H.forEach((h, i) => out.push(<Glow key={`h${i}`} map={map} at={[h.x + 0.12 * Math.sin(t * 5 + i), h.y, h.z + 0.12 * Math.cos(t * 6 + i)]} size={0.45} color={COL.hole} opacity={0.22} />));
  // drops: electron crosses the junction, falls into a hole, a photon flies out
  TL.drops.forEach((d, k) => {
    const p = dropPair(k), lead = t - d;
    if (lead < -0.6 || lead > 1.6) return;
    if (lead < 0) {
      const u = ease((lead + 0.6) / 0.6);
      out.push(<Glow key={`de${k}`} map={map} at={[-2.2 + 3.1 * u, p.y, p.z]} size={1.2} color={COL.electron} opacity={1} />);
      out.push(<Glow key={`dh${k}`} map={map} at={[0.9, p.y, p.z]} size={0.55} color={COL.hole} opacity={0.5} />);
    } else {
      if (lead < 0.35) out.push(<Glow key={`df${k}`} map={map} at={[0.9, p.y, p.z]} size={2.4 * (1 - lead / 0.35) + 0.5} color="#ffffff" opacity={1 - lead / 0.35} />);
      const pos: V3 = [0.9 + p.dx * lead * 6, p.y + lead * 9, p.z + p.dz * lead * 6];
      const yellow = ph > 0.5 && k % 2 === 0 && pos[1] > PHOSPHOR_Y;
      const col = yellow ? COL.yellow : COL.photon;
      for (let s = 0; s < 6; s++) {
        const b = Math.max(0, lead - s * 0.025);
        const sp: V3 = [0.9 + p.dx * b * 6, p.y + b * 9, p.z + p.dz * b * 6];
        const sc = yellow && sp[1] <= PHOSPHOR_Y ? COL.photon : col;
        out.push(<Glow key={`dp${k}_${s}`} map={map} at={sp} size={(s === 0 ? 0.9 : 0.6) * (1 - s / 7)} color={s === 0 ? "#ffffff" : sc} opacity={(1 - s / 6) * 0.9} />);
      }
      out.push(<Glow key={`dq${k}`} map={map} at={pos} size={1.6} color={col} opacity={0.5} />);
    }
  });
  if (ph > 0.01) out.push(<Glow key="phos" map={map} at={[0, PHOSPHOR_Y + 1, 0]} size={18} color="#fff6e0" opacity={0.18 * ph * Math.min(1, (t - 30) / 6)} />);
  return <>{out}</>;
};

// ===================== composition =====================
const sceneAt = (t: number) => (t < 7 ? "bulb" : t < 16 ? "wire" : t < 38 ? "chip" : "bulb");
const flashAt = (t: number) => Math.max(...[7, 16, 38].map((s) => Math.exp(-(((t - s) / 0.16) ** 2))));

const Hook: React.FC<{ o: number }> = ({ o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#fff6e6", opacity: o, textShadow: "0 0 26px rgba(255,210,120,0.5), 4px 4px 0 rgba(0,0,0,0.85)", lineHeight: 1.6 }}>
    <div style={{ fontSize: 30 }}>HOW DOES A</div>
    <div style={{ fontSize: 64, lineHeight: 1.35 }}>LIGHT BULB</div>
    <div style={{ fontSize: 30 }}>MAKE LIGHT?  🎧</div>
  </div>
);

export const LightVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const sc = sceneAt(t);
  const xray = xrayAt(t);
  const front = pushFront(t);
  const tag = sc === "bulb" ? "▶ REAL SIZE" : sc === "wire" ? "⌕ ZOOM ×10,000,000" : t < 34 ? "⌕ ×10,000,000 · SLOW-MO" : "⌕ ×10,000,000 · FASTER";
  let cam;
  if (sc === "bulb") cam = camAt(BULB_CAM, t); else if (sc === "wire") cam = camAt(WIRE_CAM, t); else cam = camAt(CHIP_CAM, t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/05-light/music.wav")} />
      <PixelLayer bg={BG} fov={42}>
        <CamRig {...cam} />
        {sc === "bulb" && (
          <>
            <ambientLight intensity={0.12} />
            <pointLight position={[0, 0.3, 0]} intensity={260} distance={60} decay={1.6} color="#ffd9a0" />
            <pointLight position={[0, 0.3, 6]} intensity={60} distance={30} color="#ffe8c0" />
            <Bulb xray={xray} />
          </>
        )}
        {sc === "wire" && (
          <>
            <hemisphereLight args={["#ffd0a8", "#140804", 0.6]} />
            <directionalLight position={[-6, 10, 8]} intensity={1.4} color="#ffe2c8" />
            {front !== null && <pointLight position={[front, 0, 0]} intensity={300} distance={10} color="#5ee7ff" />}
            <Instances pos={WIRE_ATOMS} r={0.2} color="#9a5a30" />
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[3.3, 3.3, 64, 40, 1, true]} /><meshStandardMaterial color="#3a120a" side={THREE.BackSide} transparent opacity={0.35} /></mesh>
          </>
        )}
        {sc === "chip" && <ChipWorld t={t} />}
      </PixelLayer>
      <GlowLayer fov={42}>
        <CamRig {...cam} />
        {sc === "bulb" && <BulbGlow map={map} xray={xray} />}
        {sc === "wire" && (
          <>
            {WIRE_E.map((_, i) => {
              const p = electronPos(i, t);
              const near = front !== null ? Math.exp(-(((p[0] - front) / 1.6) ** 2)) : 0;
              return <Glow key={i} map={map} at={p} size={1.0 + 1.2 * near} color={COL.electron} opacity={0.85 + 0.15 * near} />;
            })}
            {front !== null && Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return <Glow key={`r${i}`} map={map} at={[front, Math.cos(a) * 2.9, Math.sin(a) * 2.9]} size={1.8} color="#bff6ff" opacity={0.9} />;
            })}
            {front !== null && <Glow map={map} at={[front, 0, 0]} size={9} color={COL.electron} opacity={0.35} />}
          </>
        )}
        {sc === "chip" && <ChipGlow map={map} t={t} />}
      </GlowLayer>
      <Vignette s={0.82} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 55%, #ffffff 0%, #bfe9ff 40%, rgba(80,160,255,0) 75%)", opacity: flashAt(t) }} />
      <div style={{ position: "absolute", left: 50, top: 70, fontFamily: "PressStart2P", fontSize: 22, color: "#fff6e6", opacity: 0.85, textShadow: "3px 3px 0 #000" }}>{tag}</div>
      <Captions t={t} end={48} color="#fff6e6" glow="rgba(120,200,255,0.5)" cues={[
        { t: 2.2, a: "INSIDE A MODERN BULB", b: "NO FIRE", c: "JUST TINY CHIPS" },
        { t: 5, a: "IT ALL STARTS", b: "IN THE", c: "WIRE" },
        { t: 7.3, a: "COPPER ATOMS", b: "AND", c: "FREE ELECTRONS" },
        { t: 9, a: "THE ELECTRONS", b: "CRAWL", c: "SLOWER THAN A SNAIL" },
        { t: 11, a: "BUT EACH ONE", b: "PUSHES", c: "THE NEXT" },
        { t: 13, a: "SO THE PUSH TRAVELS", b: "NEARLY", c: "AT LIGHT SPEED" },
        { t: 15, a: "STRAIGHT INTO", b: "THE CHIP" },
        { t: 16.3, a: "INSIDE THE LED", b: "TWO CRYSTALS", c: "MEET" },
        { t: 18, a: "ONE HAS", b: "EXTRA", c: "ELECTRONS" },
        { t: 20, a: "THE OTHER HAS", b: "HOLES", c: "WHERE ELECTRONS ARE MISSING" },
        { t: 22, a: "AN ELECTRON", b: "FALLS", c: "INTO A HOLE" },
        { t: 24, a: "ITS EXTRA ENERGY", b: "FLIES OUT", c: "AS LIGHT" },
        { t: 26, a: "ONE FALL", b: "ONE PHOTON" },
        { t: 28, a: "THE BIGGER THE FALL", b: "THE BLUER", c: "THE LIGHT" },
        { t: 30, a: "THE LIGHT IS BLUE...", b: "BUT", c: "A YELLOW COATING" },
        { t: 32, a: "BLUE + YELLOW", b: "= WHITE" },
        { t: 34, a: "NOW", b: "FASTER" },
        { t: 36, a: "BILLIONS OF BILLIONS", b: "EVERY", c: "SECOND" },
        { t: 38.3, a: "OLD BULBS HEATED A WIRE", b: "WHITE-HOT", c: "OVER 2,000°C" },
        { t: 40, a: "THIS ONE JUST LETS", b: "ELECTRONS", c: "FALL" },
        { t: 42, a: "THAT'S WHY LEDS", b: "RUN", c: "COOLER" },
        { t: 44, b: "NOW YOU KNOW." },
        { t: 46, b: "" },
      ]} />
      <Hook o={t < 2.2 ? ease((2.2 - t) / 0.35) : ease((t - 46.2) / 0.6)} />
    </AbsoluteFill>
  );
};
