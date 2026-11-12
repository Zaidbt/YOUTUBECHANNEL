/**
 * Video 026 · What actually makes the knuckle CRACK — a new look for 20-25 year olds: realistic 3D medical animation
 * (lit three.js scene + bloom, no pixel pipeline, no mascots), an X-ray hand hook, a macro joint interior, an MRI pass,
 * and TikTok-style word-by-word captions carrying a real script. Music: 142 BPM UK-drill-style beat (crack.json +
 * music.wav from videos/26-crack/build.py); every caption word is placed on the beat grid.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import EV from "./crack.json";

loadFont({ family: "PoppinsX", url: staticFile("fonts/Poppins-ExtraBold.ttf"), weight: "800" });
loadFont({ family: "PoppinsS", url: staticFile("fonts/Poppins-SemiBold.ttf"), weight: "600" });

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
type Word = { w: string; t: number; seg: number };
const D = EV.duration, BEAT = EV.beat;
const LW = (2 * Math.PI) / D;
const WORDS = EV.words as Word[], HOOKW = EV.hookWords as Word[], SEGS = EV.segs as { key: string; t: number; end: number }[];
const CRACK = EV.crack, DIVE = EV.dive, OUT = EV.out, END = EV.end, HOOKC = EV.hookCracks as number[];
const seg = (k: string) => SEGS.find((s) => s.key === k)!;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const W = 720, H = 1280;
const scene = (t: number) => (t >= DIVE && t < OUT ? "joint" : "hand");
const mriK = (t: number) => { const s = seg("mri"); return t < s.t - 0.2 || t > s.end + 0.6 ? 0 : t < s.t ? (t - s.t + 0.2) / 0.2 : t > s.end + 0.3 ? 1 - (t - s.end - 0.3) / 0.3 : 1; };

// ================= render: composer with bloom =================
const Post: React.FC = () => {
  const { gl, scene: sc, camera } = useThree();
  const composer = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
    const c = new EffectComposer(gl);
    c.setSize(W, H);
    c.addPass(new RenderPass(sc, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.5, 0.72));
    c.addPass(new OutputPass());
    return c;
  }, [gl, sc, camera]);
  useFrame(() => { composer.render(); }, 1);
  return null;
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

// ================= the X-ray hand =================
const boneMat = new THREE.MeshStandardMaterial({ color: "#d8ecff", emissive: "#5c9dff", emissiveIntensity: 0.45, roughness: 0.45, metalness: 0.0 });
const boneHot = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffe08a", emissiveIntensity: 1.1, roughness: 0.3 });
const fleshMat = new THREE.MeshBasicMaterial({ color: "#1d4f9e", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
const Capsule: React.FC<{ a: V3; b: V3; r: number; mat: THREE.Material }> = ({ a, b, r, mat }) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() };
  }, [a, b]);
  return <mesh position={pos} quaternion={quat} material={mat}><capsuleGeometry args={[r, Math.max(0.01, len - 2 * r), 6, 14]} /></mesh>;
};
const FINGERS = [{ x: -0.95, len: [1.05, 0.68, 0.48], ang: 0.1 }, { x: -0.32, len: [1.15, 0.75, 0.52], ang: 0.03 }, { x: 0.3, len: [1.08, 0.72, 0.5], ang: -0.03 }, { x: 0.88, len: [0.85, 0.55, 0.42], ang: -0.12 }];
const CRACK_FINGER = [1, 2, 0, 3, 1, 2, 0];
const flexOf = (t: number, f: number) => { let k = 0; HOOKC.forEach((c, i) => { if (CRACK_FINGER[i] !== f) return; const a = t - c; if (a > -0.25 && a < 0) k = Math.max(k, ease((a + 0.25) / 0.25)); else if (a >= 0 && a < 0.45) k = Math.max(k, 1 - ease(a / 0.45)); }); return k; };
const Finger: React.FC<{ x: number; len: number[]; ang: number; flex: number; hot: number }> = ({ x, len, ang, flex, hot }) => {
  const r = [0.13, 0.11, 0.095];
  return (
    <group position={[x, 0.22, 0]} rotation={[0, 0, ang]}>
      <mesh material={hot > 0.05 ? boneHot : boneMat}><sphereGeometry args={[0.2, 16, 12]} /></mesh>
      <group rotation={[-1.25 * flex, 0, 0]}>
        <Capsule a={[0, 0.12, 0]} b={[0, len[0], 0]} r={r[0]} mat={boneMat} />
        <mesh position={[0, len[0] / 2, 0]} material={fleshMat} scale={[1, len[0] / 0.6, 1]}><sphereGeometry args={[0.3, 14, 10]} /></mesh>
        <group position={[0, len[0] + 0.06, 0]} rotation={[-0.5 * flex, 0, 0]}>
          <Capsule a={[0, 0.04, 0]} b={[0, len[1], 0]} r={r[1]} mat={boneMat} />
          <mesh position={[0, len[1] / 2, 0]} material={fleshMat} scale={[1, len[1] / 0.5, 1]}><sphereGeometry args={[0.27, 14, 10]} /></mesh>
          <group position={[0, len[1] + 0.06, 0]} rotation={[-0.3 * flex, 0, 0]}>
            <Capsule a={[0, 0.04, 0]} b={[0, len[2], 0]} r={r[2]} mat={boneMat} />
            <mesh position={[0, len[2] / 2 + 0.03, 0]} material={fleshMat} scale={[1, len[2] / 0.4, 1]}><sphereGeometry args={[0.24, 14, 10]} /></mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
const XrayHand: React.FC<{ t: number }> = ({ t }) => {
  const carp = useMemo(() => Array.from({ length: 8 }, (_, i) => [-0.55 + (i % 4) * 0.36, -2.55 + Math.floor(i / 4) * 0.38, 0] as V3), []);
  return (
    <group rotation={[0.08, 0.32 + 0.12 * Math.sin(2 * LW * t), 0.04 * Math.sin(3 * LW * t)]} position={[0, -0.4, 0]}>
      {/* forearm + wrist */}
      <Capsule a={[-0.45, -6.5, 0]} b={[-0.42, -3.1, 0]} r={0.27} mat={boneMat} />
      <Capsule a={[0.42, -6.5, 0]} b={[0.4, -3.15, 0]} r={0.2} mat={boneMat} />
      {carp.map((p, i) => <mesh key={i} position={p} material={boneMat}><sphereGeometry args={[0.17, 14, 10]} /></mesh>)}
      {/* palm flesh */}
      <mesh position={[0, -0.95, 0]} scale={[1.45, 1.6, 0.45]} material={fleshMat}><sphereGeometry args={[1, 24, 16]} /></mesh>
      <mesh position={[0, -4.4, 0]} scale={[1.0, 2.2, 0.5]} material={fleshMat}><sphereGeometry args={[1, 20, 14]} /></mesh>
      {/* metacarpals + fingers */}
      {FINGERS.map((f, i) => <React.Fragment key={i}>
        <Capsule a={[f.x * 0.5, -2.1, 0]} b={[f.x, 0.12, 0]} r={0.12} mat={boneMat} />
        <Finger x={f.x} len={f.len} ang={f.ang} flex={flexOf(t, i)} hot={HOOKC.some((c, j) => CRACK_FINGER[j] === i && t >= c && t - c < 0.25) ? 1 : 0} />
      </React.Fragment>)}
      {/* thumb */}
      <group position={[-0.75, -2.15, 0]} rotation={[0, 0, 0.75]}>
        <Capsule a={[0, 0, 0]} b={[0, 1.0, 0]} r={0.13} mat={boneMat} />
        <Capsule a={[0, 1.08, 0]} b={[0, 1.75, 0]} r={0.12} mat={boneMat} />
        <Capsule a={[0, 1.82, 0]} b={[0, 2.3, 0]} r={0.1} mat={boneMat} />
        <mesh position={[0, 1.2, 0]} scale={[1, 2.2, 1]} material={fleshMat}><sphereGeometry args={[0.32, 14, 10]} /></mesh>
      </group>
      {HOOKC.map((c, i) => { const a = t - c; if (a < 0 || a > 0.4) return null; const f = FINGERS[CRACK_FINGER[i]]; return <pointLight key={i} position={[f.x, 0.25, 0.5]} intensity={4 * (1 - a / 0.4)} distance={2.5} color="#ffd58a" />; })}
    </group>
  );
};

