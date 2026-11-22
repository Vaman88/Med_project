// Pure gesture rules for the cooking game: chopping with a downward knife swipe,
// mashing with presses or a scrub, and stirring/whisking in circles. Everything is
// in the scene's SVG units and has no DOM access, so it can be unit-tested.
// The rules are forgiving on purpose (players are about 5 to 12): there are no
// fail states, a near miss is snapped to the closest target, and a miss only
// earns a gentle nudge.

export interface Pt { x: number; y: number }

// ------------------------------------------------------------------- chop --

/** One dashed cut line across the food: its x and the food's top and bottom there. */
export interface ChopGuide { index: number; x: number; top: number; bottom: number }

export const CHOP = {
  /** How far the knife must travel down in one stroke before it counts as a chop. */
  minDrop: 34,
  /** The knife has to reach this far into the food (0 = top edge, 1 = bottom edge). */
  depth: 0.3,
  /** Default sideways reach around a line, in SVG units. */
  reach: 46,
} as const;

/**
 * Where each uncut line sits on screen. Pieces that are already cut slide apart
 * (`gap` per cut to their left, centred), so a line moves with the piece it is on.
 */
export function chopGuideX(baseX: number[], done: readonly number[], gap: number): number[] {
  return baseX.map((x, i) => x + (done.filter((c) => c < i).length - done.length / 2) * gap);
}

export type ChopResult = { kind: "cut"; index: number } | { kind: "miss" } | null;

/**
 * Decides whether a pointer move from `prev` to `p` chops a line. `minY` is the
 * highest point (smallest y) of the stroke since its last chop. A chop needs a
 * downward stroke of `minDrop` that reaches into the food near an uncut line.
 * A stroke that comes down into the food away from every line is a "miss".
 */
export function chopAt(
  prev: Pt, p: Pt, minY: number, guides: readonly ChopGuide[],
  opts: { reach?: number; minDrop?: number; foodLeft?: number; foodRight?: number } = {},
): ChopResult {
  if (!guides.length) return null;
  const reach = opts.reach ?? CHOP.reach;
  if (p.y - minY < (opts.minDrop ?? CHOP.minDrop) || p.y < prev.y - 2) return null;
  // Fast swipes jump many units between events, so measure the line's distance to
  // the whole horizontal span the knife just covered, not only to its end point.
  const lo = Math.min(prev.x, p.x), hi = Math.max(prev.x, p.x);
  const dist = (x: number) => (x < lo ? lo - x : x > hi ? x - hi : 0);
  let best: ChopGuide | null = null, bestD = Infinity;
  for (const g of guides) {
    const d = dist(g.x);
    // A tie (both lines inside the span) goes to the line nearest the end point.
    if (d < bestD || (d === bestD && best && Math.abs(g.x - p.x) < Math.abs(best.x - p.x))) { best = g; bestD = d; }
  }
  if (!best) return null;
  const into = best.top + (best.bottom - best.top) * CHOP.depth;
  if (p.y < into) return null;
  if (bestD <= reach) return { kind: "cut", index: best.index };
  const left = opts.foodLeft ?? -Infinity, right = opts.foodRight ?? Infinity;
  return p.x > left - reach && p.x < right + reach ? { kind: "miss" } : null;
}

/** For taps (tap-only mode or a helping hand): the closest uncut line, or the first one. */
export function nearestGuide(guides: readonly ChopGuide[], x: number | null, within = 90): ChopGuide | null {
  if (!guides.length) return null;
  if (x == null) return guides[0];
  const best = [...guides].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  return Math.abs(best.x - x) <= within ? best : guides[0];
}

// ------------------------------------------------------------------- mash --

/** Presses each lump needs before it is mash. Younger chefs (tap-only) need fewer. */
export const mashPressesNeeded = (tapOnly: boolean) => (tapOnly ? 2 : 3);

export interface MashPress { presses: number[]; hit: number[]; finished: number[] }

/**
 * One press of the masher at `p`. Every unfinished lump within `radius` gets one
 * press; if none is that close, the closest lump within `snap` takes it instead
 * (so an imprecise tap still mashes). Returns the new press counts, the lumps that
 * were pressed and those that just became mash.
 */
export function mashPress(
  presses: readonly number[], lumps: readonly Pt[], done: readonly number[], p: Pt,
  opts: { need: number; radius?: number; snap?: number },
): MashPress {
  const radius = opts.radius ?? 56, snap = opts.snap ?? 130;
  const live = lumps.map((l, i) => ({ i, d: Math.hypot(l.x - p.x, l.y - p.y) }))
    .filter(({ i }) => !done.includes(i) && (presses[i] ?? 0) < opts.need);
  let hit = live.filter((l) => l.d <= radius).map((l) => l.i);
  if (!hit.length) {
    const near = [...live].sort((a, b) => a.d - b.d)[0];
    if (near && near.d <= snap) hit = [near.i];
  }
  const next = lumps.map((_, i) => presses[i] ?? 0);
  const finished: number[] = [];
  for (const i of hit) {
    next[i] = Math.min(opts.need, next[i] + 1);
    if (next[i] >= opts.need) finished.push(i);
  }
  return { presses: next, hit, finished };
}

/** After an undo the saved dish may un-mash a lump; start that lump over. */
export function syncPresses(presses: readonly number[], done: readonly number[], need: number): number[] {
  return presses.map((n, i) => (done.includes(i) ? need : n >= need ? 0 : n));
}

/** 0 (lumpy) to 1 (smooth), counting partly mashed lumps. */
export function mashProgress(presses: readonly number[], done: readonly number[], spots: number, need: number): number {
  let sum = 0;
  for (let i = 0; i < spots; i++) sum += done.includes(i) ? need : Math.min(need, presses[i] ?? 0);
  return spots ? sum / (spots * need) : 0;
}

/** Hold-and-scrub: a moving press counts again after `everyMs` and some travel. */
export function scrubDue(sinceLast: number, travelled: number, everyMs = 150, minTravel = 14): boolean {
  return sinceLast >= everyMs && travelled >= minTravel;
}

// ------------------------------------------------------------ stir / whisk --

/** Degrees from `center` to `p`, like a clock hand. */
export const angleOf = (center: Pt, p: Pt) => (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;

/**
 * How far one pointer move turned around the bowl, in degrees (always positive, so
 * either direction counts, and back-and-forth beating counts too). Moves too close
 * to the centre, where the angle jumps around, are ignored, and one event can add at
 * most `maxStep` degrees so a straight swipe across the bowl is not a full turn.
 */
export function turnStep(
  center: Pt, prevAngle: number | null, p: Pt, opts: { deadZone?: number; maxStep?: number } = {},
): { angle: number | null; delta: number } {
  if (Math.hypot(p.x - center.x, p.y - center.y) < (opts.deadZone ?? 26)) return { angle: prevAngle, delta: 0 };
  const a = angleOf(center, p);
  if (prevAngle == null) return { angle: a, delta: 0 };
  let d = a - prevAngle;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return { angle: a, delta: Math.min(Math.abs(d), opts.maxStep ?? 40) };
}

/** Sums a whole drag path into degrees turned (used by tests and the hold helper). */
export function turnsAlong(center: Pt, path: readonly Pt[], opts?: { deadZone?: number; maxStep?: number }): number {
  let angle: number | null = null, total = 0;
  for (const p of path) { const s = turnStep(center, angle, p, opts); angle = s.angle; total += s.delta; }
  return total;
}

/** 0 to 1 for a stir step of `turns` full circles. */
export const stirProgress = (degrees: number, turns: number) => (turns > 0 ? Math.min(1, Math.max(0, degrees / (turns * 360))) : 1);
