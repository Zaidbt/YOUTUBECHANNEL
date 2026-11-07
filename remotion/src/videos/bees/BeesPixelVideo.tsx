/**
 * Video 006 (v2) · How do bees build perfect hexagons? — true pixel-art 3D, 48 s seamless loop @ 60 fps.
 * Same story, timing and music as BeesVideo.tsx (bees.json + videos/06-bees/build.py), rendered through the
 * palette-locked pixel pipeline: 270x480, 1-px outlines, Bayer dithering, flat cel shading; glows included.
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import DATA from "./bees.json";
import { PixelArtCanvas } from "../../brand/PixelPipeline";
import { glowTexture, Glow } from "../watch/CinematicPreview";
import { camAt } from "../teasers/Majestic";
import { rnd } from "../../brand/pixels";
import { Bee, Lights, useTextures } from "./BeesPixelPreview";
import { LW, cellState, CRAWLERS, crawlerPos, chainVis, crawlVis, CHAIN_X, chainBee, HERO, CAM, Diagram } from "./BeesVideo";

export const FPS = 60;
export const DURATION = Math.round(DATA.duration * FPS);
type V3 = [number, number, number];
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const R = DATA.R, TOP = DATA.top, D = 1.3, Z0 = -0.3, TILT = -0.22;
const BG = "#0b0604";

const Cam: React.FC<{ p: V3; l: V3 }> = ({ p, l }) => { const { camera } = useThree(); camera.position.set(...p); camera.lookAt(...l); camera.updateMatrixWorld(); return null; };

/** Toon-shaded comb whose cells grow, fill with honey and get capped over time. */
const Comb: React.FC<{ t: number }> = ({ t }) => {
  const x = useTextures();
  const m = useMemo(() => {
    const n = DATA.cells.length;
    const mat = (color: string, map?: THREE.Texture) => new THREE.MeshToonMaterial({ color, gradientMap: x.toon, map, side: THREE.DoubleSide });
    return {
      walls: new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, D, 6, 1, true).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, D / 2), mat("#d98a1f"), n),
      rims: new THREE.InstancedMesh(new THREE.TorusGeometry(R * 0.95, 0.07, 3, 6).rotateZ(Math.PI / 6), mat("#ffcf5a"), n),
      backs: new THREE.InstancedMesh(new THREE.CircleGeometry(R, 6).rotateZ(Math.PI / 6), mat("#8f4a14"), n),
      honey: new THREE.InstancedMesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, D * 0.85, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, D * 0.42), mat("#d98a1f"), n),
      caps: new THREE.InstancedMesh(new THREE.CircleGeometry(R * 0.93, 6).rotateZ(Math.PI / 6), mat("#ffffff", x.caps), n),
    };
  }, [x]);
  const o = new THREE.Object3D();
  const set = (mesh: THREE.InstancedMesh, i: number, x0: number, y: number, z: number, s: number, sz = 1) => {
    o.position.set(x0, y, z); o.rotation.set(TILT, 0, 0); o.scale.set(Math.max(1e-4, s), Math.max(1e-4, s), Math.max(1e-4, sz)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
  };
  DATA.cells.forEach((c, i) => {
    const s = cellState(c, t), g = s.grow;
    set(m.walls, i, c.x, c.y, Z0, g > 0 ? 1 : 0, g);
    set(m.backs, i, c.x, c.y, Z0, g);
    set(m.rims, i, c.x, c.y - Math.sin(TILT) * D * g, Z0 + Math.cos(TILT) * D * g, g > 0.02 ? 1 : 0);
    set(m.honey, i, c.x, c.y, Z0 + 0.02, g > 0.98 && s.fill > 0.01 ? 1 : 0, s.fill);
    set(m.caps, i, c.x, c.y - Math.sin(TILT) * D, Z0 + Math.cos(TILT) * D - 0.04, g > 0.98 ? s.cap : 0);
  });
  Object.values(m).forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  return <group>{Object.values(m).map((mesh, i) => <primitive key={i} object={mesh} />)}</group>;
};

