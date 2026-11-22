"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import type { DishState, Step } from "@/lib/cooking";
import { BOARD_FOOD, cutLength, cutPositions, type Point } from "@/lib/cooking-geometry";
import { chopAt, chopGuideX, nearestGuide, type ChopGuide } from "@/lib/gestures";
import { FOOD_SHAPES } from "../food-art";
import { FOOD_JUICE, burst, pop, shake } from "./juice";
import { GestureLayer, GestureMeter, pxPerUnit, useLatest, useStageDrag, type GestureHandle, type GestureHost } from "./host";

type CutStep = Extract<Step, { kind: "cut" }>;

/** How far apart cut pieces slide, in SVG units (the banana's round slices need more room). */
export const pieceGap = (food: string) => (food === "banana" ? 32 : 22);

/**
 * Where the food and its cut lines are on the board. Shared by the scene (dashed
 * marks), the studio (labelled hotspots) and the knife gesture, so all three agree.
 */
export function chopLayout(step: CutStep, dish: DishState) {
  const length = cutLength(step.food);
  const shape = FOOD_SHAPES[step.food];
  const scale = shape ? length / shape.length : 1;
  const half = shape ? ((shape.bottom - shape.top) / 2) * scale : 50;
  const top = BOARD_FOOD.cy - half, bottom = BOARD_FOOD.cy + half;
  const done = dish.cuts[step.id] ?? [];
  const xs = chopGuideX(cutPositions(step.cuts, length), done, pieceGap(step.food));
  const guides: ChopGuide[] = xs.map((x, index) => ({ index, x, top, bottom })).filter((g) => !done.includes(g.index));
  const spread = (done.length / 2) * pieceGap(step.food);
  return { guides, xs, done, top, bottom, left: BOARD_FOOD.cx - length / 2 - spread, right: BOARD_FOOD.cx + length / 2 + spread };
}

/** A chef's knife with soft shading; its edge (the bottom of the blade) is at 0,0. */
function KnifeArt() {
  return (
    <g>
      <defs>
        <linearGradient id="gx-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f7f9fb" /><stop offset=".42" stopColor="#cfd6dc" /><stop offset=".55" stopColor="#eef2f5" /><stop offset="1" stopColor="#97a3ae" />
        </linearGradient>
        <linearGradient id="gx-handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7b4a2a" /><stop offset=".45" stopColor="#b07548" /><stop offset="1" stopColor="#5e361d" />
        </linearGradient>
      </defs>
      <path d="M -15 -114 L 14 -114 L 14 -22 C 14 -8 6 0 -6 0 L -15 0 Z" fill="url(#gx-steel)" stroke="#7d8894" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M -15 -6 L -6 -6 C 4 -6 9 -12 9 -22" fill="none" stroke="#fff" strokeWidth="2.2" opacity=".85" strokeLinecap="round" />
      <path d="M -10 -104 L -10 -16" stroke="#fff" strokeWidth="3" opacity=".7" strokeLinecap="round" />
      <rect x="-17" y="-122" width="33" height="10" rx="4" fill="#8d98a2" />
      <rect x="-13" y="-192" width="26" height="72" rx="12" fill="url(#gx-handle)" />
      <rect x="-8" y="-186" width="6" height="60" rx="3" fill="#d39a68" opacity=".55" />
      {[-176, -156, -136].map((y) => <g key={y}><circle cx="0" cy={y} r="3" fill="#e9dccb" /><circle cx="-0.8" cy={y - 0.8} r="1.1" fill="#fff" /></g>)}
    </g>
  );
}

