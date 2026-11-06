/**
 * 3D mechanical watch movement (Swiss lever escapement + simplified train) in three looks:
 *  - "pixel":     low-res toon-shaded 3D, upscaled with hard pixels (retro 3D)
 *  - "toy":       glossy candy-coloured 3D, like a designer toy
 *  - "blueprint": metal 3D parts with glowing edges on a blueprint sheet
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { BlueprintBg } from "../../brand/ui";

export type Look = "pixel" | "toy" | "blueprint";

loadFont({ family: "Bungee", url: staticFile("fonts/Bungee-Regular.ttf") });
loadFont({ family: "PressStart2P", url: staticFile("fonts/PressStart2P-Regular.ttf") });

// ---------- layout (mm-ish units, movement plate radius ~8.3) ----------
export const POS = {
  balance: new THREE.Vector3(2.2, 4.0, 1.1),
  fork: new THREE.Vector3(0, 0.3, 0.75),
  escape: new THREE.Vector3(-2.4, -3.6, 0.4),
  fourth: new THREE.Vector3(-0.4, -5.6, 0.0),
  barrel: new THREE.Vector3(4.2, -5.0, 0.0),
};
const TILT = -0.62; // movement tilted back so we see its depth
const CAM_Z = 37;
const FOV = 46;

// ---------- geometry ----------
const polar = (r: number, a: number) => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);

function arcPath(path: THREE.Path, r: number, a0: number, a1: number, n = 10, first = false) {
  for (let i = 0; i <= n; i++) {
    const p = polar(r, a0 + ((a1 - a0) * i) / n);
    if (i === 0 && first) path.moveTo(p.x, p.y);
    else path.lineTo(p.x, p.y);
  }
}

function gearShape(r: number, teeth: number, th: number, opts: { spokes?: number; rim?: number; hub?: number; bore?: number; hooked?: boolean } = {}) {
  const { spokes = 0, rim = 0.35, hub = 0.4, bore = 0, hooked = false } = opts;
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = hooked
      ? [polar(r, a), polar(r + th, a + step * 0.62), polar(r + th * 0.75, a + step * 0.7), polar(r, a + step * 0.62)]
      : [polar(r, a), polar(r + th, a + step * 0.15), polar(r + th, a + step * 0.45), polar(r, a + step * 0.6)];
    pts.forEach((p, k) => (i === 0 && k === 0 ? s.moveTo(p.x, p.y) : s.lineTo(p.x, p.y)));
  }
  s.closePath();
  if (spokes > 0) {
    const ro = r - rim, ri = hub + 0.15;
    for (let k = 0; k < spokes; k++) {
      const a0 = (k * Math.PI * 2) / spokes, a1 = ((k + 1) * Math.PI * 2) / spokes;
      const h = new THREE.Path();
      arcPath(h, ro, a0 + 0.14 / ro, a1 - 0.14 / ro, 12, true);
      arcPath(h, ri, a1 - 0.14 / ri, a0 + 0.14 / ri, 6);
      h.closePath();
      s.holes.push(h);
    }
  }
  if (bore > 0) {
    const h = new THREE.Path();
    arcPath(h, bore, 0, Math.PI * 2, 48, true);
    s.holes.push(h);
  }
  return s;
}

export const extrude = (shape: THREE.Shape, depth: number) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, curveSegments: 8 });

export function annulus(ro: number, ri: number, depth: number) {
  const s = new THREE.Shape();
  arcPath(s as unknown as THREE.Path, ro, 0, Math.PI * 2, 64, true);
  const h = new THREE.Path();
  arcPath(h, ri, 0, Math.PI * 2, 64, true);
  s.holes.push(h);
  return extrude(s, depth);
}

function spiralTube(r0: number, r1: number, turns: number, radius: number, z = 0) {
  const pts: THREE.Vector3[] = [];
  const n = Math.ceil(turns * 48);
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, radius, 6, false);
}

export const cylZ = (r: number, h: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2);

// ---------- materials ----------
type PartKey = "plate" | "barrel" | "fourth" | "escape" | "fork" | "balance" | "hairspring" | "jewel" | "steel";
const COLORS: Record<Look, Record<PartKey, string>> = {
  pixel: { plate: "#3a4a78", barrel: "#e2b14c", fourth: "#e2b14c", escape: "#c3cede", fork: "#c3cede", balance: "#f0c45a", hairspring: "#5f8cff", jewel: "#ff3b6b", steel: "#c3cede" },
  toy: { plate: "#fff3e8", barrel: "#ffcf3f", fourth: "#ff8a3d", escape: "#ff5fa8", fork: "#9be84a", balance: "#4fd2ff", hairspring: "#7a5cff", jewel: "#ff3b6b", steel: "#ffffff" },
  blueprint: { plate: "#1b3d78", barrel: "#d9a441", fourth: "#d9a441", escape: "#b9c4d6", fork: "#b9c4d6", balance: "#e3b552", hairspring: "#4f7dff", jewel: "#ff2d5e", steel: "#b9c4d6" },
};

export function useMaterials(look: Look) {
  return useMemo(() => {
    const out = {} as Record<PartKey, THREE.Material>;
    let gradient: THREE.DataTexture | undefined;
    if (look === "pixel") {
      gradient = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
      gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
      gradient.needsUpdate = true;
    }
    (Object.keys(COLORS[look]) as PartKey[]).forEach((k) => {
      const color = new THREE.Color(COLORS[look][k]);
      if (look === "pixel") out[k] = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
      else if (look === "toy") out[k] = new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 });
      else out[k] = new THREE.MeshStandardMaterial({ color, metalness: k === "plate" ? 0.1 : 0.55, roughness: 0.32, transparent: k === "plate", opacity: k === "plate" ? 0.55 : 1 });
    });
    return out;
  }, [look]);
}

const Part: React.FC<{ geo: THREE.BufferGeometry; mat: THREE.Material; edges?: boolean; position?: [number, number, number]; rotation?: [number, number, number] }> = ({ geo, mat, edges, position, rotation }) => {
  const e = useMemo(() => (edges ? new THREE.EdgesGeometry(geo, 28) : null), [geo, edges]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} material={mat} />
      {e && (
        <lineSegments geometry={e}>
          <lineBasicMaterial color="#8be9ff" />
        </lineSegments>
      )}
    </group>
  );
};

// ---------- the movement ----------
export const MovementScene: React.FC<{ look: Look; balanceA: number; escA: number; forkA: number; tilt?: number }> = ({ look, balanceA, escA, forkA, tilt = TILT }) => {
  const m = useMaterials(look);
  const edges = look === "blueprint";
  const g = useMemo(() => {
    return {
      plate: cylZ(8.3, 0.5, 96),
      barrel: extrude(gearShape(2.2, 40, 0.18, { bore: 1.95 }), 0.55),
      barrelFloor: cylZ(2.1, 0.12, 48),
      mainspring: spiralTube(0.35, 1.85, 6, 0.045, 0.3),
      fourth: extrude(gearShape(2.0, 36, 0.16, { spokes: 4, rim: 0.3, hub: 0.35 }), 0.18),
      escape: extrude(gearShape(1.8, 15, 0.5, { spokes: 5, rim: 0.28, hub: 0.3, hooked: true }), 0.16),
      pinion: extrude(gearShape(0.35, 8, 0.12), 0.5),
      balRim: annulus(2.6, 2.3, 0.28),
      spoke: new THREE.BoxGeometry(2.35, 0.2, 0.16),
      screw: cylZ(0.11, 0.28, 12).rotateY(Math.PI / 2),
      hairspring: spiralTube(0.4, 1.7, 5, 0.035, -0.25),
      roller: cylZ(0.38, 0.22, 24),
      jewel: cylZ(0.15, 0.1, 16),
      arm: new THREE.BoxGeometry(1, 0.28, 0.16),
      pallet: new THREE.BoxGeometry(0.28, 0.42, 0.24),
      pivot: cylZ(0.25, 0.3, 20),
    };
  }, []);

  const arm = (to: [number, number], w = 0.28) => {
    const len = Math.hypot(to[0], to[1]);
    return (
      <group rotation={[0, 0, Math.atan2(to[1], to[0])]}>
        <mesh geometry={g.arm} material={m.fork} scale={[len, w / 0.28, 1]} position={[len / 2, 0, 0]} />
      </group>
    );
  };
  // fork arm endpoints relative to the fork pivot
  const entry: [number, number] = [-3.6, -2.1], exit: [number, number] = [-0.8, -2.5], tail: [number, number] = [1.4, 2.3];

  return (
    <group rotation={[tilt, 0, 0]}>
      <Part geo={g.plate} mat={m.plate} edges={edges} position={[0, 0, -0.55]} />
      {/* mainspring barrel */}
      <group position={POS.barrel.toArray()} rotation={[0, 0, escA / 40]}>
        <Part geo={g.barrel} mat={m.barrel} edges={edges} />
        <mesh geometry={g.barrelFloor} material={m.barrel} position={[0, 0, 0.06]} />
        <mesh geometry={g.mainspring} material={m.steel} />
        <mesh geometry={g.jewel} material={m.jewel} position={[0, 0, 0.6]} />
      </group>
      {/* fourth wheel */}
      <group position={POS.fourth.toArray()} rotation={[0, 0, -escA / 4]}>
        <Part geo={g.fourth} mat={m.fourth} edges={edges} />
        <mesh geometry={g.jewel} material={m.jewel} position={[0, 0, 0.25]} />
      </group>
      {/* escape wheel */}
      <group position={POS.escape.toArray()} rotation={[0, 0, escA]}>
        <Part geo={g.escape} mat={m.escape} edges={edges} />
        <mesh geometry={g.pinion} material={m.steel} position={[0, 0, -0.45]} />
        <mesh geometry={g.jewel} material={m.jewel} position={[0, 0, 0.24]} />
      </group>
      {/* pallet fork */}
      <group position={POS.fork.toArray()} rotation={[0, 0, forkA]}>
        {arm(entry)}
        {arm(exit)}
        {arm(tail, 0.2)}
        <mesh geometry={g.pallet} material={m.jewel} position={[entry[0], entry[1], 0]} rotation={[0, 0, 0.5]} />
        <mesh geometry={g.pallet} material={m.jewel} position={[exit[0], exit[1], 0]} rotation={[0, 0, -0.3]} />
        <mesh geometry={g.pivot} material={m.steel} />
        <mesh geometry={g.jewel} material={m.jewel} position={[0, 0, 0.2]} />
      </group>
      {/* balance wheel + hairspring */}
      <group position={POS.balance.toArray()}>
        <mesh geometry={g.hairspring} material={m.hairspring} rotation={[0, 0, balanceA * 0.5]} />
        <group rotation={[0, 0, balanceA]}>
          <Part geo={g.balRim} mat={m.balance} edges={edges} position={[0, 0, -0.14]} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={g.spoke} material={m.balance} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[Math.cos((i * Math.PI * 2) / 3) * 1.17, Math.sin((i * Math.PI * 2) / 3) * 1.17, 0]} />
          ))}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i * Math.PI * 2) / 10 + 0.3;
            return <mesh key={i} geometry={g.screw} material={i % 2 ? m.hairspring : m.barrel} position={[Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0]} rotation={[0, 0, a]} />;
          })}
          <mesh geometry={g.roller} material={m.steel} />
          <mesh geometry={g.jewel} material={m.jewel} position={[0.3, 0.2, 0.15]} />
        </group>
      </group>
    </group>
  );
};