// crisp pixel captions (hard outline, no glow)
type Cue = { t: number; a?: string; b: string; c?: string };
const OUT = "4px 4px 0 #0b0604, -4px 0 0 #0b0604, 0 -4px 0 #0b0604, 4px 0 0 #0b0604, 0 4px 0 #0b0604";
const CapBlock: React.FC<{ cue: Omit<Cue, "t">; o: number }> = ({ cue, o }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontFamily: "PressStart2P", color: "#fff8e6", opacity: o, textShadow: OUT, lineHeight: 1.5 }}>
    {cue.a && <div style={{ fontSize: 32 }}>{cue.a}</div>}
    <div style={{ fontSize: 64, lineHeight: 1.3, color: "#ffcf5a" }}>{cue.b}</div>
    {cue.c && <div style={{ fontSize: 32 }}>{cue.c}</div>}
  </div>
);
// opacity in hard steps (pixel-style fade: 0, 1/3, 2/3, 1)
const stepped = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 3) / 3;
const CUES: Cue[] = [
  { t: 2.2, a: "NO PLAN.", b: "NO TOOLS.", c: "NO BOSS." },
  { t: 5, a: "SO HOW DOES", b: "THIS", c: "HAPPEN?" },
  { t: 7.2, a: "IT STARTS", b: "WITH", c: "NOTHING" },
  { t: 8.6, a: "YOUNG BEES HANG", b: "IN CHAINS", c: "AND MAKE WAX" },
  { t: 10.2, a: "IT OOZES FROM", b: "8 GLANDS", c: "UNDER THEIR BELLY" },
  { t: 12, a: "THEY CHEW IT", b: "SOFT" },
  { t: 13.4, a: "AND PRESS IT", b: "INTO WALLS" },
  { t: 15.2, a: "CELL", b: "BY CELL" },
  { t: 17, a: "BUT", b: "WHY", c: "HEXAGONS?" },
  { t: 19, a: "CIRCLES", b: "LEAVE GAPS" },
  { t: 21, a: "SQUARES", b: "USE MORE", c: "WAX" },
  { t: 23, a: "HEXAGONS", b: "NO GAPS", c: "LEAST WAX" },
  { t: 25, a: "AND WAX", b: "IS COSTLY", c: "~8 KG OF HONEY PER KG" },
  { t: 27.2, a: "MATHEMATICIANS", b: "PROVED IT", c: "IN 1999" },
  { t: 29.4, a: "EACH CELL TILTS UP", b: "A LITTLE", c: "SO HONEY WON'T DRIP" },
  { t: 31.4, a: "THEN THEY FILL THEM", b: "WITH HONEY" },
  { t: 33.4, a: "AND SEAL THEM", b: "WITH WAX" },
  { t: 36, a: "THOUSANDS OF CELLS", b: "ZERO", c: "BLUEPRINTS" },
  { t: 39, a: "BEES", b: "KNEW IT", c: "ALL ALONG" },
  { t: 42, a: "@HOWTOWITHZAY", b: "NOW YOU", c: "KNOW." },
  { t: 45.5, b: "" },
];

