/**
 * Sneak peek · "How does a sewing machine tie a knot it can't reach?" (cinematic pixel-3D)
 * Lockstitch: the needle pushes a loop of top thread under the fabric, a rotary hook catches the loop and
 * carries it around the bobbin, then the take-up lever pulls the knot up into the middle of the fabric.
 * Upper thread = pink glow, bobbin (lower) thread = gold glow.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { CamRig, PixelLayer, GlowLayer, Vignette } from "../teasers/Majestic";
import { rnd } from "../../brand/pixels";

const C = { bg: "#071219", body: "#3f8f86", bodyDk: "#2b6862", trim: "#d9a441", steel: "#c9d2dc", fabric: "#2f4a8a", fabric2: "#5a3f86", wood: "#5a3a22", up: "#ff5c8a", low: "#ffcc55" };
type V3 = [number, number, number];

// ---------- threads: tube in the pixel layer + glow sprites along it in the glow layer ----------
const curve = (pts: V3[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.4);
const Thread: React.FC<{ pts: V3[]; color: string; r?: number }> = ({ pts, color, r = 0.05 }) => {
  const g = useMemo(() => new THREE.TubeGeometry(curve(pts), 160, r, 6, false), [pts, r]);
  return <mesh geometry={g}><meshBasicMaterial color={color} /></mesh>;
};
const ThreadGlow: React.FC<{ map: THREE.Texture; pts: V3[]; color: string; n?: number; size?: number }> = ({ map, pts, color, n = 46, size = 0.7 }) => {
  const c = useMemo(() => curve(pts), [pts]);
  return <>{Array.from({ length: n }, (_, i) => { const p = c.getPoint(i / (n - 1)); return <Glow key={i} map={map} at={[p.x, p.y, p.z]} size={size} color={color} opacity={0.4} />; })}</>;
};

// ---------- machine parts ----------
const std = (color: string, extra: Record<string, unknown> = {}) => <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} {...extra} />;

/** Vintage machine body: base, pillar, arm, head, handwheel, spool. Needle sits at the origin (x=0,z=0). */
const MachineBody: React.FC = () => (
  <group>
    <mesh position={[3.2, -0.55, -1.2]}><boxGeometry args={[12.5, 0.6, 5.2]} />{std(C.body)}</mesh>
    <mesh position={[3.2, -0.88, -1.2]}><boxGeometry args={[12.7, 0.08, 5.4]} />{std(C.trim, { metalness: 0.6 })}</mesh>
    <mesh position={[8.2, 2.4, -1.6]}><boxGeometry args={[2.4, 5.6, 2.6]} />{std(C.body)}</mesh>
    <mesh position={[4.0, 5.0, -1.6]}><boxGeometry args={[10.4, 2.0, 2.4]} />{std(C.body)}</mesh>
    <mesh position={[4.0, 5.95, -1.6]}><boxGeometry args={[10.6, 0.12, 2.5]} />{std(C.trim, { metalness: 0.6 })}</mesh>
    <mesh position={[-0.6, 3.4, -1.2]}><boxGeometry args={[2.4, 4.2, 2.6]} />{std(C.bodyDk)}</mesh>
    <mesh position={[9.8, 4.6, -1.6]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[1.8, 1.8, 0.6, 32]} />{std(C.trim, { metalness: 0.7, roughness: 0.3 })}</mesh>
    {/* spool pin + spool on top */}
    <mesh position={[5.5, 6.6, -1.6]}><cylinderGeometry args={[0.55, 0.55, 1.0, 20]} />{std("#7a1e3c")}</mesh>
    <mesh position={[5.5, 6.6, -1.6]}><cylinderGeometry args={[0.62, 0.62, 0.12, 20]} />{std(C.wood)}</mesh>
    {/* take-up lever */}
    <mesh position={[0.4, 5.2, 0.15]} rotation={[0, 0, 0.5]}><boxGeometry args={[0.25, 1.6, 0.2]} />{std(C.steel, { metalness: 0.7 })}</mesh>
    {/* needle bar + presser bar */}
    <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.13, 0.13, 2.6, 12]} />{std(C.steel, { metalness: 0.7 })}</mesh>
    <mesh position={[-0.45, 1.8, 0]}><cylinderGeometry args={[0.1, 0.1, 2.6, 10]} />{std(C.steel, { metalness: 0.7 })}</mesh>
  </group>
);
const Needle: React.FC<{ tipY: number }> = ({ tipY }) => (
  <group position={[0, tipY, 0]}>
    <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.05, 0.05, 2.6, 8]} />{std(C.steel, { metalness: 0.8, roughness: 0.2 })}</mesh>
    <mesh position={[0, 0.06, 0]}><coneGeometry args={[0.05, 0.14, 8]} />{std(C.steel, { metalness: 0.8 })}</mesh>
    <mesh position={[0, 3.0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.8, 10]} />{std(C.steel, { metalness: 0.8 })}</mesh>
  </group>
);
/** Presser foot + throat plate + fabric. cut=true removes the front half so we can see underneath. */
const Bed: React.FC<{ cut?: boolean }> = ({ cut }) => {
  const zMax = cut ? 0 : 3, zMin = -3.4, w = zMax - zMin;
  return (
    <group>
      <mesh position={[0, -0.12, zMin + w / 2]}><boxGeometry args={[9, 0.14, w]} />{std(C.steel, { metalness: 0.6, roughness: 0.3 })}</mesh>
      <mesh position={[0, 0.05, zMin + w / 2]}><boxGeometry args={[8.6, 0.12, w]} />{std(C.fabric, { roughness: 0.9, metalness: 0 })}</mesh>
      <mesh position={[0, 0.17, zMin + w / 2]}><boxGeometry args={[8.6, 0.12, w]} />{std(C.fabric2, { roughness: 0.9, metalness: 0 })}</mesh>
      <mesh position={[0, 0.32, -0.3]}><boxGeometry args={[0.9, 0.08, 1.1]} />{std(C.steel, { metalness: 0.7 })}</mesh>
    </group>
  );
};
/** Rotary hook (cup with a sharp point) and the bobbin inside it, under the plate. */
const HOOK_C: V3 = [0, -1.7, -1.25];
const Hook: React.FC<{ a: number }> = ({ a }) => (
  <group position={HOOK_C}>
    <group rotation={[0, a, 0]}>
      <mesh><cylinderGeometry args={[1.25, 1.25, 0.55, 40, 1, true]} />{std("#8f9aa6", { metalness: 0.75, roughness: 0.25, side: THREE.DoubleSide })}</mesh>
      <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[1.25, 40]} />{std("#7d8794", { metalness: 0.6, side: THREE.DoubleSide })}</mesh>
      {/* the hook point: a horn sweeping tangentially */}
      <mesh position={[0.35, 0.22, 1.2]} rotation={[0, Math.PI / 2, Math.PI / 2]}><coneGeometry args={[0.12, 0.9, 10]} />{std(C.trim, { metalness: 0.8, roughness: 0.2 })}</mesh>
    </group>
    {/* bobbin (does not spin with the hook) */}
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.82, 0.82, 0.08, 32]} />{std(C.steel, { metalness: 0.8 })}</mesh>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.62, 0.62, 0.3, 32]} /><meshBasicMaterial color={C.low} /></mesh>
    <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.82, 0.82, 0.08, 32]} />{std(C.steel, { metalness: 0.8 })}</mesh>
  </group>
);

