import { useId, type CSSProperties, type ReactNode } from "react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { extraScene } from "./cooking-scene-extra";
import {
  browning, stirAmount, totalScoops,
  type AssetKey, type DishState, type Drop, type Step,
} from "@/lib/cooking";
import {
  BOARD, BOARD_FOOD, BOWL, GLASS, PAINT_GRID, PAINT_AREA, PAN, PITA, PLATE,
  cutLength, cutPositions, glassRadius, glassSurface, glassSurfaceY, paintCellCenter,
  type Point, type Surface, type ViewBox,
} from "@/lib/cooking-geometry";
import {
  ART, BatterBowl, Bean, BeansBowl, CornBowl, CornCob, CutFace, Kernel, FOOD_SHAPES, FoodDetail,
  HummusBowl, Shadow, YogurtBowl, YogurtDollop, rnd,
} from "./food-art";

export interface Fx {
  knife: { x: number; y: number; down: boolean } | null;
  masher: { x: number; y: number; down: boolean } | null;
  spoon: { key: number; kind: "scoop" | "pour"; from: Point; to: Point; asset: AssetKey } | null;
  pointer: Point | null;
  stirAngle: number | null;
  flip: { index: number; key: number } | null;
  cooking: boolean;
  target: boolean;
  landed: number | null;
}
export const noFx: Fx = {
  knife: null, masher: null, spoon: null, pointer: null, stirAngle: null,
  flip: null, cooking: false, target: false, landed: null,
};

export interface SceneProps {
  recipe: LittleRecipe;
  plan: Step[];
  dish: DishState;
  step: Step | null;
  surface: Surface;
  fx?: Fx;
  presenting?: boolean;
  view?: ViewBox;
  /** Only the drawing, no counter, for small previews. */
  bare?: boolean;
}

const ITEM_SCALE: Record<Surface, number> = { board: 1.25, glass: 1, bowl: 1.5, pita: 1.8, plate: 1.55, pan: 1.4 };
const ease = (t: number) => t * t * (3 - 2 * t);

function Item({ asset, x, y, rot = 0, scale = 1, pitch = 1, landed, chocolate }: {
  asset: AssetKey; x: number; y: number; rot?: number; scale?: number; pitch?: number; landed?: boolean; chocolate?: boolean;
}) {
  const art = ART[asset];
  if (!art) return null;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={landed ? "ck-drop" : undefined}>
        <g transform={`rotate(${rot}) scale(${scale})`}>{art.draw({ pitch, chocolate })}</g>
      </g>
    </g>
  );
}
const FlatShadow = ({ x, y, r }: { x: number; y: number; r: number }) =>
  <ellipse cx={x} cy={y + r * 0.5} rx={r * 1.05} ry={r * 0.42} fill="url(#fa-shadow)" opacity=".8" />;