export function ChopBoard({ step, dish, host, handleRef, onCut }: {
  step: CutStep;
  dish: DishState;
  host: GestureHost;
  handleRef: Ref<GestureHandle | null>;
  /** Commit one cut to the dish (the studio plays the sound and keeps undo). */
  onCut: (index: number) => void;
}) {
  const layout = chopLayout(step, dish);
  const L = useLatest({ layout, step, host, onCut });
  const knifeRef = useRef<SVGGElement>(null);
  const bladeRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGPolylineElement>(null);
  const fxRef = useRef<SVGGElement>(null);
  const stroke = useRef<{ minY: number; start: Point; last: Point; warned: boolean; cut: boolean; pts: Point[] } | null>(null);
  const taps = useRef(0);
  /** True only while an automatic chop is on its way down (until the knife lands). */
  const busy = useRef(false);
  /** The knife's automatic down-and-up animation; a quick next tap may cut it short. */
  const swing = useRef<Animation | null>(null);
  /** Lines tapped while the knife was still coming down; they are chopped next, never dropped. */
  const queue = useRef<number[]>([]);
  const [near, setNear] = useState<number | null>(null);
  const view = host.view;
  // At rest the knife lies on the board below the food, handle to the right, fully in
  // view on a 360px phone as well as on a wide screen.
  const rest = { x: Math.min(view.x + view.w - 24, 646) - 196, y: Math.min(layout.bottom + 38, 408), rot: 84 };

  const shadowRef = useRef<SVGEllipseElement>(null);
  const place = (x: number, y: number, rot = 0, resting = false) => {
    knifeRef.current?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
    // The drop shadow belongs under an upright knife; a lying knife has its own outline.
    shadowRef.current?.setAttribute("opacity", resting ? "0" : ".18");
  };
  const restKnife = () => place(rest.x, rest.y, rest.rot, true);
  const reach = () => Math.max(34, Math.min(60, 40 / pxPerUnit(L.current.host)));

  /** The knife lands: cut, juice, a tiny shake and the food's own chop sound. */
  function cut(index: number, auto = false) {
    const { layout: lay, host: h, step: s } = L.current;
    const g = lay.guides.find((q) => q.index === index);
    if (!g || h.locked()) return;
    L.current.onCut(index);
    const juice = FOOD_JUICE[s.food] ?? FOOD_JUICE.banana;
    burst(fxRef.current, g.x, (g.top + g.bottom) / 2 - 6, {
      n: juice.wet ? 12 : 8, colors: juice.colors, speed: 6, up: 6, r: juice.wet ? [2, 4.5] : [2.5, 5], floor: g.bottom + 16,
    }, h.reduced);
    shake(h.stageRef.current, 2, h.reduced);
    if (!auto) pop(bladeRef.current, [{ transform: "translateY(-6px)" }, { transform: "translateY(4px)" }, { transform: "translateY(0)" }], { duration: 180, easing: "ease-out" }, h.reduced);
    setNear(null);
  }

  /** Tap, keyboard or helping hand: the knife lifts over the line and chops by itself. */
  function autoChop(index: number) {
    const { layout: lay, host: h } = L.current;
    const g = lay.guides.find((q) => q.index === index);
    if (!g || h.locked()) return;
    if (busy.current) { if (!queue.current.includes(index)) queue.current.push(index); return; }
    if (h.reduced) { place(g.x, g.bottom + 4); cut(index); window.setTimeout(restKnife, 250); return; }
    busy.current = true;
    swing.current?.cancel();
    place(g.x, g.top - 24);
    const drop = g.bottom - g.top + 30;
    const a = bladeRef.current?.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(${drop}px)`, offset: 0.45 }, { transform: `translateY(${drop}px)`, offset: 0.6 }, { transform: "translateY(0)" }],
      { duration: 320, easing: "cubic-bezier(.5,0,.5,1)" },
    ) ?? null;
    swing.current = a;
    // Once the knife has landed the next tap is welcome, so quick tappers never wait.
    window.setTimeout(() => {
      busy.current = false;
      cut(index, true);
      const next = queue.current.shift();
      // The dish updates first, then the knife moves on to the next tapped line.
      if (next != null) window.setTimeout(() => autoChop(next), 60);
    }, 140);
    if (a) a.onfinish = () => { if (swing.current === a) { swing.current = null; restKnife(); } };
    else window.setTimeout(restKnife, 320);
  }

  useImperativeHandle(handleRef, () => ({ tap: (i: number) => autoChop(i) }));

  useStageDrag(host, {
    down: (_e, p) => {
      if (L.current.host.locked()) return false;
      swing.current?.cancel();
      swing.current = null;
      stroke.current = { minY: p.y, start: p, last: p, warned: false, cut: false, pts: [p] };
      if (!L.current.host.tapOnly) place(p.x, p.y);
    },
    move: (_e, p, moved) => {
      const s = stroke.current, h = L.current.host;
      if (!s || !moved || h.tapOnly || busy.current) return;
      const prev = s.last;
      s.last = p;
      place(p.x, Math.max(view.y + 150, p.y), Math.max(-12, Math.min(12, (p.x - prev.x) * 0.8)));
      s.pts.push(p);
      if (s.pts.length > 7) s.pts.shift();
      if (!h.reduced) trailRef.current?.setAttribute("points", s.pts.map((q) => `${q.x.toFixed(0)},${q.y.toFixed(0)}`).join(" "));
      if (p.y < s.minY) s.minY = p.y;
      const lay = L.current.layout;
      const r = reach();
      const close = nearestGuide(lay.guides, p.x, r);
      setNear(close && Math.abs(close.x - p.x) <= r ? close.index : null);
      if (h.locked()) return;
      const hit = chopAt(prev, p, s.minY, lay.guides, { reach: r, foodLeft: lay.left, foodRight: lay.right });
      // After a cut, the rest of the same stroke never earns an "almost" nudge.
      if (hit?.kind === "cut") { cut(hit.index); s.minY = p.y; s.warned = true; s.cut = true; }
      else if (hit?.kind === "miss" && !s.warned) {
        s.warned = true;
        h.nudge("Almost! Bring the knife down on a dashed line.");
      }
    },
    up: (_e, p, moved, onHotspot) => {
      const s = stroke.current;
      stroke.current = null;
      trailRef.current?.setAttribute("points", "");
      setNear(null);
      const h = L.current.host, lay = L.current.layout;
      // Busy phones coalesce pointer moves, so the last stretch of a fast swipe (the
      // part that reaches into the food) may only arrive with the finger lifting.
      if (moved && s && !h.tapOnly && !busy.current && !h.locked() && (p.x !== s.last.x || p.y !== s.last.y)) {
        const hit = chopAt(s.last, p, Math.min(s.minY, p.y), lay.guides, { reach: reach(), foodLeft: lay.left, foodRight: lay.right });
        if (hit?.kind === "cut") { cut(hit.index); s.cut = true; }
      }
      if (!moved && !onHotspot && !h.locked()) {
        const g = nearestGuide(lay.guides, p.x, 90);
        if (h.tapOnly) { if (g) autoChop(g.index); }
        else if (++taps.current >= 3) {
          h.nudge("Tapping works too! I’ll help with the knife.");
          if (g) autoChop(g.index);
        } else h.nudge("Swipe the knife down through a dashed line, like a real chef!");
      } else if (moved && s && !s.cut && !s.warned && !h.locked()) {
        // Sawing sideways never fails, it just earns a tip about chopping down.
        const dx = Math.abs(p.x - s.start.x), dy = Math.abs(p.y - s.start.y);
        if (dx > 90 && dx > dy * 2) h.nudge("Chop down, from the top to the bottom of the food!");
      }
      if (!busy.current && !swing.current) restKnife();
    },
    hover: (p) => {
      if (busy.current || swing.current || L.current.host.tapOnly) return;
      if (!p) { restKnife(); return; }
      place(p.x, Math.min(p.y, L.current.layout.top - 8), -4);
    },
  });

  return (
    <>
      <GestureLayer view={view} className="ck-chop-layer">
        {layout.guides.map((g) => (
          <line key={g.index} x1={g.x} x2={g.x} y1={g.top - 22} y2={g.bottom + 14}
            className={`ck-chop-guide${near === g.index ? " near" : ""}`} />
        ))}
        <polyline ref={trailRef} className="ck-chop-trail" points="" />
        <g ref={fxRef} />
        <g ref={knifeRef} transform={`translate(${rest.x} ${rest.y}) rotate(${rest.rot})`} className="ck-knife">
          <ellipse ref={shadowRef} cx="6" cy="10" rx="26" ry="5" fill="#4a3118" opacity="0" />
          <g ref={bladeRef}><KnifeArt /></g>
        </g>
      </GestureLayer>
      <GestureMeter label={`Cuts: ${layout.done.length} of ${step.cuts}`} value={layout.done.length / step.cuts} pips={{ done: layout.done.length, total: step.cuts }} />
    </>
  );
}