// ---------- thread paths ----------
const UPPER_FROM_SPOOL: V3[] = [[5.5, 6.6, -1.0], [2.5, 6.4, 0.2], [0.6, 5.7, 0.2], [0.3, 4.6, 0.15], [0.1, 3.4, 0.1], [0.05, 2.0, 0.08], [0.0, 0.9, 0.06]];
const STITCHED: V3[] = [[-4.2, 0.24, 0], [-3.2, 0.24, 0], [-2.6, 0.24, 0], [-2.4, 0.12, 0], [-2.2, 0.24, 0], [-1.6, 0.24, 0], [-1.4, 0.12, 0], [-1.2, 0.24, 0], [-0.6, 0.24, 0], [-0.25, 0.24, 0], [0, 0.25, 0]];
const loopAround = (): V3[] => {
  const pts: V3[] = [[0.0, 0.0, 0.0], [0.15, -0.8, 0.05]];
  for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 1.75 + 0.2; pts.push([HOOK_C[0] + Math.sin(a) * 1.05, HOOK_C[1] + 0.25 + 0.1 * Math.sin(a * 2), HOOK_C[2] + Math.cos(a) * 1.05]); }
  pts.push([-0.15, -0.8, 0.05], [0.0, 0.0, 0.0]);
  return pts;
};
const LOOP_CAUGHT: V3[] = [[0.02, 0.0, 0.0], [0.04, -0.7, -0.03], [0.06, -1.3, -0.06], [0.28, -1.42, -0.32], [0.12, -1.25, -0.1], [-0.02, -0.7, -0.02], [-0.02, 0.0, 0.0]];
const BOBBIN_THREAD: V3[] = [[0.5, -1.45, -1.0], [0.3, -1.0, -0.4], [0.08, -0.4, -0.05], [0.02, 0.0, 0.0]];

