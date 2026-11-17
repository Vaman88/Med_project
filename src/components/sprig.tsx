"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChildProgress } from "@/lib/child-progress";

/**
 * Sprig, the Healthy Steps companion: a pinto bean that sprouts and grows as the
 * child cooks. Two leaves to start, one more leaf per finished dish (up to eight),
 * a flower at 10 dishes and a bean pod at 15, so progress shows on Sprig itself.
 */
export type SprigMood = "hello" | "cheer" | "think" | "encourage";

const LEAF_GOAL = 6;
const FLOWER_AT = 10;
const POD_AT = 15;

/** Every dish the child has finished, counting repeats. */
export const dishesCooked = (progress: Pick<ChildProgress, "completed">) =>
  Object.values(progress.completed).reduce((sum, n) => sum + n, 0);

export function sprigGrowth(dishes: number) {
  const d = Math.max(0, Math.floor(dishes));
  return { leaves: Math.min(2 + d, 2 + LEAF_GOAL), flower: d >= FLOWER_AT, pod: d >= POD_AT };
}

/** What the next milestone is, in words a child can follow. */
export function sprigNextGoal(dishes: number): string {
  if (dishes < LEAF_GOAL) return "Cook a dish and Sprig grows a new leaf.";
  if (dishes < FLOWER_AT) {
    const left = FLOWER_AT - dishes;
    return `${left} more ${left === 1 ? "dish" : "dishes"} until Sprig grows a flower.`;
  }
  if (dishes < POD_AT) {
    const left = POD_AT - dishes;
    return `${left} more ${left === 1 ? "dish" : "dishes"} until Sprig grows a bean pod.`;
  }
  return "Sprig is fully grown, with a flower and a bean pod!";
}

const INK = "#2d1b0f";

function Face({ mood }: { mood: SprigMood }) {
  const cheeks = (
    <>
      <ellipse cx="-25" cy="9" rx="6.5" ry="4" fill="#ff7f86" opacity=".6" />
      <ellipse cx="25" cy="9" rx="6.5" ry="4" fill="#ff7f86" opacity=".6" />
    </>
  );
  if (mood === "cheer")
    return (
      <g>
        <path d="M-21 -3 Q-14 -13 -7 -3" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M7 -3 Q14 -13 21 -3" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M-12 7 Q0 25 12 7 Z" fill="#7a2a1a" />
        <path d="M-6 15 Q0 21 6 15 Q0 12 -6 15 Z" fill="#ff8a7a" />
        {cheeks}
      </g>
    );
  if (mood === "think")
    return (
      <g>
        <ellipse cx="-11" cy="-7" rx="6" ry="8" fill={INK} />
        <ellipse cx="17" cy="-7" rx="6" ry="8" fill={INK} />
        <circle cx="-9" cy="-10" r="2.4" fill="#fff" />
        <circle cx="19" cy="-10" r="2.4" fill="#fff" />
        <path d="M8 -22 Q16 -27 24 -22" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M-4 13 Q3 9 10 13" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  if (mood === "encourage")
    return (
      <g>
        <ellipse cx="-14" cy="-3" rx="6" ry="7.5" fill={INK} />
        <ellipse cx="14" cy="-3" rx="6" ry="7.5" fill={INK} />
        <circle cx="-12" cy="-6" r="2.4" fill="#fff" />
        <circle cx="16" cy="-6" r="2.4" fill="#fff" />
        <path d="M-22 -17 Q-15 -21 -8 -18" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M8 -18 Q15 -21 22 -17" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M-8 11 Q0 17 8 11" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        {cheeks}
      </g>
    );
  return (
    <g>
      <ellipse cx="-14" cy="-4" rx="6.5" ry="8.5" fill={INK} />
      <ellipse cx="14" cy="-4" rx="6.5" ry="8.5" fill={INK} />
      <circle cx="-11.5" cy="-7.5" r="2.6" fill="#fff" />
      <circle cx="16.5" cy="-7.5" r="2.6" fill="#fff" />
      <path d="M-10 10 Q0 20 10 10" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      {cheeks}
    </g>
  );
}

/** One leaf, drawn pointing right from its base at (0, 0). */
function Leaf({ x, y, angle, scale = 1, light = false }: { x: number; y: number; angle: number; scale?: number; light?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path d="M0 0 C14 -20 40 -18 44 -4 C34 6 14 8 0 0 Z" fill={light ? "#7fd156" : "#6cc04a"} />
      <path d="M0 0 C14 -4 28 -5 40 -4" fill="none" stroke="#4c9a2a" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

/** How tall Sprig's drawing is (in drawing units, 200 wide) at a growth stage. */
function sprigTop(dishes: number) {
  const { leaves, flower } = sprigGrowth(dishes);
  return 26 - (leaves - 2) * 9 - (flower ? 10 : 0);
}
const viewTop = (dishes: number) => Math.min(0, sprigTop(dishes) - 34);

/** Where Sprig is looking, from -1 (left/up) to 1 (right/down). */
export type SprigLook = { x: number; y: number };

export function SprigArt({ mood = "hello", dishes = 0, look = { x: 0, y: 0 } }: { mood?: SprigMood; dishes?: number; look?: SprigLook }) {
  const { leaves, flower, pod } = sprigGrowth(dishes);
  // The stem gets taller as extra leaves arrive along it.
  const extra = leaves - 2;
  const top = sprigTop(dishes);
  const side = Array.from({ length: extra }, (_, i) => {
    const y = 58 - (i + 1) * ((58 - top) / (extra + 1));
    return i % 2 ? { x: 103, y, angle: -28, light: true } : { x: 101, y, angle: 208, light: false };
  });
  const minY = viewTop(dishes);
  return (
    <svg className={`sprig-svg sprig-${mood}`} style={{ ["--sprig-lean" as string]: `${look.x * 4}deg` }} viewBox={`0 ${minY} 200 ${200 - minY}`} width="100%" height="100%" aria-hidden="true">
      <ellipse cx="100" cy="184" rx="56" ry="8" fill={INK} opacity=".12" />
      <g className="sprig-body">
        <ellipse cx="80" cy="176" rx="14" ry="7" fill="#8a5528" />
        <ellipse cx="122" cy="176" rx="14" ry="7" fill="#8a5528" />
        <path d="M58 104 C56 64 142 58 148 100 C154 142 130 176 100 174 C66 172 60 140 58 104 Z" fill="#c98a4b" />
        <path d="M70 92 C74 74 96 68 112 72" fill="none" stroke="#e6b27a" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="126" cy="146" rx="5" ry="3" fill="#a86a33" transform="rotate(-20 126 146)" />
        <ellipse cx="78" cy="150" rx="4" ry="2.6" fill="#a86a33" transform="rotate(20 78 150)" />
        <ellipse cx="136" cy="118" rx="3.5" ry="2.4" fill="#a86a33" />
        {pod && (
          <g transform="translate(140 150) rotate(-35)">
            <path d="M0 0 C10 -6 34 -6 44 0 C34 8 10 8 0 0 Z" fill="#5aae3d" />
            <circle cx="14" cy="0" r="4" fill="#97dc6a" /><circle cx="23" cy="0" r="4" fill="#97dc6a" /><circle cx="32" cy="0" r="4" fill="#97dc6a" />
          </g>
        )}
        {/* The face turns toward whatever Sprig is looking at. */}
        <g transform={`translate(${103 + look.x * 6} ${112 + look.y * 4})`} style={{ transition: "transform 180ms ease-out" }}><Face mood={mood} /></g>
      </g>
      <g className="sprig-sprout">
        <path d={`M102 66 C100 50 102 ${top + 12} 104 ${top}`} fill="none" stroke="#4c9a2a" strokeWidth="6" strokeLinecap="round" />
        {side.map((leaf, i) => <Leaf key={i} {...leaf} scale={0.62} />)}
        <Leaf x={104} y={top + 4} angle={200} />
        <Leaf x={104} y={top + 4} angle={-20} light />
        {flower && (
          <g transform={`translate(104 ${top - 6})`}>
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-11" rx="7" ry="11" fill="#ffd23f" transform={`rotate(${a})`} />)}
            <circle r="7" fill="#e8892b" />
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * Sprig with an optional speech bubble. `size` is Sprig's height in CSS pixels; the
 * bubble sits beside Sprig so it never covers the dish.
 */
export function Sprig({ mood = "hello", dishes = 0, size = 96, label, children, className = "" }: {
  mood?: SprigMood; dishes?: number; size?: number; label?: string; children?: ReactNode; className?: string;
}) {
  return (
    <div className={`sprig ${className}`.trim()} style={{ ["--sprig-size" as string]: `${size}px` }}>
      {/* An explicit width from the drawing's shape: an SVG with only a height can default to 300px wide. */}
      <div className="sprig-figure" key={mood} role={label ? "img" : undefined} aria-label={label}
        style={{ width: `${Math.round((size * 200) / (200 - viewTop(dishes)))}px` }}>
        <SprigArt mood={mood} dishes={dishes} />
      </div>
      {children && <div className="sprig-bubble">{children}</div>}
    </div>
  );
}

/** How long a tapped message stays before it fades away. */
export const SAY_FOR_MS = 7000;

/** Friendly lines Sprig says when tapped: real, simple cooking and food tips. */
const TAP_LINES = [
  "Hee hee, that tickles!",
  "Wash your hands before you cook. Scrub for 20 seconds!",
  "Fruits and veggies come in every color. Try to eat a rainbow!",
  "A grown-up handles knives and hot stoves. You’re the star chef!",
  "Beans like me are full of fiber and protein!",
  "Tasting a new food? One tiny bite is brave!",
  "Water is the best drink for a thirsty chef.",
];

/**
 * Sprig, alive: the eyes follow your finger or mouse, and a tap makes Sprig giggle,
 * hop and share a cooking tip. It is a real button, so a keyboard works too.
 */
export function InteractiveSprig({ mood = "hello", dishes = 0, size = 96, children, className = "", label = "Sprig the bean sprout. Tap for a cooking tip." }: {
  mood?: SprigMood; dishes?: number; size?: number; children?: ReactNode; className?: string; label?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [look, setLook] = useState<SprigLook>({ x: 0, y: 0 });
  const [tapped, setTapped] = useState<{ line: string; key: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const lineIndex = useRef(0);
  useEffect(() => {
    let frame = 0;
    const follow = (e: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.55);
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        setLook({ x: clamp(dx / 260), y: clamp(dy / 260) });
      });
    };
    window.addEventListener("pointermove", follow, { passive: true });
    window.addEventListener("pointerdown", follow, { passive: true });
    return () => { window.removeEventListener("pointermove", follow); window.removeEventListener("pointerdown", follow); if (frame) window.cancelAnimationFrame(frame); window.clearTimeout(timer.current); };
  }, []);
  function poke() {
    const line = TAP_LINES[lineIndex.current % TAP_LINES.length];
    lineIndex.current += 1;
    setTapped({ line, key: Date.now() });
    window.clearTimeout(timer.current);
    // The message stays long enough to read (about 7 seconds), then fades away.
    timer.current = window.setTimeout(() => setTapped(null), SAY_FOR_MS);
  }
  const shownMood: SprigMood = tapped ? "cheer" : mood;
  return (
    <div className={`sprig sprig-live ${className}`.trim()} style={{ ["--sprig-size" as string]: `${size}px` }}>
      {/* Height comes from --sprig-size (CSS can change it per screen); the width follows the drawing's shape. */}
      <button ref={ref} type="button" className="sprig-figure sprig-poke" onClick={poke} aria-label={label}
        style={{ aspectRatio: `200 / ${200 - viewTop(dishes)}` }}>
        <span className="sprig-figure-inner" key={tapped ? `t${tapped.key}` : shownMood}>
          <SprigArt mood={shownMood} dishes={dishes} look={look} />
        </span>
      </button>
      {(tapped || children) && (
        <div className={`sprig-bubble${tapped ? " sprig-bubble-timed" : ""}`} role="status" aria-live="polite" key={tapped?.key ?? "said"}>
          {tapped ? tapped.line : children}
        </div>
      )}
    </div>
  );
}