// ================= the joint (macro) =================
const noisyBone = (r: number, seed: number) => {
  const g = new THREE.SphereGeometry(r, 64, 48), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.025 * Math.sin(v.x * 9 + seed) * Math.sin(v.y * 11) * Math.sin(v.z * 7 + seed) + 0.012 * Math.sin(v.x * 23 + v.y * 19); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
};
const pullK = (t: number) => { const s = seg("pull"); return t < s.t ? 0 : t < CRACK ? ease((t - s.t) / (CRACK - s.t)) : 1 - 0.35 * ease((t - CRACK) / 0.25); };
const bubbleR = (t: number) => { const w = seg("wait"); if (t < CRACK) return 0; const born = Math.min(1.08, 1 - Math.pow(1 - clamp01((t - CRACK) / 0.09), 3)) * 0.62; return t < w.t ? born : lerp(0.62, 0.16, ease((t - w.t) / (w.end - w.t + 1.5))); };
const GAS = Array.from({ length: 70 }, (_, i) => { const a = (i * 2.399) % (2 * Math.PI), r = 0.35 + ((i * 0.618) % 1) * 1.05, h = (((i * 0.377) % 1) - 0.5) * 0.9; return { p: [Math.cos(a) * r, h, Math.sin(a) * r] as V3, ph: i * 1.3 }; });
const Joint: React.FC<{ t: number }> = ({ t }) => {
  const head = useMemo(() => noisyBone(1.15, 1), []), base = useMemo(() => noisyBone(1.0, 3), []);
  const mats = useMemo(() => ({
    bone: new THREE.MeshStandardMaterial({ color: "#e9d6b4", roughness: 0.78, metalness: 0 }),
    cart: new THREE.MeshPhysicalMaterial({ color: "#d6f0ff", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.88 }),
    capsule: new THREE.MeshPhysicalMaterial({ color: "#ff7a8a", roughness: 0.35, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, clearcoat: 0.6 }),
    fluid: new THREE.MeshStandardMaterial({ color: "#ffc86b", emissive: "#ff9a3a", emissiveIntensity: 0.12, transparent: true, opacity: 0.14, depthWrite: false }),
    gas: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#bfe6ff", emissiveIntensity: 1.1 }),
    bub: new THREE.MeshPhysicalMaterial({ color: "#eaf7ff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.6, clearcoat: 1, emissive: "#9fd6ff", emissiveIntensity: 0.35 }),
    bubMri: new THREE.MeshBasicMaterial({ color: "#000000" }),
    tissue: new THREE.MeshStandardMaterial({ color: "#5a1d2c", roughness: 0.9, side: THREE.BackSide }),
    vessel: new THREE.MeshStandardMaterial({ color: "#a3263a", roughness: 0.5, emissive: "#3a0a12" }),
  }), []);
  const pk = pullK(t), gap = 0.18 + 0.75 * pk, mid = -gap / 2, rb = bubbleR(t), mri = mriK(t) > 0.5, ca = t - CRACK;
  const vessels = useMemo(() => [[-3, 2.6, -1.8], [3.2, -1.5, -2.2], [-2.6, -2.8, -1.4]].map((p, i) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(p[0] * 0.3, p[1] * 0.5 + 0.8, p[2] - 1), new THREE.Vector3(-p[0] * 0.8, -p[1] * 0.4, p[2] - 0.5)]), 40, 0.09 + 0.03 * i, 8)), []);
  return (
    <group>
      <ambientLight intensity={0.28} />
      <directionalLight position={[-4, 6, 5]} intensity={1.7} color="#fff1dc" />
      <directionalLight position={[4, -2, -5]} intensity={1.8} color="#6fd0ff" />
      <pointLight position={[0, mid, 0.6]} intensity={mri ? 0 : 1.2 + (ca >= 0 && ca < 0.4 ? 12 * (1 - ca / 0.4) : 0)} distance={4} color="#ffd9a8" />
      {/* surrounding tissue + vessels */}
      <mesh material={mats.tissue}><sphereGeometry args={[9, 32, 24]} /></mesh>
      {vessels.map((g, i) => <mesh key={i} geometry={g} material={mats.vessel} />)}
      {/* upper bone: metacarpal head + shaft */}
      <group position={[0, 1.15, 0]}>
        <mesh geometry={head} material={mats.bone} scale={[1, 1.08, 1]} />
        <mesh position={[0, 2.2, 0]} material={mats.bone}><cylinderGeometry args={[0.72, 0.9, 3.6, 40]} /></mesh>
        <mesh position={[0, -0.05, 0]} material={mats.cart} scale={[1.03, 1.1, 1.03]}><sphereGeometry args={[1.16, 48, 24, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45]} /></mesh>
      </group>
      {/* lower bone: phalanx base, pulled away */}
      <group position={[0, -gap - 1.05, 0]}>
        <mesh geometry={base} material={mats.bone} scale={[1.05, 0.85, 1.05]} />
        <mesh position={[0, -2.1, 0]} material={mats.bone}><cylinderGeometry args={[0.85, 0.7, 3.4, 40]} /></mesh>
        <mesh position={[0, 0.62, 0]} material={mats.cart} rotation={[Math.PI, 0, 0]} scale={[1.02, 0.5, 1.02]}><sphereGeometry args={[1.02, 48, 20, 0, Math.PI * 2, 0, Math.PI * 0.42]} /></mesh>
      </group>
      {/* the capsule + fluid */}
      <mesh position={[0, mid, 0]} scale={[1.75 - 0.08 * pk, 1.55 + 0.45 * pk, 1.75 - 0.08 * pk]} material={mats.capsule}><sphereGeometry args={[1, 48, 32]} /></mesh>
      <mesh position={[0, mid, 0]} scale={[1.5, 1.2 + 0.4 * pk, 1.5]} material={mats.fluid}><sphereGeometry args={[1, 40, 28]} /></mesh>
      {/* dissolved gas: drifts, then rushes into the cavity */}
      {GAS.map((g, i) => { const j = 0.06 * Math.sin(t * 2 + g.ph), p: V3 = [g.p[0] + j, mid + g.p[1] * (1 + pk * 0.6) + j * 0.5, g.p[2]]; if (ca >= 0) { const u = clamp01(ca / 0.1); if (u >= 1) return null; return <mesh key={i} position={[lerp(p[0], 0, u), lerp(p[1], mid, u), lerp(p[2], 0, u)]} material={mats.gas}><sphereGeometry args={[0.028, 6, 5]} /></mesh>; } return <mesh key={i} position={p} material={mats.gas}><sphereGeometry args={[0.022 + 0.01 * pk, 6, 5]} /></mesh>; })}
      {/* the cavity */}
      {rb > 0.01 && <mesh position={[0, mid, 0.05]} material={mri ? mats.bubMri : mats.bub} scale={[rb, rb * 0.82, rb]}><sphereGeometry args={[1, 40, 28]} /></mesh>}
      {/* 1971 theory: a ghost bubble that pops */}
      {(() => { const s = seg("1971"), a = t - s.t - 1.4; if (a < -1.2 || a > 0.6) return null; const r = a < 0 ? 0.62 : 0.62 * (1 - ease(a / 0.12)); return <>
        {r > 0.01 && <mesh position={[1.9, mid, 0.4]} material={mats.bub} scale={r}><sphereGeometry args={[1, 32, 24]} /></mesh>}
        {a >= 0 && a < 0.5 && <mesh position={[1.9, mid, 0.4]} scale={0.6 + a * 3}><ringGeometry args={[0.9, 1, 40]} /><meshBasicMaterial color="#ffffff" transparent opacity={1 - a / 0.5} side={THREE.DoubleSide} /></mesh>}
      </>; })()}
      {ca >= 0 && ca < 0.6 && [0, 0.12, 0.24].map((d) => ca > d ? <mesh key={d} position={[0, mid, 0.6]} scale={0.5 + (ca - d) * 7}><ringGeometry args={[0.95, 1, 64]} /><meshBasicMaterial color="#fff2c8" transparent opacity={Math.max(0, 0.9 - (ca - d) / 0.4)} side={THREE.DoubleSide} /></mesh> : null)}
    </group>
  );
};

