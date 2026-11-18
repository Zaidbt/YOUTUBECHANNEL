/** Shared overlays for the "how it works" reel format (030+): notification-style step cards and pinned callouts. */
import React from "react";
import { project } from "./Labels";

type V3 = [number, number, number];
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, c: number, k: number) => a + (c - a) * k;
export const ui: React.CSSProperties = { fontFamily: "Inter, 'Inter Display', -apple-system, sans-serif" };
export type Card = { from: number; to: number; n?: number; title: string; sub: string; hold?: boolean };
export const Notif: React.FC<{ t: number; cards: Card[]; app: string; icon: string; grad: string }> = ({ t, cards, app, icon, grad }) => {
  const c = cards.find((x) => t >= x.from && t < x.to); if (!c) return null;
  const k = c.hold ? 1 : ease((t - c.from) / 0.3), o = c.hold ? 1 : Math.min(k, clamp01((c.to - t) / 0.2));
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 205, opacity: o, transform: `translateY(${(1 - k) * -40}px)`, background: "rgba(246,246,248,0.95)", borderRadius: 40, padding: "26px 30px", display: "flex", gap: 24, alignItems: "center", boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
      <div style={{ width: 104, height: 104, borderRadius: 26, background: grad, display: "flex", alignItems: "center", justifyContent: "center", ...ui, fontWeight: 900, fontSize: 56, color: "#fff", flex: "0 0 auto" }}>{c.n ?? icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...ui, fontSize: 26, color: "#6b6f7a", fontWeight: 600, marginBottom: 6 }}><span>{app}</span><span>now</span></div>
        <div style={{ ...ui, fontSize: 44, fontWeight: 800, color: "#111318", lineHeight: 1.1 }}>{c.title}</div>
        <div style={{ ...ui, fontSize: 32, fontWeight: 500, color: "#4a4f5c", marginTop: 6 }}>{c.sub}</div>
      </div>
    </div>
  );
};
export type Call = { txt: string; at: V3 | ((t: number) => V3); from: number; to: number; dx: number; dy: number; color?: string };
export const Callouts: React.FC<{ t: number; cam: { p: V3; l: V3 }; fov: number; calls: Call[] }> = ({ t, cam, fov, calls }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    {calls.filter((c) => t >= c.from && t < c.to).map((c, i) => {
      const at = typeof c.at === "function" ? c.at(t) : c.at;
      const [x, y] = project(at, cam, fov), k = ease((t - c.from) / 0.3), w = Math.max(220, c.txt.length * 19 + 60);
      const ex = Math.max(w / 2 + 30, Math.min(1050 - w / 2, x + c.dx)), ey = Math.max(470, Math.min(1780, y + c.dy)), col = c.color ?? "#ffd23f";
      return (
        <g key={i} opacity={Math.min(k, clamp01((c.to - t) / 0.2))}>
          <circle cx={x} cy={y} r={10} fill={col} stroke="#120c14" strokeWidth={4} />
          <line x1={x} y1={y} x2={lerp(x, ex, k)} y2={lerp(y, ey, k)} stroke="#ffffff" strokeWidth={4} />
          <rect x={ex - w / 2} y={ey - 34} width={w} height={64} rx={32} fill="#120c14" stroke={col} strokeWidth={4} />
          <text x={ex} y={ey + 10} textAnchor="middle" style={{ ...ui, fontWeight: 800, fontSize: 28, fill: "#ffffff", letterSpacing: 2 } as React.CSSProperties}>{c.txt}</text>
        </g>);
    })}
  </svg>
);
export const Pill: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <div style={{ ...ui, fontWeight: 800, fontSize: 32, color: "#fff", background: bg, padding: "12px 24px", borderRadius: 999, boxShadow: "0 6px 0 rgba(0,0,0,0.35)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{children}</div>
);
export const Stamp: React.FC<{ t: number; at: number; dur: number; color: string; big: string; small?: string; y?: number }> = ({ t, at, dur, color, big, small, y = 1180 }) => {
  if (t < at || t > at + dur) return null;
  const u = t - at, k = u < 0.18 ? 1.6 - 0.6 * (u / 0.18) : 1, o = Math.min(1, clamp01((at + dur - t) / 0.2));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, transform: `scale(${k}) rotate(-4deg)` }}>
      <div style={{ ...ui, fontWeight: 900, fontSize: 104, color: "#fff", background: color, padding: "10px 44px", borderRadius: 28, border: "8px solid #fff", boxShadow: "0 14px 0 rgba(0,0,0,0.4)" }}>{big}</div>
      {small && <div style={{ ...ui, fontWeight: 800, fontSize: 38, color: "#fff", marginTop: 22, background: "rgba(18,12,20,0.85)", padding: "10px 26px", borderRadius: 999 }}>{small}</div>}
    </div>
  );
};
