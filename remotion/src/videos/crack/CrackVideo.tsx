/**
 * Video 026 · What actually makes the knuckle CRACK — realistic 3D medical-animation look for 20-25 year olds.
 * Rendering: three.js PBR with an image-based environment (RoomEnvironment → PMREM), glassy transmission materials for
 * the capsule / fluid / bubble, procedural bump on bone, bloom + depth of field + film grain & slight chromatic
 * aberration. No pixels, no mascots.
 * Text for a MUSIC video (no voice-over): no subtitles. A big title on the hook, 1-3 word callouts pinned to the anatomy
 * (projected 3D anchors with a leader line), and big graphic stamps on the drops (1971 / 2015 / 20:00 / 0 arthritis).
 * Facts: synovial capsule with dissolved gas (mostly CO2); pulling lowers the pressure and a cavity forms
 * (tribonucleation); 1971 theory = bubble collapse (Unsworth); 2015 real-time MRI (Kawchuk) = sound with cavity
 * formation, the cavity persists; ~20 min refractory; no arthritis link found.
 * Music: 142 BPM UK-drill-style beat (crack.json + music.wav from videos/26-crack/build.py); segment times are beat-locked.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import EV from "./crack.json";
import { project } from "../../brand/Labels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const D = EV.duration, BEAT = EV.beat;
const LW = (2 * Math.PI) / D;
const SEGS = EV.segs as { key: string; t: number; end: number }[];
const CRACK = EV.crack, DIVE = EV.dive, OUT = EV.out, END = EV.end, HOOKC = EV.hookCracks as number[];
const seg = (k: string) => SEGS.find((s) => s.key === k)!;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const W = 720, H = 1280, FOV = 30;
const scene = (t: number) => (t >= DIVE && t < OUT ? "joint" : "hand");
const mriK = (t: number) => { const s = seg("mri"); return t < s.t - 0.2 || t > s.end + 0.6 ? 0 : t < s.t ? (t - s.t + 0.2) / 0.2 : t > s.end + 0.3 ? 1 - (t - s.end - 0.3) / 0.3 : 1; };

// ================= render: environment + composer =================
const grainShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 0.05 }, ca: { value: 0.0015 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform float ca; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
    void main(){ vec2 d = (vUv - 0.5) * ca * 2.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + d).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d).b);
      c += (rnd(vUv * 1000.0) - 0.5) * amount;
      gl_FragColor = vec4(c, 1.0); }`,
};
const Post: React.FC<{ t: number; focus: number; aperture: number }> = ({ t, focus, aperture }) => {
  const { gl, scene: sc, camera } = useThree();
  const { composer, bokeh, grain } = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.78;
    const pm = new THREE.PMREMGenerator(gl);
    sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    sc.environmentIntensity = 0.28;
    const c = new EffectComposer(gl); c.setSize(W, H);
    c.addPass(new RenderPass(sc, camera));
    const bokeh = new BokehPass(sc, camera, { focus: 10, aperture: 0.0008, maxblur: 0.006 });
    c.addPass(bokeh);
    c.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.45, 0.88));
    const grain = new ShaderPass(grainShader); c.addPass(grain);
    c.addPass(new OutputPass());
    return { composer: c, bokeh, grain };
  }, [gl, sc, camera]);
  useFrame(() => {
    const u = bokeh.uniforms as Record<string, { value: number }>;
    u.focus.value = focus; u.aperture.value = aperture;
    (grain.uniforms as Record<string, { value: number }>).time.value = t * 13.7 % 100;
    composer.render();
  }, 1);
  return null;
};
const CamSet: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

// ================= the X-ray hand =================
const boneMat = new THREE.MeshStandardMaterial({ color: "#d8ecff", emissive: "#4f8fff", emissiveIntensity: 0.85, roughness: 0.4, metalness: 0.0 });
const boneHot = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffd27a", emissiveIntensity: 1.0, roughness: 0.3 });
const fleshMat = new THREE.MeshBasicMaterial({ color: "#1d4f9e", transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false });
const Capsule: React.FC<{ a: V3; b: V3; r: number; mat: THREE.Material }> = ({ a, b, r, mat }) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() };
  }, [a, b]);
  return <mesh position={pos} quaternion={quat} material={mat}><capsuleGeometry args={[r, Math.max(0.01, len - 2 * r), 6, 16]} /></mesh>;
};
const FINGERS = [{ x: -0.95, len: [1.05, 0.68, 0.48], ang: 0.1 }, { x: -0.32, len: [1.15, 0.75, 0.52], ang: 0.03 }, { x: 0.3, len: [1.08, 0.72, 0.5], ang: -0.03 }, { x: 0.88, len: [0.85, 0.55, 0.42], ang: -0.12 }];
const CRACK_FINGER = [1, 2, 0, 3, 1, 2, 0];
const flexOf = (t: number, f: number) => { let k = 0; HOOKC.forEach((c, i) => { if (CRACK_FINGER[i] !== f) return; const a = t - c; if (a > -0.25 && a < 0) k = Math.max(k, ease((a + 0.25) / 0.25)); else if (a >= 0 && a < 0.45) k = Math.max(k, 1 - ease(a / 0.45)); }); return k; };
const Finger: React.FC<{ x: number; len: number[]; ang: number; flex: number; hot: number }> = ({ x, len, ang, flex, hot }) => {
  const r = [0.13, 0.11, 0.095];
  return (
    <group position={[x, 0.22, 0]} rotation={[0, 0, ang]}>
      <mesh material={hot > 0.05 ? boneHot : boneMat}><sphereGeometry args={[0.2, 20, 14]} /></mesh>
      <group rotation={[-1.25 * flex, 0, 0]}>
        <Capsule a={[0, 0.12, 0]} b={[0, len[0], 0]} r={r[0]} mat={boneMat} />
        <mesh position={[0, len[0] / 2, 0]} material={fleshMat} scale={[1, len[0] / 0.6, 1]}><sphereGeometry args={[0.3, 16, 12]} /></mesh>
        <group position={[0, len[0] + 0.06, 0]} rotation={[-0.5 * flex, 0, 0]}>
          <Capsule a={[0, 0.04, 0]} b={[0, len[1], 0]} r={r[1]} mat={boneMat} />
          <mesh position={[0, len[1] / 2, 0]} material={fleshMat} scale={[1, len[1] / 0.5, 1]}><sphereGeometry args={[0.27, 16, 12]} /></mesh>
          <group position={[0, len[1] + 0.06, 0]} rotation={[-0.3 * flex, 0, 0]}>
            <Capsule a={[0, 0.04, 0]} b={[0, len[2], 0]} r={r[2]} mat={boneMat} />
            <mesh position={[0, len[2] / 2 + 0.03, 0]} material={fleshMat} scale={[1, len[2] / 0.4, 1]}><sphereGeometry args={[0.24, 16, 12]} /></mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
const HAND_ROT = (t: number): V3 => [0.08, 0.32 + 0.12 * Math.sin(2 * LW * t), 0.04 * Math.sin(3 * LW * t)];
const XrayHand: React.FC<{ t: number }> = ({ t }) => {
  const carp = useMemo(() => Array.from({ length: 8 }, (_, i) => [-0.55 + (i % 4) * 0.36, -2.55 + Math.floor(i / 4) * 0.38, 0] as V3), []);
  return (
    <group rotation={HAND_ROT(t)} position={[0, -0.4, 0]}>
      <Capsule a={[-0.45, -6.5, 0]} b={[-0.42, -3.1, 0]} r={0.27} mat={boneMat} />
      <Capsule a={[0.42, -6.5, 0]} b={[0.4, -3.15, 0]} r={0.2} mat={boneMat} />
      {carp.map((p, i) => <mesh key={i} position={p} material={boneMat}><sphereGeometry args={[0.17, 16, 12]} /></mesh>)}
      <mesh position={[0, -0.95, 0]} scale={[1.45, 1.6, 0.45]} material={fleshMat}><sphereGeometry args={[1, 28, 18]} /></mesh>
      <mesh position={[0, -4.4, 0]} scale={[1.0, 2.2, 0.5]} material={fleshMat}><sphereGeometry args={[1, 24, 16]} /></mesh>
      {FINGERS.map((f, i) => <React.Fragment key={i}>
        <Capsule a={[f.x * 0.5, -2.1, 0]} b={[f.x, 0.12, 0]} r={0.12} mat={boneMat} />
        <Finger x={f.x} len={f.len} ang={f.ang} flex={flexOf(t, i)} hot={HOOKC.some((c, j) => CRACK_FINGER[j] === i && t >= c && t - c < 0.25) ? 1 : 0} />
      </React.Fragment>)}
      <group position={[-0.75, -2.15, 0]} rotation={[0, 0, 0.75]}>
        <Capsule a={[0, 0, 0]} b={[0, 1.0, 0]} r={0.13} mat={boneMat} />
        <Capsule a={[0, 1.08, 0]} b={[0, 1.75, 0]} r={0.12} mat={boneMat} />
        <Capsule a={[0, 1.82, 0]} b={[0, 2.3, 0]} r={0.1} mat={boneMat} />
        <mesh position={[0, 1.2, 0]} scale={[1, 2.2, 1]} material={fleshMat}><sphereGeometry args={[0.32, 16, 12]} /></mesh>
      </group>
      {HOOKC.map((c, i) => { const a = t - c; if (a < 0 || a > 0.4) return null; const f = FINGERS[CRACK_FINGER[i]]; return <pointLight key={i} position={[f.x, 0.25, 0.5]} intensity={3 * (1 - a / 0.4)} distance={2.5} color="#ffd58a" />; })}
    </group>
  );
};

// ================= the joint (macro, PBR) =================
const noiseTex = (n: number, seed: number) => {
  const d = new Uint8Array(n * n * 4); let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const base = Array.from({ length: n * n }, () => r());
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += base[((y + dy + n) % n) * n + ((x + dx + n) % n)];
    v = v / 9; const pore = r() < 0.04 ? 0.35 : 1; const c = Math.floor(255 * v * pore);
    d.set([c, c, c, 255], (y * n + x) * 4);
  }
  const t = new THREE.DataTexture(d, n, n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true; return t;
};
const noisyBone = (r: number, seed: number) => {
  const g = new THREE.SphereGeometry(r, 72, 56), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.02 * Math.sin(v.x * 9 + seed) * Math.sin(v.y * 11) * Math.sin(v.z * 7 + seed) + 0.01 * Math.sin(v.x * 23 + v.y * 19); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
};
const pullK = (t: number) => { const s = seg("pull"); return t < s.t ? 0 : t < CRACK ? ease((t - s.t) / (CRACK - s.t)) : 1 - 0.35 * ease((t - CRACK) / 0.25); };
const bubbleR = (t: number) => { const w = seg("wait"); if (t < CRACK) return 0; const born = Math.min(1.08, 1 - Math.pow(1 - clamp01((t - CRACK) / 0.09), 3)) * 0.62; return t < w.t ? born : lerp(0.62, 0.16, ease((t - w.t) / (w.end - w.t + 1.5))); };
const GAS = Array.from({ length: 80 }, (_, i) => { const a = (i * 2.399) % (2 * Math.PI), r = 0.3 + ((i * 0.618) % 1) * 1.05, h = (((i * 0.377) % 1) - 0.5) * 0.9; return { p: [Math.cos(a) * r, h, Math.sin(a) * r] as V3, ph: i * 1.3 }; });
const gapOf = (t: number) => 0.18 + 0.75 * pullK(t);
const Joint: React.FC<{ t: number }> = ({ t }) => {
  const head = useMemo(() => noisyBone(1.15, 1), []), base = useMemo(() => noisyBone(1.0, 3), []);
  const mats = useMemo(() => {
    const bump = noiseTex(128, 7);
    return {
      bone: new THREE.MeshPhysicalMaterial({ color: "#cdb48c", roughness: 0.7, bumpMap: bump, bumpScale: 0.6, sheen: 0.3, sheenColor: new THREE.Color("#ffe9c9") }),
      cart: new THREE.MeshPhysicalMaterial({ color: "#d9f1ff", roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transmission: 0.35, thickness: 0.4, ior: 1.4 }),
      capsule: new THREE.MeshPhysicalMaterial({ color: "#ffb0bb", roughness: 0.18, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, clearcoat: 0.8 }),
      fluid: new THREE.MeshPhysicalMaterial({ color: "#ffd89a", roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, clearcoat: 1 }),
      gas: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#cfeaff", emissiveIntensity: 0.9 }),
      bub: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.0, transmission: 1, thickness: 0.15, ior: 1.0, iridescence: 0.6, iridescenceIOR: 1.3, clearcoat: 1, specularIntensity: 1 }),
      bubMri: new THREE.MeshBasicMaterial({ color: "#000000" }),
      tissue: new THREE.MeshStandardMaterial({ color: "#3a0d18", roughness: 0.95, side: THREE.BackSide }),
      vessel: new THREE.MeshPhysicalMaterial({ color: "#a01e33", roughness: 0.35, clearcoat: 0.6, emissive: "#2a0509" }),
      ligament: new THREE.MeshPhysicalMaterial({ color: "#f3e6da", roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color("#ffffff") }),
    };
  }, []);
  const pk = pullK(t), gap = gapOf(t), mid = -gap / 2, rb = bubbleR(t), mri = mriK(t) > 0.5, ca = t - CRACK;
  const vessels = useMemo(() => [[-3, 2.6, -1.8], [3.2, -1.5, -2.2], [-2.6, -2.8, -1.4], [2.4, 2.9, -2.6]].map((p, i) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(p[0] * 0.3, p[1] * 0.5 + 0.8, p[2] - 1), new THREE.Vector3(-p[0] * 0.8, -p[1] * 0.4, p[2] - 0.5)]), 60, 0.08 + 0.03 * (i % 2), 12)), []);
  return (
    <group>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-4, 6, 5]} intensity={1.5} color="#fff1dc" />
      <directionalLight position={[4, -2, -5]} intensity={1.6} color="#6fd0ff" />
      <pointLight position={[0, mid, 0.6]} intensity={mri ? 0 : 1.0 + (ca >= 0 && ca < 0.4 ? 10 * (1 - ca / 0.4) : 0)} distance={4} color="#ffd9a8" />
      <mesh material={mats.tissue}><sphereGeometry args={[11, 40, 28]} /></mesh>
      {vessels.map((g, i) => <mesh key={i} geometry={g} material={mats.vessel} />)}
      {/* collateral ligaments either side */}
      <group position={[0, 1.15, 0]}>
        <mesh geometry={head} material={mats.bone} scale={[1, 1.08, 1]} />
        <mesh position={[0, 2.2, 0]} material={mats.bone}><cylinderGeometry args={[0.72, 0.9, 3.6, 48]} /></mesh>
        <mesh position={[0, -0.05, 0]} material={mats.cart} scale={[1.03, 1.1, 1.03]}><sphereGeometry args={[1.16, 56, 28, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45]} /></mesh>
      </group>
      <group position={[0, -gap - 1.05, 0]}>
        <mesh geometry={base} material={mats.bone} scale={[1.05, 0.85, 1.05]} />
        <mesh position={[0, -2.1, 0]} material={mats.bone}><cylinderGeometry args={[0.85, 0.7, 3.4, 48]} /></mesh>
        <mesh position={[0, 0.62, 0]} material={mats.cart} rotation={[Math.PI, 0, 0]} scale={[1.02, 0.5, 1.02]}><sphereGeometry args={[1.02, 56, 24, 0, Math.PI * 2, 0, Math.PI * 0.42]} /></mesh>
      </group>
      <mesh position={[0, mid, 0]} scale={[1.75 - 0.08 * pk, 1.55 + 0.45 * pk, 1.75 - 0.08 * pk]} material={mats.capsule}><sphereGeometry args={[1, 64, 40]} /></mesh>
      <mesh position={[0, mid, 0]} scale={[1.45, 1.15 + 0.4 * pk, 1.45]} material={mats.fluid}><sphereGeometry args={[1, 48, 32]} /></mesh>
      {GAS.map((g, i) => { const j = 0.06 * Math.sin(t * 2 + g.ph), p: V3 = [g.p[0] + j, mid + g.p[1] * (1 + pk * 0.6) + j * 0.5, g.p[2]]; if (ca >= 0) { const u = clamp01(ca / 0.1); if (u >= 1) return null; return <mesh key={i} position={[lerp(p[0], 0, u), lerp(p[1], mid, u), lerp(p[2], 0, u)]} material={mats.gas}><sphereGeometry args={[0.026, 8, 6]} /></mesh>; } return <mesh key={i} position={p} material={mats.gas}><sphereGeometry args={[0.02 + 0.01 * pk, 8, 6]} /></mesh>; })}
      {rb > 0.01 && <mesh position={[0, mid, 0.05]} material={mri ? mats.bubMri : mats.bub} scale={[rb, rb * 0.82, rb]}><sphereGeometry args={[1, 48, 32]} /></mesh>}
      {(() => { const s = seg("1971"), a = t - s.t - 1.4; if (a < -1.2 || a > 0.6) return null; const r = a < 0 ? 0.62 : 0.62 * (1 - ease(a / 0.12)); return <>
        {r > 0.01 && <mesh position={[1.9, mid, 0.6]} material={mats.bub} scale={r}><sphereGeometry args={[1, 40, 28]} /></mesh>}
        {a >= 0 && a < 0.5 && <mesh position={[1.9, mid, 0.6]} scale={0.6 + a * 3}><ringGeometry args={[0.9, 1, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={1 - a / 0.5} side={THREE.DoubleSide} /></mesh>}
      </>; })()}
      {ca >= 0 && ca < 0.6 && [0, 0.12, 0.24].map((d) => ca > d ? <mesh key={d} position={[0, mid, 0.6]} scale={0.5 + (ca - d) * 7}><ringGeometry args={[0.96, 1, 72]} /><meshBasicMaterial color="#fff2c8" transparent opacity={Math.max(0, 0.7 - (ca - d) / 0.4)} side={THREE.DoubleSide} /></mesh> : null)}
    </group>
  );
};