/** Project a movement-space point to 1080x1920 screen pixels (for 2D callouts). */
export function toScreen(p: THREE.Vector3): [number, number] {
  const cam = new THREE.PerspectiveCamera(FOV, 1080 / 1920, 0.1, 200);
  cam.position.set(0, 0, CAM_Z);
  cam.updateMatrixWorld();
  const v = p.clone().applyEuler(new THREE.Euler(TILT, 0, 0)).project(cam);
  return [((v.x + 1) / 2) * 1080, ((1 - v.y) / 2) * 1920];
}

export const WatchCanvas: React.FC<{ look: Look; balanceA: number; escA: number; forkA: number }> = ({ look, ...angles }) => {
  const pixel = look === "pixel";
  const W = pixel ? 216 : 1080, H = pixel ? 384 : 1920;
  return (
    <AbsoluteFill style={{ imageRendering: pixel ? "pixelated" : "auto" }}>
      <div style={{ width: W, height: H, transform: `scale(${1080 / W})`, transformOrigin: "top left" }}>
        <ThreeCanvas width={W} height={H} gl={{ alpha: true, antialias: !pixel }} camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 200 }}>
          <ambientLight intensity={look === "toy" ? 0.9 : 0.55} />
          <directionalLight position={[-8, 10, 14]} intensity={look === "toy" ? 1.6 : 2.2} />
          <directionalLight position={[10, -6, 6]} intensity={0.6} color={look === "blueprint" ? "#7fd8ff" : "#ffd7f0"} />
          <MovementScene look={look} {...angles} />
        </ThreeCanvas>
      </div>
    </AbsoluteFill>
  );
};

