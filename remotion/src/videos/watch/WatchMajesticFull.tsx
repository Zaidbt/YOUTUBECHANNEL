/**
 * Video 003 · How does a watch tick? — majestic cinematic pixel-3D, 48 s @ 60 fps.
 * Story: real speed → slow down → mainspring → gears → pallet fork → balance → hairspring → every swing = a tick
 *        → back to real speed → big numbers → pull back while the dial appears → TICK. TOCK.
 * Timing + music: videos/03-watch-majestic/build.py (majestic.json).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import TL from "./majestic.json";
import { MovementScene, POS, annulus, cylZ } from "./Watch3D";
import { glowTexture, Glow } from "./CinematicPreview";
import { camAt, CamRig, CamKey, PixelLayer, GlowLayer, Captions, Vignette } from "../teasers/Majestic";
// Captions fade in from cue.t; the loop hook is drawn separately so it is fully visible on frame 0.
import { rnd } from "../../brand/pixels";

export const FPS = 60;
export const DURATION = Math.round(TL.duration * FPS); // 2880
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const window01 = (t: number, a: number, b: number, fade = 0.8) => Math.min(ease((t - a) / fade), ease((b - t) / fade));

// ---------- escapement from the tick counter ----------
const tcAt = (t: number) => {
  const x = Math.max(0, Math.min(TL.tc.length - 1.001, t * TL.rate)), i = Math.floor(x);
  return TL.tc[i] + (TL.tc[i + 1] - TL.tc[i]) * (x - i);
};
function angles(t: number) {
  const tc = tcAt(t), n = Math.floor(tc + 1e-6), f = tc - n;
  return { balanceA: 2.3 * Math.sin(Math.PI * tc), escA: -(Math.PI * 2) / 30 * (n + easeOut(f / 0.2)), forkA: 0.12 * (n % 2 === 0 ? 1 : -1) * (2 * easeOut(f / 0.14) - 1) };
}
/** Second hand sweeps 8 steps/s; mapped so that t=48 lands exactly where t=0 started (one extra full turn). */
const secondHand = (t: number) => (2 * Math.PI * Math.floor((t < 24 ? t : t - 48 + 60) * 8)) / 480;
const lastTick = (t: number) => { let k = -1; for (let i = 0; i < TL.ticks.length && TL.ticks[i] <= t + 1e-6; i++) k = i; return k; };

// ---------- camera: one continuous move ----------
const HOME: Omit<CamKey, "t"> = { p: [0, -7, 50], l: [0, 0, 0.5] }; // first frame == last frame (seamless loop)
const CAM: CamKey[] = [
  { t: 0, ...HOME },
  { t: 1.2, ...HOME },
  { t: 4, p: [0.3, -9, 25], l: [0.3, 0, 0] },
  { t: 7, p: [1.5, -9, 20], l: [1.2, -1.2, 0] },
  { t: 10, p: [5.6, -10.5, 13], l: [4.2, -4.8, 0.3] },      // mainspring barrel
  { t: 14, p: [-0.8, -12, 14], l: [-1.2, -4.4, 0.3] },      // gear train -> escape wheel
  { t: 18, p: [-3.2, -8.2, 10], l: [-1.9, -2.2, 0.6] },     // pallet fork
  { t: 22, p: [1.4, -4.2, 12], l: [2.2, 3.4, 1.0] },        // balance wheel
  { t: 26, p: [2.3, 0.4, 8.8], l: [2.2, 4.0, 1.1] },        // hairspring, close & top-down
  { t: 30, p: [0.6, -8.5, 21], l: [0.4, 0.2, 0.2] },        // every swing = a tick
  { t: 34, p: [0.3, -9.5, 24], l: [0.3, 0, 0] },
  { t: 38, p: [0.2, -11, 31], l: [0.2, 0, 0] },
  { t: 42, p: [0.1, -10, 44], l: [0, 0, 0.5] },             // pull back: the dial appears
  { t: 45.5, ...HOME },
  { t: 48, ...HOME },
];