export const BeesPixelVideo: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const map = useMemo(glowTexture, []);
  const cam = camAt(CAM, t);
  const cv = crawlVis(t), chv = chainVis(t);
  const tag = t < 5 ? "▶ REAL SPEED" : t < 7.2 ? "◀◀ REWIND" : t < 13 ? "▶ REAL SPEED" : t < 36 ? "▶▶ TIME-LAPSE" : "▶ REAL SPEED";
  const hook = t < 2.2 ? stepped((2.2 - t) / 0.35) : stepped((t - 46.2) / 0.6);
  let cueIdx = -1;
  CUES.forEach((c, i) => { if (t >= c.t) cueIdx = i; });
  const cue = cueIdx >= 0 ? CUES[cueIdx] : null;
  const next = cueIdx + 1 < CUES.length ? CUES[cueIdx + 1].t : 99;
  const cueO = cue ? stepped(Math.min((t - cue.t) / 0.3, (next - t) / 0.3)) : 0;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile("videos/06-bees/music.wav")} />
      <PixelArtCanvas bg={BG} fov={40}>
        <Cam p={cam.p} l={cam.l} />
        <Lights />
        <mesh position={[0, TOP + 0.45, -0.1]}><boxGeometry args={[18, 0.9, 1.6]} /><meshToonMaterial color="#4a2c1a" /></mesh>
        <mesh position={[0, 0, -40]}><planeGeometry args={[140, 140]} /><meshToonMaterial color="#2b1410" /></mesh>
        <Comb t={t} />
        {cv > 0.02 && CRAWLERS.map((b, i) => { const { p, h } = crawlerPos(i, t); return <Bee key={i} p={[p[0], p[1], 1.35]} heading={h} t={t + i * 0.37} s={0.8 * b.s / 0.8 * cv} />; })}
        {chv > 0.02 && CHAIN_X.map((_, ci) => Array.from({ length: 5 }, (__, j) => {
          const { p, h } = chainBee(ci, j, t);
          const hero = ci === HERO.ci && j === HERO.j && t > 8.5 && t < 13;
          return <Bee key={`${ci}-${j}`} p={p} heading={h} t={t + j * 0.21} belly={hero} s={0.85 * chv} />;
        }))}
        {/* glows go through the palette too */}
        {DATA.cells.map((c, i) => {
          const s = cellState(c, t);
          if (s.grow < 0.98) return null;
          return (
            <group key={i}>
              {s.fill > 0.5 && s.cap < 0.5 && <Glow map={map} at={[c.x - 0.15, c.y + 0.35, 1.15]} size={0.35} color="#fff8e6" opacity={0.85} />}
              {s.flash > 0 && <Glow map={map} at={[c.x, c.y + 0.15, 1.2]} size={1.6} color="#ffe9a8" opacity={s.flash} />}
            </group>
          );
        })}
        {DATA.cells.map((c, i) => { const s = cellState(c, t); return s.flash > 0 && s.grow < 0.98 ? <Glow key={`f${i}`} map={map} at={[c.x, c.y + 0.15, 1.2]} size={1.6} color="#ffe9a8" opacity={s.flash} /> : null; })}
        {DATA.flakes.map((ft, i) => {
          if (t < ft || t > 12.8) return null;
          const p = chainBee(HERO.ci, HERO.j, t).p;
          const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
          return <Glow key={`k${i}`} map={map} at={[p[0] + side * 0.32, p[1] + 0.2 - k * 0.32 - 0.1, p[2] + 0.75]} size={0.5 + 0.6 * Math.exp(-(t - ft) * 6)} color="#fff8e6" opacity={1} />;
        })}
        <Glow map={map} at={[-6, 9, -6]} size={30} color="#d98a1f" opacity={0.18} />
        {Array.from({ length: 40 }, (_, i) => (
          <Glow key={`d${i}`} map={map} at={[(rnd(i) - 0.5) * 30 + 0.4 * Math.sin(t * 2 * LW + i), (rnd(i + 40) - 0.5) * 26 + 0.3 * Math.cos(t * 2 * LW + i), 2 + rnd(i + 80) * 12]} size={0.22} color="#ffcf5a" opacity={0.5 + 0.4 * rnd(i + 3)} />
        ))}
      </PixelArtCanvas>
      <Diagram t={t} />
      <div style={{ position: "absolute", left: 48, top: 72, fontFamily: "PressStart2P", fontSize: 24, color: "#fff8e6", textShadow: OUT }}>{tag}</div>
      {cue && cue.b && <CapBlock cue={cue} o={cueO} />}
      {hook > 0 && <CapBlock cue={{ a: "HOW DO BEES BUILD", b: "PERFECT", c: "HEXAGONS? 🎧" }} o={hook} />}
    </AbsoluteFill>
  );
};
