/**
 * Video 011 · How do noise-cancelling headphones work? — true pixel-art 3D, 48 s seamless loop @ 60 fps, 130 BPM UK garage.
 * The engine drone in the soundtrack is multiplied by (1 − anc(t)); the picture flattens the red noise wave with the
 * same anc(t). So when you see silence, you hear it. Events from anc.json (videos/11-anc/build.py).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import EV from "./anc.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt, CamKey } from "../teasers/Majestic";
import { Labels, LabelDef } from "../../brand/Labels";

export const FPS = 60;
export const DURATION = Math.round(EV.duration * FPS);
type V3 = [number, number, number];
const LW = (2 * Math.PI) / EV.duration;
const BAR = EV.bar, BEAT = BAR / 4;
const bt = (bar: number) => bar * BAR;
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export const ANC_PALETTE = [
  "#06070d", "#0d1020", "#161b33", "#232a4d", "#343d66", "#2a2a33", "#4a4a58", "#7a7a8a", "#b9bccb", "#e8eaf2",
  "#ff3b4a", "#a81830", "#5a1018", "#3ad6ff", "#1f7fbf", "#0f3a5a", "#ffffff", "#ffd23f", "#3ee06a", "#1f8a3a",
  "#ff9ab0", "#c96a7a", "#8a3a4a", "#b05cff",
];
const BG = "#06070d";
const RED = "#ff3b4a", BLUE = "#3ad6ff", WHITE = "#ffffff";

const ancAt = (t: number) => {
  const a = EV.anc;
  for (let i = 0; i < a.length - 1; i++) if (t >= a[i][0] && t <= a[i + 1][0]) {
    const [t0, v0] = a[i], [t1, v1] = a[i + 1];
    return t1 === t0 ? v1 : v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return 0;
};
const since = (arr: number[], t: number) => { let a = 9; for (const x of arr) if (x <= t + 1e-6) a = t - x; return a; };
const pulse8 = (t: number) => Math.exp(-since(EV.pulses, t) / 0.08);
const chatterAmt = (t: number) => (t >= EV.chatter[0] && t < EV.chatter[EV.chatter.length - 1] + 0.2 ? Math.exp(-since(EV.chatter, t) / 0.1) : 0);

// ---------- waves ----------
const SPK_X = 1.4, EAR_X = 6.1;
const noiseY = (x: number, t: number) =>
  0.95 * (0.9 * Math.sin(1.6 * x - 40 * LW * t) + 0.45 * Math.sin(3.3 * x - 55 * LW * t + 1) + 0.25 * Math.sin(6.1 * x - 70 * LW * t + 2)) * (0.8 + 0.2 * pulse8(t));
const chatterY = (x: number, t: number) => 0.4 * chatterAmt(t) * Math.sin(12 * x - 300 * LW * t);
const WaveBlocks: React.FC<{ pts: V3[]; color: string; size?: number }> = ({ pts, color, size = 0.13 }) => {
  const mesh = useMemo(() => new THREE.InstancedMesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color }), 220), [color, size]);
  const o = new THREE.Object3D();
  pts.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
  mesh.count = pts.length; mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------- the cut-away ear cup ----------
const Cup: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const anc = ancAt(t);
  const flipFlash = Math.exp(-since(EV.flips, t) / 0.12) * (t < bt(8.2) ? 1 : 0);
  const mic = pulse8(t) * (1 - 0.2 * anc);
  const noise: V3[] = [], anti: V3[] = [], heard: V3[] = [];
  for (let x = -13; x <= EAR_X; x += 0.12) {
    const n = noiseY(x, t) + chatterY(x, t);
    noise.push([x, n, 0]);
    if (x >= SPK_X) {
      const a = -noiseY(x, t) * anc - 0.3 * chatterY(x, t) * anc;
      anti.push([x, a, 0.25]);
      heard.push([x, -2.1 + 0.6 * (n + a), 0.1]);
    }
  }
  return (
    <group>
      {/* shell: back wall, top and bottom */}
      <mesh position={[-2.3, 0, -0.3]}><boxGeometry args={[0.6, 7.6, 2.6]} /><meshToonMaterial color="#343d66" /></mesh>
      <mesh position={[1.2, 3.6, -0.3]}><boxGeometry args={[7.6, 0.5, 2.6]} /><meshToonMaterial color="#343d66" /></mesh>
      <mesh position={[1.2, -3.6, -0.3]}><boxGeometry args={[7.6, 0.5, 2.6]} /><meshToonMaterial color="#343d66" /></mesh>
      {[3.0, -3.0].map((y) => <mesh key={y} position={[5.2, y, -0.3]}><boxGeometry args={[0.9, 1.4, 2.6]} /><meshToonMaterial color="#c96a7a" /></mesh>)}
      {/* the ear */}
      <mesh position={[EAR_X + 1.0, 0, -0.6]} scale={[0.6, 1.9, 1]}><sphereGeometry args={[1.2, 16, 12]} /><meshToonMaterial color="#ff9ab0" /></mesh>
      {/* mic, wire, chip, speaker */}
      <mesh position={[-2.95, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.22, 0.5, 4, 8]} /><meshToonMaterial color="#b9bccb" /></mesh>
      <mesh position={[-1.6, 2.35, 0]}><boxGeometry args={[1.6, 0.08, 0.08]} /><meshBasicMaterial color="#7a7a8a" /></mesh>
      <mesh position={[-0.3, 2.4, 0]}><boxGeometry args={[1.6, 0.9, 0.25]} /><meshToonMaterial color="#1f8a3a" /></mesh>
      <mesh position={[-0.3, 2.4, 0.15]}><boxGeometry args={[0.6, 0.45, 0.1]} /><meshToonMaterial color="#2a2a33" /></mesh>
      <mesh position={[0.6, 1.2, 0]}><boxGeometry args={[0.08, 2.2, 0.08]} /><meshBasicMaterial color="#7a7a8a" /></mesh>
      <mesh position={[SPK_X - 0.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[1.3, 0.35, 0.9, 20, 1, true]} /><meshToonMaterial color="#4a4a58" side={THREE.DoubleSide} /></mesh>
      <mesh position={[SPK_X - 0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.5, 0.4, 16]} /><meshToonMaterial color="#2a2a33" /></mesh>
      {/* the ANC switch */}
      <group position={[3.4, 4.6, 0]}>
        <mesh><boxGeometry args={[2.0, 0.8, 0.5]} /><meshToonMaterial color="#232a4d" /></mesh>
        <mesh position={[-0.5 + anc, 0, 0.3]}><boxGeometry args={[0.85, 0.65, 0.3]} /><meshBasicMaterial color={anc > 0.5 ? BLUE : RED} /></mesh>
      </group>
      <WaveBlocks pts={noise} color={RED} />
      {anc > 0.01 && <WaveBlocks pts={anti} color={BLUE} />}
      <WaveBlocks pts={heard} color={WHITE} size={0.12} />
      <Glow map={map} at={[-3.0, 2.3, 0.4]} size={0.6 + 1.2 * mic} color={RED} opacity={0.4 + 0.6 * mic} />
      <Glow map={map} at={[-0.3, 2.4, 0.5]} size={0.6 + 2.2 * flipFlash} color={BLUE} opacity={0.3 + 0.7 * flipFlash} />
      <Glow map={map} at={[3.4 - 0.5 + anc, 4.6, 0.6]} size={1.4} color={anc > 0.5 ? BLUE : RED} opacity={0.6} />
    </group>
  );
};