// ---------- caption ----------
const Cap: React.FC<{ a?: string; b: string; c?: string; color?: string }> = ({ a, b, c, color = "#f3efe6" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color, textShadow: "0 0 26px rgba(255,92,138,0.45), 4px 4px 0 rgba(0,0,0,0.85)", lineHeight: 1.6 }}>
    {a && <div style={{ fontSize: 30 }}>{a}</div>}
    <div style={{ fontSize: 64, lineHeight: 1.35 }}>{b}</div>
    {c && <div style={{ fontSize: 30 }}>{c}</div>}
  </div>
);
const Lights: React.FC<{ under?: boolean }> = ({ under }) => (
  <>
    <hemisphereLight args={["#bfe7ff", "#0a1418", 0.9]} />
    <directionalLight position={[-6, 14, 12]} intensity={2.2} color="#fff0d8" />
    <directionalLight position={[8, -4, 6]} intensity={0.7} color="#ff7aa2" />
    {under && <pointLight position={[0, -0.8, 1.5]} intensity={40} distance={8} color="#ffd9a0" />}
  </>
);
const Dust: React.FC<{ map: THREE.Texture; spread?: number }> = ({ map, spread = 14 }) => (
  <>{Array.from({ length: 40 }, (_, i) => <Glow key={i} map={map} at={[(rnd(i) - 0.5) * spread, (rnd(i + 40) - 0.3) * spread, (rnd(i + 80) - 0.5) * spread]} size={0.1 + rnd(i + 9) * 0.18} color="#cfeaff" opacity={0.25 + 0.35 * rnd(i + 3)} />)}</>
);

// ---------- shots ----------
const Shot: React.FC<{ cam: { p: V3; l: V3 }; under?: boolean; world: React.ReactNode; glow: React.ReactNode; cap: React.ReactNode }> = ({ cam, under, world, glow, cap }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <PixelLayer bg={C.bg} fov={40}><CamRig {...cam} /><Lights under={under} />{world}</PixelLayer>
    <GlowLayer fov={40}><CamRig {...cam} />{glow}</GlowLayer>
    <Vignette s={0.8} />
    {cap}
  </AbsoluteFill>
);