// ================= camera =================
const camHand = (t: number): { p: V3; l: V3 } => {
  const a = 0.18 * Math.sin(2 * LW * t), base: V3 = [Math.sin(a) * 13.5, 0.2, Math.cos(a) * 13.5];
  if (t < DIVE && t > DIVE - 3 * BEAT) { const k = ease((t - DIVE + 3 * BEAT) / (3 * BEAT)); const target: V3 = [-0.32, -0.15, 0.2]; return { p: [lerp(base[0], target[0], k * k), lerp(base[1], target[1], k * k), lerp(base[2], 1.0, k * k)], l: [lerp(0, target[0], k), lerp(-0.6, target[1], k), 0] }; }
  if (t >= OUT && t < OUT + 2 * BEAT) { const k = ease((t - OUT) / (2 * BEAT)); return { p: [base[0] * k, lerp(-0.1, 0.2, k), lerp(2, 13.5, k)], l: [0, -0.6, 0] }; }
  return { p: base, l: [0, -0.6, 0] };
};
const camJoint = (t: number): { p: V3; l: V3 } => {
  const u = (t - DIVE) / (OUT - DIVE), ang = 0.55 + 0.9 * u + 0.08 * Math.sin(t * 0.5);
  let dist = lerp(15, 12.5, ease(u * 3));
  const ca = t - CRACK; if (ca > -1.5 && ca < 1.5) dist -= 2.6 * Math.exp(-(ca * ca) / 0.6);
  if (t < DIVE + 0.8) dist = lerp(4, dist, ease((t - DIVE) / 0.8));
  const shake = ca >= 0 && ca < 0.35 ? 0.12 * (1 - ca / 0.35) * Math.sin(t * 95) : 0;
  return { p: [Math.sin(ang) * dist + shake, 0.9 + 0.4 * Math.sin(u * 3), Math.cos(ang) * dist], l: [shake, -0.25, 0] };
};