// ---------- the watch's outside (fades in over the movement at the end) ----------
const Exterior: React.FC<{ dial: number; t: number; occ?: boolean }> = ({ dial, t, occ }) => {
  const g = useMemo(() => ({ caseRing: annulus(9.6, 8.6, 2.6), bezel: new THREE.TorusGeometry(9.05, 0.55, 16, 96), dial: cylZ(8.6, 0.12, 96), crown: new THREE.CylinderGeometry(0.9, 0.9, 1.3, 20).rotateZ(Math.PI / 2) }), []);
  const metal = occ ? <meshBasicMaterial color="#000" /> : <meshStandardMaterial color="#b8873a" metalness={0.45} roughness={0.35} />;
  const fade = { transparent: true, opacity: dial, depthWrite: dial > 0.98 };
  const sec = secondHand(t);
  const hand = (theta: number, len: number, w: number, z: number, color: string, tail = 0) => (
    <mesh position={[Math.sin(theta) * (len / 2 - tail), Math.cos(theta) * (len / 2 - tail), z]} rotation={[0, 0, -theta]}>
      <boxGeometry args={[w, len, 0.1]} />{occ ? <meshBasicMaterial color="#000" /> : <meshStandardMaterial color={color} {...fade} />}
    </mesh>
  );
  return (
    <group>
      <mesh geometry={g.caseRing} position={[0, 0, -0.9]}>{metal}</mesh>
      <mesh geometry={g.bezel} position={[0, 0, 1.75]}>{metal}</mesh>
      <mesh geometry={g.crown} position={[10.2, 0, 0.4]}>{metal}</mesh>
      {dial > 0.01 && !occ && (
        <group>
          <mesh geometry={g.dial} position={[0, 0, 1.78]}><meshStandardMaterial color="#efe4cf" roughness={0.6} {...fade} /></mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <mesh key={i} position={[Math.sin(a) * 7.1, Math.cos(a) * 7.1, 1.88]} rotation={[0, 0, -a]}><boxGeometry args={[i % 3 ? 0.3 : 0.55, i % 3 ? 0.9 : 1.5, 0.1]} /><meshStandardMaterial color="#2a1d10" {...fade} /></mesh>;
          })}
          {hand(((10 + 10 / 60) / 12) * Math.PI * 2, 4.4, 0.55, 1.96, "#2a1d10")}
          {hand((10 / 60) * Math.PI * 2, 6.6, 0.4, 2.04, "#2a1d10")}
          {hand(sec, 8.0, 0.14, 2.12, "#d4243e", 1.6)}
        </group>
      )}
    </group>
  );
};

// ---------- glows ----------
const Trail: React.FC<{ map: THREE.Texture; t: number; k: number }> = ({ map, t, k }) => {
  const c = POS.balance;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const a = 0.6 + angles(Math.max(0, t - i * 0.02)).balanceA;
        return <Glow key={i} map={map} at={[c.x + Math.cos(a) * 2.95, c.y + Math.sin(a) * 2.95, c.z + 0.45]} size={(i === 0 ? 1.9 : 1.2) * (1 - i / 16)} color={i === 0 ? "#fff1c8" : "#ffb347"} opacity={(1 - i / 14) * 0.85 * k} />;
      })}
    </>
  );
};
/** Energy pulse travelling barrel -> fourth wheel -> escape wheel after every tick (mainspring/gears chapters). */
const EnergyPulse: React.FC<{ map: THREE.Texture; since: number; k: number }> = ({ map, since, k }) => {
  const path = [POS.barrel, POS.fourth, POS.escape];
  const u = Math.min(1, since / 0.45);
  const seg = u < 0.5 ? 0 : 1, f = u < 0.5 ? u * 2 : (u - 0.5) * 2;
  const a = path[seg], b = path[seg + 1];
  const at: [number, number, number] = [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 1.0];
  const o = k * (1 - Math.max(0, (since - 0.45) / 0.15));
  return o > 0 ? (<><Glow map={map} at={at} size={2.6} color="#ffb347" opacity={0.7 * o} /><Glow map={map} at={at} size={0.9} color="#fff4d6" opacity={o} /></>) : null;
};

