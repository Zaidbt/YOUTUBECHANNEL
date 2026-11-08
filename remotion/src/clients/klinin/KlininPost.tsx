/**
 * Klinin — Instagram feed post (4:5, 1080x1350), animated (9 s) + still (last frame).
 * One relatable message ("Reste posé 😌" + the guy relaxing from the klinin.ma hero), 3 simple steps, one offer
 * (-50% sur la 1ère commande, from the app's launch banner), price anchor (dès 10 DH, from the app), clear CTA.
 * Claims: "4 à 24h" (klinin.ma hero bag), "dès 10 DH" (app price list), "-50% 1ère commande" (app banner) —
 * check the offer is still running before posting.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

loadFont({ family: "PoppinsX", url: staticFile("fonts/Poppins-ExtraBold.ttf"), weight: "800" });
loadFont({ family: "PoppinsS", url: staticFile("fonts/Poppins-SemiBold.ttf"), weight: "600" });

const K = { navy: "#003367", blue: "#137fec", sky: "#e9f3ff", amber: "#f59e0b", ink: "#0f172a", white: "#ffffff" };
const img = (f: string) => staticFile(`clients/klinin/${f}`);

const Bubble: React.FC<{ x: number; y: number; r: number; f: number; i: number }> = ({ x, y, r, f, i }) => {
  const dy = ((f * (0.6 + (i % 3) * 0.2) + i * 47) % 260);
  return <div style={{ position: "absolute", left: x + 10 * Math.sin((f + i * 20) / 25), top: y - dy, width: r, height: r, borderRadius: "50%", border: "3px solid rgba(19,127,236,0.35)", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0 18%, rgba(19,127,236,0.08) 40%, rgba(19,127,236,0.04) 70%)", opacity: 1 - dy / 260 }} />;
};

export const KlininPost: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (start: number, damping = 11) => spring({ frame: f - start, fps, config: { damping, stiffness: 140, mass: 0.7 } });
  const fadeUp = (start: number) => ({ opacity: interpolate(f, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), transform: `translateY(${interpolate(pop(start, 16), [0, 1], [40, 0])}px)` });

  const photo = pop(4, 13), sticker = pop(54, 8), price = pop(70, 10);
  const steps = [
    { icon: "📱", t: "Tu commandes", s: "sur l'app" },
    { icon: "🛵", t: "On récupère", s: "chez toi" },
    { icon: "✨", t: "Livré propre", s: "en 4 à 24h" },
  ];
  const wob = Math.sin(f / 9) * 3;

  return (
    <AbsoluteFill style={{ background: K.sky, overflow: "hidden", fontFamily: "PoppinsS" }}>
      {/* brand blob + bubbles */}
      <div style={{ position: "absolute", right: -470, top: 250, width: 1080, height: 1080, borderRadius: "46% 54% 48% 52%", background: K.blue, transform: `scale(${0.6 + 0.4 * photo}) rotate(${f * 0.05}deg)` }} />
      {Array.from({ length: 9 }, (_, i) => <Bubble key={i} i={i} f={f} x={520 + ((i * 97) % 480)} y={1050 - ((i * 61) % 300)} r={22 + ((i * 13) % 36)} />)}

      {/* header */}
      <div style={{ position: "absolute", left: 60, top: 52, display: "flex", alignItems: "center", gap: 18, ...fadeUp(0) }}>
        <Img src={img("logo.png")} style={{ width: 96, height: 96, borderRadius: 24, background: K.white, boxShadow: "0 8px 24px rgba(0,51,103,0.15)" }} />
        <div style={{ fontFamily: "PoppinsX", fontSize: 44, color: K.navy, letterSpacing: -1 }}>klinin<span style={{ color: K.blue }}>.ma</span></div>
      </div>
      <div style={{ position: "absolute", right: 60, top: 72, background: K.navy, color: K.white, fontSize: 30, padding: "12px 26px", borderRadius: 999, ...fadeUp(6) }}>📍 Agadir</div>

      {/* headline */}
      <div style={{ position: "absolute", left: 56, top: 175, fontFamily: "PoppinsX", color: K.navy, letterSpacing: -4, lineHeight: 1, fontSize: 122, whiteSpace: "nowrap", ...fadeUp(10) }}>Reste posé. 😌</div>
      <div style={{ position: "absolute", left: 60, top: 335, width: 500, fontSize: 38, lineHeight: 1.25, color: K.ink, ...fadeUp(22) }}>
        Ton linge, on le <b style={{ color: K.blue }}>récupère</b>, on le <b style={{ color: K.blue }}>nettoie</b> et on te le <b style={{ color: K.blue }}>livre</b>.
      </div>

      {/* the photo (klinin.ma hero) */}
      <div style={{ position: "absolute", right: -20, top: 300, width: 620, height: 880, transform: `scale(${photo}) translateY(${(1 - photo) * 80}px)`, transformOrigin: "60% 100%" }}>
        <Img src={img("hero_crop.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%", WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 52% 46%, #000 66%, transparent 76%)", maskImage: "radial-gradient(ellipse 75% 70% at 52% 46%, #000 66%, transparent 76%)" }} />
      </div>

      {/* 3 steps */}
      <div style={{ position: "absolute", left: 60, top: 560, display: "flex", flexDirection: "column", gap: 20 }}>
        {steps.map((st, i) => { const k = pop(34 + i * 8, 12); return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, background: K.white, borderRadius: 28, padding: "16px 24px 16px 16px", width: 480, boxShadow: "0 14px 34px rgba(0,51,103,0.14)", transform: `scale(${k}) translateX(${(1 - k) * -60}px)`, transformOrigin: "0% 50%" }}>
            <div style={{ width: 78, height: 78, borderRadius: 22, background: K.sky, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{st.icon}</div>
            <div>
              <div style={{ fontFamily: "PoppinsX", fontSize: 34, color: K.navy, lineHeight: 1.05, whiteSpace: "nowrap" }}><span style={{ color: K.blue }}>{i + 1}.</span> {st.t}</div>
              <div style={{ fontSize: 28, color: "#475569" }}>{st.s}</div>
            </div>
          </div>); })}
      </div>

      {/* offer sticker */}
      <div style={{ position: "absolute", right: 36, top: 820, width: 240, height: 240, borderRadius: "50%", background: K.amber, color: K.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", boxShadow: "0 18px 40px rgba(245,158,11,0.45)", transform: `scale(${sticker}) rotate(${-12 + wob}deg)`, border: "8px solid #fff" }}>
        <div style={{ fontFamily: "PoppinsX", fontSize: 92, lineHeight: 0.9, letterSpacing: -3 }}>-50%</div>
        <div style={{ fontSize: 26, lineHeight: 1.1, marginTop: 6 }}>sur ta 1ère<br />commande</div>
      </div>

      {/* price chip */}
      <div style={{ position: "absolute", left: 60, top: 975, background: K.navy, color: K.white, borderRadius: 20, padding: "14px 28px", fontSize: 34, transform: `scale(${price})`, transformOrigin: "0% 50%" }}>
        Dès <span style={{ fontFamily: "PoppinsX", color: K.amber, fontSize: 44 }}>10 DH</span> la pièce
      </div>

      {/* CTA bar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 170, background: K.navy, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 60px", ...fadeUp(80) }}>
        <div style={{ color: K.white }}>
          <div style={{ fontFamily: "PoppinsX", fontSize: 46, lineHeight: 1.1 }}>Commande sur l'app Klinin</div>
          <div style={{ fontSize: 30, color: "#bcd6ff" }}>Lien en bio 👆 · Collecte & livraison à domicile</div>
        </div>
        <div style={{ width: 92, height: 92, borderRadius: "50%", background: K.blue, color: K.white, fontSize: 52, display: "flex", alignItems: "center", justifyContent: "center", transform: `translateX(${4 * Math.sin(f / 6)}px)` }}>→</div>
      </div>
    </AbsoluteFill>
  );
};
