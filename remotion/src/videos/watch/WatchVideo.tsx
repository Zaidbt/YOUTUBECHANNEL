/**
 * Video 002 · How does a watch tick?  (How It Works with Zay)
 * 32 s seamless loop · 120 BPM · every tick on screen is a tick in the music.
 *
 *  0-4 s   OUTSIDE: 3D candy watch, hook; camera dives in, dial turns see-through
 *  4-8 s   INSIDE 3D at real speed, then "slowing": camera flies to the escapement, image dissolves into pixels
 *  8-20 s  2D BLUEPRINT slow-mo (Blueprint Arcade), ticks = kick/snare
 *  20-28 s pixels sharpen back to 3D real speed, big numbers, zoom out
 *  28-32 s OUTSIDE again = frame 0 (loop)
 * Timing comes from timeline.json, written by videos/02-watch/build.py together with the music.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import TL from "./timeline.json";
import { MovementScene, annulus, cylZ } from "./Watch3D";
import { Movement, BAL, FORK, ESC, FOURTH, BARREL, CANDY_PAL } from "./Movement";
import { P, Balloon, Cogsy } from "../../brand/ui";
import { Pixels, ring, rect } from "../../brand/pixels";

export const FPS = 30;
export const DURATION = Math.round(TL.duration * FPS); // 960
const BAR = TL.bar; // 2 s

// ---------- timeline ----------
const tcAt = (t: number) => {
  const x = Math.max(0, Math.min(TL.tc.length - 1.001, t * TL.rate));
  const i = Math.floor(x);
  return TL.tc[i] + (TL.tc[i + 1] - TL.tc[i]) * (x - i);
};
const lastTick = (t: number) => {
  let k = -1;
  for (let i = 0; i < TL.ticks.length && TL.ticks[i] <= t + 1e-6; i++) k = i;
  return k;
};
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Escapement angles from the tick counter (one tick = half a balance swing = half an escape tooth). */
function angles(t: number, amp: number) {
  const tc = tcAt(t);
  const n = Math.floor(tc + 1e-6), f = tc - n;
  const balanceA = amp * Math.sin(Math.PI * tc);
  const escA = -(Math.PI * 2) / 30 * (n + easeOut(f / 0.18));
  const side = n % 2 === 0 ? 1 : -1;
  const forkA = 0.12 * side * (2 * easeOut(f / 0.12) - 1);
  return { balanceA, escA, forkA };
}

// ---------- camera path ----------
type KF = { t: number; dist: number; tilt: number; f: [number, number, number] };
const OUT: Omit<KF, "t"> = { dist: 50, tilt: -0.25, f: [0, 0, 0] };
const IN: Omit<KF, "t"> = { dist: 41, tilt: -0.62, f: [0, -0.5, 0] };
const ESCAPE: Omit<KF, "t"> = { dist: 12, tilt: -0.45, f: [-0.6, -1.2, 0.7] };
const KFS: KF[] = [
  { t: 0, ...OUT }, { t: 2, ...OUT }, { t: 4, ...IN }, { t: 6, ...IN }, { t: 8, ...ESCAPE },
  { t: 20, ...ESCAPE }, { t: 23, ...IN }, { t: 26, ...IN }, { t: 28, ...OUT }, { t: 32, ...OUT },
];
function camera(t: number) {
  let i = 0;
  while (i < KFS.length - 2 && KFS[i + 1].t <= t) i++;
  const a = KFS[i], b = KFS[i + 1];
  const k = ease((t - a.t) / (b.t - a.t));
  return { dist: lerp(a.dist, b.dist, k), tilt: lerp(a.tilt, b.tilt, k), f: a.f.map((v, j) => lerp(v, b.f[j], k)) as [number, number, number] };
}
const dialOpacity = (t: number) => (t < 2.6 ? 1 : t < 3.6 ? 1 - ease((t - 2.6) / 1) : t < 26.6 ? 0 : t < 27.6 ? ease((t - 26.6) / 1) : 1);
// "bit-crush": the 3D image gets chunkier in 8-bit steps on every 8th note, cuts to 2D pixels on the kick, then back
const CRUSH = [2, 3, 4, 6, 8, 12];
const pixelSize = (t: number) => {
  if (t >= 6.5 && t < 8) return CRUSH[Math.min(5, Math.floor((t - 6.5) / 0.25))];
  if (t >= 20 && t < 21.5) return CRUSH[5 - Math.min(5, Math.floor((t - 20) / 0.25))];
  return 1;
};
const handTime = (t: number) => (t < 16 ? t : t - 32 + 60);

