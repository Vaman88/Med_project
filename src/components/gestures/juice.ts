// "Juice" for the cooking gestures: little particles (juice drops, crumbs, splashes),
// a tiny board shake and squash pops. Everything is skipped when the child's device
// asks for reduced motion. Particles are plain SVG circles moved by one rAF loop per
// layer, capped at about 40 so cheap phones stay smooth.

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_PARTICLES = 40;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface BurstOptions {
  n?: number;
  colors?: readonly string[];
  speed?: number;
  up?: number;
  r?: readonly [number, number];
  gravity?: number;
  life?: number;
  /** Particles bounce softly on this y (the board or the bowl floor). */
  floor?: number | null;
  /** Throw direction in radians; omitted = a fountain in every direction. */
  dir?: number | null;
}

interface Particle { el: SVGCircleElement; x: number; y: number; vx: number; vy: number; g: number; life: number; floor: number | null }
interface LayerState { list: Particle[]; raf: number }
const layers = new WeakMap<SVGGElement, LayerState>();

function step(layer: SVGGElement) {
  const st = layers.get(layer);
  if (!st) return;
  for (let i = st.list.length - 1; i >= 0; i--) {
    const p = st.list[i];
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.97;
    if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.25; p.vx *= 0.5; }
    p.life--;
    p.el.setAttribute("cx", p.x.toFixed(1));
    p.el.setAttribute("cy", p.y.toFixed(1));
    p.el.setAttribute("opacity", Math.max(0, Math.min(1, p.life / 12)).toFixed(2));
    if (p.life <= 0) { p.el.remove(); st.list.splice(i, 1); }
  }
  st.raf = st.list.length && layer.isConnected ? requestAnimationFrame(() => step(layer)) : 0;
  if (!layer.isConnected) { st.list.forEach((p) => p.el.remove()); st.list.length = 0; }
}

/** Throws a small burst of particles from (x, y) in SVG units. */
export function burst(layer: SVGGElement | null, x: number, y: number, o: BurstOptions = {}, reduced = prefersReducedMotion()) {
  if (!layer || reduced || typeof requestAnimationFrame === "undefined") return;
  const { n = 8, colors = ["#f4a340"], speed = 5, up = 5, r = [2, 5], gravity = 0.35, life = 30, floor = null, dir = null } = o;
  let st = layers.get(layer);
  if (!st) { st = { list: [], raf: 0 }; layers.set(layer, st); }
  for (let i = 0; i < n; i++) {
    const el = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
    el.setAttribute("r", (r[0] + Math.random() * (r[1] - r[0])).toFixed(1));
    el.setAttribute("fill", colors[i % colors.length]);
    el.setAttribute("cx", String(x));
    el.setAttribute("cy", String(y));
    layer.appendChild(el);
    const a = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * 1.1;
    const sp = speed * (0.4 + Math.random() * 0.6);
    st.list.push({ el, x, y, vx: Math.cos(a) * sp, vy: dir == null ? -Math.random() * up - 1 : Math.sin(a) * sp, g: gravity, life: life + Math.random() * 12, floor });
  }
  if (st.list.length > MAX_PARTICLES) st.list.splice(0, st.list.length - MAX_PARTICLES).forEach((p) => p.el.remove());
  if (!st.raf) st.raf = requestAnimationFrame(() => step(layer));
}

/** A tiny shake (2 to 3 px at most) of the stage when the knife or masher lands. */
export function shake(node: Element | null, magnitude = 2, reduced = prefersReducedMotion()) {
  if (!node || reduced || !("animate" in node)) return;
  const m = Math.min(3, Math.max(0, magnitude));
  node.animate([
    { transform: "translate(0, 0)" },
    { transform: `translate(${-m}px, ${m * 0.6}px)` },
    { transform: `translate(${m}px, ${-m * 0.4}px)` },
    { transform: "translate(0, 0)" },
  ], { duration: 170, easing: "ease-out" });
}

/** Plays a short keyframe pop (squash, bounce) unless motion is reduced. */
export function pop(node: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions, reduced = prefersReducedMotion()) {
  if (!node || reduced || !("animate" in node)) return null;
  return node.animate(frames, options);
}

/** Juice and crumb colours for each food that can be cut or mashed. */
export const FOOD_JUICE: Record<string, { colors: string[]; wet: boolean }> = {
  banana: { colors: ["#fff3c4", "#f6e08f", "#fffbe6"], wet: false },
  strawberry: { colors: ["#ff3355", "#ff8099", "#d1102d"], wet: true },
  tomato: { colors: ["#ff5a3c", "#ffb08a", "#f2d27a"], wet: true },
  pepper: { colors: ["#ff6b55", "#fff1d8", "#ffd0c4"], wet: true },
  carrot: { colors: ["#ff9a2e", "#ffc066", "#e56b0a"], wet: false },
};