// ================= captions =================
const CAP_Y = 1520;
const Captions: React.FC<{ t: number }> = ({ t }) => {
  let list: Word[], cur = -1;
  if (t < DIVE) { list = HOOKW; cur = -1; }
  else if (t >= END) { list = HOOKW.filter((w) => t >= w.t); cur = list.length - 1; }
  else { const si = SEGS.findIndex((s, i) => t >= s.t && (i === SEGS.length - 1 || t < SEGS[i + 1].t)); if (si < 0) return null; const ws = WORDS.filter((w) => w.seg === si); list = ws.filter((w) => t >= w.t); cur = list.length - 1; if (t > SEGS[si].end + 0.6) return null; }
  const key = (w: string) => /\d|crack|cavity|carbon|dioxide|pressure|bubble|MRI|arthritis|20|bones|popping|crashes|dissolve/i.test(w);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: CAP_Y, transform: "translateY(-50%)", textAlign: "center", fontFamily: "PoppinsX", fontSize: 76, lineHeight: 1.12, letterSpacing: -1 }}>
      {list.map((w, i) => { const age = t - w.t, pop = i === cur ? 1 + 0.12 * Math.exp(-age / 0.08) : 1; return (
        <span key={i} style={{ display: "inline-block", margin: "0 12px", transform: `scale(${pop})`, color: i === cur || key(w.w) ? "#ffd84a" : "#ffffff", textShadow: "0 0 2px #000, 4px 4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000, -4px -4px 0 #000, 0 6px 18px rgba(0,0,0,0.6)" }}>{w.w}</span>); })}
    </div>
  );
};
/** small context chips (source / instrument), sentence case */
const Chip: React.FC<{ t: number }> = ({ t }) => {
  const s = SEGS.find((x) => t >= x.t && t < x.end + 0.4);
  const txt: Record<string, string> = { joint: "synovial joint · cross-section", pull: "capsule volume ↑  pressure ↓", tear: "tribonucleation", crack: "cavity forms in < 0.3 s", "1971": "1971 theory: the bubble collapses", mri: "real-time MRI · 2015", wait: "refractory period", arth: "no link found in studies" };
  if (!s || !txt[s.key]) return null;
  const k = ease((t - s.t) / 0.25);
  const wait = s.key === "wait", mins = wait ? Math.min(20, Math.floor(((t - s.t) / (s.end - s.t)) * 20)) : 0;
  return (
    <div style={{ position: "absolute", left: 60, top: 190, opacity: k, transform: `translateY(${(1 - k) * 10}px)`, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: s.key === "mri" ? "#ffffff" : "#ffd84a", boxShadow: "0 0 14px #ffd84a" }} />
      <div style={{ fontFamily: "PoppinsS", fontSize: 34, color: "#ffffff", textShadow: "0 2px 8px #000" }}>{txt[s.key]}{wait ? `  ·  ${mins} min` : ""}</div>
    </div>
  );
};