// ================= camera =================
const camHand = (t: number): { p: V3; l: V3 } => {
  const a = 0.18 * Math.sin(2 * LW * t), base: V3 = [Math.sin(a) * 14.5, 0.2, Math.cos(a) * 14.5];
  if (t < DIVE && t > DIVE - 3 * BEAT) { const k = ease((t - DIVE + 3 * BEAT) / (3 * BEAT)); const target: V3 = [-0.32, -0.15, 0.2]; return { p: [lerp(base[0], target[0], k * k), lerp(base[1], target[1], k * k), lerp(base[2], 1.0, k * k)], l: [lerp(0, target[0], k), lerp(-0.6, target[1], k), 0] }; }
  if (t >= OUT && t < OUT + 2 * BEAT) { const k = ease((t - OUT) / (2 * BEAT)); return { p: [base[0] * k, lerp(-0.1, 0.2, k), lerp(2, 14.5, k)], l: [0, -0.6, 0] }; }
  return { p: base, l: [0, -0.6, 0] };
};
const camJoint = (t: number): { p: V3; l: V3 } => {
  const u = (t - DIVE) / (OUT - DIVE), ang = 0.55 + 0.9 * u + 0.08 * Math.sin(t * 0.5);
  let dist = lerp(20, 17, ease(u * 3));
  const ca = t - CRACK; if (ca > -1.5 && ca < 1.5) dist -= 4 * Math.exp(-(ca * ca) / 0.6);
  if (t < DIVE + 0.8) dist = lerp(4, dist, ease((t - DIVE) / 0.8));
  const shake = ca >= 0 && ca < 0.35 ? 0.12 * (1 - ca / 0.35) * Math.sin(t * 95) : 0;
  return { p: [Math.sin(ang) * dist + shake, 0.9 + 0.4 * Math.sin(u * 3), Math.cos(ang) * dist], l: [shake, -0.25, 0] };
};

