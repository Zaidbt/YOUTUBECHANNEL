/**
 * Video 033 · What happens when you click a pen — format of 030-032 (real-life hook, HUD pills, notification step
 * cards, pinned callouts, stamps). A pen on a notebook clicks on the beat; x-ray into the rotating-cam mechanism
 * (spring, sawtooth plunger, cam, barrel ribs = stops, channels = slots), then the ball tip and its thick ink.
 * 38.6 s loop, 112 BPM amapiano (clickpen.json + music.wav from videos/33-clickpen/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./clickpen.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Notif, Callouts, Card, Call, Pill, Stamp, ui } from "../../brand/HowCards";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BAR = EV.bar;
const LW = (2 * Math.PI) / D;
const FOV = 30;
const L = EV.l as number[], CLICKS = EV.clicks as number[][];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
const DEG = Math.PI / 180;

export const PEN_PALETTE = [
  "#0d0b14", "#17142a", "#221e3d", "#2f2a52", "#433c6e",
  "#3b2418", "#5a3520", "#7a4a2a", "#9c6436", "#c08350", "#e0a870",
  "#0b1e3a", "#123a6b", "#1e66b0", "#3a86d8", "#7ab8f5", "#bfe6ff",
  "#2a3042", "#3e465e", "#58627e", "#8c93b3", "#c8cdf0", "#eef0ff", "#ffffff",
  "#e9e3d6", "#f6f1e6", "#c9c0ae", "#8f8676",
  "#ff9a3c", "#ffbf6a", "#ffd23f", "#fff08a", "#c0283a", "#ff4f5f", "#ff8ac0", "#e04a93",
  "#1f8a4a", "#3fcf6a", "#b0ffc8", "#0a1a5a", "#1a2fa0",
];
const BG = "#17142a";
const std = (c: string, r = 0.5, m = 0, e = "#000000", ei = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei });

// ================= the mechanism state =================
const C_IN = 1.6, C_OUT = 0.6, C_PRESS = 0.22;
const cOf = (n: number) => (n % 2 === 0 ? C_IN : C_OUT);
const mech = (t: number) => {
  let n = 0; for (const c of CLICKS) if (t >= c[3]) n++;
  const cur = CLICKS[n]; const phi0 = 45 + 45 * n;
  if (cur && t >= cur[0]) {
    const [p0, p1, r0, r1] = cur;
    if (t < p1) { const k = ease((t - p0) / (p1 - p0)); return { c: lerp(cOf(n), C_PRESS, k), phi: phi0 + 22.5 * k, n, phase: "press" }; }
    if (t < r0) return { c: C_PRESS, phi: phi0 + 22.5, n, phase: "hold" };
    const k = ease((t - r0) / (r1 - r0)); return { c: lerp(C_PRESS, cOf(n + 1), k), phi: phi0 + 22.5 + 22.5 * k, n, phase: "release" };
  }
  return { c: cOf(n), phi: phi0, n, phase: "rest" };
};
const tipOut = (t: number) => mech(t).c < 1.1;

// ================= the pen (axis = y, button up) =================
const NOSE = -7.2, BTOP = 2.8, RB = 0.7;
const springGeo = (() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 81 }, (_, i) => { const u = i / 80, a = u * Math.PI * 2 * 9; return new THREE.Vector3(0.3 * Math.cos(a), u, 0.3 * Math.sin(a)); })), 260, 0.045, 5))();
const Pen: React.FC<{ t: number; xray: number; map: THREE.Texture; hl: string }> = ({ t, xray, map, hl }) => {
  const m = useMemo(() => ({ barrel: new THREE.MeshStandardMaterial({ color: "#1e66b0", roughness: 0.35, transparent: true, side: THREE.DoubleSide }), metal: std("#c8cdf0", 0.25, 0.85), rib: std("#ff9a3c", 0.5, 0.1, "#ff9a3c", 0.15),
    cam: std("#eef0ff", 0.35, 0.3), ridge: std("#ff4f5f", 0.4, 0.1, "#ff4f5f", 0.25), plunger: std("#8c93b3", 0.3, 0.6), refill: std("#e9e3d6", 0.4), ink: std("#1a2fa0", 0.3), spring: std("#eef0ff", 0.25, 0.9), chan: new THREE.MeshBasicMaterial({ color: "#3a86d8", transparent: true, opacity: 0.5 }) }), []);
  m.barrel.opacity = 1 - 0.8 * xray; m.barrel.depthWrite = xray < 0.5;
  const s = mech(t), c = s.c, phi = s.phi * DEG;
  const glowRib = hl === "stop", glowChan = hl === "chan";
  m.rib.emissiveIntensity = glowRib ? 0.6 + 0.3 * Math.sin(t * 10) : 0.15; m.chan.opacity = glowChan ? 0.8 : 0.35;
  const refTop = c - 0.7, refLen = 7.6, collar = refTop - 6.3;
  return (
    <group>
      {/* barrel shell + nose + clip */}
      <mesh material={m.barrel} position={[0, (BTOP + NOSE + 0.8) / 2, 0]}><cylinderGeometry args={[RB, RB, BTOP - NOSE - 0.8, 40, 1, true]} /></mesh>
      <mesh material={m.metal} position={[0, NOSE + 0.4, 0]}><cylinderGeometry args={[RB, 0.2, 0.8, 32, 1, true]} /></mesh>
      <mesh material={m.metal} position={[0, BTOP - 0.25, 0]}><cylinderGeometry args={[RB + 0.03, RB + 0.03, 0.5, 32, 1, true]} /></mesh>
      {xray < 0.5 && <mesh material={m.metal} position={[0, BTOP - 1.6, RB + 0.12]}><boxGeometry args={[0.28, 2.6, 0.1]} /></mesh>}
      {/* inside: barrel ribs (stops) and channels (slots) */}
      {xray > 0.05 && [0, 1, 2, 3].map((k) => <group key={k} rotation={[0, k * Math.PI / 2, 0]}>
        <mesh material={m.rib} position={[0, 1.5, 0.53]}><boxGeometry args={[0.32, 1.8, 0.16]} /></mesh>
        <group rotation={[0, Math.PI / 4, 0]}><mesh material={m.chan} position={[0, 1.6, 0.6]}><boxGeometry args={[0.3, 2.0, 0.02]} /></mesh></group>
      </group>)}
      {/* plunger with a sawtooth crown, ends in the button */}
      <group position={[0, c, 0]}>
        <mesh material={m.plunger} position={[0, 1.3, 0]}><cylinderGeometry args={[0.4, 0.4, 2.4, 24]} /></mesh>
        {Array.from({ length: 8 }, (_, k) => <mesh key={k} material={m.plunger} position={[0.3 * Math.cos(k * Math.PI / 4), 0.05, 0.3 * Math.sin(k * Math.PI / 4)]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.12, 0.22, 4]} /></mesh>)}
        <mesh material={m.metal} position={[0, 2.4, 0]}><cylinderGeometry args={[0.44, 0.46, 0.3, 24]} /></mesh>
      </group>
      {/* the rotating cam with 4 ridges */}
      <group position={[0, c, 0]} rotation={[0, phi, 0]}>
        <mesh material={m.cam} position={[0, -0.35, 0]}><cylinderGeometry args={[0.38, 0.38, 0.7, 24]} /></mesh>
        {[0, 1, 2, 3].map((k) => <group key={k} rotation={[0, k * Math.PI / 2, 0]}><mesh material={m.ridge} position={[0, -0.3, 0.46]}><boxGeometry args={[0.24, 0.6, 0.2]} /></mesh></group>)}
      </group>
      {/* ink refill + spring at the nose */}
      <mesh material={m.refill} position={[0, refTop - refLen / 2, 0]}><cylinderGeometry args={[0.16, 0.16, refLen, 16]} /></mesh>
      <mesh material={m.ink} position={[0, refTop - refLen * 0.55, 0]}><cylinderGeometry args={[0.1, 0.1, refLen * 0.7, 12]} /></mesh>
      <mesh material={m.metal} position={[0, refTop - refLen - 0.2, 0]}><cylinderGeometry args={[0.16, 0.05, 0.4, 16]} /></mesh>
      <mesh material={m.metal} position={[0, collar, 0]}><cylinderGeometry args={[0.32, 0.32, 0.12, 20]} /></mesh>
      <mesh geometry={springGeo} material={m.spring} position={[0, NOSE + 0.6, 0]} scale={[1, Math.max(0.2, collar - NOSE - 0.6), 1]} />
      {xray > 0.5 && hl === "stop" && <Glow map={map} at={[0, 0.6, 0.7]} size={1.6} color="#ff9a3c" opacity={0.6} />}
    </group>
  );
};

