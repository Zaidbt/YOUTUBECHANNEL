/** Sneak peek · bees in true pixel-art 3D (palette-locked, dithered, outlined). */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill } from "remotion";
import DATA from "./bees.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { rnd } from "../../brand/pixels";

type V3 = [number, number, number];
const R = DATA.R, TOP = DATA.top, D = 1.3, Z0 = -0.3, TILT = -0.22;

// ---------- pixel textures ----------
const tex = (w: number, h: number, f: (x: number, y: number) => [number, number, number, number]) => {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y); d.set(c, (y * w + x) * 4); }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
};
const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export function useTextures() {
  return useMemo(() => {
    const toon = new THREE.DataTexture(new Uint8Array([60, 60, 60, 255, 140, 140, 140, 255, 210, 210, 210, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    toon.minFilter = toon.magFilter = THREE.NearestFilter; toon.needsUpdate = true;
    const band = ["#1e1410", "#1e1410", "#f0ac2e", "#f0ac2e", "#1e1410", "#d98a1f", "#f0ac2e", "#1e1410", "#d98a1f", "#f0ac2e", "#f0ac2e", "#3a2618", "#3a2618", "#3a2618", "#3a2618", "#3a2618"];
    const stripes = tex(4, 16, (_, y) => [...hex(band[y]), 255]);
    const fuzz = tex(16, 16, (x, y) => { const r = rnd(x * 31 + y * 7); const c = r > 0.66 ? "#c99a4a" : r > 0.33 ? "#8f4a14" : "#6b3512"; return [...hex(c), 255]; });
    const wing = tex(32, 16, (x, y) => {
      const edge = Math.hypot((x - 15.5) / 16, (y - 7.5) / 8) > 0.98;
      const vein = y === 7 || y === 4 || (x === 10 && y < 12) || (x === 20 && y > 3);
      return edge ? [0, 0, 0, 0] : vein ? [...hex("#4a3f63"), 200] : [...hex("#d6dcf2"), 110];
    });
    const caps = tex(8, 8, (x, y) => [...hex(rnd(x * 13 + y * 5) > 0.5 ? "#ffe9a8" : "#e3c06a"), 255]);
    return { toon, stripes, fuzz, wing, caps };
  }, []);
}

// ---------- bee ----------
export const Bee: React.FC<{ p: V3; heading: number; pitch?: number; t?: number; s?: number; flake?: boolean; belly?: boolean }> = ({ p, heading, pitch = 0, t = 0, s = 1, flake, belly }) => {
  const x = useTextures();
  const toon = (props: Record<string, unknown>) => <meshToonMaterial gradientMap={x.toon} {...props} />;
  const abd = useMemo(() => new THREE.SphereGeometry(0.55, 16, 12).rotateZ(-Math.PI / 2), []);
  const flap = Math.sin(t * 535 * ((2 * Math.PI) / 48)) * 0.25; // periodic over 48 s (loop-safe)
  return (
    <group position={p} rotation={[pitch + (belly ? Math.PI : 0), 0, heading]} scale={s}>
      <mesh geometry={abd} position={[-0.68, 0, 0.02]} scale={[1.3, 0.8, 0.78]}>{toon({ map: x.stripes })}</mesh>
      <mesh position={[0.22, 0, 0.05]}><sphereGeometry args={[0.44, 14, 10]} />{toon({ map: x.fuzz })}</mesh>
      <mesh position={[0.82, 0, 0.02]}><sphereGeometry args={[0.31, 12, 10]} />{toon({ color: "#6b3512" })}</mesh>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[0.88, side * 0.2, 0.12]} scale={[0.8, 0.55, 1.2]}><sphereGeometry args={[0.19, 10, 8]} />{toon({ color: "#0b0604" })}</mesh>
          <mesh position={[1.18, side * 0.2, 0.22]} rotation={[0, 0.5, -Math.PI / 2 + side * 0.55]}><cylinderGeometry args={[0.03, 0.03, 0.45, 5]} />{toon({ color: "#1e1410" })}</mesh>
          {[0.0, 0.22, 0.44].map((lx, i) => (
            <mesh key={i} position={[lx, side * 0.42, -0.22]} rotation={[side * (1.0 + i * 0.15), 0, (i - 1) * 0.5]}><cylinderGeometry args={[0.035, 0.03, 0.75, 5]} />{toon({ color: "#2b1410" })}</mesh>
          ))}
          <mesh position={[-0.42, side * 0.3, 0.46]} rotation={[side * (0.18 + flap), 0, side * 0.32]}><planeGeometry args={[0.95, 0.38]} />
            <meshBasicMaterial map={x.wing} transparent alphaTest={0.2} side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
      {flake && <mesh position={[1.18, 0, -0.08]} rotation={[0.3, 0.6, 0]}><circleGeometry args={[0.16, 6]} /><meshBasicMaterial color="#fff8e6" side={THREE.DoubleSide} /></mesh>}
    </group>
  );
};

// ---------- comb ----------
const Comb: React.FC<{ built?: (i: number) => number }> = ({ built = () => 1 }) => {
  const x = useTextures();
  const m = useMemo(() => {
    const n = DATA.cells.length;
    const toonMat = (color: string, map?: THREE.Texture) => new THREE.MeshToonMaterial({ color, gradientMap: x.toon, map, side: THREE.DoubleSide });
    return {
      walls: new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, D, 6, 1, true).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, D / 2), toonMat("#d98a1f"), n),
      rims: new THREE.InstancedMesh(new THREE.TorusGeometry(R * 0.95, 0.07, 3, 6).rotateZ(Math.PI / 6), toonMat("#ffcf5a"), n),
      backs: new THREE.InstancedMesh(new THREE.CircleGeometry(R, 6).rotateZ(Math.PI / 6), toonMat("#8f4a14"), n),
      honey: new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, D * 0.85, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, D * 0.42), toonMat("#d98a1f"), n),
      caps: new THREE.InstancedMesh(new THREE.CircleGeometry(R * 0.93, 6).rotateZ(Math.PI / 6), toonMat("#ffffff", x.caps), n),
    };
  }, [x]);
  const o = new THREE.Object3D();
  const set = (mesh: THREE.InstancedMesh, i: number, x0: number, y: number, z: number, s: number, sz = 1) => {
    o.position.set(x0, y, z); o.rotation.set(TILT, 0, 0); o.scale.set(Math.max(1e-4, s), Math.max(1e-4, s), Math.max(1e-4, sz)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
  };
  DATA.cells.forEach((c, i) => {
    const g = built(i), capped = c.cap !== null;
    const mouthY = c.y - Math.sin(TILT) * D, mouthZ = Z0 + Math.cos(TILT) * D;
    set(m.walls, i, c.x, c.y, Z0, g > 0 ? 1 : 0, g);
    set(m.backs, i, c.x, c.y, Z0, g);
    set(m.rims, i, c.x, c.y - Math.sin(TILT) * D * g, Z0 + Math.cos(TILT) * D * g, g > 0 ? 1 : 0);
    set(m.honey, i, c.x, c.y, Z0 + 0.02, g >= 1 && !capped ? 1 : 0, 1);
    set(m.caps, i, c.x, mouthY, mouthZ - 0.04, g >= 1 && capped ? 1 : 0);
  });
  Object.values(m).forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  return <group>{Object.values(m).map((mesh, i) => <primitive key={i} object={mesh} />)}</group>;
};

