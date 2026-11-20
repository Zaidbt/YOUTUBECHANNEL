/**
 * Video 036 · Your contactless card has no battery — what really happens in a tap.
 * Own look: dark 3D toon-neon stage (the slick gearbox/Wankel series) — a payment terminal and a card, x-ray of the
 * copper antenna, dipole field lines from the reader coil, an in-scene scope showing load modulation (the card's
 * "voice" = dips in the field), a dive into the chip (secret key + one-time cryptogram), a skimmer that gets the
 * number but no key, a replay that gets DECLINED, and the 1/d³ fall-off of the near field.
 * 40.9 s loop, 94 BPM G-funk (contactless.json + music.wav from videos/36-contactless/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import EV from "./contactless.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef, project } from "../../brand/Labels";
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BEAT = EV.beat, S16 = BEAT / 4;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], BEEPS = EV.beeps as number[], BITS = EV.bits as [number, number][], SCR = EV.scramble as number[], LIFT = EV.lift as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const backOut = (x: number) => { const k = clamp01(x), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const beatK = (t: number) => Math.exp(-((t % BEAT) / BEAT) * 5);

export const CL_PALETTE = [
  "#05060f", "#0a0e24", "#121a4a", "#1c2a6e", "#2b3f99", "#262b45", "#3a3f5a", "#454b6a", "#5a607a", "#6e7596", "#8c93b3", "#aab1cf",
  "#c8cdf0", "#e0e6ff", "#ffffff", "#bfe6ff", "#4a9aff", "#1f4abf", "#6ee6cf", "#1fb5a8", "#0f6e6a", "#ff4f8b", "#d94a7a", "#ffb3c9",
  "#7a4dff", "#b48cff", "#5a2a9a", "#ff3a2a", "#8a1414", "#ff8a1f", "#c85a10", "#ffbf6a", "#ffd23f", "#fff08a", "#fff3b0", "#c8a010",
  "#3fcf6a", "#1f8a4a", "#b87333", "#e0a060", "#7a3f12",
];
const BG = "#05060f";
const gradTex = (() => { const d = new Uint8Array([60, 60, 60, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c: string, emissive = "#000000", ei = 0) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradTex, emissive, emissiveIntensity: ei });

// ================= state =================
const COIL_Y = 0.62, CARD_Y0 = 1.25;
const liftAt = (t: number) => (t < LIFT[0] ? 0 : t < LIFT[1] ? ease((t - LIFT[0]) / (LIFT[1] - LIFT[0])) : t < LIFT[2] ? 1 : t < LIFT[3] ? 1 - ease((t - LIFT[2]) / (LIFT[3] - LIFT[2])) : 0) * 2.25;
const cardPos = (t: number): V3 => [0, CARD_Y0 + liftAt(t) + 0.04 * Math.sin(4 * LW * t), 0.35];
const distU = (t: number) => cardPos(t)[1] - COIL_Y;                                 // 1 unit = 2.5 cm (card = 8.56 cm = 3.4 u)
const fieldAtCard = (t: number) => Math.pow((CARD_Y0 - COIL_Y) / distU(t), 3);
const xrayAt = (t: number) => (t >= L[1] && t < L[10] ? clamp01((t - L[1]) / 0.5) * clamp01((L[10] - t) / 0.5) : 0);
const fieldOn = (t: number) => (t >= L[3] && t < L[9] + 0.01 ? 1 : t >= L[9] && t < L[10] ? 1 : 0.35);
const bitAt = (tt: number) => { const b = BITS.find(([x]) => tt >= x && tt < x + S16 * 0.9); return b ? b[1] : 0; };
const approvedAt = (t: number) => BEEPS.some((b) => t >= b && t < b + 1.6);
const CODES = ["9C1E 77A0", "3B52 F09D", "E41A 6C28", "07FD 93B1", "A8C3 1E64", "5D90 B27F", "C61B 08EA", "2F7E D435"];
const codeAt = (t: number) => { const n = SCR.filter((x) => x <= t).length; return n === 0 ? "…" : CODES[n % CODES.length]; };

// ================= the card =================
const CW = 3.4, CD = 2.15;
const loopPath = (inset: number) => { const w = CW / 2 - inset, d = CD / 2 - inset, r = 0.18; const pts: THREE.Vector3[] = []; const c = [[w - r, d - r, 0], [-w + r, d - r, Math.PI / 2], [-w + r, -d + r, Math.PI], [w - r, -d + r, Math.PI * 1.5]] as const; c.forEach(([cx, cz, a0]) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector3(cx + r * Math.cos(a), 0, cz + r * Math.sin(a))); } }); pts.push(pts[0].clone()); return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1); };
const LOOPS = [0.1, 0.17, 0.24, 0.31].map(loopPath);
const LOOPG = LOOPS.map((c) => new THREE.TubeGeometry(c, 160, 0.022, 4, false));
const CHIP: V3 = [-1.0, 0, -0.15];
const Card: React.FC<{ t: number; map: THREE.Texture; xray: number; power: number }> = ({ t, map, xray, power }) => {
  const g = useMemo(() => new RoundedBoxGeometry(CW, 0.05, CD, 3, 0.12), []);
  const m = useMemo(() => ({ body: new THREE.MeshToonMaterial({ color: "#7a4dff", gradientMap: gradTex, transparent: true }), stripe: toon("#ff4f8b"), gold: toon("#ffd23f", "#c8a010", 0.2), copper: toon("#e0a060", "#b87333", 0.3), die: toon("#0a0e24") }), []);
  m.body.opacity = 1 - 0.78 * xray; m.body.depthWrite = xray < 0.5;
  const pos = cardPos(t);
  return (
    <group position={pos}>
      <mesh geometry={g} material={m.body} />
      {xray < 0.6 && <mesh material={m.stripe} position={[0.3, 0.03, 0.55]}><boxGeometry args={[2.6, 0.01, 0.22]} /></mesh>}
      <mesh material={m.gold} position={[CHIP[0], 0.03, CHIP[2]]}><boxGeometry args={[0.5, 0.012, 0.4]} /></mesh>
      {xray > 0.05 && <group>
        {LOOPG.map((lg, i) => <mesh key={i} geometry={lg}><meshToonMaterial color="#e0a060" gradientMap={gradTex} emissive="#ff8a1f" emissiveIntensity={0.2 + 1.2 * power} transparent opacity={xray} /></mesh>)}
        <mesh material={m.die} position={[CHIP[0], 0.0, CHIP[2]]}><boxGeometry args={[0.3, 0.04, 0.26]} /></mesh>
        <mesh material={m.copper} position={[(CHIP[0] - 1.45) / 2, 0, CHIP[2]]}><boxGeometry args={[Math.abs(CHIP[0] + 1.45), 0.012, 0.03]} /></mesh>
        {/* current running round the coil */}
        {power > 0.05 && Array.from({ length: 12 }, (_, i) => { const u = ((t * 0.9 + i / 12) % 1), p = LOOPS[i % 4].getPointAt(u); return <mesh key={`e${i}`} position={[p.x, 0.03, p.z]}><sphereGeometry args={[0.05, 6, 4]} /><meshBasicMaterial color="#fff08a" /></mesh>; })}
        {power > 0.05 && <Glow map={map} at={[CHIP[0], 0.15, CHIP[2]]} size={1.2 + 0.8 * power} color="#fff08a" opacity={0.7 * power} />}
      </group>}
    </group>
  );
};
// ================= the terminal + field =================
const fieldLine = (C: number, az: number) => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 30; i++) { const th = 0.16 + (i / 30) * (Math.PI / 2 - 0.16); const r = C * Math.sin(th) ** 2; const rho = r * Math.sin(th), y = r * Math.cos(th); pts.push(new THREE.Vector3(rho * Math.cos(az), COIL_Y + y, 0.35 + rho * Math.sin(az))); } return new THREE.CatmullRomCurve3(pts); };
const FIELD = [1.3, 2.1, 3.0].flatMap((C) => Array.from({ length: 6 }, (_, k) => fieldLine(C, (k / 6) * Math.PI * 2 + C)));
const FIELDG = FIELD.map((c) => new THREE.TubeGeometry(c, 40, 0.018, 4, false));
const Terminal: React.FC<{ t: number; map: THREE.Texture; fs: number }> = ({ t, map, fs }) => {
  const g = useMemo(() => new RoundedBoxGeometry(3.0, 0.7, 4.4, 4, 0.2), []);
  const m = useMemo(() => ({ body: toon("#262b45"), top: toon("#3a3f5a") }), []);
  const ok = approvedAt(t), declined = t >= EV.decline && t < EV.decline + 1.6;
  const flip = Math.floor(t / (BEAT / 2)) % 2 === 0 ? 1 : -1;
  const scr = declined ? "#ff3a2a" : ok ? "#3fcf6a" : "#1c2a6e";
  return (
    <group>
      <mesh geometry={g} material={m.body} position={[0, 0.35, -0.2]} />
      <mesh position={[0, 0.71, -1.55]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.3, 1.2]} /><meshBasicMaterial color={scr} /></mesh>
      {(ok || declined) && <Glow map={map} at={[0, 1.0, -1.55]} size={2.4} color={declined ? "#ff3a2a" : "#3fcf6a"} opacity={0.6} />}
      {/* the contactless logo on top = the reader coil underneath */}
      {[0.3, 0.55, 0.8].map((r, i) => <mesh key={i} position={[0.0, 0.71, 0.35]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r, r + 0.06, 32, 1, -0.6, 1.2]} /><meshBasicMaterial color="#e0e6ff" /></mesh>)}
      <mesh position={[0, COIL_Y, 0.35]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.0, 0.05, 6, 48]} /><meshToonMaterial color="#e0a060" gradientMap={gradTex} emissive="#ff8a1f" emissiveIntensity={0.3 + 0.7 * fs} /></mesh>
      {/* keypad */}
      {Array.from({ length: 12 }, (_, i) => <mesh key={`k${i}`} position={[-0.6 + (i % 3) * 0.6, 0.72, -0.55 + Math.floor(i / 3) * 0.0 + (Math.floor(i / 3) - 1.5) * 0.0]} visible={false}><boxGeometry args={[0.4, 0.05, 0.3]} /><meshBasicMaterial color="#5a607a" /></mesh>)}
      {/* field lines (dipole loops), flowing dots flip direction with the field */}
      {fs > 0.02 && FIELDG.map((fg, i) => <mesh key={`f${i}`} geometry={fg}><meshBasicMaterial color="#6ee6cf" transparent opacity={0.55 * fs} /></mesh>)}
      {fs > 0.02 && FIELD.map((c, i) => { const u = (((t * 0.7 * flip + i * 0.37) % 1) + 1) % 1, p = c.getPointAt(u); return <mesh key={`fd${i}`} position={[p.x, p.y, p.z]}><sphereGeometry args={[0.05, 6, 4]} /><meshBasicMaterial color="#e0e6ff" transparent opacity={fs} /></mesh>; })}
      <Glow map={map} at={[0, 0.9, 0.35]} size={3.2} color="#6ee6cf" opacity={0.15 + 0.35 * fs} />
    </group>
  );
};
// ================= the scope (load modulation) =================
const Scope: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => {
  const P: V3 = [2.7, 2.7, 0.2];
  const ry = Math.atan2(cam.p[0] - P[0], cam.p[2] - P[2]);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(301 * 2 * 3), 3)); const idx: number[] = []; for (let i = 0; i < 300; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx); return g; }, []);
  const p = geo.attributes.position as THREE.BufferAttribute, WIN = BEAT * 2;
  for (let i = 0; i <= 300; i++) { const u = i / 300, tt = t - WIN + u * WIN, x = -1.3 + 2.6 * u, A = 0.42 * (1 - 0.55 * bitAt(tt)), y = A * Math.sin(u * 2 * Math.PI * 12); p.setXYZ(i * 2, x, y - 0.04, 0.02); p.setXYZ(i * 2 + 1, x, y + 0.04, 0.02); }
  p.needsUpdate = true;
  return (
    <group position={P} rotation={[0, ry, 0]}>
      <mesh><planeGeometry args={[3.0, 1.4]} /><meshBasicMaterial color="#0a0e24" transparent opacity={0.92} /></mesh>
      {[[0, 0.7, 3.0, 0.04], [0, -0.7, 3.0, 0.04], [-1.5, 0, 0.04, 1.4], [1.5, 0, 0.04, 1.4]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.01]}><planeGeometry args={[w, h]} /><meshBasicMaterial color="#6ee6cf" /></mesh>)}
      <mesh geometry={geo}><meshBasicMaterial color="#ffd23f" side={THREE.DoubleSide} /></mesh>
    </group>
  );
};
// ================= the chip close-up (key + code) =================
const Vault: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const cp = cardPos(t), c: V3 = [cp[0] + CHIP[0], cp[1] + 0.42, cp[2] + CHIP[2]];
  const spin = 4 * LW * t, k = beatK(t);
  return (
    <group position={c}>
      <group rotation={[0, spin, 0.3]} scale={0.32 * (1 + 0.04 * k)}>
        <mesh position={[-0.55, 0, 0]}><torusGeometry args={[0.32, 0.11, 8, 20]} /><meshToonMaterial color="#ffd23f" gradientMap={gradTex} emissive="#c8a010" emissiveIntensity={0.4} /></mesh>
        <mesh position={[0.35, 0, 0]}><boxGeometry args={[1.2, 0.14, 0.14]} /><meshToonMaterial color="#ffd23f" gradientMap={gradTex} emissive="#c8a010" emissiveIntensity={0.4} /></mesh>
        {[0.6, 0.85].map((x, i) => <mesh key={i} position={[x, -0.15, 0]}><boxGeometry args={[0.12, 0.2, 0.14]} /><meshToonMaterial color="#ffd23f" gradientMap={gradTex} /></mesh>)}
      </group>
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <mesh key={i} position={[0.42 * Math.cos(a), 0, 0.42 * Math.sin(a)]}><boxGeometry args={[0.012, 0.36, 0.012]} /><meshBasicMaterial color="#6ee6cf" /></mesh>; })}
      <Glow map={map} at={[0, 0, 0]} size={1.4} color="#ffd23f" opacity={0.5 + 0.3 * k} />
    </group>
  );
};
// ================= the skimmer =================
const skimmerAt = (t: number): V3 | null => {
  if (t < L[7] - 0.2 || t >= L[9]) return null;
  if (t < L[8]) { const k = ease((t - L[7] + 0.2) / 0.8); return [lerp(5.5, 2.45, k), 1.25, 0.35]; }
  const k = ease((t - L[8]) / 0.8); return [lerp(2.45, 1.9, k), lerp(1.25, 1.3, k), lerp(0.35, -1.6, k)];
};
const Skimmer: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const g = useMemo(() => new RoundedBoxGeometry(1.2, 0.4, 1.0, 3, 0.1), []);
  const p = skimmerAt(t); if (!p) return null;
  const blink = Math.floor(t / (BEAT / 2)) % 2 === 0;
  const pk = t >= L[8] + 0.9 && t < EV.decline ? clamp01((t - L[8] - 0.9) / (EV.decline - L[8] - 0.9)) : -1;
  return (
    <group>
      <group position={p}>
        <mesh geometry={g}><meshToonMaterial color="#3a3f5a" gradientMap={gradTex} /></mesh>
        <mesh position={[0, 0.21, 0]}><boxGeometry args={[0.7, 0.02, 0.5]} /><meshBasicMaterial color="#8a1414" /></mesh>
        <mesh position={[0.4, 0.25, 0.3]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color={blink ? "#ff3a2a" : "#8a1414"} /></mesh>
        <Glow map={map} at={[0, 0.3, 0]} size={1.6} color="#ff3a2a" opacity={0.35} />
      </group>
      {pk >= 0 && <group position={[lerp(p[0] - 0.6, 0.6, pk), lerp(p[1], 0.95, pk) + 0.5 * Math.sin(pk * Math.PI), lerp(p[2], -1.55, pk)]}>
        <mesh><boxGeometry args={[0.25, 0.25, 0.25]} /><meshBasicMaterial color="#ff8a1f" /></mesh>
        <Glow map={map} at={[0, 0, 0]} size={0.9} color="#ff8a1f" opacity={0.8} />
      </group>}
    </group>
  );
};
// ================= stage =================
const Stage: React.FC<{ t: number; map: THREE.Texture; cam: { p: V3; l: V3 } }> = ({ t, map, cam }) => {
  const k = beatK(t), xr = xrayAt(t);
  const fs = fieldOn(t) * Math.min(1, fieldAtCard(t) * (t >= L[9] && t < L[10] ? 1 : 1)) * (t >= L[9] && t < L[10] ? 1 : 1);
  const power = t >= L[3] && t < L[10] ? Math.min(1, fieldAtCard(t)) : 0;
  return (
    <group>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 7, 5]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-4, 3, 3]} intensity={20} distance={14} color="#4a9aff" />
      <pointLight position={[4, 2, 3]} intensity={18} distance={14} color="#ff4f8b" />
      <mesh position={[0, 1.2, -4.2]}><torusGeometry args={[4.0 + 0.06 * k, 0.06, 8, 96]} /><meshBasicMaterial color="#ff4f8b" /></mesh>
      <mesh position={[0, 1.2, -4.3]}><torusGeometry args={[4.5, 0.03, 8, 96]} /><meshBasicMaterial color="#4a9aff" /></mesh>
      <Glow map={map} at={[0, 1.2, -4.6]} size={10} color="#ff4f8b" opacity={0.15 + 0.1 * k} />
      {Array.from({ length: 15 }, (_, i) => <mesh key={`gx${i}`} position={[-7 + i, -0.01, 0]}><boxGeometry args={[0.02, 0.02, 14]} /><meshBasicMaterial color="#2b3f99" /></mesh>)}
      {Array.from({ length: 14 }, (_, i) => <mesh key={`gz${i}`} position={[0, -0.01, -7 + i]}><boxGeometry args={[14, 0.02, 0.02]} /><meshBasicMaterial color="#2b3f99" /></mesh>)}
      {Array.from({ length: 24 }, (_, i) => <mesh key={`d${i}`} position={[(rnd(i + 1) - 0.5) * 12, 0.5 + rnd(i + 2) * 6 + 0.2 * Math.sin(3 * LW * t + i), -2 - rnd(i + 3) * 4]}><sphereGeometry args={[0.03, 4, 3]} /><meshBasicMaterial color={i % 3 ? "#bfe6ff" : "#ffb3c9"} /></mesh>)}
      <Terminal t={t} map={map} fs={fs} />
      <Card t={t} map={map} xray={xr} power={power} />
      {t >= L[4] && t < L[5] && <Scope t={t} cam={cam} />}
      {t >= L[5] && t < L[7] && <Vault t={t} map={map} />}
      <Skimmer t={t} map={map} />
    </group>
  );
};