// ================= text for a music video: a title, pinned callouts, big stamps =================
const display: React.CSSProperties = { fontFamily: "Inter, 'Inter Display', sans-serif", fontWeight: 900, color: "#ffffff", letterSpacing: -2, textShadow: "0 4px 24px rgba(0,0,0,0.65)" };
const small: React.CSSProperties = { fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#ffffff", letterSpacing: 4, textTransform: "uppercase", textShadow: "0 2px 10px rgba(0,0,0,0.9)" };
const Title: React.FC<{ t: number }> = ({ t }) => {
  const show = t < DIVE - 0.2 || t >= END;
  if (!show) return null;
  const k = t >= END ? ease((t - END) / 0.5) : t > DIVE - 0.6 ? clamp01((DIVE - 0.2 - t) / 0.4) : 1;
  return (
    <div style={{ position: "absolute", left: 70, top: 230, opacity: k, transform: `translateY(${(1 - k) * 20}px)` }}>
      <div style={{ ...small, fontSize: 30, color: "#ffd84a", marginBottom: 18 }}>knuckle cracking</div>
      <div style={{ ...display, fontSize: 132, lineHeight: 0.92 }}>That crack<br />isn't bone.</div>
    </div>
  );
};
type Callout = { txt: string; sub?: string; at: (t: number) => V3; from: number; to: number; side: 1 | -1; dy?: number };
const JOINT_CALLOUTS: Callout[] = [
  { txt: "Synovial fluid", at: (t) => [0.9, -gapOf(t) / 2 - 0.5, 0.9], from: seg("joint").t + 2 * BEAT, to: seg("pull").t, side: 1, dy: 120 },
  { txt: "Dissolved CO₂", at: (t) => [-0.5, -gapOf(t) / 2 + 0.25, 0.8], from: seg("joint").t + 5 * BEAT, to: seg("tear").t, side: -1, dy: -150 },
  { txt: "Sealed capsule", at: (t) => [-1.6, -gapOf(t) / 2 - 1.0, 0.4], from: seg("joint").t + 8 * BEAT, to: seg("pull").t + 2 * BEAT, side: -1, dy: 170 },
  { txt: "Pressure ↓", sub: "the capsule stretches", at: (t) => [1.2, -gapOf(t) / 2, 1.0], from: seg("pull").t + 2 * BEAT, to: CRACK, side: 1, dy: -140 },
  { txt: "Cavity", sub: "gas tears out of the fluid", at: (t) => [0.35, -gapOf(t) / 2 + 0.3, 0.6], from: CRACK + 0.35, to: seg("1971").t, side: 1, dy: -170 },
  { txt: "Still there", sub: "after the crack", at: (t) => [0.3, -gapOf(t) / 2 + 0.2, 0.6], from: seg("mri").t + 4 * BEAT, to: seg("mri").end, side: 1, dy: -160 },
  { txt: "Re-dissolving", at: (t) => [0.25, -gapOf(t) / 2 + 0.1, 0.6], from: seg("wait").t + 2 * BEAT, to: OUT - 0.3, side: -1, dy: -150 },
];
const Callouts: React.FC<{ t: number; cam: { p: V3; l: V3 } }> = ({ t, cam }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    {JOINT_CALLOUTS.filter((c) => t >= c.from && t < c.to && scene(t) === "joint").map((c, i) => {
      const [x, y] = project(c.at(t), cam, FOV), k = ease((t - c.from) / 0.3), o = Math.min(k, clamp01((c.to - t) / 0.2));
      const ex = Math.max(300, Math.min(780, x + c.side * 170)), ey = y + (c.dy ?? -140), lx = ex + c.side * 30;
      const line = `M ${x} ${y} L ${lerp(x, ex, k)} ${lerp(y, ey, k)} L ${lerp(ex, lx + c.side * 230, clamp01(k * 2 - 1))} ${ey}`;
      return (
        <g key={i} opacity={o}>
          <circle cx={x} cy={y} r={9} fill="#ffd84a" /><circle cx={x} cy={y} r={20} fill="none" stroke="#ffd84a" strokeWidth={2} opacity={0.6} />
          <path d={line} fill="none" stroke="#ffffff" strokeWidth={3} />
          <text x={c.side > 0 ? lx : lx} y={ey - 16} textAnchor={c.side > 0 ? "start" : "end"} style={{ ...small, fontSize: 30, letterSpacing: 3, fill: "#ffffff" } as React.CSSProperties}>{c.txt}</text>
          {c.sub && <text x={lx} y={ey + 34} textAnchor={c.side > 0 ? "start" : "end"} style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 26, fill: "rgba(255,255,255,0.75)" } as React.CSSProperties}>{c.sub}</text>}
        </g>);
    })}
  </svg>
);
/** big graphic stamps on the drops */
const Stamps: React.FC<{ t: number }> = ({ t }) => {
  const s71 = seg("1971"), mri = seg("mri"), w = seg("wait"), ar = seg("arth");
  const blk = (from: number, to: number, el: (k: number) => React.ReactNode) => { if (t < from || t >= to) return null; const k = ease((t - from) / 0.3), o = Math.min(k, clamp01((to - t) / 0.25)); return <div style={{ position: "absolute", left: 70, top: 230, opacity: o }}>{el(k)}</div>; };
  const strike = clamp01((t - (mri.t - 0.6)) / 0.3);
  return (
    <>
      {blk(CRACK - 0.02, CRACK + 1.8, (k) => <div style={{ ...display, fontSize: 210, transform: `scale(${1 + 0.25 * Math.exp(-(t - CRACK) / 0.12)})`, transformOrigin: "0 50%" }}>crack.</div>)}
      {blk(s71.t, mri.t, () => <div>
        <div style={{ ...display, fontSize: 170, position: "relative", display: "inline-block" }}>1971<div style={{ position: "absolute", left: -10, top: "52%", height: 14, width: `${strike * 110}%`, background: "#ff3b4a" }} /></div>
        <div style={{ ...small, fontSize: 34, marginTop: 10 }}>theory: the bubble pops</div>
      </div>)}
      {blk(mri.t, mri.end + 0.4, () => <div><div style={{ ...display, fontSize: 170 }}>2015</div><div style={{ ...small, fontSize: 34, marginTop: 10 }}>filmed live in an MRI</div></div>)}
      {blk(w.t, OUT, () => { const m = Math.min(20, ((t - w.t) / (OUT - w.t - 0.3)) * 20); return <div><div style={{ ...display, fontSize: 170, fontVariantNumeric: "tabular-nums" }}>{String(Math.floor(m)).padStart(2, "0")}:{String(Math.floor((m % 1) * 60)).padStart(2, "0")}</div><div style={{ ...small, fontSize: 34, marginTop: 10 }}>until it can crack again</div></div>; })}
      {blk(ar.t, END - 0.2, () => <div><div style={{ ...small, fontSize: 34, color: "#ffd84a", marginBottom: 14 }}>arthritis?</div><div style={{ ...display, fontSize: 150, lineHeight: 0.95 }}>No link<br />found.</div></div>)}
    </>
  );
};