const S0 = () => {
  const map = useMemo(glowTexture, []);
  return (
    <Shot cam={{ p: [-3.5, 7.5, 31], l: [3.4, 1.2, -1] }}
      world={<><MachineBody /><Needle tipY={0.6} /><Bed /><Thread pts={[...UPPER_FROM_SPOOL]} color={C.up} r={0.045} /><Thread pts={STITCHED} color={C.up} r={0.05} />
        <mesh position={[3, -1.2, -1]}><boxGeometry args={[22, 0.5, 9]} />{std(C.wood, { roughness: 0.8 })}</mesh></>}
      glow={<><ThreadGlow map={map} pts={UPPER_FROM_SPOOL} color={C.up} /><ThreadGlow map={map} pts={STITCHED} color={C.up} n={30} /><Dust map={map} spread={20} /></>}
      cap={<Cap a="HOW DOES A SEWING MACHINE" b="TIE A KNOT" c="IT CAN'T REACH?  🎧" />} />
  );
};
const S1 = () => {
  const map = useMemo(glowTexture, []);
  return (
    <Shot under cam={{ p: [3.0, 0.9, 6.2], l: [0, -0.55, -0.7] }}
      world={<><Bed cut /><Needle tipY={-1.45} /><Hook a={0.0} /><Thread pts={LOOP_CAUGHT} color={C.up} /><Thread pts={BOBBIN_THREAD} color={C.low} /></>}
      glow={<><ThreadGlow map={map} pts={LOOP_CAUGHT} color={C.up} n={30} size={0.5} /><ThreadGlow map={map} pts={BOBBIN_THREAD} color={C.low} n={20} size={0.45} />
        <Glow map={map} at={[0.32, -1.42, -0.3]} size={1.4} color="#fff2c8" opacity={0.8} /><Dust map={map} spread={8} /></>}
      cap={<Cap a="UNDER THE FABRIC," b="A HOOK" c="CATCHES THE LOOP" />} />
  );
};
const S2 = () => {
  const map = useMemo(glowTexture, []);
  const loop = loopAround();
  return (
    <Shot under cam={{ p: [1.6, 2.6, 6.0], l: [0, -0.75, -1.0] }}
      world={<><Bed cut /><Needle tipY={0.9} /><Hook a={Math.PI * 1.1} /><Thread pts={loop} color={C.up} /><Thread pts={BOBBIN_THREAD} color={C.low} /></>}
      glow={<><ThreadGlow map={map} pts={loop} color={C.up} n={60} size={0.55} /><ThreadGlow map={map} pts={BOBBIN_THREAD} color={C.low} n={20} size={0.45} /><Dust map={map} spread={8} /></>}
      cap={<Cap a="AND SWINGS IT" b="AROUND" c="THE BOBBIN" />} />
  );
};
const S3 = () => {
  const map = useMemo(glowTexture, []);
  // cross-section of stitched fabric: top thread dips down, bobbin thread rises, they lock in the middle
  const up: V3[] = [], lo: V3[] = [];
  for (let i = 0; i <= 64; i++) {
    const x = -6 + (i / 64) * 12, ph = ((x + 6) / 1.5) % 1, dip = Math.exp(-((ph - 0.5) ** 2) / 0.006);
    up.push([x, 0.62 - 0.62 * dip, 0]); lo.push([x, -0.62 + 0.58 * dip, 0]);
  }
  return (
    <Shot cam={{ p: [0, 0.4, 8.0], l: [0, 1.0, 0] }}
      world={<>
        <mesh position={[0, 0.3, -0.6]}><boxGeometry args={[13, 0.52, 1.2]} />{std(C.fabric2, { roughness: 0.95, metalness: 0 })}</mesh>
        <mesh position={[0, -0.3, -0.6]}><boxGeometry args={[13, 0.52, 1.2]} />{std(C.fabric, { roughness: 0.95, metalness: 0 })}</mesh>
        <Thread pts={up} color={C.up} r={0.08} /><Thread pts={lo} color={C.low} r={0.08} /></>}
      glow={<><ThreadGlow map={map} pts={up} color={C.up} n={70} size={0.6} /><ThreadGlow map={map} pts={lo} color={C.low} n={70} size={0.6} />
        {Array.from({ length: 8 }, (_, i) => <Glow key={i} map={map} at={[-6 + 0.75 + i * 1.5, 0, 0.1]} size={1.3} color="#ffffff" opacity={0.55} />)}</>}
      cap={<>
        <Cap a="THE KNOT HIDES" b="INSIDE" c="THE FABRIC" />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1560, textAlign: "center", fontFamily: "PressStart2P", fontSize: 26, lineHeight: 2.2, textShadow: "3px 3px 0 #000" }}>
          <div style={{ color: C.up }}>TOP THREAD</div>
          <div style={{ color: C.low }}>BOBBIN THREAD</div>
        </div>
      </>} />
  );
};

const SHOTS = [S0, S1, S2, S3];
export const SewingPreview: React.FC<{ shot: number }> = ({ shot }) => { const S = SHOTS[shot] ?? S0; return <S />; };