function Counter() {
  return (
    <g>
      <rect x="-10" y="-10" width="820" height="520" fill="url(#fa-counter)" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M -10 ${40 + i * 56} Q 400 ${34 + i * 56 + (i % 2) * 8} 810 ${42 + i * 56}`} stroke="#e6d9bd" strokeWidth="1.2" opacity=".45" fill="none" />
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ board --

function boardFood(plan: Step[], dish: DishState, step: Step | null) {
  const idx = step ? plan.indexOf(step) : plan.length - 1;
  let food: string | null = null;
  for (let i = 0; i <= idx && i < plan.length; i++) {
    const s = plan[i];
    if (s.kind === "drop" && s.fixed && s.zone === "board") food = s.items[0].asset.split(":")[0];
    else if (s.kind === "cut" || s.kind === "mash") food = s.food;
  }
  if (!food) return null;
  const placeStep = plan.find((s) => s.id === `place-${food}`);
  const placed = !placeStep || dish.drops.some((d) => d.step === placeStep.id);
  const cutStep = plan.find((s) => s.kind === "cut" && s.food === food);
  const mashStep = plan.find((s) => s.kind === "mash" && s.food === food);
  return { food, placed, cutStep, mashStep };
}

function BoardScene(props: SceneProps & { fx: Fx }) {
  const { plan, dish, step, fx, presenting } = props;
  const uid = useId().replace(/\W/g, "");
  const info = boardFood(plan, dish, step);
  const shape = info ? FOOD_SHAPES[info.food] : null;
  const length = info ? cutLength(info.food) : 0;
  const scale = info && shape ? length / shape.length : 1;
  const mid = shape ? (shape.top + shape.bottom) / 2 : 0;
  const mode = info?.cutStep?.kind === "cut" ? "cut" : info?.mashStep ? "mash" : "whole";
  const segs = mode === "cut" && info?.cutStep?.kind === "cut" ? info.cutStep.cuts + 1
    : mode === "mash" && info?.mashStep?.kind === "mash" ? info.mashStep.spots : 1;
  const done = mode === "cut" && info?.cutStep ? dish.cuts[info.cutStep.id] ?? [] : [];
  const mashed = mode === "mash" && info?.mashStep ? dish.mash[info.mashStep.id] ?? [] : [];
  const half = (length / 2) / scale;
  const bounds = Array.from({ length: segs + 1 }, (_, k) => -half + ((half * 2) * k) / segs);
  const gap = (info?.food === "banana" ? 32 : 22) / scale;

  const body = (k: number) => {
    if (!shape || !info) return null;
    const sepLeft = done.filter((c) => c < k).length;
    const dx = (sepLeft - done.length / 2) * gap;
    const touched = done.includes(k - 1) || done.includes(k);
    const rot = touched ? (k % 2 ? 4 : -3.5) : 0;
    const x0 = bounds[k] - (k === 0 ? 44 : 0.4), x1 = bounds[k + 1] + (k === segs - 1 ? 20 : 0.4);
    const isMashed = mashed.includes(k);
    const cx = (bounds[k] + bounds[k + 1]) / 2;
    return (
      <g key={k} style={{ transform: `translate(${dx}px, 0) rotate(${rot}deg)`, transformOrigin: `${cx}px ${mid}px`, transition: "transform 420ms cubic-bezier(.3,.7,.3,1)" }}>
        {!isMashed && (
          <g>
            <clipPath id={`seg-${uid}-${k}`}><rect x={x0} y={shape.top - 40} width={x1 - x0} height={shape.bottom - shape.top + 80} /></clipPath>
            <g clipPath={`url(#seg-${uid}-${k})`}>
              <path d={shape.path} fill={shape.fill} />
              <FoodDetail food={info.food} />
            </g>
            {mode === "cut" && done.includes(k - 1) && <CutFace food={info.food} x={bounds[k]} side="left" />}
            {mode === "cut" && done.includes(k) && <CutFace food={info.food} x={bounds[k + 1]} side="right" />}
          </g>
        )}
        {isMashed && <MashPatch cx={cx} cy={mid} w={(bounds[k + 1] - bounds[k]) * 1.32} h={(shape.bottom - shape.top) * 0.8} k={k} />}
      </g>
    );
  };

  const knife = fx.knife;
  const masher = fx.masher;
  return (
    <g>
      <Counter />
      <ellipse cx={BOARD.cx} cy={BOARD.cy + BOARD.ry + 8} rx={BOARD.rx + 22} ry="22" fill="url(#fa-shadow)" />
      <g>{/* containerBack: the board itself */}
        <rect x={BOARD.cx - BOARD.rx} y={BOARD.cy - BOARD.ry} width={BOARD.rx * 2} height={BOARD.ry * 2} rx="30" fill="#b98852" />
        <rect x={BOARD.cx - BOARD.rx} y={BOARD.cy - BOARD.ry - 4} width={BOARD.rx * 2} height={BOARD.ry * 2} rx="30" fill="url(#fa-board)" />
        {[-100, -62, -22, 24, 66, 104].map((y, i) => (
          <path key={i} d={`M ${BOARD.cx - BOARD.rx + 24} ${BOARD.cy + y} Q ${BOARD.cx} ${BOARD.cy + y + (i % 2 ? 8 : -8)} ${BOARD.cx + BOARD.rx - 24} ${BOARD.cy + y + 3}`} stroke="#b88548" strokeWidth="1.6" opacity=".26" fill="none" />
        ))}
        <rect x={BOARD.cx - BOARD.rx + 8} y={BOARD.cy - BOARD.ry + 4} width={BOARD.rx * 2 - 16} height={BOARD.ry * 2 - 16} rx="24" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />
        <ellipse cx={BOARD.cx + BOARD.rx - 34} cy={BOARD.cy - BOARD.ry + 24} rx="11" ry="7" fill="#c89a62" opacity=".6" />
      </g>
      {/* set-aside pieces from earlier steps */}
      {plan.map((s) => s.kind === "cut" && (!info || s.food !== info.food) && (dish.cuts[s.id] ?? []).length === s.cuts && (
        <g key={s.id}>
          {Array.from({ length: s.cuts + 1 }, (_, i) => {
            const x = BOARD.cx - BOARD.rx + 70 + (i % 2) * 44 + Math.floor(i / 2) * 10;
            const y = BOARD.cy + BOARD.ry - 62 + Math.floor(i / 2) * 22 - (i % 2) * 6;
            return <g key={i}><FlatShadow x={x} y={y} r={20} /><Item asset={s.result} x={x} y={y} rot={i * 17} scale={1.1} pitch={0.9} /></g>;
          })}
        </g>
      ))}
      {info && shape && (
        <g transform={`translate(${BOARD_FOOD.cx} ${BOARD_FOOD.cy - mid * scale}) scale(${scale})`}>
          {info.placed ? (
            <g>
              {Array.from({ length: segs }, (_, k) => (
                <ellipse key={`s${k}`} cx={(bounds[k] + bounds[k + 1]) / 2} cy={shape.bottom - 4} rx={(bounds[k + 1] - bounds[k]) * 0.52} ry="13" fill="url(#fa-shadow)" opacity=".75" />
              ))}
              {Array.from({ length: segs }, (_, k) => body(k))}
              {mode === "cut" && !presenting && info.cutStep?.kind === "cut" && info.cutStep === step &&
                cutPositions(info.cutStep.cuts, length).map((x, i) => {
                  const lx = (x - BOARD_FOOD.cx) / scale;
                  return done.includes(i) ? null : (
                    <line key={i} className="ck-mark" x1={lx} x2={lx} y1={shape.top - 26} y2={shape.bottom + 18} strokeWidth={3 / scale} strokeDasharray={`${8 / scale} ${7 / scale}`} />
                  );
                })}
            </g>
          ) : (
            <path d={shape.path} fill="none" className="ck-ghost-outline" strokeWidth={3 / scale} strokeDasharray={`${10 / scale} ${8 / scale}`} />
          )}
        </g>
      )}
      {step?.kind === "mash" && masher && (
        <g style={{ transform: `translate(${masher.x}px, ${masher.y + (masher.down ? 70 : -6)}px)`, transition: "transform 200ms ease-out" }}>
          <Masher />
        </g>
      )}
      {step?.kind === "cut" && (
        <g style={{ transform: `translate(${knife?.x ?? Math.min(678, (props.view?.x ?? 0) + (props.view?.w ?? 800) - 30)}px, ${(knife?.y ?? 262) + (knife?.down ? 70 : 0)}px) rotate(${knife ? -6 : -14}deg)`, transition: "transform 240ms cubic-bezier(.3,.7,.3,1)" }}>
          <Knife />
        </g>
      )}
    </g>
  );
}

function blobPath(cx: number, cy: number, rx: number, ry: number, seed: number, n = 9): string {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, r = 0.84 + rnd(seed * 13 + i) * 0.26;
    return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r };
  });
  const mid = (p: Point, q: Point) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  let d = `M ${mid(pts[n - 1], pts[0]).x} ${mid(pts[n - 1], pts[0]).y}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q ${pts[i].x} ${pts[i].y} ${m.x} ${m.y}`;
  }
  return d + " Z";
}

function MashPatch({ cx, cy, w, h, k }: { cx: number; cy: number; w: number; h: number; k: number }) {
  return (
    <g className="ck-mash-in" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <path d={blobPath(cx, cy + 7, w * 0.5, h * 0.5, k + 1)} fill="#d9c07c" opacity=".5" />
      <path d={blobPath(cx, cy, w * 0.5, h * 0.5, k + 1)} fill="#f5e4a9" />
      <path d={blobPath(cx - 3, cy - 4, w * 0.36, h * 0.34, k + 5)} fill="#fbf0c6" opacity=".9" />
      {[-0.28, 0.02, 0.3].map((o, i) => <path key={i} d={`M ${cx - w * 0.3} ${cy + o * h} q ${w * 0.15} ${-8 - i * 2} ${w * 0.3} 0 t ${w * 0.3} 0`} stroke="#e4cb82" strokeWidth="2.2" fill="none" strokeLinecap="round" />)}
    </g>
  );
}