/** Opening hook. Fully visible on frame 0 and settled again on the last frame, so the loop is invisible. */
const Hook: React.FC<{ o: number }> = ({ o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#f6e7c8", opacity: o, textShadow: "0 0 26px rgba(255,160,70,0.5), 4px 4px 0 rgba(0,0,0,0.85)", lineHeight: 1.6 }}>
    <div style={{ fontSize: 30 }}>HOW DOES A</div>
    <div style={{ fontSize: 64, lineHeight: 1.35 }}>WATCH TICK?</div>
    <div style={{ fontSize: 30 }}>🎧</div>
  </div>
);

export const WatchMajesticFull: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const cam = camAt(CAM, t);
  const ang = angles(t);
  const k = lastTick(t);
  const since = k >= 0 ? t - TL.ticks[k] : 9;
  const tg = Math.exp(-since * 6);
  const dial = t < 24 ? 1 - ease((t - 1.5) / 2.5) : ease((t - 39) / 3.5);
  // chapter spotlights
  const spring = window01(t, 8, 12), gears = window01(t, 12, 16), fork = window01(t, 16, 20), bal = window01(t, 20, 28), hair = window01(t, 24, 28);
  const jewels: [number, number, number, number][] = [
    [POS.balance.x, POS.balance.y, 1.4, 0.4], [POS.fork.x, POS.fork.y, 1.0, 0.5], [POS.escape.x, POS.escape.y, 0.7, 0.5], [POS.fourth.x, POS.fourth.y, 0.3, 0.3], [POS.barrel.x, POS.barrel.y, 0.7, 0.3],
    [POS.fork.x - 3.6, POS.fork.y - 2.1, 0.9, 1 + fork], [POS.fork.x - 0.8, POS.fork.y - 2.5, 0.9, 1 + fork],
  ];
  const tag = t < 6 || t >= 34 ? "▶ REAL SPEED" : t < 8 ? "❚❚ SLOWING..." : t < 32 ? "❚❚ SLOW-MO 1/4" : "❚❚ SLOW-MO 1/2";
  const inside = 1 - dial;
  return (
    <AbsoluteFill style={{ background: "#090503" }}>
      <Audio src={staticFile("videos/03-watch-majestic/music.wav")} />
      <PixelLayer bg="#090503" fov={40}>
        <CamRig {...cam} />
        <hemisphereLight args={["#ffd9a0", "#1a0e05", 0.8 + 0.25 * dial]} />
        <directionalLight position={[-8, 14, 16]} intensity={2.3 + 0.6 * dial} color="#ffcf8a" />
        <directionalLight position={[10, -6, 5]} intensity={0.8} color="#ff7a2a" />
        <pointLight position={[POS.fork.x - 2, POS.fork.y - 2, 4]} intensity={(15 + 120 * tg) * inside} distance={12} color="#ff8a3c" />
        <pointLight position={[POS.balance.x, POS.balance.y, 3]} intensity={60 * hair} distance={8} color="#6f8cff" />
        <MovementScene look="cinema" tilt={0} {...ang} />
        <Exterior dial={dial} t={t} />
      </PixelLayer>
      <GlowLayer fov={40}>
        <CamRig {...cam} />
        <Exterior dial={0} t={t} occ />
        <group visible={inside > 0.02}>
          {jewels.map(([x, y, z, w], i) => <Glow key={i} map={map} at={[x, y, z]} size={1.0 + 1.6 * w * tg} color="#ff2d55" opacity={(0.35 + 0.5 * Math.min(1, w) * tg) * inside} />)}
          <Trail map={map} t={t} k={(0.55 + 0.45 * bal) * inside} />
          <EnergyPulse map={map} since={since} k={Math.max(spring, gears)} />
          {/* chapter halos */}
          <Glow map={map} at={[POS.barrel.x, POS.barrel.y, 0.8]} size={9} color="#ff9a3c" opacity={0.22 * spring} />
          <Glow map={map} at={[POS.escape.x, POS.escape.y, 0.8]} size={8} color="#ff9a3c" opacity={0.2 * gears} />
          <Glow map={map} at={[POS.fork.x - 2, POS.fork.y - 2, 1]} size={7} color="#ff6a3c" opacity={0.2 * fork} />
          <Glow map={map} at={[POS.balance.x, POS.balance.y, 1.2]} size={5 + 2 * Math.abs(Math.sin(ang.balanceA))} color="#6f8cff" opacity={0.35 * hair} />
        </group>
        <Glow map={map} at={[-6, 9, -2]} size={30} color="#ff9a3c" opacity={0.16} />
        {Array.from({ length: 60 }, (_, i) => (
          <Glow key={`d${i}`} map={map} at={[(rnd(i) - 0.5) * 26 + 0.4 * Math.sin(t * 0.3 + i), (rnd(i + 40) - 0.5) * 26 + 0.3 * Math.cos(t * 0.25 + i), 2 + rnd(i + 80) * 12]} size={0.12 + rnd(i + 9) * 0.24} color="#ffd9a0" opacity={0.22 + 0.4 * rnd(i + 3)} />
        ))}
        {/* second-hand tip glow once the dial is in */}
        {dial > 0.3 && (() => { const a = secondHand(t); return <Glow map={map} at={[Math.sin(a) * 6.3, Math.cos(a) * 6.3, 2.2]} size={1.4} color="#ff3355" opacity={0.6 * dial} />; })()}
      </GlowLayer>
      <Vignette s={0.82} />
      <div style={{ position: "absolute", left: 50, top: 70, fontFamily: "PressStart2P", fontSize: 22, color: "#f6e7c8", opacity: 0.85, textShadow: "3px 3px 0 #000" }}>{tag}</div>
      <Captions t={t} end={48} color="#f6e7c8" glow="rgba(255,160,70,0.5)" cues={[
        { t: 2.2, a: "LISTEN...", b: "8 TICKS", c: "EVERY SECOND" },
        { t: 6, a: "LET'S", b: "SLOW IT", c: "DOWN" },
        { t: 8, a: "IT STARTS WITH", b: "A SPRING", c: "WOUND TIGHT" },
        { t: 10, a: "ITS PUSH FLOWS", b: "THROUGH", c: "THE GEARS" },
        { t: 12, a: "THE GEARS WANT TO", b: "RACE", c: "AWAY..." },
        { t: 14, a: "BUT SOMETHING", b: "HOLDS", c: "THEM BACK" },
        { t: 16, a: "A FORK", b: "LOCKS", c: "THE WHEEL" },
        { t: 18, a: "THEN LETS IT SLIP", b: "HALF", c: "A TOOTH AT A TIME" },
        { t: 20, a: "A WHEEL", b: "SWINGS", c: "BACK AND FORTH" },
        { t: 22, a: "EACH SWING", b: "KICKS", c: "THE FORK" },
        { t: 24, a: "A HAIR-THIN SPRING", b: "PULLS", c: "IT BACK" },
        { t: 26, a: "SO EVERY SWING TAKES", b: "THE SAME", c: "TIME" },
        { t: 28, a: "EVERY SWING", b: "ONE TICK" },
        { t: 30, b: "TICK... TOCK..." },
        { t: 32, a: "NOW", b: "FASTER" },
        { t: 34, a: "REAL SPEED", b: "8 TICKS", c: "EVERY SECOND" },
        { t: 36, a: "THAT'S", b: "691,200", c: "TICKS A DAY" },
        { t: 38, a: "OVER", b: "250 MILLION", c: "A YEAR" },
        { t: 40, a: "ALL FROM ONE", b: "TINY", c: "SPRING" },
        { t: 42, a: "RIGHT THERE", b: "ON YOUR", c: "WRIST" },
        { t: 44, b: "TICK. TOCK." },
        { t: 46, b: "" },
      ]} />
      <Hook o={t < 2.2 ? ease((2.2 - t) / 0.35) : ease((t - 46.2) / 0.6)} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, textAlign: "center", fontFamily: "PressStart2P", color: "#f6e7c8", opacity: Math.min(ease((t - 44.2) / 0.6), ease((45.9 - t) / 0.5)), textShadow: "4px 4px 0 #000" }}>
        <div style={{ fontSize: 30 }}>HOW IT WORKS</div>
        <div style={{ fontSize: 22, marginTop: 20, opacity: 0.7 }}>WITH ZAY</div>
      </div>
    </AbsoluteFill>
  );
};