// ---------- outside: headphones and a jet engine ----------
const Outside: React.FC<{ t: number; map: THREE.Texture }> = ({ t, map }) => {
  const anc = ancAt(t);
  return (
    <group>
      <group position={[2.5, 0, 0]}>
        <mesh position={[0, 0.4, 0]}><torusGeometry args={[3, 0.35, 8, 28, Math.PI]} /><meshToonMaterial color="#2a2a33" /></mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 3, -0.9, 0]} rotation={[0, s * Math.PI / 2, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.4, 1.4, 1.0, 24]} /><meshToonMaterial color="#343d66" /></mesh>
            <mesh position={[0, 0, -0.55]}><torusGeometry args={[1.15, 0.35, 8, 20]} /><meshToonMaterial color="#4a4a58" /></mesh>
            <mesh position={[0, 0, 0.52]}><torusGeometry args={[1.0, 0.1, 6, 20]} /><meshBasicMaterial color={anc > 0.5 ? BLUE : "#7a7a8a"} /></mesh>
          </group>
        ))}
        <Glow map={map} at={[3.6, -0.9, 0.6]} size={1.2} color={anc > 0.5 ? BLUE : RED} opacity={0.8} />
      </group>
      <group position={[-9, -1.5, -3]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[2.4, 2.8, 5, 24, 1, true]} /><meshToonMaterial color="#b9bccb" side={THREE.DoubleSide} /></mesh>
        <group position={[2.4, 0, 0]} rotation={[24 * LW * t, 0, 0]}>
          {Array.from({ length: 12 }, (_, i) => <mesh key={i} rotation={[(i / 12) * Math.PI * 2, 0, 0]} position={[0, 0, 0]}><boxGeometry args={[0.15, 4.4, 0.5]} /><meshToonMaterial color="#7a7a8a" /></mesh>)}
          <mesh rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.7, 1.0, 12]} /><meshToonMaterial color="#e8eaf2" /></mesh>
        </group>
      </group>
      {/* sound rings rolling from the engine to the headphones; with ANC on they stop at the ear cup */}
      {Array.from({ length: 7 }, (_, k) => {
        const u = ((t / (BEAT * 2) + k / 7) % 1);
        const x = -6 + u * 13;
        if (anc > 0.5 && x > 4.5) return null;
        return <mesh key={k} position={[x, -1.2, -1.5]} rotation={[0, Math.PI / 2, 0]} scale={1 + u * 1.6}><torusGeometry args={[1.4, 0.08, 4, 24]} /><meshBasicMaterial color={RED} transparent opacity={1 - u * 0.6} /></mesh>;
      })}
    </group>
  );
};