function Knife() {
  return (
    <g>
      <ellipse cx="20" cy="150" rx="30" ry="6" fill="url(#fa-shadow)" opacity=".5" />
      <rect x="-12" y="-104" width="26" height="60" rx="12" fill="#8a5a33" />
      <rect x="-8" y="-100" width="7" height="52" rx="3.5" fill="#b78554" opacity=".7" />
      <circle cx="1" cy="-88" r="2.4" fill="#e9e1d0" /><circle cx="1" cy="-64" r="2.4" fill="#e9e1d0" />
      <path d="M -14 -50 L 16 -50 L 16 56 C 16 60 12 62 8 62 L -14 62 C -16 62 -16 58 -16 54 Z" fill="url(#fa-steel)" stroke="#9aa09d" strokeWidth="1" />
      <path d="M -9 -42 L -9 50" stroke="#fff" strokeWidth="3" opacity=".7" />
    </g>
  );
}
function Masher() {
  return (
    <g>
      <rect x="-9" y="-100" width="18" height="72" rx="9" fill="#8a5a33" />
      <rect x="-4" y="-94" width="5" height="60" rx="2.5" fill="#b78554" opacity=".7" />
      <rect x="-50" y="-30" width="100" height="18" rx="9" fill="url(#fa-steel)" stroke="#9aa09d" strokeWidth="1" />
      <rect x="-50" y="-14" width="100" height="20" rx="6" fill="#aeb3b0" />
      {[-40, -26, -12, 2, 16, 30].map((x) => <rect key={x} x={x} y="-12" width="9" height="16" rx="2" fill="#7e8481" />)}
    </g>
  );
}
function Spoon({ load }: { load?: ReactNode }) {
  return (
    <g>
      <rect x="-5" y="-12" width="10" height="150" rx="5" fill="#a87440" transform="rotate(0)" />
      <rect x="-1" y="0" width="3" height="130" rx="1.5" fill="#c99560" opacity=".8" />
      <ellipse cx="0" cy="-18" rx="23" ry="30" fill="#b57e47" />
      <ellipse cx="-1" cy="-20" rx="19" ry="25" fill="#cf9a62" />
      {load}
    </g>
  );
}

// ------------------------------------------------------------------ glass --

function bandPath(y0: number, y1: number): string {
  const r0 = glassRadius(y0) - 5, r1 = glassRadius(y1) - 5;
  const c = GLASS.cx;
  const ry0 = r0 * 0.26, ry1 = r1 * 0.26;
  return `M ${c - r1} ${y1} A ${r1} ${ry1} 0 0 0 ${c + r1} ${y1} L ${c + r0} ${y0} A ${r0} ${ry0} 0 0 1 ${c - r0} ${y0} Z`;
}

function GlassScene({ plan, dish, step, fx, presenting }: SceneProps & { fx: Fx }) {
  const uid = useId().replace(/\W/g, "");
  const scoops = totalScoops(dish, plan, "glass");
  const top = glassSurface(scoops);
  const c = GLASS.cx;
  const items = dish.drops.filter((d) => d.zone === "glass").sort((a, b) => a.id - b.id);
  const rimRy = GLASS.rimRx * 0.26;
  const baseRy = GLASS.bottomRx * 0.26;
  const bands = Array.from({ length: scoops }, (_, i) => i);
  const spoon = fx.spoon;
  const showBowl = !presenting && (step?.kind === "scoop" || (step === null ? false : scoops === 0));
  const left = `M ${c - GLASS.rimRx} ${GLASS.rimY} L ${c - GLASS.bottomRx} ${GLASS.bottomY}`;
  const right = `M ${c + GLASS.rimRx} ${GLASS.rimY} L ${c + GLASS.bottomRx} ${GLASS.bottomY}`;
  const interior = `M ${c - GLASS.rimRx + 4} ${GLASS.rimY} L ${c - GLASS.bottomRx + 4} ${GLASS.bottomY} A ${GLASS.bottomRx - 4} ${baseRy} 0 0 0 ${c + GLASS.bottomRx - 4} ${GLASS.bottomY} L ${c + GLASS.rimRx - 4} ${GLASS.rimY} A ${GLASS.rimRx - 4} ${rimRy} 0 0 1 ${c - GLASS.rimRx + 4} ${GLASS.rimY} Z`;
  const itemY = (d: Drop) => (d.lvl < scoops ? glassSurfaceY(d.lvl) + glassSurface(d.lvl).ry * 0.7 - 2 : d.y);
  return (
    <g>
      <Counter />
      <ellipse cx={c} cy={GLASS.bottomY + 8} rx={GLASS.bottomRx + 46} ry="26" fill="url(#fa-shadow)" />
      {/* containerBack */}
      <path d={`${interior}`} fill="#dfe9e2" fillOpacity=".55" />
      <ellipse cx={c} cy={GLASS.rimY} rx={GLASS.rimRx - 3} ry={rimRy - 2} fill="#d9e2dc" fillOpacity=".7" />
      <clipPath id={`gi-${uid}`}><path d={`${interior}`} /></clipPath>
      <g clipPath={`url(#gi-${uid})`}>
        {/* contents: yogurt body, built scoop by scoop */}
        {bands.map((i) => {
          const y0 = glassSurfaceY(i + 1), y1 = i === 0 ? GLASS.bottomY + 12 : glassSurfaceY(i);
          const newest = i === scoops - 1;
          return (
            <g key={i} className={newest && fx.landed === -1 ? "ck-rise" : undefined}>
              <path d={bandPath(y0, y1)} fill="url(#fa-yogurt)" />
              {i > 0 && <path d={`M ${c - glassRadius(y1) + 6} ${y1} A ${glassRadius(y1) - 6} ${(glassRadius(y1) - 6) * 0.26} 0 0 0 ${c + glassRadius(y1) - 6} ${y1}`} fill="none" stroke="#e8dcc0" strokeWidth="2.4" opacity=".85" />}
            </g>
          );
        })}
        {scoops > 0 && (
          <g className={fx.landed === -1 ? "ck-rise" : undefined}>
            <ellipse cx={c} cy={top.cy} rx={top.rx} ry={top.ry} fill="url(#fa-yogurt-top)" stroke="#eadfc6" strokeWidth="1.6" />
            <path d={`M ${c - top.rx * 0.55} ${top.cy + 1} C ${c - top.rx * 0.2} ${top.cy - top.ry * 0.7} ${c + top.rx * 0.25} ${top.cy - top.ry * 0.7} ${c + top.rx * 0.58} ${top.cy - 1}`} fill="none" stroke="#e6dac0" strokeWidth="2.6" strokeLinecap="round" />
            <path d={`M ${c - top.rx * 0.34} ${top.cy + top.ry * 0.38} C ${c - top.rx * 0.1} ${top.cy + top.ry * 0.05} ${c + top.rx * 0.2} ${top.cy + top.ry * 0.05} ${c + top.rx * 0.42} ${top.cy + top.ry * 0.4}`} fill="none" stroke="#e9dfc7" strokeWidth="2.2" strokeLinecap="round" />
            <path d={`M ${c - top.rx * 0.5} ${top.cy - top.ry * 0.28} C ${c - top.rx * 0.3} ${top.cy - top.ry * 0.62} ${c - top.rx * 0.05} ${top.cy - top.ry * 0.62} ${c + top.rx * 0.05} ${top.cy - top.ry * 0.5}`} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
          </g>
        )}
        {scoops === 0 && <ellipse cx={c} cy={GLASS.bottomY - 8} rx={GLASS.bottomRx - 10} ry={baseRy - 4} fill="#dbe4de" opacity=".7" />}
        {/* toppings and slices; items in covered layers sit against the glass wall */}
        {items.map((d) => {
          const covered = d.lvl < scoops;
          const y = itemY(d);
          return (
            <g key={d.id}>
              {!covered && <ellipse cx={d.x} cy={y + 5} rx="30" ry="9" fill="url(#fa-shadow)" opacity=".75" />}
              <Item asset={d.asset} x={d.x} y={y} rot={covered ? d.rot * 0.25 : d.rot} pitch={covered ? 0.66 : 0.52} scale={covered ? 1.2 : 1.35}
                landed={fx.landed === d.id} />
            </g>
          );
        })}
      </g>
      {/* containerFront: walls, front rim, glare */}
      <path d={left} stroke="#9fb3a8" strokeOpacity=".8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={right} stroke="#9fb3a8" strokeOpacity=".8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M ${c - GLASS.bottomRx} ${GLASS.bottomY} A ${GLASS.bottomRx} ${baseRy} 0 0 0 ${c + GLASS.bottomRx} ${GLASS.bottomY}`} stroke="#9fb3a8" strokeOpacity=".85" strokeWidth="3" fill="none" />
      <path d={interior} fill="url(#fa-glass)" />
      <ellipse cx={c} cy={GLASS.rimY} rx={GLASS.rimRx} ry={rimRy} fill="none" stroke="#b6c6bd" strokeWidth="3.4" />
      <path d={`M ${c - GLASS.rimRx} ${GLASS.rimY} A ${GLASS.rimRx} ${rimRy} 0 0 0 ${c + GLASS.rimRx} ${GLASS.rimY}`} fill="none" stroke="#fff" strokeOpacity=".95" strokeWidth="2.4" transform="translate(0 -1.5)" />
      <path d={`M ${c - GLASS.rimRx + 16} ${GLASS.rimY + 36} L ${c - GLASS.bottomRx + 12} ${GLASS.bottomY - 40}`} stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".6" />
      <path d={`M ${c + GLASS.rimRx - 20} ${GLASS.rimY + 50} L ${c + GLASS.bottomRx - 16} ${GLASS.bottomY - 80}`} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".45" />
      {/* tools */}
      {showBowl && (
        <g transform="translate(205 392) scale(1.2)"><YogurtBowl /></g>
      )}
      {spoon && spoon.kind === "scoop" && !presenting && (
        <g key={spoon.key} className="ck-spoon-path" style={{ "--x0": `${spoon.from.x}px`, "--y0": `${spoon.from.y}px`, "--x1": `${spoon.to.x}px`, "--y1": `${spoon.to.y}px` } as CSSProperties}>
          <g transform="rotate(-62)">
            <Spoon load={<g className="ck-spoon-load" transform="translate(0 -22) scale(.62)"><YogurtDollop /></g>} />
          </g>
        </g>
      )}
      {spoon && spoon.kind === "scoop" && !presenting && (
        <g key={`d${spoon.key}`} className="ck-dollop" style={{ "--x1": `${spoon.to.x}px`, "--y1": `${spoon.to.y}px`, "--y2": `${glassSurfaceY(scoops) + 4}px` } as CSSProperties}>
          <g transform="scale(.8)"><YogurtDollop /></g>
        </g>
      )}
    </g>
  );
}