// ================= camera, labels, tags =================
const HOME = { p: [6.0, 10.5, 13.5] as V3, l: [0.1, 0.6, -0.4] as V3 };
const chipW = (t: number): V3 => { const c = cardPos(t); return [c[0] + CHIP[0], c[1], c[2] + CHIP[2]]; };
const CAM: CamKey[] = [
  { t: 0, ...HOME }, { t: L[1], ...HOME },
  { t: L[2] + 0.4, p: [3.0, 7.2, 6.4], l: [0, 1.2, 0.3] }, { t: L[3] - 0.2, p: [2.8, 7.0, 6.2], l: [0, 1.2, 0.3] },
  { t: L[3] + 0.9, p: [8.5, 4.6, 9.5], l: [0.2, 1.7, 0] }, { t: L[4], p: [8.3, 4.6, 9.7], l: [0.2, 1.7, 0] },
  { t: L[4] + 0.8, p: [7.0, 4.8, 11.0], l: [1.3, 2.0, 0] }, { t: L[5] - 0.1, p: [6.8, 4.8, 11.0], l: [1.3, 2.0, 0] },
  { t: L[5] + 0.9, p: [-1.0 + 2.4, 1.25 + 3.2, -0.15 + 3.8], l: [-1.0, 1.6, -0.15] }, { t: L[7] - 0.4, p: [-1.0 + 2.2, 1.25 + 3.0, -0.15 + 3.7], l: [-1.0, 1.6, -0.15] },
  { t: L[7] + 0.6, p: [7.5, 7.5, 12.5], l: [1.4, 1.0, -0.3] }, { t: L[9], p: [7.3, 7.3, 12.3], l: [1.2, 1.0, -0.4] },
  { t: L[9] + 0.6, p: [10.5, 5.0, 11.0], l: [0, 2.2, 0] }, { t: L[10], p: [10.4, 5.0, 11.2], l: [0, 2.2, 0] },
  { t: L[10] + 1.0, ...HOME }, { t: D, ...HOME },
];
const camFor = (t: number) => camAt(CAM, t) as { p: V3; l: V3 };
const TOPZ: [number, number] = [540, 420];
const Lb = (from: number, to: number, border: string, lines: LabelDef["lines"], hold = false): LabelDef => ({ from, to, anchor: [0, 0, 0], screen: TOPZ, border, lines, hold });
const HOOK = [[{ t: "YOUR CARD HAS" }], [{ t: "NO BATTERY.", c: "#ff4f8b" }], [{ t: "WHO POWERS IT? ⚡" }]];
const LABELS: LabelDef[] = [
  Lb(0, L[2], "#ff4f8b", HOOK, true),
  Lb(L[2], L[3], "#e0a060", [[{ t: "INSIDE: A COPPER" }], [{ t: "COIL", c: "#e0a060" }, { t: " AROUND" }], [{ t: "THE EDGE 🌀" }]]),
  Lb(L[3], L[4], "#6ee6cf", [[{ t: "THE READER'S FIELD" }], [{ t: "FLIPS 13.56M×/S", c: "#6ee6cf" }], [{ t: "= THE POWER ⚡", c: "#fff08a" }]]),
  Lb(L[4], L[5], "#ffd23f", [[{ t: "IT CAN'T TRANSMIT." }], [{ t: "IT TWITCHES" }], [{ t: "THE FIELD = DATA", c: "#ffd23f" }]]),
  Lb(L[5], L[6], "#ffd23f", [[{ t: "THE CHIP HOLDS A" }], [{ t: "SECRET KEY 🔑", c: "#ffd23f" }], [{ t: "IT NEVER LEAVES" }]]),
  Lb(L[6], L[7], "#6ee6cf", [[{ t: "KEY + AMOUNT +" }], [{ t: "RANDOM + COUNTER", c: "#6ee6cf" }], [{ t: "= ONE-TIME CODE", c: "#ff8a1f" }]]),
  Lb(L[7], L[8], "#ff3a2a", [[{ t: "COPY THE CARD?" }], [{ t: "YOU GET A NUMBER" }], [{ t: "BUT NO KEY 🔒", c: "#ff3a2a" }]]),
  Lb(L[8], L[9], "#ff3a2a", [[{ t: "REPLAY A CODE?" }], [{ t: "COUNTER MOVED ON" }], [{ t: "→ DECLINED ❌", c: "#ff3a2a" }]]),
  Lb(L[9], L[10], "#4a9aff", [[{ t: "WHY SO CLOSE?" }], [{ t: "FIELD FADES 1/D³", c: "#6ee6cf" }], [{ t: "→ ~4 CM MAX 📏" }]]),
  Lb(L[10], D + 0.01, "#ff4f8b", HOOK, true),
];
type Tag = { txt: string | ((t: number) => string); at: V3 | ((t: number) => V3); from: number; to: number; col: string };
const lastBits = (t: number) => BITS.filter(([x]) => x <= t).slice(-8).map(([, b]) => b).join("").replace(/(.{4})/, "$1 ");
const TAGS: Tag[] = [
  ...BEEPS.map((b) => ({ txt: "€12.40 · APPROVED ✓", at: [0, 0.75, -1.55] as V3, from: b, to: b + 1.6, col: "#3fcf6a" })),
  { txt: "COPPER ANTENNA", at: (t) => { const c = cardPos(t); return [c[0] + 1.4, c[1], c[2] + 0.9]; }, from: L[2] + 0.4, to: L[3], col: "#e0a060" },
  { txt: "CHIP", at: (t) => chipW(t), from: L[2] + 0.8, to: L[3], col: "#ffd23f" },
  { txt: "READER COIL", at: [-1.0, COIL_Y, 0.35], from: L[3] + 0.6, to: L[4], col: "#e0a060" },
  { txt: "13.56 MHZ FIELD", at: [1.6, 2.6, 0.35], from: L[3] + 1.0, to: L[4], col: "#6ee6cf" },
  { txt: "LOAD MODULATION", at: [2.7, 3.55, 0.2], from: L[4] + 0.5, to: L[5], col: "#ffd23f" },
  { txt: (t) => `BITS ${lastBits(t)}`, at: [2.7, 1.9, 0.2], from: L[4] + 0.5, to: L[5], col: "#ffd23f" },
  { txt: "AMOUNT €12.40", at: (t) => { const c = chipW(t); return [c[0] - 0.6, c[1] + 0.9, c[2]]; }, from: L[6] + 0.1, to: L[7], col: "#c8cdf0" },
  { txt: "RANDOM 8F3A2C91", at: (t) => { const c = chipW(t); return [c[0] + 0.7, c[1] + 0.75, c[2]]; }, from: L[6] + 0.4, to: L[7], col: "#6ee6cf" },
  { txt: "COUNTER #0418", at: (t) => { const c = chipW(t); return [c[0] - 0.7, c[1] - 0.15, c[2] + 0.3]; }, from: L[6] + 0.7, to: L[7], col: "#b48cff" },
  { txt: (t) => `CODE ${codeAt(t)}`, at: (t) => { const c = chipW(t); return [c[0] + 0.5, c[1] - 0.3, c[2] + 0.4]; }, from: SCR[0], to: L[7], col: "#ff8a1f" },
  { txt: "SKIMMER", at: (t) => { const p = skimmerAt(t) ?? [0, 0, 0]; return [p[0], p[1] + 0.5, p[2]]; }, from: L[7] + 0.6, to: L[8], col: "#ff3a2a" },
  { txt: "GOT: NUMBER ✓  KEY ✗", at: [1.2, 2.9, 0.35], from: L[7] + 1.4, to: L[8], col: "#ff3a2a" },
  { txt: "OLD CODE · COUNTER #0418", at: [1.4, 2.6, -1.0], from: L[8] + 0.9, to: EV.decline, col: "#ff8a1f" },
  { txt: (t) => `${(distU(t) * 2.5).toFixed(0)} CM · FIELD ÷${Math.max(1, Math.round(1 / fieldAtCard(t)))}`, at: (t) => { const c = cardPos(t); return [c[0] + 1.6, c[1] + 0.4, c[2]]; }, from: L[9] + 0.3, to: L[10], col: "#4a9aff" },
];
const TagsView: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <>{TAGS.filter((g) => t >= g.from && t < g.to).map((g, i) => { const txt = typeof g.txt === "function" ? g.txt(t) : g.txt; const [x, y] = project(typeof g.at === "function" ? g.at(t) : g.at, cam, FOV); const k = backOut((t - g.from) / 0.25); const w = txt.length * 24 + 60; return (
    <div key={i} style={{ position: "absolute", left: Math.max(w / 2 + 20, Math.min(1060 - w / 2, x)), top: Math.max(560, Math.min(1820, y)), transform: `translate(-50%, -100%) scale(${k})`, transformOrigin: "50% 100%", fontFamily: "PressStart2P", fontSize: 24, color: "#ffffff", background: "rgba(5,6,15,0.9)", border: `6px solid ${g.col}`, boxShadow: "6px 6px 0 #000", padding: "12px 14px 8px", whiteSpace: "nowrap" }}>{txt}</div>); })}</>
);
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
const tag: React.CSSProperties = { fontFamily: "PressStart2P", fontSize: 22, textShadow: "4px 4px 0 #05060f, -4px 0 0 #05060f, 0 -4px 0 #05060f" };

export const ContactlessVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camFor(t);
  const dec = t >= EV.decline && t < EV.decline + 1.6 ? t - EV.decline : -1;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/36-contactless/music.wav")} />
      <PixelArtCanvas bg={BG} fov={FOV} palette={CL_PALETTE} outline outlineColor="#05060f" dither={0.04} scale={3}>
        <CamSet p={cam.p} l={cam.l} />
        <Stage t={t} map={glow} cam={cam} />
      </PixelArtCanvas>
      <div style={{ ...tag, position: "absolute", right: 48, top: 60, color: "#ff4f8b" }}>@HOWTOWITHZAY</div>
      <TagsView t={t} cam={cam} />
      {dec >= 0 && <div style={{ position: "absolute", left: 0, right: 0, top: 1380, textAlign: "center", transform: `scale(${backOut(dec / 0.2)}) rotate(-4deg)` }}>
        <span style={{ fontFamily: "PressStart2P", fontSize: 76, color: "#ffffff", background: "#ff3a2a", padding: "22px 34px 14px", border: "8px solid #ffffff", boxShadow: "10px 10px 0 #000" }}>DECLINED</span></div>}
      <Labels t={t} cam={cam} labels={LABELS} fov={FOV} />
    </AbsoluteFill>
  );
};