// ---------- camera ----------
const OUT_HOME = { p: [-1, 1.5, 24] as V3, l: [-1, -0.5, 0] as V3 };
const OUT_CAM: CamKey[] = [
  { t: 0, ...OUT_HOME }, { t: 1.4, ...OUT_HOME },
  { t: bt(3), p: [-2, 0.8, 20], l: [-1.5, -0.6, 0] },
  { t: bt(4), p: [3, 0, 12], l: [5, -0.9, 0] },
  { t: bt(24), p: [1, 0.8, 16], l: [1.5, -0.6, 0] },
  { t: 46.4, ...OUT_HOME }, { t: 48, ...OUT_HOME },
];
const IN_CAM: CamKey[] = [
  { t: bt(4), p: [-4.5, 1.6, 13], l: [-3.5, 1.2, 0] },     // the mic
  { t: bt(6), p: [-1.2, 2.2, 10.5], l: [-0.6, 1.6, 0] },   // the chip
  { t: bt(8), p: [3, 0.8, 13], l: [3, 0.2, 0] },           // speaker → ear
  { t: bt(10), p: [0, 0.2, 24], l: [-0.5, 0.2, 0] },       // silence
  { t: bt(12), p: [1.8, 0.8, 20], l: [2, 0.8, 0] },        // ON / OFF
  { t: bt(16), p: [-0.5, 1.6, 15], l: [-0.3, 1.4, 0] },
  { t: bt(18), p: [-4.5, 0.6, 19], l: [-4, 0, 0] },        // low hums
  { t: bt(20), p: [4, 0.4, 14], l: [4.5, -0.4, 0] },       // voices slip through
  { t: bt(22), p: [0, 0, 24], l: [0.5, -0.3, 0] },
  { t: bt(24), p: [0, 0, 26], l: [0.5, 0, 0] },
];
const sceneAt = (t: number) => (t < bt(4) || t >= bt(24) ? "out" : "in");
const flashAt = (t: number) => Math.max(...[bt(4), bt(24)].map((s) => Math.exp(-(((t - s) / 0.13) ** 2))));