// ------------------------------------------------------------------- bowl --

function useMixed(plan: Step[], dish: DishState) {
  const f = ease(stirAmount(dish, plan));
  return f;
}
function bowlParticles(plan: Step[], dish: DishState, f: number) {
  const out: { asset: "bean" | "corn"; x: number; y: number; r: number }[] = [];
  let cluster = 0;
  for (const s of plan) {
    if (s.kind !== "scoop" || s.into !== "bowl") continue;
    const n = dish.scoops[s.id] ?? 0;
    const kind = s.asset.startsWith("beans") ? "bean" : "corn";
    for (let sc = 0; sc < n; sc++) {
      const a = (cluster * 2.4) + 0.7, hx = BOWL.cx + Math.cos(a) * 70, hy = BOWL.cy + Math.sin(a) * 62;
      cluster++;
      for (let i = 0; i < 17; i++) {
        const seed = cluster * 31 + i;
        const ha = rnd(seed) * 6.28, hr = Math.sqrt(rnd(seed + 3)) * 46;
        const home = { x: hx + Math.cos(ha) * hr, y: hy + Math.sin(ha) * hr * 0.9 };
        const ma = rnd(seed + 7) * 6.28, mr = Math.sqrt(rnd(seed + 11)) * 126;
        const mixed = { x: BOWL.cx + Math.cos(ma) * mr, y: BOWL.cy + Math.sin(ma) * mr };
        out.push({ asset: kind, x: home.x + (mixed.x - home.x) * f, y: home.y + (mixed.y - home.y) * f, r: rnd(seed + 19) * 180 });
      }
    }
  }
  return out;
}