export const CrackVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = scene(t), cam = s === "joint" ? camJoint(t) : camHand(t), mri = mriK(t);
  const flash = Math.max(...[DIVE, OUT].map((x) => (Math.abs(t - x) < 0.25 ? 1 - Math.abs(t - x) / 0.25 : 0)), t >= CRACK && t < CRACK + 0.15 ? 0.6 * (1 - (t - CRACK) / 0.15) : 0);
  return (
    <AbsoluteFill style={{ background: "#03050b" }}>
      <Audio src={staticFile("videos/26-crack/music.wav")} />
      <AbsoluteFill style={{ filter: mri > 0 ? `grayscale(${mri}) contrast(${1 + 0.45 * mri}) brightness(${1 + 0.1 * mri})` : undefined }}>
        <div style={{ width: W, height: H, transform: `scale(${1080 / W})`, transformOrigin: "top left" }}>
          <ThreeCanvas width={W} height={H} gl={{ antialias: true }} camera={{ fov: 32, near: 0.1, far: 100 }}>
            <color attach="background" args={[s === "joint" ? "#14060a" : "#03050b"]} />
            <CamSet p={cam.p} l={cam.l} />
            {s === "joint" ? <Joint t={t} /> : <><ambientLight intensity={0.35} /><directionalLight position={[3, 5, 6]} intensity={1.4} color="#cfe3ff" /><XrayHand t={t} /></>}
            <Post />
          </ThreeCanvas>
        </div>
      </AbsoluteFill>
      {/* vignette + MRI scanlines */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)" }} />
      {mri > 0 && <AbsoluteFill style={{ opacity: mri * 0.25, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 2px, rgba(0,0,0,0) 2px 6px)" }} />}
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />
      <div style={{ position: "absolute", left: 60, top: 110, fontFamily: "PoppinsS", fontSize: 30, color: "rgba(255,255,255,0.65)" }}>@howtowithzay</div>
      <Chip t={t} />
      <Captions t={t} />
    </AbsoluteFill>
  );
};