// ================= scenes =================
const paperTex = (() => {
  const W = 64, H = 96, d = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const line = y % 8 === 0, margin = x === 10; const c = margin ? [255, 79, 95] : line ? [122, 184, 245] : [246, 241, 230]; d.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
  const t = new THREE.DataTexture(d, W, H); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t;
})();
const woodTex = (() => {
  const W = 64, H = 64, d = new Uint8Array(W * H * 4), rp = [[59, 36, 24], [90, 53, 32], [122, 74, 42], [156, 100, 54]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const g = Math.sin(y * 0.4 + Math.sin(x * 0.15) * 2.5) * 0.5 + 0.5; const c = y % 16 === 0 ? rp[0] : rp[1 + Math.min(2, Math.floor(g * 3))]; d.set([c[0], c[1], c[2], 255], (y * W + x) * 4); }
  const t = new THREE.DataTexture(d, W, H); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true; return t;
})();
const squiggle = (() => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push(new THREE.Vector3(-3.2 + u * 4.5, 0.03, 4.4 + 0.45 * Math.sin(u * 14) - u * 0.4)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.05, 4); })();
const Desk: React.FC<{ t: number; map: THREE.Texture; xray: number }> = ({ t, map, xray }) => (
  <group>
    <ambientLight intensity={0.55} color="#ffffff" />
    <directionalLight position={[-4, 9, 5]} intensity={1.2} color="#fff3e0" />
    <pointLight position={[5, 3, 3]} intensity={14} distance={14} color="#7ab8f5" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial map={woodTex} roughness={0.8} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0.08]} position={[0, 0.02, 0.5]}><planeGeometry args={[9, 12]} /><meshStandardMaterial map={paperTex} roughness={0.9} /></mesh>
    <mesh geometry={squiggle}><meshStandardMaterial color="#1a2fa0" roughness={0.4} /></mesh>
    <group position={[-0.36, RB * 0.62 + 0.02, -0.43]} rotation={[0, -1.2, Math.PI / 2]} scale={0.62}><Pen t={t} xray={xray} map={map} hl="" /></group>
    <Glow map={map} at={[-4, 6, -3]} size={8} color="#fff08a" opacity={0.2} />
  </group>
);
const Mech: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const hl = t >= L[4] && t < L[5] ? "stop" : t >= L[5] && t < L[6] ? "chan" : "";
  return (
    <group>
      <ambientLight intensity={0.45} color="#bfe6ff" />
      <directionalLight position={[-3, 6, 6]} intensity={1.3} color="#fff08a" />
      <pointLight position={[3, 2, 4]} intensity={18} distance={12} color="#7ab8f5" />
      <pointLight position={[-3, -1, 3]} intensity={12} distance={12} color="#ff8ac0" />
      <mesh position={[0, 0, -6]}><planeGeometry args={[60, 60]} /><meshStandardMaterial color="#17142a" roughness={1} /></mesh>
      <Pen t={t} xray={1} map={map} hl={hl} />
    </group>
  );
};
const TrailGeo = (() => { const g = new THREE.PlaneGeometry(40, 0.5); g.rotateX(-Math.PI / 2); return g; })();
const Tip: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const v = 1.2, x = (t * v) % 40, roll = (t * v) / 0.9;
  const thick = t >= L[7] ? 1 : 0;
  const blob = (k: number) => 0.18 + 0.04 * Math.sin(t * 3 + k * 2);
  return (
    <group>
      <ambientLight intensity={0.5} color="#fff08a" />
      <directionalLight position={[-3, 6, 6]} intensity={1.3} color="#fff08a" />
      <pointLight position={[3, 1, 4]} intensity={16} distance={12} color="#7ab8f5" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-x * 0, -1.0, 0]}><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#f6f1e6" roughness={0.95} /></mesh>
      {/* ink line left behind on the paper */}
      <mesh geometry={TrailGeo} position={[-20, -0.985, 0]}><meshStandardMaterial color="#1a2fa0" roughness={0.4} /></mesh>
      {/* the socket (cut away) + ball + ink */}
      <group rotation={[0, 0, -0.35]}>
        <mesh position={[0, 1.4, -0.3]}><cylinderGeometry args={[1.3, 1.02, 2.4, 32, 1, false, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#c8cdf0" metalness={0.85} roughness={0.25} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.45, 0.6, 2.0, 20]} /><meshStandardMaterial color="#1a2fa0" roughness={0.3} emissive="#1a2fa0" emissiveIntensity={0.2} /></mesh>
        {thick > 0 && [0, 1, 2, 3].map((k) => <mesh key={k} position={[0.25 * Math.cos(k * 1.7), 0.9 + k * 0.45, 0.4]} scale={blob(k) / 0.18}><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#3a86d8" roughness={0.2} /></mesh>)}
        <group position={[0, 0, 0]} rotation={[0, 0, -roll]}>
          <mesh><sphereGeometry args={[0.92, 32, 24]} /><meshStandardMaterial color="#eef0ff" metalness={0.35} roughness={0.25} /></mesh>
          {[0, 1, 2].map((k) => <mesh key={k} rotation={[0, 0, (k * 2 * Math.PI) / 3]} position={[0.62 * Math.cos((k * 2 * Math.PI) / 3), 0.62 * Math.sin((k * 2 * Math.PI) / 3), 0.55]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#1a2fa0" roughness={0.3} /></mesh>)}
        </group>
      </group>
      <Glow map={map} at={[0, 0.3, 1]} size={3} color="#7ab8f5" opacity={0.25} />
      {void x}
    </group>
  );
};

// ================= camera, HUD, cards =================
const DESK_CAM = { p: [3.4, 21, 8.5] as V3, l: [0.3, 0, -0.2] as V3 };
const MECH_CAM: CamKey[] = [
  { t: L[2], p: [2.0, 2.0, 7.5], l: [0, 1.4, 0] }, { t: L[2] + 0.6, p: [2.8, 1.0, 13.5], l: [0, -1.0, 0] }, { t: L[3] - 0.3, p: [2.6, 0.8, 13.2], l: [0, -1.2, 0] },
  { t: L[3] + 0.6, p: [3.0, 2.6, 8.8], l: [0, 1.0, 0] }, { t: L[5], p: [2.6, 2.4, 8.4], l: [0, 1.0, 0] }, { t: L[6], p: [-2.4, 2.6, 8.4], l: [0, 1.0, 0] },
];
const TIP_CAM: CamKey[] = [{ t: L[6], p: [1.5, 1.5, 9.5], l: [0, 0.8, 0] }, { t: L[7], p: [0.8, 1.2, 8.0], l: [0, 0.8, 0] }, { t: L[8], p: [-0.5, 1.6, 8.6], l: [0, 1.0, 0] }];
const scene = (t: number) => (t < L[2] || t >= L[8] ? "desk" : t >= L[6] ? "tip" : "mech");
const camFor = (t: number): { p: V3; l: V3 } => {
  const sc = scene(t);
  if (sc === "mech") return camAt(MECH_CAM, t) as { p: V3; l: V3 };
  if (sc === "tip") return camAt(TIP_CAM, t) as { p: V3; l: V3 };
  if (t >= L[1] && t < L[2]) { const k = ease((t - L[1]) / (L[2] - L[1])) ** 2; const tg: V3 = [-0.2, 0.5, -0.8]; return { p: [lerp(DESK_CAM.p[0], tg[0] + 1.2, k), lerp(DESK_CAM.p[1], tg[1] + 2.5, k), lerp(DESK_CAM.p[2], tg[2] + 2.2, k)], l: [lerp(DESK_CAM.l[0], tg[0], k), lerp(DESK_CAM.l[1], tg[1], k), lerp(DESK_CAM.l[2], tg[2], k)] }; }
  const a = 0.1 * Math.sin(2 * LW * t); return { p: [DESK_CAM.p[0] + a, DESK_CAM.p[1], DESK_CAM.p[2]], l: DESK_CAM.l };
};
const HOOKC = { title: "What happens when you click a pen?", sub: "a tiny rotating machine is hiding in there", hold: true };
const CARDS: Card[] = [
  { from: 0, to: L[1], ...HOOKC },
  { from: L[1], to: L[2], title: "Let's see through it…", sub: "and slow it right down" },
  { from: L[2], to: L[3], n: 1, title: "A spring pushes the ink up", sub: "that's why the tip hides inside" },
  { from: L[3], to: L[4], n: 2, title: "Click: a sawtooth pushes down", sub: "its slanted teeth twist the cam a little" },
  { from: L[4], to: L[5], n: 3, title: "Let go: it lands on a ledge", sub: "the tip is stuck out → you can write" },
  { from: L[5], to: L[6], n: 4, title: "Click again: it twists into a slot", sub: "the spring shoots it back up" },
  { from: L[6], to: L[7], n: 5, title: "The tip: a tiny metal ball", sub: "~0.7 mm, it rolls ink out like a roll-on" },
  { from: L[7], to: L[8], n: 6, title: "Thick ink, like honey", sub: "so it doesn't leak (Bíró's patent, 1938)" },
  { from: L[8], to: D + 0.01, ...HOOKC },
];
const CALLS: Call[] = [
  { txt: "BUTTON", at: [-1.2, 0.5, -2.7], from: 0.4, to: L[1] - 0.1, dx: 120, dy: -200 },
  { txt: "SPRING", at: [0, -6.0, 0.4], from: L[2] + 0.8, to: L[3], dx: 200, dy: -60 },
  { txt: "INK TUBE", at: [0, -3.0, 0.2], from: L[2] + 1.4, to: L[3], dx: -220, dy: -60 },
  { txt: "SAWTOOTH", at: (t) => [0.3, mech(t).c + 0.1, 0.3], from: L[3] + 0.9, to: L[4], dx: -230, dy: -200 },
  { txt: "ROTATING CAM", at: (t) => [0.2, mech(t).c - 0.4, 0.45], from: L[3] + 1.4, to: L[4], dx: 230, dy: 160, color: "#ff4f5f" },
  { txt: "LEDGE = STOP", at: [0, 0.6, 0.6], from: L[4] + 0.5, to: L[5], dx: 230, dy: -230, color: "#ff9a3c" },
  { txt: "SLOT", at: [0.4, 1.8, 0.45], from: L[5] + 0.5, to: L[6], dx: 220, dy: -200, color: "#3a86d8" },
  { txt: "BALL ~0.7 MM", at: [0, -0.4, 0.9], from: L[6] + 0.6, to: L[7], dx: 220, dy: 260 },
  { txt: "INK", at: [0, 1.8, 0.6], from: L[6] + 1.0, to: L[8], dx: -200, dy: -200, color: "#3a86d8" },
];
const Hud: React.FC<{ t: number }> = ({ t }) => {
  const out = tipOut(t), slow = scene(t) === "mech";
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Pill bg={out ? "#1f8a4a" : "#2f2a52"}>{out ? "✏️ TIP OUT" : "TIP IN"}</Pill>
      <Pill bg={slow ? "#1e66b0" : "rgba(13,11,20,0.9)"}>{slow ? "100× SLOWER" : "REAL SPEED"}</Pill>
    </div>
  );
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

export const ClickPenVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = useMemo(() => glowTexture(), []);
  const sc = scene(t), cam = camFor(t);
  const xray = t >= L[1] && t < L[2] ? clamp01((t - L[1] - 0.2) / 0.6) : 0;
  const flash = [L[2], L[6], L[8]].reduce((a, x) => Math.max(a, Math.abs(t - x) < 0.2 ? 1 - Math.abs(t - x) / 0.2 : 0), 0);
  const land = CLICKS[4][3], back = CLICKS[5][3];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/33-clickpen/music.wav")} />
      <PixelArtCanvas bg={sc === "desk" ? "#3b2418" : sc === "tip" ? "#e9e3d6" : BG} fov={FOV} palette={PEN_PALETTE} outline outlineColor="#0d0b14" dither={0.06} scale={2}>
        <CamSet p={cam.p} l={cam.l} />
        {sc === "desk" ? <Desk t={t} map={glow} xray={xray} /> : sc === "mech" ? <Mech t={t} map={glow} /> : <Tip t={t} map={glow} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#fff08a", opacity: flash }} />
      <Hud t={t} />
      <Notif t={t} cards={CARDS} app="PEN · HOW IT WORKS" icon="🖊️" grad="linear-gradient(160deg,#3a86d8,#1a2fa0)" />
      <Callouts t={t} cam={cam} fov={FOV} calls={CALLS} />
      <Stamp t={t} at={land} dur={L[5] - land - 0.1} color="#1f8a4a" big="TIP OUT ✓" y={1500} />
      <Stamp t={t} at={back} dur={L[6] - back - 0.1} color="#2f2a52" big="TIP IN" y={1500} />
      <div style={{ ...ui, position: "absolute", left: 56, bottom: 60, fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 3 }}>@HOWTOWITHZAY</div>
    </AbsoluteFill>
  );
};