// ---------- 3D: watch exterior ----------
const C3 = { case: "#ff5fa8", bezel: "#ffcf3f", dial: "#fff3e8", ink: "#1a1440", second: "#9be84a", strap: "#4fd2ff", crown: "#ffcf3f" };

const Exterior: React.FC<{ dial: number; ht: number }> = ({ dial, ht }) => {
  const g = useMemo(() => ({
    caseRing: annulus(9.6, 8.6, 2.6), back: cylZ(8.7, 0.2, 64), bezel: new THREE.TorusGeometry(9.05, 0.6, 16, 96), dial: cylZ(8.6, 0.12, 96),
    crown: new THREE.CylinderGeometry(0.9, 0.9, 1.3, 24).rotateZ(Math.PI / 2), strap: new THREE.BoxGeometry(8.6, 7, 0.9), hole: cylZ(0.28, 1.0, 12),
  }), []);
  const hidden = dial < 0.02;
  const mat = (color: string, extra = {}) => <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={1} clearcoatRoughness={0.15} {...extra} />;
  const fade = { transparent: true, opacity: dial, depthWrite: dial > 0.98 };
  const hand = (theta: number, len: number, w: number, z: number, color: string, tail = 0) => (
    <mesh position={[Math.sin(theta) * (len / 2 - tail), Math.cos(theta) * (len / 2 - tail), z]} rotation={[0, 0, -theta]}>
      <boxGeometry args={[w, len, 0.12]} />
      {mat(color, fade)}
    </mesh>
  );
  const sec = (2 * Math.PI * Math.floor(ht * 8)) / 480;
  return (
    <group>
      <mesh geometry={g.caseRing} position={[0, 0, -0.9]}>{mat(C3.case)}</mesh>
      <mesh geometry={g.back} position={[0, 0, -0.95]}>{mat(C3.case)}</mesh>
      <mesh geometry={g.bezel} position={[0, 0, 1.75]}>{mat(C3.bezel)}</mesh>
      <mesh geometry={g.crown} position={[10.2, 0, 0.4]}>{mat(C3.crown)}</mesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={g.strap} position={[0, s * 12.4, -0.2]}>{mat(C3.strap)}</mesh>
          <mesh geometry={g.strap} position={[0, s * 18.9, -1.3]} rotation={[s * 0.35, 0, 0]}>{mat(C3.strap)}</mesh>
          {s < 0 && [0, 1, 2].map((k) => <mesh key={k} geometry={g.hole} position={[0, -17 - k * 1.8, -0.75 - k * 0.6]} rotation={[-0.35, 0, 0]}>{mat(C3.ink)}</mesh>)}
        </group>
      ))}
      {!hidden && (
        <group>
          <mesh geometry={g.dial} position={[0, 0, 1.78]}>{mat(C3.dial, fade)}</mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6, big = i % 3 === 0;
            return (
              <mesh key={i} position={[Math.sin(a) * 7.0, Math.cos(a) * 7.0, 1.9]} rotation={[0, 0, -a]}>
                <boxGeometry args={[big ? 0.7 : 0.35, big ? 1.6 : 1.0, 0.15]} />
                {mat(big ? C3.case : C3.ink, fade)}
              </mesh>
            );
          })}
          {hand(((10 + 10 / 60) / 12) * Math.PI * 2, 4.4, 0.6, 1.98, C3.ink)}
          {hand((10 / 60) * Math.PI * 2, 6.6, 0.42, 2.06, C3.ink)}
          {hand(sec, 8.2, 0.16, 2.14, C3.second, 1.6)}
          <mesh position={[0, 0, 2.2]}><cylinderGeometry args={[0.45, 0.45, 0.2, 20]} />{mat(C3.case, fade)}</mesh>
        </group>
      )}
    </group>
  );
};