// ---------- labels ----------
const HOOK = [[{ t: "HOW DO" }], [{ t: "NOISE-CANCELLING", c: BLUE }], [{ t: "HEADPHONES WORK? 🎧" }]];
const LABELS: LabelDef[] = [
  { from: 0, to: bt(2), anchor: [1, 4.6, 0], border: BLUE, lines: HOOK, hold: true },
  { from: bt(2), to: bt(4), anchor: [-2.5, 2.2, -1.5], border: RED, lines: [[{ t: "NOISE IS" }], [{ t: "A WAVE", c: RED }]] },
  { from: bt(4), to: bt(6), anchor: [-3.0, 3.1, 0], border: RED, lines: [[{ t: "1. A MIC" }], [{ t: "HEARS IT", c: RED }]] },
  { from: bt(6), to: bt(8), anchor: [-0.3, 3.2, 0], border: BLUE, lines: [[{ t: "2. A CHIP" }], [{ t: "FLIPS IT", c: BLUE }], [{ t: "UPSIDE DOWN" }]] },
  { from: bt(8), to: bt(10), anchor: [SPK_X + 1, 1.8, 0], border: BLUE, lines: [[{ t: "3. THE SPEAKER" }], [{ t: "PLAYS THE" }], [{ t: "ANTI-NOISE", c: BLUE }]] },
  { from: bt(10), to: bt(12), anchor: [3.6, 1.6, 0], border: WHITE, lines: [[{ t: "PEAK", c: RED }, { t: " + " }, { t: "VALLEY", c: BLUE }], [{ t: "= SILENCE" }]] },
  { from: bt(12), to: bt(13), anchor: [3.4, 5.3, 0], border: RED, lines: [[{ t: "ANC" }], [{ t: "OFF", c: RED }]] },
  { from: bt(13), to: bt(14), anchor: [3.4, 5.3, 0], border: BLUE, lines: [[{ t: "ANC" }], [{ t: "ON", c: BLUE }]] },
  { from: bt(14), to: bt(15), anchor: [3.4, 5.3, 0], border: RED, lines: [[{ t: "ANC" }], [{ t: "OFF", c: RED }]] },
  { from: bt(15), to: bt(16), anchor: [3.4, 5.3, 0], border: BLUE, lines: [[{ t: "ANC" }], [{ t: "ON", c: BLUE }]] },
  { from: bt(16), to: bt(18), anchor: [-0.3, 3.2, 0], border: BLUE, lines: [[{ t: "IT RECALCULATES" }], [{ t: "THOUSANDS", c: BLUE }], [{ t: "OF TIMES A SECOND" }]] },
  { from: bt(18), to: bt(20), anchor: [-5.5, 1.6, 0], border: RED, lines: [[{ t: "BEST ON" }], [{ t: "LOW HUMS", c: RED }], [{ t: "ENGINES · TRAINS" }]] },
  { from: bt(20), to: bt(22), anchor: [4.4, 1.6, 0], border: "#ffd23f", lines: [[{ t: "VOICES & CLICKS" }], [{ t: "SLIP THROUGH", c: "#ffd23f" }], [{ t: "THE PADS HELP" }]] },
  { from: bt(22), to: bt(24), anchor: [3.6, -0.9, 0], border: BLUE, lines: [[{ t: "SO YOU HEAR" }], [{ t: "JUST THE MUSIC", c: BLUE }]] },
  { from: bt(24), to: bt(25), anchor: [1.5, 4.0, 0], border: "#ffd23f", lines: [[{ t: "NOW YOU KNOW." }], [{ t: "@HOWTOWITHZAY", c: "#ffd23f" }]] },
  { from: bt(25), to: 48.01, anchor: [1, 4.6, 0], border: BLUE, lines: HOOK, hold: true },
];

export const AncVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const sc = sceneAt(t);
  const cam = sc === "out" ? camAt(OUT_CAM, t) : camAt(IN_CAM, t);
  const anc = ancAt(t);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/11-anc/music.wav")} />
      <PixelArtCanvas bg={BG} fov={42} palette={ANC_PALETTE} outlineColor="#06070d">
        <CamOn p={cam.p} l={cam.l} />
        <ambientLight intensity={0.6} color="#b9bccb" />
        <directionalLight position={[-8, 12, 14]} intensity={1.6} />
        <directionalLight position={[9, -4, -6]} intensity={0.6} color={BLUE} />
        {sc === "out" ? <Outside t={t} map={map} /> : <Cup t={t} map={map} />}
      </PixelArtCanvas>
      <AbsoluteFill style={{ background: "#e8eaf2", opacity: Math.round(flashAt(t) * 3) / 3 }} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 22, color: anc > 0.5 ? BLUE : RED, textShadow: "4px 4px 0 #06070d, -4px 0 0 #06070d, 0 -4px 0 #06070d" }}>{anc > 0.5 ? "● ANC ON" : "○ ANC OFF"}</div>
      <Labels t={t} cam={cam} labels={LABELS} />
    </AbsoluteFill>
  );
};
const CamOn: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };
