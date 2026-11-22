"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import type { DishState, Step } from "@/lib/cooking";
import { BOARD_FOOD, cutLength, type Point } from "@/lib/cooking-geometry";
import { mashPress, mashPressesNeeded, mashProgress, scrubDue, syncPresses } from "@/lib/gestures";
import { FOOD_JUICE, burst, pop, shake } from "./juice";
import { GestureLayer, GestureMeter, pxPerUnit, useLatest, useStageDrag, type GestureHandle, type GestureHost } from "./host";

type MashStep = Extract<Step, { kind: "mash" }>;

/** The shallow mixing bowl the banana is mashed in, sitting on the board. */
export const MASH_BOWL = { cx: BOARD_FOOD.cx, cy: BOARD_FOOD.cy + 6, rx: 214, ry: 124 };
const JITTER = [-8, 10, -6, 9, -4, 7, -9, 5, -3];

/** Where each lump of food sits (the labelled "Mash spot" hotspots use the same points). */
export function mashLumps(step: MashStep): Point[] {
  const len = Math.min(300, cutLength(step.food) - 60);
  return Array.from({ length: step.spots }, (_, i) => ({
    x: BOARD_FOOD.cx - len / 2 + (len * (i + 0.5)) / step.spots,
    y: BOARD_FOOD.cy + JITTER[i % JITTER.length],
  }));
}

function blob(cx: number, cy: number, rx: number, ry: number, seed: number, n = 9): string {
  const rnd = (k: number) => { const x = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, r = 0.84 + rnd(i) * 0.26;
    return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r };
  });
  const mid = (p: Point, q: Point) => `${((p.x + q.x) / 2).toFixed(1)} ${((p.y + q.y) / 2).toFixed(1)}`;
  let d = `M ${mid(pts[n - 1], pts[0])}`;
  for (let i = 0; i < n; i++) d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mid(pts[i], pts[(i + 1) % n])}`;
  return d + " Z";
}

/** The masher's grid of holes; `print` draws the pattern it leaves in the mash. */
function MasherGrid({ print = false }: { print?: boolean }) {
  const holes: Point[] = [];
  for (let i = 0; i < 25; i++) {
    const x = (i % 5 - 2) * 12, y = (Math.floor(i / 5) - 2) * 7;
    if (Math.hypot(x / 1.2, y * 1.6) < 30) holes.push({ x, y });
  }
  return <g>{holes.map((h, i) => <ellipse key={i} cx={h.x} cy={h.y} rx={print ? 3.4 : 3} ry={print ? 2.2 : 1.9} fill={print ? "#d7b85c" : "#56606a"} opacity={print ? 0.55 : 1} />)}</g>;
}

/** A potato masher seen at an angle; the middle of its plate is at 0,0. */
function MasherArt() {
  return (
    <g>
      <defs>
        <radialGradient id="gx-plate" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#f6f8fa" /><stop offset="1" stopColor="#929eaa" /></radialGradient>
        <linearGradient id="gx-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7b4a2a" /><stop offset=".45" stopColor="#b07548" /><stop offset="1" stopColor="#5e361d" /></linearGradient>
      </defs>
      <path d="M -26 -4 C -26 -40 -10 -70 -6 -96 M 26 -4 C 26 -40 10 -70 6 -96" stroke="#9aa4ae" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="-10" y="-168" width="20" height="78" rx="10" fill="url(#gx-wood)" />
      <rect x="-6" y="-162" width="5" height="64" rx="2.5" fill="#d39a68" opacity=".55" />
      <ellipse cx="0" cy="0" rx="44" ry="19" fill="url(#gx-plate)" stroke="#7d8894" strokeWidth="2" />
      <MasherGrid />
      <ellipse cx="-14" cy="-8" rx="14" ry="4" fill="#fff" opacity=".6" />
    </g>
  );
}

/** One lump of peeled banana at stage `t`: 0 = whole chunk, 1 = mashed flat. */
function Lump({ at, t, presses, i, need }: { at: Point; t: number; presses: number; i: number; need: number }) {
  const sx = 1 + 0.55 * t, sy = 1 - 0.55 * t;
  if (t >= 1) {
    return (
      <g className="ck-mash-in">
        <path d={blob(at.x, at.y + 6, 58, 30, i + 1)} fill="#d9bf73" opacity=".45" />
        <path d={blob(at.x, at.y, 56, 28, i + 1)} fill="url(#gx-mash)" />
        <path d={blob(at.x - 6, at.y - 5, 34, 14, i + 5)} fill="#fff6d2" opacity=".75" />
        <g transform={`translate(${at.x} ${at.y})`}><MasherGrid print /></g>
      </g>
    );
  }
  return (
    <g data-lump={i} data-presses={presses} data-need={need}>
      <ellipse cx={at.x} cy={at.y + 22 * sy + 4} rx={36 * sx} ry={8} fill="#6b4a1a" opacity=".18" />
      <g transform={`translate(${at.x} ${at.y}) scale(${sx.toFixed(2)} ${sy.toFixed(2)})`}>
        <g className="ck-lump" data-i={i}>
          {/* side of the chunk, then its round cut top with the banana's seedy centre */}
          <path d="M -34 -4 L -34 10 C -34 26 34 26 34 10 L 34 -4 Z" fill="url(#gx-banana-side)" />
          <ellipse cx="0" cy="-4" rx="34" ry="20" fill="url(#gx-banana-top)" stroke="#e2c46e" strokeWidth="1.5" />
          <ellipse cx="0" cy="-4" rx="12" ry="7" fill="#efd98f" opacity=".8" />
          {[[-4, -6], [3, -3], [5, -7], [-2, -1]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.3" fill="#8a6a2e" opacity=".55" />)}
          <ellipse cx="-14" cy="-12" rx="11" ry="4" fill="#fff" opacity=".55" />
        </g>
      </g>
      {presses > 0 && Array.from({ length: presses }, (_, k) => (
        <g key={k} transform={`translate(${at.x + (k - (presses - 1) / 2) * 10} ${at.y - 2}) scale(.7)`}><MasherGrid print /></g>
      ))}
    </g>
  );
}

export function MashBowl({ step, dish, host, handleRef, onMash }: {
  step: MashStep;
  dish: DishState;
  host: GestureHost;
  handleRef: Ref<GestureHandle | null>;
  /** Commit one lump as mashed (the studio keeps undo). */
  onMash: (index: number) => void;
}) {
  const need = mashPressesNeeded(host.tapOnly);
  const done = dish.mash[step.id] ?? [];
  const lumps = mashLumps(step);
  const [raw, setRaw] = useState<number[]>(() => lumps.map(() => 0));
  // After an undo the dish can un-mash a lump; it simply starts over.
  const presses = syncPresses(raw, done, need);
  const progress = mashProgress(presses, done, step.spots, need);
  const L = useLatest({ presses, done, lumps, need, host, onMash, step, progress });
  const toolRef = useRef<SVGGElement>(null);
  const plateRef = useRef<SVGGElement>(null);
  const fxRef = useRef<SVGGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const scrub = useRef<{ t: number; travel: number; last: Point; missed: boolean } | null>(null);
  const view = host.view;
  const rest = { x: Math.min(view.x + view.w - 70, 640), y: MASH_BOWL.cy + 70 };

  const place = (p: Point) => toolRef.current?.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  const restTool = () => place(rest);

  /** One press of the masher at `p` (or straight onto lump `only`). Returns whether it hit food. */
  function press(p: Point, opts: { snap: number; only?: number; whole?: boolean }) {
    const c = L.current, h = c.host;
    if (h.locked()) return false;
    let result;
    if (opts.only != null) {
      const i = opts.only;
      if (c.done.includes(i)) return false;
      const next = [...c.presses];
      next[i] = opts.whole ? c.need : Math.min(c.need, next[i] + 1);
      result = { presses: next, hit: [i], finished: next[i] >= c.need ? [i] : [] };
    } else {
      const radius = Math.max(48, 40 / pxPerUnit(h));
      result = mashPress(c.presses, c.lumps, c.done, p, { need: c.need, radius, snap: opts.snap });
    }
    const at = result.hit.length ? c.lumps[result.hit[0]] : p;
    place(at);
    pop(plateRef.current, [{ transform: "translateY(-14px)" }, { transform: "translateY(4px)" }, { transform: "translateY(0)" }], { duration: 200, easing: "ease-out" }, h.reduced);
    if (!result.hit.length) return false;
    setRaw(result.presses);
    for (const i of result.finished) c.onMash(i);
    const level = mashProgress(result.presses, [...c.done, ...result.finished], c.step.spots, c.need);
    h.sound("mash", { food: c.step.food, level });
    // Squash and stretch on the lumps that were pressed.
    for (const i of result.hit) {
      const node = layerRef.current?.querySelector(`.ck-lump[data-i="${i}"]`);
      pop(node ?? null, [{ transform: "scale(1.3, .62)" }, { transform: "scale(1)" }], { duration: 260, easing: "cubic-bezier(.3,1.6,.5,1)" }, h.reduced);
      const l = c.lumps[i];
      burst(fxRef.current, l.x, l.y - 6, { n: 6, colors: FOOD_JUICE[c.step.food]?.colors ?? FOOD_JUICE.banana.colors, speed: 5, up: 4, r: [2, 4], gravity: 0.25, life: 22 }, h.reduced);
    }
    shake(h.stageRef.current, 1.5, h.reduced);
    return true;
  }

  useImperativeHandle(handleRef, () => ({
    // A tap on a labelled spot is one press; Enter/Space mashes that spot all the way.
    tap: (i: number, viaPointer: boolean) => { press(L.current.lumps[i], { snap: 0, only: i, whole: !viaPointer }); },
  }));

  useStageDrag(host, {
    down: (_e, p, onHotspot) => {
      const h = L.current.host;
      if (h.locked()) return false;
      scrub.current = { t: performance.now(), travel: 0, last: p, missed: false };
      // Presses on a labelled spot are handled by its button (so keyboard and tap agree).
      if (onHotspot) { if (!h.tapOnly) place(p); return; }
      const hit = press(p, { snap: h.tapOnly ? Infinity : 130 });
      if (!hit) { scrub.current.missed = true; h.nudge(`Press the masher on the ${L.current.step.food} lumps!`); }
    },
    move: (_e, p, moved) => {
      const s = scrub.current, h = L.current.host;
      if (!s || h.tapOnly) return;
      place(p);
      s.travel += Math.hypot(p.x - s.last.x, p.y - s.last.y);
      s.last = p;
      if (!moved) return;
      const now = performance.now();
      // Hold and scrub: moving over the lumps keeps mashing, about 6 presses a second.
      if (scrubDue(now - s.t, s.travel)) { s.t = now; s.travel = 0; press(p, { snap: 0 }); }
    },
    up: () => { scrub.current = null; window.setTimeout(restTool, 260); },
    hover: (p) => { if (!L.current.host.tapOnly) { if (p) place({ x: p.x, y: p.y - 10 }); else restTool(); } },
  });

  const B = MASH_BOWL;
  return (
    <>
      <GestureLayer view={view} className="ck-mash-layer">
        <defs>
          <radialGradient id="gx-bowl" cx=".45" cy=".3" r=".8"><stop offset="0" stopColor="#ffffff" /><stop offset=".7" stopColor="#e9f5f2" /><stop offset="1" stopColor="#b9dcd4" /></radialGradient>
          <radialGradient id="gx-bowl-in" cx=".5" cy=".35" r=".7"><stop offset="0" stopColor="#ffffff" /><stop offset=".75" stopColor="#eef4f2" /><stop offset="1" stopColor="#c6d6d2" /></radialGradient>
          <radialGradient id="gx-mash" cx=".42" cy=".38" r=".7"><stop offset="0" stopColor="#fff4c8" /><stop offset=".65" stopColor="#f3dd94" /><stop offset="1" stopColor="#ddbd68" /></radialGradient>
          <radialGradient id="gx-banana-top" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#fffbea" /><stop offset=".6" stopColor="#fbeec0" /><stop offset="1" stopColor="#ecd48a" /></radialGradient>
          <linearGradient id="gx-banana-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e3a3" /><stop offset="1" stopColor="#d7b65f" /></linearGradient>
          <clipPath id="gx-bowl-clip"><ellipse cx={B.cx} cy={B.cy} rx={B.rx - 14} ry={B.ry - 12} /></clipPath>
        </defs>
        <ellipse cx={B.cx + 6} cy={B.cy + B.ry - 2} rx={B.rx + 4} ry="20" fill="#4a3118" opacity=".2" />
        <ellipse cx={B.cx} cy={B.cy + 8} rx={B.rx} ry={B.ry} fill="#7cc7b8" />
        <ellipse cx={B.cx} cy={B.cy} rx={B.rx} ry={B.ry} fill="url(#gx-bowl)" stroke="#6fb3a7" strokeWidth="3" />
        <ellipse cx={B.cx} cy={B.cy + 4} rx={B.rx - 14} ry={B.ry - 12} fill="url(#gx-bowl-in)" />
        <g clipPath="url(#gx-bowl-clip)">
          {/* the smooth mash spreads across the bottom as the lumps go */}
          <ellipse cx={B.cx} cy={B.cy + 10} rx={40 + 150 * progress} ry={22 + 72 * progress} fill="url(#gx-mash)" opacity={progress > 0 ? 0.95 : 0}
            style={{ transition: host.reduced ? undefined : "rx 300ms ease-out, ry 300ms ease-out" }} />
          <g ref={layerRef}>
            {lumps.map((at, i) => (
              <Lump key={i} at={at} i={i} need={need} presses={done.includes(i) ? need : presses[i]} t={done.includes(i) ? 1 : presses[i] / need} />
            ))}
          </g>
        </g>
        <path d={`M ${B.cx - B.rx + 30} ${B.cy - 40} A ${B.rx} ${B.ry} 0 0 1 ${B.cx - 40} ${B.cy - B.ry + 6}`} stroke="#fff" strokeWidth="7" fill="none" opacity=".8" strokeLinecap="round" />
        <g ref={fxRef} />
        <g ref={toolRef} transform={`translate(${rest.x} ${rest.y})`} className="ck-masher">
          <g ref={plateRef}><MasherArt /></g>
        </g>
      </GestureLayer>
      <GestureMeter label="Mashing: lumpy to smooth" value={progress} left="Lumpy" right="Smooth" />
    </>
  );
}