const Scene3D: React.FC<{ t: number }> = ({ t }) => {
  const px = pixelSize(t);
  const W = Math.round(1080 / px), H = Math.round(1920 / px);
  const cam = camera(t);
  const dial = dialOpacity(t);
  const inside = 1 - dial;
  const fp = new THREE.Vector3(...cam.f).applyEuler(new THREE.Euler(cam.tilt, 0, 0));
  const orbit = 0.14 * Math.sin((2 * Math.PI * (t - 4)) / 8) * inside;
  const bob = 0.07 * Math.sin((2 * Math.PI * t) / 4) * dial;
  const ang = angles(t, 2.3);
  return (
    <AbsoluteFill style={{ imageRendering: px > 1 ? "pixelated" : "auto" }}>
      <div style={{ width: W, height: H, transform: `scale(${1080 / W})`, transformOrigin: "top left" }}>
        <ThreeCanvas width={W} height={H} gl={{ alpha: true, antialias: px === 1 }} camera={{ fov: 46, position: [0, 0, 40], near: 0.1, far: 300 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[-8, 10, 14]} intensity={1.6} />
          <directionalLight position={[10, -6, 6]} intensity={0.6} color="#ffd7f0" />
          <group position={[-fp.x, -fp.y, 40 - cam.dist - fp.z]}>
            <group rotation={[cam.tilt, bob, orbit]}>
              <Exterior dial={dial} ht={handTime(t)} />
              <MovementScene look="toy" tilt={0} {...ang} />
            </group>
          </group>
        </ThreeCanvas>
      </div>
    </AbsoluteFill>
  );
};

// ---------- HTML overlays for the 3D parts ----------
const HSticker: React.FC<{ x?: number; y: number; bg: string; tilt?: number; pop?: number; lines: { t: string; s: number; c?: string }[] }> = ({ x = 540, y, bg, tilt = -3, pop = 1, lines }) => (
  <div style={{
    position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${pop})`, background: bg, color: "#0a0f24",
    fontFamily: "Bungee", padding: "26px 44px", borderRadius: 44, border: "8px solid #0a0f24", boxShadow: "16px 16px 0 #0a0f24",
    textAlign: "center", lineHeight: 1.12, whiteSpace: "nowrap",
  }}>
    {lines.map((l, i) => <div key={i} style={{ fontSize: l.s, color: l.c }}>{l.t}</div>)}
  </div>
);

const popIn = (t: number, start: number) => (t < start ? 0 : 1 + 0.18 * Math.exp(-(t - start) * 9) * Math.cos((t - start) * 22) - Math.exp(-(t - start) * 30) * 0.9);

const Hook: React.FC<{ pop: number; out?: number }> = ({ pop, out = 0 }) => (
  <div style={{ position: "absolute", inset: 0, transform: `translateY(${-out * 900}px)` }}>
    <HSticker y={330} bg="#ff4fa3" pop={pop} lines={[{ t: "HOW DOES A", s: 64 }, { t: "WATCH", s: 150 }, { t: "TICK?", s: 96 }]} />
    <HSticker y={600} x={600} bg="#ffd23f" tilt={2} pop={pop} lines={[{ t: "8 TICKS EVERY SECOND", s: 46 }]} />
  </div>
);

function caption3D(t: number): React.ReactNode {
  const b = t / BAR;
  if (b < 1) return <Hook pop={1} />;
  if (b < 1.25) return <Hook pop={1} out={ease((t - 2) / 0.5)} />;
  if (b < 2) return <HSticker y={300} bg="#59d8ff" pop={popIn(t, 2.5)} lines={[{ t: "LET'S LOOK", s: 70 }, { t: "INSIDE", s: 110 }]} />;
  if (b < 3) return <HSticker y={300} bg="#ffd23f" pop={popIn(t, 4)} lines={[{ t: "AT REAL SPEED", s: 54 }, { t: "IT'S A BLUR", s: 84 }]} />;
  if (b < 4) return <HSticker y={300} bg="#59d8ff" pop={popIn(t, 6)} tilt={2} lines={[{ t: "SLOWING", s: 96 }, { t: "DOWN...", s: 70 }]} />;
  if (b < 10) return null;
  if (b < 11) return <HSticker y={300} bg="#b8ff4a" pop={popIn(t, 20.3)} lines={[{ t: "BACK TO", s: 60 }, { t: "REAL SPEED", s: 90 }]} />;
  if (b < 12) return <HSticker y={300} bg="#ffd23f" pop={popIn(t, 22)} tilt={2} lines={[{ t: "THAT'S", s: 54 }, { t: "691,200", s: 130 }, { t: "TICKS A DAY", s: 60 }]} />;
  if (b < 13) return <HSticker y={300} bg="#ff4fa3" pop={popIn(t, 24)} lines={[{ t: "252 MILLION", s: 96 }, { t: "A YEAR", s: 70 }]} />;
  if (b < 14) return <HSticker y={300} bg="#59d8ff" pop={popIn(t, 26)} tilt={2} lines={[{ t: "ALL FROM ONE", s: 64 }, { t: "TINY SPRING", s: 90 }]} />;
  if (b < 15) return <HSticker y={330} bg="#ffffff" pop={popIn(t, 28)} lines={[{ t: "NOW YOU", s: 80 }, { t: "KNOW!", s: 140, c: "#ff4fa3" }]} />;
  return <Hook pop={popIn(t, 30)} />;
}

const speedLabel = (t: number): [string, string] => {
  if (t >= 6 && t < 8) return ["❚❚ SLOWING", "#59d8ff"];
  if (t >= 8 && t < 16) return ["❚❚ SLOW-MO 1/8", "#59d8ff"];
  if (t >= 16 && t < 18) return ["❚❚ SLOW-MO 1/4", "#59d8ff"];
  if (t >= 18 && t < 20) return ["❚❚ SLOW-MO 1/2", "#59d8ff"];
  return ["▶ REAL SPEED", "#b8ff4a"];
};
const SpeedTag: React.FC<{ t: number }> = ({ t }) => {
  const [label, c] = speedLabel(t);
  return (
    <div style={{ position: "absolute", left: 40, top: 40, fontFamily: "Bungee", fontSize: 34, color: "#0a0f24", background: c, border: "6px solid #0a0f24", borderRadius: 30, padding: "8px 26px", boxShadow: "8px 8px 0 #0a0f24" }}>
      {label}
    </div>
  );
};

const Badge: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 80, display: "flex", justifyContent: "center" }}>
    <div style={{ fontFamily: "Bungee", fontSize: 40, color: "#0a0f24", background: "#fff", border: "8px solid #0a0f24", borderRadius: 60, padding: "18px 40px", display: "flex", gap: 22, alignItems: "center", boxShadow: "10px 10px 0 #0a0f24" }}>
      <span>HOW IT WORKS</span>
      <span style={{ background: "#ff4fa3", padding: "6px 18px", borderRadius: 40, transform: "rotate(-4deg)", display: "inline-block" }}>with ZAY</span>
    </div>
  </div>
);

// ---------- 2D pixel slow-mo (same candy world, flattened into pixels) ----------
type Step = { title: string; l1?: string; hi?: { x: number; y: number; r: number }; balloon?: React.ReactNode; cogsy?: { mood: "happy" | "wow" | "point"; say?: string } };
function step2D(b: number): Step {
  if (b < 5) return { title: "THE MAINSPRING", l1: "A COILED SPRING STORES THE ENERGY", hi: { ...BARREL, r: BARREL.r + 5 },
    balloon: <Balloon n={1} x={160} y={262} to={[BARREL.x + 10, BARREL.y + 12]} label="MAINSPRING" side="left" c={P.yellow} />, cogsy: { mood: "point" } };
  if (b < 6) return { title: "THE GEARS", l1: "PASS THE PUSH TO THE ESCAPE WHEEL", hi: { ...ESC, r: ESC.r + 8 },
    balloon: <Balloon n={2} x={20} y={262} to={[ESC.x - 10, ESC.y + 16]} label="ESCAPE WHEEL" c={P.pink} /> };
  if (b < 7) return { title: "THE PALLET FORK", l1: "LOCKS IT... THEN LETS 1/2 A TOOTH SLIP", hi: { x: FORK.x - 12, y: FORK.y + 10, r: 22 },
    balloon: <Balloon n={3} x={20} y={136} to={[FORK.x - 10, FORK.y + 4]} label="PALLET FORK" c={P.lime} />, cogsy: { mood: "wow", say: "CLICK!" } };
  if (b < 8) return { title: "THE BALANCE WHEEL", l1: "SWINGS BACK + FORTH, FLICKING THE FORK", hi: { ...BAL, r: BAL.r + 6 },
    balloon: <Balloon n={4} x={160} y={86} to={[BAL.x + 18, BAL.y - 19]} label="BALANCE" side="left" c={P.cyan} /> };
  if (b < 9) return { title: "1 SWING = 1 TICK", l1: "THAT'S THE SOUND YOU HEAR!", cogsy: { mood: "happy", say: "TICK TOCK!" } };
  return { title: b < 9.5 ? "2X FASTER..." : "...AND AGAIN!" };
}

// 2D camera: starts zoomed on the escapement exactly where the 3D camera was, zooms out on the beat (and back in at the end)
const ZOOM_IN = { s: 3.1, x: 84, y: 180 }, ZOOM_OUT = { s: 1, x: 90, y: 160 };
function cam2D(t: number) {
  const k = t < 8.7 ? ease((t - 8) / 0.7) : t >= 19.3 ? 1 - ease((t - 19.3) / 0.7) : 1;
  return { s: lerp(ZOOM_IN.s, ZOOM_OUT.s, k), x: lerp(ZOOM_IN.x, ZOOM_OUT.x, k), y: lerp(ZOOM_IN.y, ZOOM_OUT.y, k) };
}

const GraphPaper: React.FC = () => {
  const px = [];
  for (let x = 0; x <= 180; x += 6) px.push(rect(x, 0, 1, 320, "#ffffff", x % 30 === 0 ? 0.55 : 0.28));
  for (let y = 0; y <= 320; y += 6) px.push(rect(0, y, 180, 1, "#ffffff", y % 30 === 0 ? 0.55 : 0.28));
  return <Pixels px={px} />;
};

const Scene2D: React.FC<{ t: number }> = ({ t }) => {
  const b = t / BAR;
  const st = step2D(b);
  const ang = angles(t, 1.25);
  const k = lastTick(t);
  const since = k >= 0 ? t - TL.ticks[k] : 9;
  const beatPulse = Math.exp(-since * 8);
  const showTickPop = b >= 4 && b < 9 && since < 0.45;
  const stepStart = Math.floor(b) * BAR;
  const c = cam2D(t);
  const zoomed = c.s > 1.05;
  const capPop = popIn(t, Math.max(stepStart, 8.6)) + (b >= 9 ? 0.04 * beatPulse : 0);
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 180 320" width={1080} height={1920} shapeRendering="crispEdges" style={{ position: "absolute" }}>
        <GraphPaper />
        <g transform={`translate(90 160) scale(${c.s}) translate(${-c.x} ${-c.y})`}>
          {st.hi && !zoomed && <Pixels px={ring(st.hi.x, st.hi.y, st.hi.r, P.pink, 2).map((p) => ({ ...p, o: 0.45 + 0.55 * beatPulse }))} />}
          {/* 2D is y-down, 3D is y-up: negate angles so everything turns the same way as in 3D */}
          <Movement balanceA={-ang.balanceA} escA={-ang.escA} forkA={-ang.forkA} pal={CANDY_PAL} />
          {!zoomed && st.balloon}
        </g>
        {st.cogsy && !zoomed && <Cogsy x={22} y={262} mood={st.cogsy.mood} say={st.cogsy.say} t={t} />}
      </svg>
      {!zoomed && (
        <HSticker y={300} bg={b >= 8 ? "#ffd23f" : "#59d8ff"} tilt={-2} pop={capPop}
          lines={[{ t: st.title, s: st.title.length > 15 ? 64 : 80 }, ...(st.l1 ? [{ t: st.l1, s: 28 }] : [])]} />
      )}
      {showTickPop && !zoomed && (
        <HSticker x={k % 2 ? 840 : 250} y={k % 2 ? 1180 : 900} bg={k % 2 ? "#ff4fa3" : "#ffd23f"} tilt={k % 2 ? 6 : -6} pop={0.6 + 0.6 * Math.exp(-since * 12)}
          lines={[{ t: k % 2 ? "TOCK!" : "TICK!", s: 72 }]} />
      )}
      {b >= 9 && Math.floor(t * 10) % 2 === 0 && <div style={{ position: "absolute", right: 50, top: 520, fontFamily: "Bungee", fontSize: 110, color: "#ff4fa3", WebkitTextStroke: "6px #0a0f24" }}>X2</div>}
    </AbsoluteFill>
  );
};

export const WatchVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const in2D = t >= 8 && t < 20; // hard cuts on the kick at 8 s and 20 s, hidden by the pixel-size match
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #fff6d8 0%, #ffc2dc 55%, #c9b6ff 100%)" }}>
      <Audio src={staticFile("videos/02-watch/music.wav")} />
      {in2D ? <Scene2D t={t} /> : <Scene3D t={t} />}
      {!in2D && caption3D(t)}
      <SpeedTag t={t} />
      <Badge />
    </AbsoluteFill>
  );
};