// ---------- overlay UI per look ----------
const FONT: Record<Look, string> = { pixel: "PressStart2P", toy: "Bungee", blueprint: "Bungee" };

const StickerH: React.FC<{ x: number; y: number; bg: string; color?: string; tilt?: number; look: Look; lines: { t: string; s: number }[] }> = ({ x, y, bg, color = "#0a0f24", tilt = -3, look, lines }) => (
  <div style={{
    position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${tilt}deg)`, background: bg, color, fontFamily: FONT[look],
    padding: look === "pixel" ? "26px 34px" : "28px 46px", borderRadius: look === "toy" ? 48 : look === "blueprint" ? 10 : 0,
    border: look === "blueprint" ? "none" : "8px solid #0a0f24", boxShadow: look === "blueprint" ? "0 0 0 4px #8be9ff, 14px 14px 0 #04122e" : "16px 16px 0 #0a0f24",
    textAlign: "center", lineHeight: 1.15, whiteSpace: "nowrap",
  }}>
    {lines.map((l, i) => <div key={i} style={{ fontSize: l.s }}>{l.t}</div>)}
  </div>
);

const Callout: React.FC<{ at: THREE.Vector3; dx: number; dy: number; n: number; label: string; color: string }> = ({ at, dx, dy, n, label, color }) => {
  const [x, y] = toScreen(at);
  const lx = x + dx, ly = y + dy;
  return (
    <>
      <svg style={{ position: "absolute", inset: 0 }} width={1080} height={1920}>
        <line x1={x} y1={y} x2={lx} y2={ly} stroke={color} strokeWidth={5} />
        <circle cx={x} cy={y} r={9} fill={color} />
      </svg>
      <div style={{ position: "absolute", left: lx, top: ly, transform: `translate(${dx < 0 ? "-100%" : "0"}, -50%)`, display: "flex", alignItems: "center", gap: 14, fontFamily: "Bungee", fontSize: 34, color: "#04122e", flexDirection: dx < 0 ? "row-reverse" : "row" }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, border: `6px solid ${color}`, background: "#04122e", color, display: "grid", placeItems: "center", fontSize: 32 }}>{n}</div>
        <div style={{ background: color, padding: "10px 18px", borderRadius: 8 }}>{label}</div>
      </div>
    </>
  );
};

const Brand: React.FC<{ look: Look }> = ({ look }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center" }}>
    <div style={{
      fontFamily: FONT[look], fontSize: look === "pixel" ? 30 : 40, color: look === "toy" ? "#0a0f24" : "#e6f4ff",
      background: look === "toy" ? "#ffffff" : "rgba(4,18,46,0.85)", border: look === "toy" ? "8px solid #0a0f24" : "4px solid #8be9ff",
      borderRadius: look === "toy" ? 60 : 8, padding: "22px 40px", display: "flex", gap: 22, alignItems: "center",
    }}>
      <span>HOW IT WORKS</span>
      <span style={{ background: "#ff4fa3", color: "#0a0f24", padding: "8px 18px", borderRadius: look === "toy" ? 40 : 4, transform: "rotate(-4deg)", display: "inline-block" }}>with ZAY</span>
    </div>
  </div>
);

const BG: React.FC<{ look: Look }> = ({ look }) => {
  if (look === "toy") return <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, #fff6d8 0%, #ffc2dc 55%, #c9b6ff 100%)" }} />;
  if (look === "pixel") return <AbsoluteFill style={{ background: "linear-gradient(#0f1636, #1d1a4a)" }} />;
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges"><BlueprintBg /></svg>
    </AbsoluteFill>
  );
};

/** One preview frame of the hook in a given look. */
export const Watch3DPreview: React.FC<{ look: Look }> = ({ look }) => {
  const frame = useCurrentFrame();
  const a = 0.9 * Math.sin(frame / 6);
  return (
    <AbsoluteFill>
      <BG look={look} />
      <WatchCanvas look={look} balanceA={0.6 + a} escA={0.25} forkA={0.1} />
      {look === "blueprint" ? (
        <>
          <StickerH look={look} x={540} y={200} bg="#59d8ff" tilt={-2} lines={[{ t: "THE ESCAPEMENT", s: 62 }, { t: "LETS THE SPRING GO ONE TOOTH AT A TIME", s: 26 }]} />
          <Callout at={new THREE.Vector3(POS.balance.x + 1.9, POS.balance.y + 1.8, 1.1)} dx={-120} dy={-150} n={1} label="BALANCE WHEEL" color="#b8ff4a" />
          <Callout at={new THREE.Vector3(-1.6, -1.6, 0.75)} dx={-60} dy={-260} n={2} label="PALLET FORK" color="#ff4fa3" />
          <Callout at={new THREE.Vector3(POS.escape.x - 1.6, POS.escape.y - 1.0, 0.4)} dx={10} dy={260} n={3} label="ESCAPE WHEEL" color="#b8ff4a" />
          <Callout at={new THREE.Vector3(POS.barrel.x + 0.6, POS.barrel.y - 1.4, 0.3)} dx={-60} dy={220} n={4} label="MAINSPRING" color="#ffd23f" />
        </>
      ) : (
        <>
          <StickerH look={look} x={540} y={250} bg="#ff4fa3" lines={look === "pixel" ? [{ t: "HOW DOES A", s: 44 }, { t: "WATCH", s: 104 }, { t: "TICK?", s: 64 }] : [{ t: "HOW DOES A", s: 64 }, { t: "WATCH", s: 150 }, { t: "TICK?", s: 96 }]} />
          <StickerH look={look} x={600} y={look === "pixel" ? 470 : 520} bg="#ffd23f" tilt={2} lines={[{ t: "8 TICKS EVERY SECOND", s: look === "pixel" ? 30 : 46 }]} />
        </>
      )}
      <Brand look={look} />
    </AbsoluteFill>
  );
};