const Cam: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.35} color="#4a3f63" />
    <directionalLight position={[-8, 14, 14]} intensity={2.6} color="#ffd59a" />
    <directionalLight position={[9, -3, -6]} intensity={1.2} color="#8f8fb8" />
    <pointLight position={[0, 1, 8]} intensity={50} distance={28} color="#ffb347" />
  </>
);
const HoneyGlints: React.FC<{ map: THREE.Texture }> = ({ map }) => (
  <>{DATA.cells.filter((c) => c.cap === null).map((c, i) => <Glow key={i} map={map} at={[c.x - 0.15, c.y + 0.35, 1.15]} size={0.35} color="#fff8e6" opacity={0.85} />)}</>
);
const Caption: React.FC<{ a?: string; b: string; c?: string }> = ({ a, b, c }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#fff8e6", textShadow: "4px 4px 0 #0b0604, -4px 0 0 #0b0604, 0 -4px 0 #0b0604", lineHeight: 1.5 }}>
    {a && <div style={{ fontSize: 32 }}>{a}</div>}
    <div style={{ fontSize: 64, lineHeight: 1.3, color: "#ffcf5a" }}>{b}</div>
    {c && <div style={{ fontSize: 32 }}>{c}</div>}
  </div>
);

const BEES: { p: V3; h: number }[] = Array.from({ length: 16 }, (_, i) => {
  const c = DATA.cells[Math.floor(rnd(i + 70) * DATA.cells.length)];
  return { p: [c.x, c.y, 1.35] as V3, h: rnd(i + 80) * Math.PI * 2 };
});