function BowlScene({ recipe, plan, dish, step, fx, presenting }: SceneProps & { fx: Fx }) {
  const f = useMixed(plan, dish);
  const chocolate = recipe.id === "brownies";
  const batterRecipe = recipe.id === "brownies" || recipe.id === "pancakes";
  const stir = plan.find((s) => s.kind === "stir");
  const angle = fx.stirAngle ?? (stir ? dish.stir[stir.id] ?? 0 : 0);
  const items = dish.drops.filter((d) => d.zone === "bowl");
  const particles = batterRecipe ? [] : bowlParticles(plan, dish, f);
  const stirring = step?.kind === "stir";
  const sources = plan.filter((s) => s.kind === "scoop" && s.into === "bowl");
  const spoon = fx.spoon;
  return (
    <g>
      <Counter />
      <ellipse cx={BOWL.cx} cy={BOWL.cy + 190} rx="212" ry="26" fill="url(#fa-shadow)" />
      <circle cx={BOWL.cx} cy={BOWL.cy + 6} r="200" fill="#dccdb2" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r="198" fill="url(#fa-ceramic)" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx + 4} fill="#e4d6bd" />
      <circle cx={BOWL.cx} cy={BOWL.cy + 3} r={BOWL.rx} fill="url(#fa-ceramic-in)" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx - 14} fill="none" stroke="#c9b690" strokeWidth="16" opacity=".28" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx} fill="none" stroke="#cdbb98" strokeWidth="4" opacity=".6" />
      <path d="M 246 150 A 190 190 0 0 1 380 84" stroke="#fff" strokeWidth="9" fill="none" opacity=".75" strokeLinecap="round" />
      <clipPath id="ck-bowl-clip"><circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx - 6} /></clipPath>
      <g clipPath="url(#ck-bowl-clip)">
        {batterRecipe && f > 0.02 && (
          <g opacity={Math.min(1, f * 1.25)}>
            <circle cx={BOWL.cx} cy={BOWL.cy} r={104 + f * 38} fill={chocolate ? "url(#fa-batter-choc)" : "url(#fa-batter-raw)"} />
            <g transform={`rotate(${angle} ${BOWL.cx} ${BOWL.cy})`} fill="none" stroke={chocolate ? "#8a5a3d" : "#fff6dc"} strokeWidth="5" strokeLinecap="round" opacity=".6">
              <path d={`M ${BOWL.cx - 80} ${BOWL.cy} A 80 80 0 0 1 ${BOWL.cx} ${BOWL.cy - 80}`} />
              <path d={`M ${BOWL.cx + 60} ${BOWL.cy} A 60 60 0 0 1 ${BOWL.cx} ${BOWL.cy + 60}`} />
            </g>
            <ellipse cx={BOWL.cx - 40} cy={BOWL.cy - 50} rx="40" ry="14" fill="#fff" opacity=".18" />
          </g>
        )}
        {items.map((d) => {
          const fade = batterRecipe ? 1 - Math.min(1, f * 1.4) : 1;
          const mixedRot = f * 180;
          return fade <= 0.02 ? null : (
            <g key={d.id} opacity={fade}>
              <FlatShadow x={d.x} y={d.y} r={22} />
              <Item asset={d.asset === "egg:whole" ? "egg:cracked" : d.asset} x={d.x} y={d.y} rot={d.rot + mixedRot * 0.2} scale={ITEM_SCALE.bowl}
                landed={fx.landed === d.id} />
            </g>
          );
        })}
        {particles.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
            {p.asset === "bean" ? <Bean s={1.4} /> : <Kernel s={1.35} />}
          </g>
        ))}
        {!batterRecipe && step && !presenting && step.kind === "drop" && step.zone === "bowl" ? null : null}
      </g>
      {!presenting && (sources.length > 0 && step?.kind === "scoop") && (
        <g transform={`translate(205 420) scale(1.05)`}>
          {!step.asset.startsWith("beans") && <g transform="translate(-4 -34) rotate(-30) scale(.3)"><CornCob /></g>}
          {step.asset.startsWith("beans") ? <BeansBowl /> : <CornBowl />}
        </g>
      )}
      {spoon && spoon.kind === "scoop" && !presenting && (
        <g key={spoon.key} className="ck-spoon-path" style={{ "--x0": `${spoon.from.x}px`, "--y0": `${spoon.from.y}px`, "--x1": `${spoon.to.x}px`, "--y1": `${spoon.to.y}px` } as CSSProperties}>
          <g transform="rotate(-62)"><Spoon load={<g className="ck-spoon-load" transform="translate(0 -22) scale(.62)">{spoon.asset.startsWith("beans") ? <BeansBowlLoad /> : <CornBowlLoad />}</g>} /></g>
        </g>
      )}
      {(stirring || (stir && (dish.stir[stir.id] ?? 0) > 0 && !presenting)) && (
        <g style={{ transformOrigin: `${BOWL.cx}px ${BOWL.cy}px`, transform: `rotate(${angle}deg)`, transition: fx.stirAngle === null ? "transform 360ms ease-out" : "none" }}>
          <g transform={`translate(${BOWL.cx + 96} ${BOWL.cy}) rotate(86)`}><Spoon /></g>
        </g>
      )}
    </g>
  );
}
const BeansBowlLoad = () => <g transform="scale(.8)"><ellipse rx="26" ry="14" fill="#1c1b1c" />{[-12, -4, 5, 13].map((x, i) => <Bean key={x} x={x} y={-2 + (i % 2) * 3} r={i * 50} s={1.1} />)}</g>;
const CornBowlLoad = () => <g transform="scale(.8)"><ellipse rx="26" ry="14" fill="#d99a14" />{[-14, -7, 0, 7, 14].map((x, i) => <Kernel key={x} x={x} y={-2 + (i % 2) * 3} r={i * 40} s={1} />)}</g>;

// ------------------------------------------------------------------- pita --

function Plate({ r = 192 }: { r?: number }) {
  return (
    <g>
      <ellipse cx={PITA.cx} cy={PITA.cy + r - 8} rx={r + 12} ry="26" fill="url(#fa-shadow)" />
      <circle cx={PITA.cx} cy={PITA.cy + 5} r={r} fill="#dccdb2" />
      <circle cx={PITA.cx} cy={PITA.cy} r={r} fill="url(#fa-ceramic)" stroke="#e6d9c2" strokeWidth="2" />
      <circle cx={PITA.cx} cy={PITA.cy} r={r - 24} fill="none" stroke="#e4d6bd" strokeWidth="3" />
    </g>
  );
}

