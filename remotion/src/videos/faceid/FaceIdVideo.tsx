/**
 * Video 031 · How Face ID works — format of 030 (real-life hook, HUD pills, notification step cards, pinned callouts,
 * stamps on the drops). A night scene: a face lit by the phone; the phone secretly fires infrared dots at it.
 * Facts (Apple security guide): flood illuminator (IR, works in the dark), dot projector (>30,000 IR dots), IR camera
 * reads the pattern → depth map, Neural Engine → maths, compared with the enrolled map inside the Secure Enclave,
 * flat photo = no depth, false match ≈ 1 in 1,000,000 (Touch ID ≈ 1 in 50,000).
 * 38.7 s loop, 124 BPM minimal tech house (faceid.json + music.wav from videos/31-faceid/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import EV from "./faceid.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Notif, Callouts, Card, Call, Pill, Stamp, ui } from "../../brand/HowCards";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar, BEAT = EV.beat;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], DOTS = EV.dots as number[];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const win = (t: number, a: number, c: number, fi = 0.3, fo = 0.3) => clamp01(Math.min((t - a) / fi, (c - t) / fo));

export const FACE_PALETTE = [
  "#0a0812", "#140f22", "#1f1733", "#2c2147", "#3d2f63", "#55437f",
  "#3b2418", "#6b4029", "#9c6436", "#c08350", "#e0a870", "#f3c99a", "#ffe3c4",
  "#1e1420", "#2e1f2a", "#0b1e3a", "#123a6b", "#1e66b0", "#4aa3f0", "#bfe6ff",
  "#3a0f2a", "#6b1d4a", "#a3306e", "#e04a93", "#ff8ac0", "#ffd0e6",
  "#ffd23f", "#fff08a", "#ff9a3c", "#ff4f5f", "#c0283a", "#8a3cff", "#5a2fd0", "#2f3fd0",
  "#1f8a4a", "#3fcf6a", "#b0ffc8", "#ffffff", "#c8cdf0", "#8c93b3", "#58627e", "#2a3042", "#e9e3d6",
];
const BG = "#0a0812";

// ================= the head (a sculpted bust, front = +z) =================
const headGeo = (() => {
  const g = new THREE.SphereGeometry(1, 96, 72), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  const G = (a: number, b: number) => Math.exp(-a * a - b * b);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const x = v.x, y = v.y, z = v.z, ax = Math.abs(x);
    let sx = 0.78, sz = 0.9; if (y < 0) { sx *= 1 - 0.28 * Math.pow(-y, 1.6); sz *= 1 - 0.12 * Math.pow(-y, 2); }
    const f = Math.pow(Math.max(0, z), 0.6);
    let dz = 0;
    dz += 0.19 * G(x / 0.1, (y + 0.02) / 0.2) + 0.07 * G(x / 0.12, (y + 0.17) / 0.07) + 0.035 * G((ax - 0.08) / 0.05, (y + 0.2) / 0.05);           // nose ridge + tip
    dz += 0.05 * G((y - 0.24) / 0.06, 0) * (ax < 0.5 ? 1 : 0.3);                                 // brow
    dz -= 0.075 * G((ax - 0.27) / 0.11, (y - 0.1) / 0.075);                                      // eye sockets
    dz += 0.04 * G((ax - 0.36) / 0.15, (y + 0.12) / 0.13);                                       // cheeks
    dz += 0.03 * G(x / 0.16, (y + 0.41) / 0.05) - 0.018 * G(x / 0.14, (y + 0.445) / 0.012);      // lips + mouth line
    dz += 0.05 * G(x / 0.16, (y + 0.64) / 0.1);                                                  // chin
    p.setXYZ(i, x * sx, y * 1.02, z * sz + dz * f);
  }
  g.computeVertexNormals(); return g;
})();
const hairGeo = (() => { const g = new THREE.SphereGeometry(1.04, 48, 24, 0, Math.PI * 2, 0, 1.3); g.scale(0.82, 1.04, 0.95); g.rotateX(-0.45); g.translate(0, 0.04, -0.03); return g; })();
// the projector's dots, hit-tested once against the head
const PROJ = new THREE.Vector3(0, -0.55, 2.4);
const DOTSET = (() => {
  const mesh = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial()); mesh.updateMatrixWorld();
  const rc = new THREE.Raycaster(), pos: number[] = [], depth: number[] = [], N = 70;
  for (let i = 0; i < N; i++) for (let j = 0; j < N * 1.3; j++) {
    const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, r1 = h - Math.floor(h), r2 = (h * 7.13) % 1;
    const tx = -0.95 + (1.9 * (i + 0.5 + (r1 - 0.5) * 0.7)) / N, ty = -1.0 + (2.3 * (j + 0.5 + (Math.abs(r2) - 0.5) * 0.7)) / (N * 1.3);
    const dir = new THREE.Vector3(tx, ty, 0.25).sub(PROJ).normalize(); rc.set(PROJ, dir);
    const hit = rc.intersectObject(mesh, false)[0]; if (!hit) continue;
    const q = hit.point.clone().addScaledVector(hit.face!.normal, 0.012); pos.push(q.x, q.y, q.z); depth.push(q.z);
  }
  const n = depth.length, order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.sin(a * 91.7) - Math.sin(b * 91.7));
  const P = new Float32Array(n * 3), Dp = new Float32Array(n);
  order.forEach((o, k) => { P.set(pos.slice(o * 3, o * 3 + 3), k * 3); Dp[k] = depth[o]; });
  return { P, Dp, n };
})();
const RAMP = ["#2f3fd0", "#8a3cff", "#e04a93", "#ff9a3c", "#ffd23f"].map((c) => new THREE.Color(c));
const rampAt = (u: number, out: THREE.Color) => { const k = clamp01(u) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(k)); return out.copy(RAMP[i]).lerp(RAMP[i + 1], k - i); };
const IRDOT = new THREE.Color("#ffd0e6");
const Dots: React.FC<{ count: number; depthMix: number; opacity: number; tint?: THREE.Color }> = ({ count, depthMix, opacity, tint }) => {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(DOTSET.P, 3)); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(DOTSET.n * 3), 3)); return g; }, []);
  const col = geo.attributes.color as THREE.BufferAttribute, c = new THREE.Color();
  for (let i = 0; i < DOTSET.n; i++) { rampAt((DOTSET.Dp[i] - 0.35) / 0.8, c); c.lerpColors(tint ?? IRDOT, c, depthMix); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true; geo.setDrawRange(0, Math.round(count * DOTSET.n));
  return <points geometry={geo}><pointsMaterial vertexColors size={2.2} sizeAttenuation={false} transparent opacity={opacity} depthWrite={false} /></points>;
};
const Head: React.FC<{ ir: number; dark: number; wire?: boolean; wireColor?: string }> = ({ ir, dark, wire, wireColor }) => {
  const m = useMemo(() => ({ skin: new THREE.MeshStandardMaterial({ roughness: 0.65 }), hair: new THREE.MeshStandardMaterial({ roughness: 0.9 }), shirt: new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    eye: new THREE.MeshStandardMaterial({ color: "#e9e3d6", roughness: 0.3 }), iris: new THREE.MeshStandardMaterial({ color: "#1e1420", roughness: 0.2 }), lip: new THREE.MeshStandardMaterial({ roughness: 0.5 }) }), []);
  const mix = (a: string, b: string, c: string) => new THREE.Color(a).lerp(new THREE.Color(b), ir).lerp(new THREE.Color(c), dark);
  m.skin.color.copy(mix("#e0a870", "#a3306e", "#140f22")); m.hair.color.copy(mix("#2e1f2a", "#3a0f2a", "#0a0812")); m.shirt.color.copy(mix("#1e66b0", "#6b1d4a", "#0a0812"));
  m.eye.color.copy(mix("#e9e3d6", "#ff8ac0", "#140f22")); m.iris.color.copy(mix("#1e1420", "#3a0f2a", "#0a0812")); m.lip.color.copy(mix("#9c6436", "#6b1d4a", "#140f22"));
  if (wire) return <mesh geometry={headGeo}><meshBasicMaterial color={wireColor} wireframe transparent opacity={0.55} /></mesh>;
  return (
    <group>
      <mesh geometry={headGeo} material={m.skin} />
      <mesh geometry={hairGeo} material={m.hair} />
      {[-1, 1].map((s) => <React.Fragment key={s}>
        <mesh material={m.skin} position={[s * 0.77, 0.0, -0.05]} scale={[0.09, 0.2, 0.13]}><sphereGeometry args={[1, 12, 10]} /></mesh>
        <mesh material={m.eye} position={[s * 0.265, 0.1, 0.715]} scale={[0.1, 0.06, 0.06]}><sphereGeometry args={[1, 16, 12]} /></mesh>
        <mesh material={m.iris} position={[s * 0.255, 0.1, 0.77]} scale={[0.05, 0.05, 0.02]}><sphereGeometry args={[1, 12, 10]} /></mesh>
        <mesh material={m.hair} position={[s * 0.27, 0.245, 0.79]} rotation={[0, s * 0.35, s * -0.12]}><boxGeometry args={[0.22, 0.04, 0.05]} /></mesh>
      </React.Fragment>)}
      <mesh material={m.lip} position={[0, -0.415, 0.81]} scale={[0.13, 0.035, 0.035]}><sphereGeometry args={[1, 14, 8]} /></mesh>
      <mesh material={m.skin} position={[0, -1.05, -0.12]}><cylinderGeometry args={[0.3, 0.36, 0.7, 20]} /></mesh>
      <mesh material={m.shirt} position={[0, -1.75, -0.15]} scale={[1.7, 0.75, 0.75]}><sphereGeometry args={[1, 28, 16]} /></mesh>
    </group>
  );
};
// a printed photo of a face (for ⑤)
const photoTex = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = 96; c.height = 128; const g = c.getContext("2d")!;
  g.fillStyle = "#e9e3d6"; g.fillRect(0, 0, 96, 128); g.fillStyle = "#4aa3f0"; g.fillRect(6, 6, 84, 96);
  g.fillStyle = "#1e66b0"; g.beginPath(); g.ellipse(48, 104, 34, 18, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#e0a870"; g.beginPath(); g.ellipse(48, 52, 22, 28, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2e1f2a"; g.beginPath(); g.ellipse(48, 34, 24, 14, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#1e1420"; g.fillRect(38, 48, 5, 4); g.fillRect(53, 48, 5, 4); g.fillStyle = "#c08350"; g.fillRect(46, 52, 4, 10); g.fillStyle = "#9c6436"; g.fillRect(41, 68, 14, 3);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t;
})();
const PHOTO_DOTS = (() => { const a: number[] = []; for (let i = 0; i < 42; i++) for (let j = 0; j < 54; j++) { const h = Math.sin(i * 12.9 + j * 78.2) * 43758.5; const r = h - Math.floor(h); a.push(-0.8 + (1.6 * (i + r * 0.6)) / 42, -1.0 + (2.0 * (j + (1 - r) * 0.6)) / 54, 0.02); } return new Float32Array(a); })();
const PhotoCard: React.FC<{ dots: number; shake: number }> = ({ dots, shake }) => {
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(PHOTO_DOTS, 3)); return g; }, []);
  geo.setDrawRange(0, Math.round(dots * PHOTO_DOTS.length / 3));
  return (
    <group position={[shake, 0.1, 0.2]} rotation={[0, 0, 0.04]}>
      <mesh><planeGeometry args={[1.7, 2.2]} /><meshStandardMaterial map={photoTex ?? undefined} roughness={0.6} /></mesh>
      <points geometry={geo}><pointsMaterial color="#8a3cff" size={2.2} sizeAttenuation={false} /></points>
    </group>
  );
};
const Phone: React.FC<{ glow: number; flood: number; map: THREE.Texture }> = ({ glow, flood, map }) => {
  const g = useMemo(() => new RoundedBoxGeometry(0.78, 1.6, 0.08, 4, 0.1), []);
  return (
    <group position={PROJ.toArray().map((v, i) => v + [0, -0.62, 0][i]) as V3} rotation={[-0.25, 0, 0]}>
      <mesh geometry={g}><meshStandardMaterial color="#2a3042" roughness={0.3} metalness={0.6} /></mesh>
      <mesh position={[0, 0, -0.045]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.7, 1.5]} /><meshBasicMaterial color={new THREE.Color("#123a6b").lerp(new THREE.Color("#bfe6ff"), glow)} /></mesh>
      <mesh position={[0.2, 0.6, 0.05]}><boxGeometry args={[0.28, 0.28, 0.04]} /><meshStandardMaterial color="#1f1733" roughness={0.3} metalness={0.5} /></mesh>
      <Glow map={map} at={[0, 0, -0.4]} size={2.4} color="#4aa3f0" opacity={0.25 + 0.35 * glow} />
      {flood > 0 && <Glow map={map} at={[0, 0.7, -0.15]} size={1.2} color="#ff8ac0" opacity={0.8 * flood} />}
    </group>
  );
};

// ================= timeline =================
const unlocked = (t: number) => t >= EV.unlock[0] && t < EV.relock;
const scanning = (t: number) => t < EV.unlock[0] || t >= EV.relock + BAR;
const irAt = (t: number) => (t < L[1] ? 0 : t < L[2] ? ease((t - L[1]) / (L[2] - L[1])) : t < L[8] ? 1 : 0);
const dotFrac = (t: number) => { if (t < L[3]) return 0; const k = DOTS.filter((d) => d <= t).length; return k >= DOTS.length ? 1 : clamp01((k + clamp01((t - (DOTS[k - 1] ?? L[3])) / (BEAT / 4))) / DOTS.length) ** 1.3; };
const turnAt = (t: number) => (t >= L[4] && t < L[5] ? 0.85 * Math.sin(Math.PI * clamp01((t - L[4] - 0.4) / (L[5] - L[4] - 0.8))) : 0);
const CAM: CamKey[] = [
  { t: 0, p: [3.4, 0.7, 7.6], l: [0.25, 0.25, 0.6] }, { t: L[1], p: [3.4, 0.7, 7.6], l: [0.25, 0.25, 0.6] },
  { t: L[2] + 0.4, p: [2.1, 0.5, 6.6], l: [0, 0.25, 0.4] }, { t: L[3] + 0.3, p: [1.0, 0.6, 6.4], l: [0, 0.3, 0.3] },
  { t: L[4] + 0.3, p: [1.3, 0.5, 6.6], l: [0, 0.3, 0.3] }, { t: L[5] + 0.5, p: [1.9, 0.7, 14.5], l: [1.3, 0.45, 0] }, { t: L[5] + 1.6, p: [1.8, 0.7, 14.2], l: [1.2, 0.45, 0] },
  { t: EV.match, p: [1.3, 0.6, 7.4], l: [0.1, 0.35, 0.3] }, { t: L[6], p: [1.3, 0.6, 7.3], l: [0.1, 0.35, 0.3] }, { t: L[6] + 0.6, p: [0.9, 0.5, 6.6], l: [0, 0.3, 0.3] },
  { t: L[7] + 0.3, p: [2.2, 0.6, 7.2], l: [0.15, 0.3, 0.4] }, { t: L[8], p: [3.4, 0.7, 7.6], l: [0.25, 0.25, 0.6] }, { t: D, p: [3.4, 0.7, 7.6], l: [0.25, 0.25, 0.6] },
];
const camFor = (t: number) => { const c = camAt(CAM, t); const a = 0.05 * Math.sin(LW * t * 2); return { p: [c.p[0] + a, c.p[1] + a * 0.5, c.p[2]] as V3, l: c.l as V3 }; };
const HOOKC = { title: "Your phone just scanned your face", sub: "with 30,000 dots you can't see", hold: true };
const CARDS: Card[] = [
  { from: 0, to: L[1], ...HOOKC },
  { from: L[1], to: L[2], title: "Let's switch to infrared…", sub: "the light Face ID really uses" },
  { from: L[2], to: L[3], n: 1, title: "A flood of infrared light", sub: "invisible to you, so it works in the dark" },
  { from: L[3], to: L[4], n: 2, title: "30,000 dots fired at your face", sub: "a laser behind a tiny lens splits into a grid" },
  { from: L[4], to: L[5], n: 3, title: "The dots reveal your shape", sub: "an IR camera sees how each dot lands" },
  { from: L[5], to: L[6], n: 4, title: "Turned into maths, then compared", sub: "with your saved map, locked inside the chip" },
  { from: L[6], to: L[7], n: 5, title: "Why a photo can't fool it", sub: "flat picture = every dot at the same depth" },
  { from: L[7], to: L[8], n: 6, title: "1 in 1,000,000", sub: "odds a stranger's face unlocks it" },
  { from: L[8], to: D + 0.01, ...HOOKC },
];
const headAt = (t: number): V3 => [0, 0.3, 0];
const CALLS: Call[] = [
  { txt: "FACE ID SENSORS", at: [0, -0.5, 2.4], from: 0.4, to: L[1] - 0.1, dx: -180, dy: 260 },
  { txt: "FLOOD ILLUMINATOR", at: [0, -0.45, 2.3], from: L[2] + 0.5, to: L[3], dx: -150, dy: 250 },
  { txt: "DOT PROJECTOR", at: [0, -0.45, 2.3], from: L[3] + 0.4, to: L[4], dx: -150, dy: 250, color: "#ff8ac0" },
  { txt: "NOSE = CLOSE", at: (t) => { const a = turnAt(t), p: V3 = [0, 0.28, 1.05]; return [p[2] * Math.sin(a), p[1], p[2] * Math.cos(a)]; }, from: L[4] + 1.0, to: L[5], dx: 230, dy: -230, color: "#ffd23f" },
  { txt: "EARS = FAR", at: (t) => { const a = turnAt(t); return [-0.8 * Math.cos(a), 0.3, 0.8 * Math.sin(a)]; }, from: L[4] + 1.6, to: L[5], dx: -120, dy: 300, color: "#8a3cff" },
  { txt: "LIVE SCAN", at: [0, 1.4, 0.3], from: L[5] + 0.6, to: EV.match, dx: -120, dy: -200, color: "#ff8ac0" },
  { txt: "SAVED MAP · SECURE ENCLAVE", at: (t) => [wireX(t), 1.4, 0], from: L[5] + 1.0, to: EV.match, dx: 0, dy: 520, color: "#3fcf6a" },
  { txt: "PRINTED PHOTO", at: [0.6, 1.2, 0.3], from: L[6] + 0.6, to: EV.denied, dx: 60, dy: -230 },
];
const wireX = (t: number) => (t < L[5] ? 2.6 : 2.6 * (1 - ease((t - L[5] - 1.2) / (EV.match - L[5] - 1.4))));
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const ir = irAt(t) > 0.5, ul = unlocked(t);
  const dots = t >= L[3] && t < L[8] ? Math.round(dotFrac(t) * 30000) : scanning(t) ? 30000 : 0;
  const m = t >= EV.match && t < L[6] ? "MATCH ✓" : t >= EV.denied && t < L[7] ? "NO MATCH ✗" : null;
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Pill bg={ir ? "#a3306e" : "#2a3042"}>{ir ? "INFRARED VIEW" : "NORMAL VIEW"}</Pill>
      <Pill bg="rgba(13,15,23,0.9)"><span style={{ color: "#ff8ac0" }}>DOTS</span> {fmt(dots)}</Pill>
      <Pill bg={m ? (m.startsWith("M") ? "#1f8a4a" : "#c0283a") : ul ? "#1f8a4a" : "#2a3042"}>{m ?? (ul ? "🔓" : "🔒")}</Pill>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

export const FaceIdVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const cam = camFor(t), ir = irAt(t);
  const photo = t >= L[6] + 0.25 && t < L[7] - 0.15;
  const flood = t >= L[2] && t < L[3] ? win(t, L[2], L[3], 0.6, 0.3) : 0;
  const scanK = scanning(t) ? 0.2 + 0.3 * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / BEAT)) : 0;
  const dark = t >= L[4] && t < L[8] && !photo ? 0.75 * win(t, L[4], L[8], 0.6, 0.6) : 0;
  const depthMix = t >= L[4] && t < L[8] ? win(t, L[4], L[8], 0.8, 0.5) : 0;
  const matched = t >= EV.match && t < L[6];
  const dotsCount = t >= L[3] && t < L[8] ? dotFrac(t) : scanning(t) ? 1 : 0;
  const dotsOp = t >= L[3] && t < L[8] ? 1 : scanK;
  const shake = t >= EV.denied && t < EV.denied + 0.4 ? 0.08 * Math.sin((t - EV.denied) * 70) * (1 - (t - EV.denied) / 0.4) : 0;
  const flash = [L[2], L[6] + 0.25, L[7] - 0.15, L[8]].reduce((a, x) => Math.max(a, Math.abs(t - x) < 0.2 ? 1 - Math.abs(t - x) / 0.2 : 0), 0);
  const bgc = new THREE.Color("#140f22").lerp(new THREE.Color("#1f0a1c"), ir).getStyle();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/31-faceid/music.wav")} />
      <PixelArtCanvas bg={bgc} fov={FOV} palette={FACE_PALETTE} outline outlineColor="#0a0812" dither={0.06} scale={2}>
        <CamSet p={cam.p} l={cam.l} />
        <ambientLight intensity={0.25 + 0.2 * ir} color={ir ? "#ff8ac0" : "#8c93b3"} />
        <pointLight position={[0, -0.3, 2.6]} intensity={(unlocked(t) ? 9 : 5) * (1 - ir) + 18 * flood + 6 * ir} distance={8} color={ir ? "#ffd0e6" : "#bfe6ff"} />
        <pointLight position={[-3, 2.5, -1.5]} intensity={14 * (1 - ir * 0.5)} distance={10} color={ir ? "#8a3cff" : "#ff8ac0"} />
        <directionalLight position={[2, 3, 3]} intensity={0.25} color="#bfe6ff" />
        {/* the room: a wall with a window at night */}
        <mesh position={[0, 0.5, -3.5]}><planeGeometry args={[30, 20]} /><meshStandardMaterial color={ir ? "#1f0a1c" : "#1f1733"} roughness={0.95} /></mesh>
        {ir < 0.5 && <group position={[-2.8, 1.8, -3.45]}>
          <mesh><planeGeometry args={[2.2, 2.6]} /><meshBasicMaterial color="#123a6b" /></mesh>
          <mesh position={[0.5, 0.6, 0.01]}><circleGeometry args={[0.28, 20]} /><meshBasicMaterial color="#fff08a" /></mesh>
          <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.08, 2.6, 0.02]} /><meshBasicMaterial color="#2c2147" /></mesh>
          <mesh position={[0, 0, 0.02]}><boxGeometry args={[2.2, 0.08, 0.02]} /><meshBasicMaterial color="#2c2147" /></mesh>
          {[[-0.6, 0.8], [0.8, -0.5], [-0.3, -0.9], [0.3, 1.1]].map((s, i) => <mesh key={i} position={[s[0], s[1], 0.01]}><planeGeometry args={[0.05, 0.05]} /><meshBasicMaterial color="#bfe6ff" /></mesh>)}
        </group>}
        {ir < 0.5 && <Glow map={glow} at={[-2.3, 2.4, -3.3]} size={2} color="#fff08a" opacity={0.3} />}
        {/* the face (or the photo) */}
        <group position={headAt(t)}>
          {!photo && <group rotation={[0, turnAt(t), 0]}>
            <Head ir={ir} dark={dark} />
            {dotsCount > 0 && <Dots count={dotsCount} depthMix={depthMix} opacity={dotsOp} tint={matched ? new THREE.Color("#b0ffc8") : undefined} />}
          </group>}
          {photo && <PhotoCard dots={clamp01((t - L[6] - 0.5) / 1.2)} shake={shake} />}
          {t >= L[5] && t < L[6] && <group position={[wireX(t), 0, 0]}><Head ir={1} dark={0} wire wireColor={matched ? "#3fcf6a" : "#b0ffc8"} /></group>}
        </group>
        <Phone glow={unlocked(t) ? 1 : 0.35} flood={flood + scanK * 0.4} map={glow} />
        {/* the IR beam from the projector (only visible in IR view) */}
        {ir > 0.5 && (flood > 0 || (t >= L[3] && t < L[4])) && <mesh position={[0, -0.12, 1.35]} rotation={[Math.PI / 2 + 0.38, 0, 0]}><coneGeometry args={[0.95, 2.1, 24, 1, true]} /><meshBasicMaterial color="#ff8ac0" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: ir > 0.5 ? "#ffd0e6" : "#bfe6ff", opacity: flash }} />
      <Hud t={t} />
      <Notif t={t} cards={CARDS} app="FACE ID · HOW IT WORKS" icon="🙂" grad="linear-gradient(160deg,#ff8ac0,#a3306e)" />
      <Callouts t={t} cam={cam} fov={FOV} calls={CALLS} />
      <Stamp t={t} at={EV.match} dur={L[6] - EV.match - 0.1} color="#1f8a4a" big="MATCH ✓" small="unlocked in a blink" y={1420} />
      <Stamp t={t} at={EV.denied} dur={L[7] - EV.denied - 0.2} color="#c0283a" big="DENIED ✗" small="no depth, no unlock" y={1420} />
      <Stamp t={t} at={L[7] + 0.2} dur={L[8] - L[7] - 0.4} color="#5a2fd0" big="1 in 1,000,000" small="Touch ID was 1 in 50,000" y={1420} />
      <div style={{ ...ui, position: "absolute", left: 56, bottom: 60, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 3 }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
