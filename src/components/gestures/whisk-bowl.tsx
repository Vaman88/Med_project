"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { DishState, Step } from "@/lib/cooking";
import { BOWL, PAN, type Point, type Surface } from "@/lib/cooking-geometry";
import { stirProgress, turnStep } from "@/lib/gestures";
import { burst } from "./juice";
import { GestureLayer, GestureMeter, useLatest, useStageDrag, type GestureHandle, type GestureHost } from "./host";

type StirStep = Extract<Step, { kind: "stir" }>;

/** Batter-like mixtures get a whisk; salads and pots get a wooden spoon. */
const WHISKED = new Set(["pancakes", "brownies", "banana-oat-cookies", "egg-muffins", "smoothie-bowl"]);
/** The tool for a stir step: a whisk for batters in a bowl, otherwise a spoon. */
export const stirTool = (recipeId: string, surface: Surface): "whisk" | "spoon" =>
  surface === "bowl" && WHISKED.has(recipeId) ? "whisk" : "spoon";

/** The streak colour that swirls through each mixture until it is blended. */
const STREAK: Record<string, string> = {
  pancakes: "#fff3cf", brownies: "#8a5a3d", "banana-oat-cookies": "#f3dc8f", "egg-muffins": "#ffb41f",
  "smoothie-bowl": "#ff8fb0", "bean-salad": "#f1d27a", "fruit-salad": "#ffd3dc",
  "oatmeal-bowl": "#fff6e2", "tomato-pasta": "#e0533a", "veggie-fried-rice": "#8a5a2d",
};

function spiral(c: Point, turns = 3, r0 = 12, r1 = 132, n = 110): string {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * Math.PI * 2 * turns, r = r0 + t * (r1 - r0);
    d += `${i ? " L" : "M"}${(c.x + Math.cos(a) * r).toFixed(1)} ${(c.y + Math.sin(a) * r).toFixed(1)}`;
  }
  return d;
}

export function WhiskArt() {
  return (
    <g>
      <rect x="-7" y="-176" width="14" height="74" rx="7" fill="url(#gx-wood2) #a86a40" />
      <rect x="-4" y="-170" width="4" height="60" rx="2" fill="#d39a68" opacity=".55" />
      {[-26, -13, 0, 13, 26].map((w, i) => (
        <path key={i} d={`M ${w * 0.18} -104 C ${w} -70 ${w * 1.3} -18 0 0 C ${-w * 0.2} -18 ${w * 0.4} -70 ${w * 0.18} -104`} fill="none" stroke={i % 2 ? "#c3ccd5" : "#e6ecf1"} strokeWidth="3" />
      ))}
      <rect x="-6" y="-110" width="12" height="10" rx="3" fill="#9aa6b2" />
    </g>
  );
}
function SpoonArt() {
  return (
    <g>
      <rect x="-6" y="-176" width="12" height="150" rx="6" fill="url(#gx-wood2) #a86a40" />
      <rect x="-2" y="-168" width="3" height="130" rx="1.5" fill="#d39a68" opacity=".6" />
      <ellipse cx="0" cy="-8" rx="22" ry="28" fill="#b57e47" />
      <ellipse cx="-2" cy="-10" rx="17" ry="22" fill="#d6a46c" />
      <ellipse cx="-7" cy="-18" rx="5" ry="8" fill="#fff" opacity=".35" />
    </g>
  );
}