function PitaScene({ plan, dish, step, fx, presenting }: SceneProps & { fx: Fx }) {
  const heat = browning(dish, plan);
  const pitaPlaced = dish.drops.some((d) => d.step === "place-pita");
  const sauce = dish.paint["spread-sauce"] ?? [];
  const cheese = dish.paint["sprinkle-cheese"] ?? [];
  const toppings = dish.drops.filter((d) => d.zone === "pita" && d.step !== "place-pita");
  const cell = PAINT_AREA.size / PAINT_GRID;
  const paintTool = step?.kind === "spread" ? step.medium : null;
  const glow = fx.cooking && !presenting;
  return (
    <g>
      <Counter />
      {glow && <circle className="ck-glow" cx={PITA.cx} cy={PITA.cy} r="214" fill="url(#ck-heat)" />}
      <Plate />
      {pitaPlaced ? (
        <g>
          <ellipse cx={PITA.cx} cy={PITA.cy + 168} rx="166" ry="14" fill="url(#fa-shadow)" opacity=".5" />
          <PitaBase heat={heat} />
          <clipPath id="ck-pita-clip"><circle cx={PITA.cx} cy={PITA.cy} r="156" /></clipPath>
          <g clipPath="url(#ck-pita-clip)">
            {sauce.length > 0 && (
              <g opacity={1 - heat * 0.12}>
                <g>{sauce.map((i) => { const c = paintCellCenter(i); return <circle key={i} cx={c.x} cy={c.y} r={cell * 0.92} fill="#b6372a" />; })}</g>
                <g>{sauce.map((i) => { const c = paintCellCenter(i); return <circle key={i} cx={c.x - 1.5} cy={c.y - 2.5} r={cell * 0.78} fill="#df583f" />; })}</g>
              </g>
            )}
            {cheese.length > 0 && (
              <g>
                {heat > 0 && <g opacity={heat}>{cheese.map((i) => { const c = paintCellCenter(i); return <circle key={`m${i}`} cx={c.x} cy={c.y} r={cell * 1.18} fill="#f3d37e" />; })}
</g>}
                <g opacity={1 - heat * 0.9}>
                  {cheese.filter((i) => i % 5 !== 3).map((i) => {
                    const c = paintCellCenter(i);
                    return [0].map((k) => <g key={`${i}-${k}`} transform={`translate(${c.x + (rnd(i + k) - 0.5) * 20} ${c.y + (rnd(i + k + 70) - 0.5) * 20}) rotate(${rnd(i + k * 5) * 180})`}>
                      <path d="M -9 0 Q 0 -4 9 0" stroke="#e5c260" strokeWidth="4.6" fill="none" strokeLinecap="round" />
                      <path d="M -9 -1 Q 0 -5 9 -1" stroke="#fff3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </g>);
                  })}
                </g>
              </g>
            )}
          </g>
          <circle cx={PITA.cx} cy={PITA.cy} r="158" fill="none" stroke="#ecca8e" strokeWidth="20" />
          <circle cx={PITA.cx} cy={PITA.cy} r="158" fill="none" stroke="#d29a52" strokeWidth="20" opacity={heat * 0.8} />
          <circle cx={PITA.cx} cy={PITA.cy} r="150" fill="none" stroke="#fff3d6" strokeWidth="3" opacity=".4" />
          {toppings.map((d) => (
            <g key={d.id}>
              <FlatShadow x={d.x} y={d.y} r={20} />
              <Item asset={d.asset} x={d.x} y={d.y} rot={d.rot} scale={ITEM_SCALE.pita} landed={fx.landed === d.id} />
            </g>
          ))}
        </g>
      ) : (
        <circle cx={PITA.cx} cy={PITA.cy} r="168" className="ck-ghost-outline" fill="none" strokeWidth="3" strokeDasharray="10 8" />
      )}
      {paintTool && fx.pointer && (
        <g style={{ transform: `translate(${fx.pointer.x}px, ${fx.pointer.y}px)` }}>
          <g transform="rotate(-58) translate(0 -8)"><Spoon load={paintTool === "sauce" ? <ellipse cx="0" cy="-20" rx="14" ry="19" fill="url(#fa-sauce)" /> : <g transform="translate(0 -20) scale(.7)"><CheeseShred2 /></g>} /></g>
        </g>
      )}
    </g>
  );
}
const CheeseShred2 = () => <g>{[[-8, -4, 20], [6, 3, -30], [0, 8, 80]].map(([x, y, r], i) => <path key={i} d="M -9 0 Q 0 -4 9 0" stroke="#e9c768" strokeWidth="5" fill="none" strokeLinecap="round" transform={`translate(${x} ${y}) rotate(${r})`} />)}</g>;

function PitaBase({ heat }: { heat: number }) {
  return (
    <g>
      <circle cx={PITA.cx} cy={PITA.cy} r="168" fill="url(#fa-pita)" />
      <circle cx={PITA.cx} cy={PITA.cy} r="168" fill="url(#fa-pita-baked)" opacity={heat} />
      <circle cx={PITA.cx} cy={PITA.cy} r="154" fill="none" stroke="#f9ebc8" strokeWidth="3" opacity=".45" />
      <path d={`M ${PITA.cx - 120} ${PITA.cy - 78} A 148 148 0 0 1 ${PITA.cx + 18} ${PITA.cy - 150}`} stroke="#fff3d6" strokeWidth="9" fill="none" opacity=".45" strokeLinecap="round" />
    </g>
  );
}

// -------------------------------------------------------------------- pan --

const PANCAKES: Point[] = [{ x: 338, y: 226 }, { x: 466, y: 232 }, { x: 402, y: 336 }];

function Pancake({ at, tone, raw, flipKey, grow }: { at: Point; tone: number; raw: number; flipKey?: number; grow?: boolean }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className={grow ? "ck-spread-in" : undefined}>
        <g className={flipKey ? "ck-flip" : undefined} key={flipKey ?? "s"}>
          <ellipse cx="0" cy="62" rx="62" ry="12" fill="url(#fa-shadow)" opacity=".7" />
          <circle r="64" fill="#a8702f" />
          <circle cx="0" cy="-3" r="62" fill="url(#fa-pancake-raw)" />
          <circle cx="0" cy="-3" r="62" fill="url(#fa-pancake)" opacity={tone} />
          <circle cx="0" cy="-3" r="52" fill="none" stroke="#f3cd85" strokeWidth="3" opacity={tone * 0.4} />
          {raw > 0 && [[-22, -16], [16, -24], [24, 12], [-10, 22], [-32, 8]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill="#fff8e4" opacity={raw * 0.85} />
          ))}
          <ellipse cx="-24" cy="-32" rx="20" ry="6" fill="#fff" opacity=".16" />
        </g>
      </g>
    </g>
  );
}

