import type { LittleRecipe } from "./little-kitchen";
import { dropZone, finalSurface, totalScoops, type DishState, type Drop, type Step } from "./cooking";
import { BOWL, GLASS, PAN, PITA, PLATE, glassSurface, type Point } from "./cooking-geometry";

/**
 * "Make it pretty": the finished dish keeps everything the child chose (which toppings and
 * how many) but the loose pieces slide into a tidy, food-photo arrangement: matching pieces
 * sit together in arcs around the dish, slices fan outward, and one piece crowns the middle.
 */
export function plateDish(recipe: LittleRecipe, plan: Step[], dish: DishState): DishState {
  const zone = finalSurface(recipe);
  const scoops = totalScoops(dish, plan, "glass");
  // Only free-placed pieces move. Fixed placements (the bread, a tortilla) and skewer slots stay put.
  const movable = new Set(plan.filter((s) => s.kind === "drop" && !s.fixed && !s.slots && s.zone === zone).map((s) => s.id));
  const last = [...plan].reverse().find((s): s is Step & { kind: "drop" } => s.kind === "drop" && movable.has(s.id));
  if (!last) return dish;
  const { area, keepOut } = dropZone(last, dish, plan);
  const pick = (d: Drop) => movable.has(d.step) && d.zone === zone && (zone !== "glass" || d.lvl >= scoops);
  const pieces = dish.drops.filter(pick);
  if (pieces.length < 2) return dish;

  // Group matching pieces so they form neat sections; the biggest group goes on the outside.
  const groups = new Map<string, Drop[]>();
  for (const d of pieces) groups.set(d.asset, [...(groups.get(d.asset) ?? []), d]);
  const ordered = [...groups.values()].sort((a, b) => b.length - a.length || a[0].asset.localeCompare(b[0].asset)).flat();

  const n = ordered.length;
  const inner0 = keepOut ? Math.min(0.62, keepOut.r / area.rx + 0.14) : 0.4;
  const useCenter = !keepOut && n % 2 === 1 && n > 2;
  const ringCount = n - (useCenter ? 1 : 0);
  const outerN = ringCount > 7 ? Math.ceil(ringCount * 0.6) : ringCount;
  const innerN = ringCount - outerN;
  const outerR = innerN ? 0.72 : keepOut ? Math.max(inner0, 0.7) : 0.52;
  const slots: { p: Point; angle: number }[] = [];
  const ring = (count: number, r: number, offset: number) => {
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      slots.push({ p: { x: area.cx + Math.cos(a) * area.rx * r, y: area.cy + Math.sin(a) * area.ry * r }, angle: a });
    }
  };
  ring(outerN, outerR, -Math.PI / 2);
  if (innerN) ring(innerN, inner0, -Math.PI / 2 + Math.PI / Math.max(1, innerN));
  if (useCenter) slots.push({ p: { x: area.cx, y: area.cy }, angle: 0 });

  const placed = new Map<number, Drop>();
  ordered.forEach((d, i) => {
    const s = slots[i];
    // Slices and coins fan out along the ring; piles and whole pieces keep a gentle tilt.
    const fan = /:(slice|coin|strip|piece|dice)$/.test(d.asset);
    const rot = fan ? Math.round((s.angle * 180) / Math.PI + 90) % 360 : Math.round(d.rot * 0.3);
    placed.set(d.id, { ...d, x: Math.round(s.p.x * 10) / 10, y: Math.round(s.p.y * 10) / 10, rot });
  });
  return { ...dish, drops: dish.drops.map((d) => placed.get(d.id) ?? d) };
}

/** The finishing touch a child adds at the end: what it is, the button wording, and the colours. */
export type GarnishKind = "mint" | "honey" | "herbs" | "cinnamon" | "seeds" | "cocoa";
export const GARNISH: Record<string, { kind: GarnishKind; label: string }> = {
  parfait: { kind: "mint", label: "Add a mint leaf" },
  "smoothie-bowl": { kind: "mint", label: "Add a mint leaf" },
  "fruit-salad": { kind: "mint", label: "Add a mint leaf" },
  "fruit-kabobs": { kind: "mint", label: "Add a mint leaf" },
  "oatmeal-bowl": { kind: "honey", label: "Drizzle some honey" },
  pancakes: { kind: "honey", label: "Drizzle some honey" },
  "banana-oat-cookies": { kind: "cinnamon", label: "Dust with cinnamon" },
  brownies: { kind: "cocoa", label: "Dust with cocoa" },
  "hummus-toast": { kind: "seeds", label: "Sprinkle sesame seeds" },
  "avocado-toast": { kind: "seeds", label: "Sprinkle some seeds" },
};
export const garnishFor = (recipeId: string) => GARNISH[recipeId] ?? { kind: "herbs" as const, label: "Sprinkle fresh herbs" };

/** Where the garnish sits on each kind of finished dish, in scene coordinates. */
export function garnishSpot(recipe: LittleRecipe, plan: Step[], dish: DishState): { cx: number; cy: number; rx: number; ry: number } {
  switch (finalSurface(recipe)) {
    case "glass": { const top = glassSurface(totalScoops(dish, plan, "glass")); return { cx: GLASS.cx, cy: top.cy, rx: top.rx * 0.75, ry: top.ry * 0.75 }; }
    case "bowl": return { cx: BOWL.cx, cy: BOWL.cy, rx: BOWL.rx * 0.62, ry: BOWL.ry * 0.62 };
    case "pita": return { cx: PITA.cx, cy: PITA.cy, rx: PITA.rx * 0.62, ry: PITA.ry * 0.62 };
    case "plate": return { cx: PLATE.cx, cy: PLATE.cy, rx: PLATE.rx * 0.6, ry: PLATE.ry * 0.6 };
    default: return { cx: PAN.cx, cy: PAN.cy, rx: PAN.rx * 0.6, ry: PAN.ry * 0.6 };
  }
}
