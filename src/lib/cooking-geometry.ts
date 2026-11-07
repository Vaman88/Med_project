// Every cooking surface is drawn in one fixed SVG coordinate system. Items store
// positions in these units, so they stay aligned however the stage is resized.
export type Surface = "board" | "glass" | "bowl" | "pita" | "pan" | "plate";
export interface Ellipse { cx: number; cy: number; rx: number; ry: number }
export interface Point { x: number; y: number }
export interface ViewBox { x: number; y: number; w: number; h: number }

// Wide view for laptops and tablets; the tall view crops the quiet counter
// edges so the dish gets more room on a portrait phone.
export const VIEW_WIDE: ViewBox = { x: 90, y: 44, w: 620, h: 430 };
export const VIEW_TALL: ViewBox = { x: 140, y: 44, w: 520, h: 430 };
// On a portrait phone each step gets its own close framing ("camera"): the wide
// cutting board keeps the tall view, while the glass and the round dishes are
// cropped square around the food so they fill the screen.
const VIEW_TALL_BOARD: ViewBox = { x: 176, y: 78, w: 448, h: 384 };
const VIEW_TALL_GLASS: ViewBox = { x: 232, y: 56, w: 336, h: 416 };
const VIEW_TALL_ROUND: ViewBox = { x: 182, y: 46, w: 436, h: 432 };
export function viewFor(surface: Surface, tall: boolean): ViewBox {
  if (!tall) return VIEW_WIDE;
  if (surface === "glass") return VIEW_TALL_GLASS;
  if (surface === "board") return VIEW_TALL_BOARD;
  return VIEW_TALL_ROUND;
}

// Explicit paint order for every scene (low to high). The dragged ghost is an
// HTML element above all of these.
export const LAYERS = {
  counter: 0,
  shadow: 1,
  containerBack: 2,
  contents: 3,
  toppings: 4,
  containerFront: 5,
  tools: 6,
  markers: 7,
} as const;

export const BOARD: Ellipse = { cx: 400, cy: 262, rx: 250, ry: 140 };
export const BOARD_FOOD = { cx: 400, cy: 262, length: 360 };
export const BOWL: Ellipse = { cx: 400, cy: 262, rx: 176, ry: 176 };
export const PITA: Ellipse = { cx: 400, cy: 262, rx: 168, ry: 168 };
export const PAN: Ellipse = { cx: 400, cy: 262, rx: 190, ry: 190 };
export const PLATE: Ellipse = { cx: 400, cy: 262, rx: 200, ry: 186 };

export const GLASS = {
  cx: 400,
  rimY: 92,
  bottomY: 436,
  rimRx: 128,
  bottomRx: 92,
  scoopHeight: 78,
  maxScoops: 4,
} as const;

export function glassRadius(y: number): number {
  const t = (GLASS.bottomY - y) / (GLASS.bottomY - GLASS.rimY);
  return GLASS.bottomRx + (GLASS.rimRx - GLASS.bottomRx) * Math.max(0, Math.min(1, t));
}
export function glassSurfaceY(scoops: number): number {
  return GLASS.bottomY - 8 - Math.min(GLASS.maxScoops, scoops) * GLASS.scoopHeight;
}
// The visible top of yogurt (or of the empty glass floor) at a given fill.
export function glassSurface(scoops: number): Ellipse {
  const y = glassSurfaceY(scoops);
  const rx = glassRadius(y) - 6;
  return { cx: GLASS.cx, cy: y, rx, ry: rx * 0.26 };
}

export function clampToEllipse(e: Ellipse, p: Point, inset = 0.82): Point {
  const dx = (p.x - e.cx) / (e.rx * inset);
  const dy = (p.y - e.cy) / (e.ry * inset);
  const d = Math.hypot(dx, dy);
  if (d <= 1) return { x: p.x, y: p.y };
  return { x: e.cx + (dx / d) * e.rx * inset, y: e.cy + (dy / d) * e.ry * inset };
}

// Deterministic, well spread spots for tap and keyboard placement.
export function autoSpot(e: Ellipse, existing: Point[], inset = 0.7): Point {
  let best: Point = { x: e.cx, y: e.cy };
  let bestGap = -1;
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.399963;
    const radius = Math.sqrt((i + 0.5) / 24) * inset;
    const spot = {
      x: e.cx + Math.cos(angle) * e.rx * radius,
      y: e.cy + Math.sin(angle) * e.ry * radius,
    };
    const gap = existing.length
      ? Math.min(...existing.map((o) => Math.hypot(o.x - spot.x, (o.y - spot.y) * (e.rx / e.ry))))
      : 999;
    if (gap > bestGap) { bestGap = gap; best = spot; }
  }
  return best;
}

export function cutPositions(count: number, length = BOARD_FOOD.length): number[] {
  const left = BOARD_FOOD.cx - length / 2;
  return Array.from({ length: count }, (_, i) => left + (length * (i + 1)) / (count + 1));
}
export function cutLength(food: string): number {
  return food === "strawberry" ? 250 : food === "tomato" ? 270 : food === "pepper" ? 300 : 360;
}

// The sauce, cheese and similar spreads are measured on a grid over the pita.
export const PAINT_GRID = 14;
export const PAINT_AREA = { x: PITA.cx - PITA.rx, y: PITA.cy - PITA.ry, size: PITA.rx * 2 };
const cell = PAINT_AREA.size / PAINT_GRID;
export const paintCellCenter = (index: number): Point => ({
  x: PAINT_AREA.x + ((index % PAINT_GRID) + 0.5) * cell,
  y: PAINT_AREA.y + (Math.floor(index / PAINT_GRID) + 0.5) * cell,
});
export const PAINT_VALID: number[] = Array.from({ length: PAINT_GRID * PAINT_GRID }, (_, i) => i)
  .filter((i) => {
    const c = paintCellCenter(i);
    return Math.hypot(c.x - PITA.cx, c.y - PITA.cy) <= PITA.rx - 10;
  });
export function paintAt(covered: number[], p: Point, radius = 40): number[] {
  const next = new Set(covered);
  for (const i of PAINT_VALID) {
    const c = paintCellCenter(i);
    if (Math.hypot(c.x - p.x, c.y - p.y) <= radius) next.add(i);
  }
  return next.size === covered.length ? covered : [...next].sort((a, b) => a - b);
}
// Keyboard and tap alternative: grows a patch outward from the middle.
const PAINT_ORDER = [...PAINT_VALID].sort((a, b) => {
  const da = paintCellCenter(a), db = paintCellCenter(b);
  return Math.hypot(da.x - PITA.cx, da.y - PITA.cy) - Math.hypot(db.x - PITA.cx, db.y - PITA.cy);
});
export function paintNext(covered: number[], amount = 24): number[] {
  const have = new Set(covered);
  const add = PAINT_ORDER.filter((i) => !have.has(i)).slice(0, amount);
  return add.length ? [...covered, ...add].sort((a, b) => a - b) : covered;
}
export const paintCoverage = (covered: number[]) =>
  covered.filter((i) => PAINT_VALID.includes(i)).length / PAINT_VALID.length;

export function angleBetween(center: Point, p: Point): number {
  return (Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI;
}
export function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