function PanScene({ recipe, plan, dish, step, fx, presenting }: SceneProps & { fx: Fx }) {
  const pour = plan.find((s) => s.kind === "pour");
  const poured = pour ? dish.poured[pour.id] : false;
  const cook1 = plan.find((s) => s.kind === "cook");
  const cook2 = plan.filter((s) => s.kind === "cook")[1];
  const h1 = cook1 ? dish.heat[cook1.id] ?? 0 : 0;
  const h2 = cook2 ? dish.heat[cook2.id] ?? 0 : 0;
  const heat = browning(dish, plan);
  const isPancake = recipe.id === "pancakes";
  const stove = step?.kind === "cook" && step.appliance === "stove";
  const glow = fx.cooking && !presenting;
  const spoon = fx.spoon;
  const chocolate = !isPancake;

  if (presenting && isPancake) return <PancakePlate />;

  return (
    <g>
      <Counter />
      {(stove || glow) && !presenting && (
        <g>
          <circle className={glow ? "ck-glow" : undefined} cx={PAN.cx} cy={PAN.cy} r="214" fill="url(#ck-heat)" opacity={glow ? 1 : 0.35} />
        </g>
      )}
      {isPancake ? (
        <g>
          <ellipse cx={PAN.cx} cy={PAN.cy + 182} rx="212" ry="24" fill="url(#fa-shadow)" />
          <rect x={PAN.cx + 170} y={PAN.cy - 16} width="140" height="32" rx="16" fill="#3a3330" />
          <rect x={PAN.cx + 176} y={PAN.cy - 11} width="124" height="7" rx="3.5" fill="#fff" opacity=".18" />
          <circle cx={PAN.cx} cy={PAN.cy + 5} r="194" fill="#242321" />
          <circle cx={PAN.cx} cy={PAN.cy} r="192" fill="url(#fa-pan-rim)" />
          <circle cx={PAN.cx} cy={PAN.cy} r="176" fill="url(#fa-pan)" />
          <path d="M 262 144 A 170 170 0 0 1 380 100" stroke="#fff" strokeWidth="6" fill="none" opacity=".25" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <ellipse cx="400" cy="452" rx="226" ry="22" fill="url(#fa-shadow)" />
          <rect x="196" y="80" width="408" height="372" rx="26" fill="#6e6b67" />
          <rect x="196" y="74" width="408" height="372" rx="26" fill="url(#fa-pan-rim)" />
          <rect x="214" y="92" width="372" height="336" rx="14" fill="#4b4946" />
          <rect x="218" y="96" width="364" height="328" rx="12" fill="url(#fa-pan)" />
        </g>
      )}
      {poured && !isPancake && (
        <g>
          <rect x="226" y="106" width="348" height="306" rx="10" fill="url(#fa-batter-choc)" className="ck-spread-in" style={{ transformOrigin: "400px 260px" }} />
          <rect x="226" y="106" width="348" height="306" rx="10" fill="url(#fa-brownie)" opacity={heat} />
          <path d="M 250 130 L 360 130 M 420 138 L 520 128" stroke="#fff" strokeOpacity={0.14 + heat * 0.2} strokeWidth="7" strokeLinecap="round" />
          {(presenting || heat >= 1) && <g stroke="#2e1a10" strokeWidth="2" opacity=".28"><path d="M 400 108 V 410 M 313 108 V 410 M 487 108 V 410 M 228 197 H 572 M 228 259 H 572 M 228 321 H 572" /></g>}
          {presenting && [0, 1, 2, 3].map((i) => <path key={i} d={`M ${240 + (i % 2) * 150} ${126 + Math.floor(i / 2) * 120} h 60`} stroke="#fff" strokeOpacity=".14" strokeWidth="7" strokeLinecap="round" />)}
        </g>
      )}
      {poured && isPancake && PANCAKES.map((at, i) => {
        const flipped = dish.flipped.includes(i);
        const tone = flipped ? Math.min(1, 0.72 * h1 + 0.28 * h2 + 0.0) : h1 * 0.28;
        const raw = flipped ? 0 : Math.min(1, h1 * 1.5);
        return <Pancake key={i} at={at} tone={tone} raw={raw} grow={!presenting} flipKey={fx.flip?.index === i ? fx.flip.key : undefined} />;
      })}
      {poured && isPancake && h1 > 0 && h1 < 1 && fx.cooking && (
        <g>{PANCAKES.map((at, i) => <ellipse key={i} className="ck-steam" cx={at.x} cy={at.y - 70} rx="10" ry="18" fill="#fff" opacity=".4" style={{ animationDelay: `${i * 300}ms` }} />)}</g>
      )}
      {spoon && spoon.kind === "pour" && !presenting && (
        <g key={spoon.key} className="ck-pour-path" style={{ "--x1": `${spoon.to.x}px`, "--y1": `${spoon.to.y}px`, "--x0": `${spoon.from.x}px`, "--y0": `${spoon.from.y}px` } as CSSProperties}>
          <g className="ck-pour-tilt"><g transform="scale(1.9)"><BatterBowl chocolate={chocolate} /></g></g>
        </g>
      )}
      {spoon && spoon.kind === "pour" && !presenting && (
        <path key={`s${spoon.key}`} className="ck-stream" pathLength={1} d={`M ${spoon.to.x - 20} ${spoon.to.y + 36} C ${spoon.to.x - 10} ${spoon.to.y + 100} ${PAN.cx - 10} ${PAN.cy - 80} ${PAN.cx} ${PAN.cy - 20}`}
          stroke={chocolate ? "#5a3624" : "#ead39a"} strokeWidth="16" strokeLinecap="round" fill="none" />
      )}
      {step?.kind === "flip" && !presenting && (
        <g style={{ transform: "translate(618px, 392px) rotate(-30deg)" }}>
          <rect x="-8" y="-8" width="14" height="110" rx="7" fill="#a87440" transform="translate(0 40)" />
          <path d="M -34 -26 L 34 -26 L 30 46 L -30 46 Z" fill="url(#fa-steel)" stroke="#9aa09d" strokeWidth="1" />
        </g>
      )}
    </g>
  );
}

function PancakePlate() {
  const layers = [0, 1, 2];
  return (
    <g>
      <Counter />
      <ellipse cx="400" cy="440" rx="214" ry="22" fill="url(#fa-shadow)" />
      <ellipse cx="400" cy="342" rx="206" ry="106" fill="#dccdb2" />
      <ellipse cx="400" cy="334" rx="206" ry="106" fill="url(#fa-ceramic)" stroke="#e6d9c2" strokeWidth="2" />
      <ellipse cx="400" cy="334" rx="168" ry="84" fill="none" stroke="#e4d6bd" strokeWidth="3" />
      <ellipse cx="400" cy="372" rx="122" ry="26" fill="url(#fa-shadow)" />
      {layers.map((i) => {
        const y = 330 - i * 38, rx = 116 - i * 3, x = 400 + (i === 1 ? -7 : i === 2 ? 5 : 0);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="26" rx={rx} ry="38" fill="url(#fa-pancake-side)" />
            <rect x={-rx} y="0" width={rx * 2} height="26" fill="url(#fa-pancake-side)" />
            <ellipse cx="0" cy="0" rx={rx} ry="38" fill="url(#fa-pancake)" />
            <ellipse cx="0" cy="0" rx={rx - 12} ry="30" fill="none" stroke="#f3cd85" strokeWidth="2.4" opacity=".35" />
            <ellipse cx="-34" cy="-14" rx="30" ry="6" fill="#fff" opacity=".18" />
          </g>
        );
      })}
    </g>
  );
}