const ShotWide = () => {
  const map = useMemo(glowTexture, []);
  return (
    <AbsoluteFill style={{ background: "#0b0604" }}>
      <PixelArtCanvas bg="#0b0604">
        <Cam p={[5, 0.5, 33]} l={[0, 2.6, 0]} />
        <Lights />
        <mesh position={[0, TOP + 0.45, -0.1]}><boxGeometry args={[18, 0.9, 1.6]} /><meshToonMaterial color="#4a2c1a" /></mesh>
        <Comb />
        {BEES.map((b, i) => <Bee key={i} p={b.p} heading={b.h} t={i * 0.37} s={0.8} />)}
        <HoneyGlints map={map} />
        <Glow map={map} at={[-6, 9, -6]} size={30} color="#d98a1f" opacity={0.18} />
      </PixelArtCanvas>
      <Caption a="HOW DO BEES BUILD" b="PERFECT" c="HEXAGONS?" />
    </AbsoluteFill>
  );
};
const ShotBee = () => {
  const map = useMemo(glowTexture, []);
  // cells near the top edge are still being built
  const built = (i: number) => (DATA.cells[i].y > 4.2 ? 1 : DATA.cells[i].y > 3.2 ? 0.45 : 0);
  return (
    <AbsoluteFill style={{ background: "#0b0604" }}>
      <PixelArtCanvas bg="#0b0604" scale={4}>
        <Cam p={[2.8, 1.4, 8.6]} l={[0.4, 3.2, 0.8]} />
        <Lights />
        <mesh position={[0, TOP + 0.45, -0.1]}><boxGeometry args={[18, 0.9, 1.6]} /><meshToonMaterial color="#4a2c1a" /></mesh>
        <Comb built={built} />
        <Bee p={[0.3, 2.7, 1.55]} heading={1.9} pitch={-0.2} t={0.3} s={1.15} flake />
        <Glow map={map} at={[0.0, 3.8, 1.8]} size={1.0} color="#fff8e6" opacity={0.9} />
        <Glow map={map} at={[-2, 6, 2]} size={8} color="#d98a1f" opacity={0.3} />
      </PixelArtCanvas>
      <Caption a="THEY CHEW WAX" b="AND PRESS IT" c="INTO WALLS" />
    </AbsoluteFill>
  );
};
const ShotHoney = () => {
  const map = useMemo(glowTexture, []);
  return (
    <AbsoluteFill style={{ background: "#0b0604" }}>
      <PixelArtCanvas bg="#0b0604" scale={4}>
        <Cam p={[0.8, -2.6, 8.2]} l={[0.5, -3.3, 0.4]} />
        <Lights />
        <Comb />
        <HoneyGlints map={map} />
        <Bee p={[2.6, -2.6, 1.45]} heading={2.6} t={0.8} s={1.0} />
      </PixelArtCanvas>
      <Caption a="THEN THEY FILL THEM" b="WITH HONEY" />
    </AbsoluteFill>
  );
};

const SHOTS = [ShotWide, ShotBee, ShotHoney];
export const BeesPixelPreview: React.FC<{ shot: number }> = ({ shot }) => { const S = SHOTS[shot] ?? ShotWide; return <S />; };