export const CrackVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = scene(t), cam = s === "joint" ? camJoint(t) : camHand(t), mri = mriK(t);
  const focusDist = Math.hypot(cam.p[0] - cam.l[0], cam.p[1] - cam.l[1], cam.p[2] - cam.l[2]);
  const flash = Math.max(...[DIVE, OUT].map((x) => (Math.abs(t - x) < 0.22 ? 1 - Math.abs(t - x) / 0.22 : 0)), t >= CRACK && t < CRACK + 0.12 ? 0.5 * (1 - (t - CRACK) / 0.12) : 0);
  return (
    <AbsoluteFill style={{ background: "#03050b" }}>
      <Audio src={staticFile("videos/26-crack/music.wav")} />
      <AbsoluteFill style={{ filter: mri > 0 ? `grayscale(${mri}) contrast(${1 + 0.45 * mri}) brightness(${1 + 0.1 * mri})` : undefined }}>
        <div style={{ width: W, height: H, transform: `scale(${1080 / W})`, transformOrigin: "top left" }}>
          <ThreeCanvas width={W} height={H} gl={{ antialias: true }} camera={{ fov: FOV, near: 0.1, far: 100 }}>
            <color attach="background" args={[s === "joint" ? "#14060a" : "#03050b"]} />
            <CamSet p={cam.p} l={cam.l} />
            {s === "joint" ? <Joint t={t} /> : <><ambientLight intensity={0.2} /><directionalLight position={[3, 5, 6]} intensity={0.9} color="#cfe3ff" /><XrayHand t={t} /></>}
            <Post t={t} focus={focusDist} aperture={s === "joint" ? 0.0012 : 0.0005} />
          </ThreeCanvas>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.75) 100%)" }} />
      {mri > 0 && <AbsoluteFill style={{ opacity: mri * 0.22, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0 2px, rgba(0,0,0,0) 2px 6px)" }} />}
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />
      <div style={{ ...small, position: "absolute", left: 70, top: 120, fontSize: 24, letterSpacing: 6, color: "rgba(255,255,255,0.55)" }}>how it works with zay</div>
      <Title t={t} />
      <Stamps t={t} />
      <Callouts t={t} cam={cam} />
    </AbsoluteFill>
  );
};