// ------------------------------------------------------------------ plate --

function PlateScene({ plan, dish, step, fx }: SceneProps & { fx: Fx }) {
  const hum = plan.find((s) => s.kind === "scoop" && s.into === "plate");
  const n = hum && hum.kind === "scoop" ? dish.scoops[hum.id] ?? 0 : 0;
  const items = dish.drops.filter((d) => d.zone === "plate");
  const spoon = fx.spoon;
  return (
    <g>
      <Counter />
      <ellipse cx={PLATE.cx} cy={PLATE.cy + PLATE.ry - 4} rx={PLATE.rx + 12} ry="24" fill="url(#fa-shadow)" />
      <ellipse cx={PLATE.cx} cy={PLATE.cy + 6} rx={PLATE.rx} ry={PLATE.ry} fill="#dccdb2" />
      <ellipse cx={PLATE.cx} cy={PLATE.cy} rx={PLATE.rx} ry={PLATE.ry} fill="url(#fa-ceramic)" stroke="#e6d9c2" strokeWidth="2" />
      <ellipse cx={PLATE.cx} cy={PLATE.cy} rx={PLATE.rx - 26} ry={PLATE.ry - 26} fill="none" stroke="#e4d6bd" strokeWidth="3" />
      {/* the little hummus bowl sits in the middle of the plate */}
      <g>
        <circle cx={PLATE.cx} cy={PLATE.cy + 8} r="76" fill="#d9cbb0" />
        <circle cx={PLATE.cx} cy={PLATE.cy} r="74" fill="#fffdf8" stroke="#e2d4ba" strokeWidth="2" />
        <circle cx={PLATE.cx} cy={PLATE.cy + 2} r="58" fill="url(#fa-ceramic-in)" />
        {n > 0 && (
          <g className="ck-rise" key={n}>
            <circle cx={PLATE.cx} cy={PLATE.cy + 2} r={n >= 2 ? 52 : 34} fill="url(#fa-hummus)" style={{ transition: "r 700ms ease" }} />
            <path d={`M ${PLATE.cx - 30} ${PLATE.cy} A 30 30 0 1 1 ${PLATE.cx + 6} ${PLATE.cy + 30}`} stroke="#cfa868" strokeWidth="2.4" fill="none" opacity={n >= 2 ? 1 : 0} />
            <ellipse cx={PLATE.cx - 12} cy={PLATE.cy - 14} rx="16" ry="6" fill="#fff" opacity=".4" />
            {n >= 2 && <path d={`M ${PLATE.cx - 14} ${PLATE.cy + 2} q 14 -12 28 0`} stroke="#c99a3e" strokeWidth="3" fill="none" strokeLinecap="round" />}
          </g>
        )}
        <path d="M 344 218 A 66 66 0 0 1 392 196" stroke="#fff" strokeWidth="5" fill="none" opacity=".8" strokeLinecap="round" />
      </g>
      {items.map((d) => (
        <g key={d.id}>
          <FlatShadow x={d.x} y={d.y} r={24} />
          <Item asset={d.asset} x={d.x} y={d.y} rot={d.rot} scale={ITEM_SCALE.plate} pitch={0.92} landed={fx.landed === d.id} />
        </g>
      ))}
      {step?.kind === "scoop" && step.into === "plate" && (
        <g transform="translate(205 416) scale(1.1)"><HummusBowl /></g>
      )}
      {spoon && spoon.kind === "scoop" && (
        <g key={spoon.key} className="ck-spoon-path" style={{ "--x0": `${spoon.from.x}px`, "--y0": `${spoon.from.y}px`, "--x1": `${spoon.to.x}px`, "--y1": `${spoon.to.y}px` } as CSSProperties}>
          <g transform="rotate(-62)"><Spoon load={<ellipse className="ck-spoon-load" cx="0" cy="-22" rx="16" ry="12" fill="url(#fa-hummus)" />} /></g>
        </g>
      )}
    </g>
  );
}

// ------------------------------------------------------------------- root --

export function CookingScene(props: SceneProps) {
  const fx = props.fx ?? noFx;
  const view = props.view ?? { x: 0, y: 0, w: 800, h: 500 };
  const inner = extraScene(props, fx) ??
    (props.surface === "board" ? <BoardScene {...props} fx={fx} />
    : props.surface === "glass" ? <GlassScene {...props} fx={fx} />
    : props.surface === "bowl" ? <BowlScene {...props} fx={fx} />
    : props.surface === "pita" ? <PitaScene {...props} fx={fx} />
    : props.surface === "plate" ? <PlateScene {...props} fx={fx} />
    : <PanScene {...props} fx={fx} />);
  return (
    <svg className="ck-scene" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet"
      role="img" aria-label={`${props.recipe.title}: your ${props.surface === "glass" ? "glass" : props.surface === "pan" ? "pan" : props.surface === "bowl" ? "bowl" : props.surface === "plate" ? "plate" : props.surface === "pita" ? (props.recipe.id === "pizza" ? "pizza" : props.recipe.id === "avocado-toast" ? "toast" : "tortilla") : "cutting board"}`}>
      <defs>
        <radialGradient id="ck-heat" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#ffb257" stopOpacity="0" />
          <stop offset="0.82" stopColor="#ff9a3c" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {props.bare && <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#fa-counter)" />}
      {inner}
    </svg>
  );
}

/** Small picture of the tool used in the current step. */
export function ToolIcon({ tool, size = 56 }: { tool: "knife" | "masher" | "spoon" | "spatula"; size?: number }) {
  return (
    <svg className="ck-icon" width={size} height={size} viewBox="-70 -70 140 140" aria-hidden="true" focusable="false">
      <g transform={tool === "knife" ? "translate(0 12) rotate(35) scale(.5)" : tool === "masher" ? "translate(0 28) rotate(-20) scale(.5)" : tool === "spoon" ? "translate(-14 -2) rotate(-40) scale(.5)" : "translate(0 -10) rotate(20) scale(.6)"}>
        {tool === "knife" ? <Knife /> : tool === "masher" ? <Masher /> : tool === "spoon" ? <Spoon /> : (
          <g><rect x="-8" y="10" width="14" height="110" rx="7" fill="#a87440" /><path d="M -34 -40 L 34 -40 L 30 20 L -30 20 Z" fill="url(#fa-steel)" stroke="#9aa09d" strokeWidth="1" /></g>
        )}
      </g>
    </svg>
  );
}