export function WhiskBowl({ step, dish, host, handleRef, recipeId, surface, onStir }: {
  step: StirStep;
  dish: DishState;
  host: GestureHost;
  handleRef: Ref<GestureHandle | null>;
  recipeId: string;
  surface: Surface;
  /** Add degrees of stirring to the dish; `merge` keeps one drag as one undo step. */
  onStir: (degrees: number, merge: boolean) => void;
}) {
  const center: Point = surface === "pan" ? { x: PAN.cx, y: PAN.cy } : { x: BOWL.cx, y: BOWL.cy };
  const radius = surface === "pan" ? 158 : BOWL.rx - 10;
  const degrees = dish.stir[step.id] ?? 0;
  const progress = stirProgress(degrees, step.turns);
  const whisk = stirTool(recipeId, surface) === "whisk";
  const L = useLatest({ host, onStir, progress, center, radius });
  const toolRef = useRef<SVGGElement>(null);
  const fxRef = useRef<SVGGElement>(null);
  const drag = useRef<{ angle: number | null; t: number; whoosh: number; pushed: boolean } | null>(null);
  const auto = useRef<{ raf: number; timer: number; ran: boolean }>({ raf: 0, timer: 0, ran: false });
  const view = host.view;
  const restAngle = (degrees * Math.PI) / 180;
  const restAt = { x: center.x + Math.cos(restAngle) * radius * 0.62, y: center.y + Math.sin(restAngle) * radius * 0.62 };

  const place = (p: Point, tilt = 0) => toolRef.current?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${tilt.toFixed(1)})`);

  /** Stir by `delta` degrees: commit, whoosh every half turn, splash when fast. */
  function stirBy(delta: number, speed: number, at: Point) {
    const c = L.current, d = drag.current;
    if (delta <= 0 || c.host.locked() || c.progress >= 1) return;
    c.onStir(delta, !!d?.pushed);
    if (d) {
      d.pushed = true;
      d.whoosh += delta;
      if (d.whoosh >= 180) { d.whoosh = 0; c.host.sound("stir", { speed: Math.min(1.5, speed * 2.4) }); }
    }
    if (speed > 0.45 && Math.random() < 0.35) {
      const a = Math.atan2(at.y - c.center.y, at.x - c.center.x);
      burst(fxRef.current, c.center.x + Math.cos(a) * c.radius * 0.95, c.center.y + Math.sin(a) * c.radius * 0.95,
        { n: 2, colors: [STREAK[recipeId] ?? "#fff6dc", "#ffffff"], speed: 4, dir: a, gravity: 0.15, r: [2, 3.5], life: 18 }, c.host.reduced);
    }
  }

  function stopAuto() {
    cancelAnimationFrame(auto.current.raf);
    window.clearTimeout(auto.current.timer);
    auto.current.raf = 0;
    auto.current.timer = 0;
  }
  /** Press and hold: the whisk goes round by itself (and for tap-only chefs, straight away). */
  function startAuto() {
    if (auto.current.raf) return;
    auto.current.ran = true;
    let last = performance.now(), angle = drag.current?.angle ?? 0;
    const tick = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      const delta = dt * 0.32;
      angle += delta;
      const a = (angle * Math.PI) / 180, c = L.current.center, r = L.current.radius * 0.55;
      const at = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
      place(at, Math.sin(a) * 10);
      stirBy(delta, 0.3, at);
      auto.current.raf = L.current.progress >= 1 || !drag.current ? 0 : requestAnimationFrame(tick);
    };
    auto.current.raf = requestAnimationFrame(tick);
  }
  useEffect(() => stopAuto, []);

  // Keyboard and plain taps go through the "Stir the bowl" button (a quarter turn each).
  useImperativeHandle(handleRef, () => ({ tap: () => undefined }));

  useStageDrag(host, {
    down: (_e, p) => {
      const h = L.current.host;
      if (h.locked()) return false;
      drag.current = { angle: turnStep(L.current.center, null, p).angle, t: performance.now(), whoosh: 0, pushed: false };
      auto.current.ran = false;
      if (!h.tapOnly) place(p);
      // A quick tap is a quarter turn (the "Stir the bowl" button); holding whisks by itself.
      auto.current.timer = window.setTimeout(startAuto, h.tapOnly ? 220 : 450);
    },
    move: (_e, p, moved) => {
      const d = drag.current, h = L.current.host;
      if (!d) return;
      if (moved) { window.clearTimeout(auto.current.timer); if (!h.tapOnly) { cancelAnimationFrame(auto.current.raf); auto.current.raf = 0; } }
      if (h.tapOnly) return;
      const now = performance.now();
      const s = turnStep(L.current.center, d.angle, p, { deadZone: 26, maxStep: 40 });
      d.angle = s.angle;
      place(p, -6);
      if (s.delta > 0) stirBy(s.delta, s.delta / Math.max(1, now - d.t), p);
      d.t = now;
    },
    up: () => {
      stopAuto();
      drag.current = null;
      // A long press already whisked; don't add the button's quarter turn on top.
      if (auto.current.ran) L.current.host.dragged();
      place(restAt);
    },
    hover: (p) => { if (!L.current.host.tapOnly) place(p ?? restAt); },
  });

  const streak = STREAK[recipeId] ?? "#fff6dc";
  const spin = host.reduced ? Math.round(progress * 4) * 30 : degrees;
  const bubbles = Math.floor(progress * 14);
  return (
    <>
      <GestureLayer view={view} className="ck-whisk-layer">
        <defs>
          <linearGradient id="gx-wood2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7b4a2a" /><stop offset=".45" stopColor="#b07548" /><stop offset="1" stopColor="#5e361d" /></linearGradient>
          <clipPath id="gx-stir-clip"><circle cx={center.x} cy={center.y} r={radius} /></clipPath>
        </defs>
        <g clipPath="url(#gx-stir-clip)">
          {/* the swirl turns with the child's circles; streaks fade as it blends */}
          <g transform={`rotate(${spin.toFixed(1)} ${center.x} ${center.y})`} opacity={(Math.sin(Math.min(1, progress + 0.15) * Math.PI) * 0.75 + (progress < 1 ? 0.1 : 0)).toFixed(2)}>
            <path d={spiral(center)} stroke={streak} strokeWidth="8" fill="none" strokeLinecap="round" opacity={surface === "pan" ? 0.4 : 0.65} />
            <path d={spiral(center, 3, 20, 120)} stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".4" />
          </g>
          {Array.from({ length: bubbles }, (_, i) => {
            const a = i * 2.399, r = radius * (0.45 + ((i * 37) % 50) / 100);
            return <circle key={i} className="ck-bubble" cx={center.x + Math.cos(a) * r} cy={center.y + Math.sin(a) * r} r={2.5 + (i % 3) * 1.5}
              fill="none" stroke="#fff" strokeWidth="1.6" opacity=".8" style={{ animationDelay: `${(i % 5) * 180}ms` }} />;
          })}
        </g>
        <g ref={fxRef} />
        <g ref={toolRef} transform={`translate(${restAt.x.toFixed(1)} ${restAt.y.toFixed(1)})`} className="ck-whisk">
          <ellipse cx="4" cy="6" rx="20" ry="6" fill="#4a3118" opacity=".16" />
          {whisk ? <WhiskArt /> : <SpoonArt />}
        </g>
      </GestureLayer>
      <GestureMeter label={whisk ? "Whisking: separate to mixed" : "Stirring: separate to mixed"} value={progress} left="Separate" right="Mixed" />
    </>
  );
}
