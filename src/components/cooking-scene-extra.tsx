import type { CSSProperties, ReactNode } from "react";
import { KABOB_SKEWERS, stirAmount, type AssetKey, type DishState } from "@/lib/cooking";
import {
  BOWL, PAINT_AREA, PAINT_GRID, PAN, PITA, PLATE, paintCellCenter, type Point,
} from "@/lib/cooking-geometry";
import { ART, Shadow, rnd } from "./food-art";
import { BreadSlice, ExtraDefs, TortillaWhole } from "./food-art-extra";
import type { Fx, SceneProps } from "./cooking-scene";

// The scenes for the newer recipes. cooking-scene.tsx hands a surface to
// `extraScene`; when it returns null the original scenes draw it. Everything
// here follows the same layer order: counter, shadow, container, contents,
// toppings, tools.

export const EXTRA_RECIPES: ReadonlySet<string> = new Set([
  "fruit-salad", "fruit-kabobs", "avocado-toast", "quesadilla", "veggie-wrap",
  "oatmeal-bowl", "banana-oat-cookies", "tomato-pasta", "egg-muffins", "veggie-fried-rice",
]);

type P = SceneProps & { fx: Fx };
const ease = (t: number) => t * t * (3 - 2 * t);
const heatOf = (dish: DishState, id: string) => dish.heat[id] ?? 0;

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
function Item({ asset, x, y, rot = 0, scale = 1, pitch = 1, opacity = 1, landed }: {
  asset: AssetKey; x: number; y: number; rot?: number; scale?: number; pitch?: number; opacity?: number; landed?: boolean;
}) {
  const art = ART[asset];
  if (!art || opacity <= 0.01) return null;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <g className={landed ? "ck-drop" : undefined}>
        <g transform={`rotate(${rot}) scale(${scale})`}>{art.draw({ pitch })}</g>
      </g>
    </g>
  );
}
const FlatShadow = ({ x, y, r }: { x: number; y: number; r: number }) =>
  <ellipse cx={x} cy={y + r * 0.5} rx={r * 1.05} ry={r * 0.42} fill="url(#fa-shadow)" opacity=".8" />;

function Spoon({ load }: { load?: ReactNode }) {
  return (
    <g>
      <rect x="-5" y="-12" width="10" height="150" rx="5" fill="#a87440" />
      <rect x="-1" y="0" width="3" height="130" rx="1.5" fill="#c99560" opacity=".8" />
      <ellipse cx="0" cy="-18" rx="23" ry="30" fill="#b57e47" />
      <ellipse cx="-1" cy="-20" rx="19" ry="25" fill="#cf9a62" />
      {load}
    </g>
  );
}
/** The stirring spoon sits at the rim and swings around with the child's drag. */
function StirSpoon({ angle }: { angle: number }) {
  return (
    <g style={{ transformOrigin: `${BOWL.cx}px ${BOWL.cy}px`, transform: `rotate(${angle}deg)`, transition: "transform 360ms ease-out" }}>
      <g transform={`translate(${BOWL.cx + 96} ${BOWL.cy}) rotate(86)`}><Spoon /></g>
    </g>
  );
}

/** Places a bit of food somewhere between where it landed and where stirring spreads it. */
function mixed(id: number, f: number, d: Point, reach: number, center: Point): Point {
  const a = rnd(id * 7 + 1) * 6.28, r = Math.sqrt(rnd(id * 11 + 5)) * reach;
  return { x: d.x + (center.x + Math.cos(a) * r - d.x) * f, y: d.y + (center.y + Math.sin(a) * r - d.y) * f };
}
const Steam = ({ on, at }: { on: boolean; at: Point[] }) => on ? (
  <g>{at.map((p, i) => <ellipse key={i} className="ck-steam" cx={p.x} cy={p.y} rx="10" ry="18" fill="#fff" opacity=".4" style={{ animationDelay: `${i * 300}ms` }} />)}</g>
) : null;

// ------------------------------------------------------------------- bowl ---

const MELT = new Set(["egg:whole", "banana:mash", "cinnamon:pile"]);

function BowlShell({ children }: { children: ReactNode }) {
  return (
    <g>
      <Counter />
      <ellipse cx={BOWL.cx} cy={BOWL.cy + 190} rx="212" ry="26" fill="url(#fa-shadow)" />
      <circle cx={BOWL.cx} cy={BOWL.cy + 6} r="200" fill="#dccdb2" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r="198" fill="url(#fa-ceramic)" stroke="#e4d7c0" strokeWidth="2" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx + 4} fill="#e4d6bd" />
      <circle cx={BOWL.cx} cy={BOWL.cy + 3} r={BOWL.rx} fill="url(#fa-ceramic-in)" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx - 14} fill="none" stroke="#c9b690" strokeWidth="16" opacity=".28" />
      <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx} fill="none" stroke="#cdbb98" strokeWidth="4" opacity=".6" />
      <path d="M 246 150 A 190 190 0 0 1 380 84" stroke="#fff" strokeWidth="9" fill="none" opacity=".75" strokeLinecap="round" />
      <clipPath id="ck-xbowl-clip"><circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx - 6} /></clipPath>
      <g clipPath="url(#ck-xbowl-clip)">{children}</g>
    </g>
  );
}

function ExtraBowl({ recipe, plan, dish, step, fx, presenting }: P) {
  const id = recipe.id;
  const oatmeal = id === "oatmeal-bowl";
  const stir = plan.find((s) => s.kind === "stir");
  // The oatmeal was already stirred in the pot; only the other bowls mix here.
  const f = oatmeal ? 0 : ease(stirAmount(dish, plan));
  const angle = fx.stirAngle ?? (stir ? dish.stir[stir.id] ?? 0 : 0);
  const base = id === "banana-oat-cookies" ? "url(#fx-dough)" : id === "egg-muffins" ? "url(#fx-eggmix)" : null;
  const items = dish.drops.filter((d) => d.zone === "bowl");
  const stirring = step?.kind === "stir";
  const center = { x: BOWL.cx, y: BOWL.cy };
  return (
    <g>
      <BowlShell>
        {oatmeal && (
          <g>
            <circle cx={BOWL.cx} cy={BOWL.cy} r={BOWL.rx - 12} fill="#c9ad74" />
            <circle cx={BOWL.cx} cy={BOWL.cy - 3} r={BOWL.rx - 14} fill="url(#fx-dough)" />
            {Array.from({ length: 26 }, (_, i) => {
              const a = rnd(i + 3) * 6.28, r = Math.sqrt(rnd(i + 50)) * 140;
              const x = BOWL.cx + Math.cos(a) * r, y = BOWL.cy + Math.sin(a) * r;
              return <ellipse key={i} cx={x} cy={y} rx="9" ry="4" fill="#f8efd8" opacity=".7" transform={`rotate(${rnd(i + 9) * 180} ${x} ${y})`} />;
            })}
            <path d="M 280 190 A 130 120 0 0 1 380 150" stroke="#fff" strokeWidth="8" fill="none" opacity=".35" strokeLinecap="round" />
          </g>
        )}
        {base && f > 0.02 && (
          <g opacity={Math.min(1, f * 1.3)}>
            <circle cx={BOWL.cx} cy={BOWL.cy} r={96 + f * 44} fill={base} />
            <g transform={`rotate(${angle} ${BOWL.cx} ${BOWL.cy})`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".35">
              <path d={`M ${BOWL.cx - 80} ${BOWL.cy} A 80 80 0 0 1 ${BOWL.cx} ${BOWL.cy - 80}`} />
              <path d={`M ${BOWL.cx + 60} ${BOWL.cy} A 60 60 0 0 1 ${BOWL.cx} ${BOWL.cy + 60}`} />
            </g>
            <ellipse cx={BOWL.cx - 40} cy={BOWL.cy - 50} rx="40" ry="14" fill="#fff" opacity=".2" />
          </g>
        )}
        {items.map((d) => {
          const melt = MELT.has(d.asset);
          const at = melt ? { x: d.x, y: d.y } : mixed(d.id, f, d, 96, center);
          const opacity = melt ? 1 - f * 0.92 : 1;
          return (
            <g key={d.id}>
              {opacity > 0.5 && <FlatShadow x={at.x} y={at.y} r={22} />}
              <Item asset={d.asset === "egg:whole" ? "egg:cracked" : d.asset} x={at.x} y={at.y}
                rot={d.rot + f * 160} scale={d.asset === "banana:slice" || d.asset === "strawberry:slice" ? 1.6 : 1.5}
                opacity={opacity} landed={fx.landed === d.id} />
            </g>
          );
        })}
      </BowlShell>
      <Steam on={oatmeal && presenting === true} at={[{ x: 340, y: 150 }, { x: 410, y: 130 }, { x: 470, y: 156 }]} />
      {(stirring || (!oatmeal && stir && (dish.stir[stir.id] ?? 0) > 0 && !presenting)) && !presenting && <StirSpoon angle={angle} />}
    </g>
  );
}

// ------------------------------------------------------------------ plate ---

function PlateBase({ children }: { children?: ReactNode }) {
  return (
    <g>
      <Counter />
      <ellipse cx={PLATE.cx} cy={PLATE.cy + PLATE.ry - 4} rx={PLATE.rx + 12} ry="24" fill="url(#fa-shadow)" />
      <ellipse cx={PLATE.cx} cy={PLATE.cy + 6} rx={PLATE.rx} ry={PLATE.ry} fill="#dccdb2" />
      <ellipse cx={PLATE.cx} cy={PLATE.cy} rx={PLATE.rx} ry={PLATE.ry} fill="url(#fa-ceramic)" stroke="#e6d9c2" strokeWidth="2" />
      <ellipse cx={PLATE.cx} cy={PLATE.cy} rx={PLATE.rx - 26} ry={PLATE.ry - 26} fill="none" stroke="#e4d6bd" strokeWidth="3" />
      {children}
    </g>
  );
}

function Kabobs({ dish, step, presenting, fx }: P) {
  const items = dish.drops.filter((d) => d.step === "thread");
  const next = items.length;
  return (
    <PlateBase>
      {KABOB_SKEWERS.map((s, i) => {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const a = { x: s.x1 - ux * 18, y: s.y1 - uy * 18 }, b = { x: s.x2 + ux * 30, y: s.y2 + uy * 30 };
        return (
          <g key={i} strokeLinecap="round">
            <line x1={a.x + 2} y1={a.y + 6} x2={b.x + 2} y2={b.y + 6} stroke="#8a6a3c" strokeWidth="8" opacity=".25" />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#caa06a" strokeWidth="7" />
            <line x1={a.x} y1={a.y - 1.6} x2={b.x} y2={b.y - 1.6} stroke="#f0d7a8" strokeWidth="2.4" />
            <line x1={b.x - 14 * ux} y1={b.y - 14 * uy} x2={b.x} y2={b.y} stroke="#8f6a38" strokeWidth="5" />
          </g>
        );
      })}
      {items.map((d) => (
        <g key={d.id}>
          <FlatShadow x={d.x} y={d.y + 4} r={22} />
          <Item asset={d.asset} x={d.x} y={d.y} rot={d.asset === "strawberry:slice" ? d.rot + 90 : d.rot} scale={d.asset === "grape:single" ? 1.45 : 1.6}
            pitch={d.asset === "grape:single" ? 1 : 0.86} landed={fx.landed === d.id} />
        </g>
      ))}
      {!presenting && step?.kind === "drop" && step.id === "thread" && next < 9 && (
        <circle className="ck-ghost-outline" cx={step.slots?.[next]?.x ?? 0} cy={step.slots?.[next]?.y ?? 0} r="32" fill="none" strokeWidth="3" strokeDasharray="8 7" />
      )}
    </PlateBase>
  );
}

/** The finished wrap, rolled and cut in half so the colorful middle shows. */
function WrapHalf({ x, y, rot }: { x: number; y: number; rot: number }) {
  const veg = [["#f08a2c", 0.2], ["#d63a2c", 1.7], ["#a8d070", 3.1], ["#f08a2c", 4.4], ["#7cb04c", 5.5]] as const;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse cx="0" cy="48" rx="118" ry="16" fill="url(#fa-shadow)" />
      <rect x="-110" y="-44" width="196" height="88" rx="44" fill="#caa468" />
      <rect x="-110" y="-48" width="196" height="88" rx="44" fill="url(#fx-tortilla)" />
      <path d="M -88 -28 C -20 -40 40 -38 78 -26" stroke="#fff" strokeWidth="6" fill="none" opacity=".4" strokeLinecap="round" />
      {[[-70, 8], [-30, -14], [20, 14], [58, -8], [-4, 26]].map(([px, py], i) => <ellipse key={i} cx={px} cy={py} rx="6" ry="3" fill="#b98a47" opacity=".32" />)}
      <path d="M -100 22 C -30 34 30 34 76 22" stroke="#b98a47" strokeWidth="2" fill="none" opacity=".4" />
      <g transform="translate(86 -4)">
        <ellipse cx="0" cy="0" rx="42" ry="44" fill="#d9c18a" />
        <ellipse cx="0" cy="0" rx="40" ry="42" fill="url(#fx-tortilla)" />
        <ellipse cx="0" cy="0" rx="33" ry="35" fill="#f1dcae" />
        <ellipse cx="0" cy="0" rx="27" ry="29" fill="#4f8a3a" opacity=".85" />
        <ellipse cx="0" cy="0" rx="22" ry="24" fill="#f1dcae" />
        <ellipse cx="0" cy="0" rx="15" ry="17" fill="#79b04a" opacity=".85" />
        <ellipse cx="0" cy="0" rx="9" ry="10" fill="#f1dcae" />
        {veg.map(([c, a], i) => <ellipse key={i} cx={Math.cos(a) * 18} cy={Math.sin(a) * 19} rx="5.4" ry="4.4" fill={c} stroke="#00000018" strokeWidth=".6" />)}
        {[0.9, 2.5, 4, 5.2].map((a, i) => <circle key={i} cx={Math.cos(a) * 28} cy={Math.sin(a) * 29} r="2.4" fill="#d5e9a6" />)}
        <path d="M -24 -20 C -14 -32 6 -34 18 -26" stroke="#fff" strokeWidth="3" fill="none" opacity=".45" strokeLinecap="round" />
      </g>
    </g>
  );
}
function WrapPlate() {
  return (
    <PlateBase>
      <WrapHalf x={364} y={208} rot={-6} />
      <WrapHalf x={364} y={318} rot={5} />
    </PlateBase>
  );
}

function ExtraPlate(p: P) {
  return p.recipe.id === "veggie-wrap" ? <WrapPlate /> : <Kabobs {...p} />;
}

// ------------------------------------------------------- bread and tortilla ---

function RoundPlate({ r = 192 }: { r?: number }) {
  return (
    <g>
      <ellipse cx={PITA.cx} cy={PITA.cy + r - 8} rx={r + 12} ry="26" fill="url(#fa-shadow)" />
      <circle cx={PITA.cx} cy={PITA.cy + 5} r={r} fill="#dccdb2" />
      <circle cx={PITA.cx} cy={PITA.cy} r={r} fill="url(#fa-ceramic)" stroke="#e6d9c2" strokeWidth="2" />
      <circle cx={PITA.cx} cy={PITA.cy} r={r - 24} fill="none" stroke="#e4d6bd" strokeWidth="3" />
    </g>
  );
}

function ExtraBread({ recipe, dish, step, fx, presenting }: P) {
  const toast = recipe.id === "avocado-toast";
  const placed = dish.drops.some((d) => d.step === (toast ? "place-bread" : "place-tortilla"));
  const heat = heatOf(dish, "toast");
  const cells = dish.paint[toast ? "spread-avocado" : "spread-hummus"] ?? [];
  const cell = PAINT_AREA.size / PAINT_GRID;
  const dark = toast ? "#7f9f3a" : "#d1ac72";
  const light = toast ? "#b7d16c" : "#f3e0b4";
  const toppings = dish.drops.filter((d) => d.zone === "pita" && !d.step.startsWith("place-"));
  const medium = step?.kind === "spread" ? step.medium : null;
  const glow = fx.cooking && !presenting;
  const flipping = fx.flip && !presenting;
  return (
    <g>
      <Counter />
      {glow && <circle className="ck-glow" cx={PITA.cx} cy={PITA.cy} r="214" fill="url(#ck-heat)" />}
      <RoundPlate />
      {placed ? (
        <g>
          <g key={flipping ? fx.flip?.key : "s"} className={flipping ? "ck-flip" : undefined}>
            <g transform={`translate(${PITA.cx} ${PITA.cy})`}>
              {toast ? <BreadSlice r={170} toast={heat} /> : <TortillaWhole r={166} />}
            </g>
            <clipPath id="ck-xbread-clip"><circle cx={PITA.cx} cy={PITA.cy} r={toast ? 148 : 152} /></clipPath>
            <g clipPath="url(#ck-xbread-clip)">
              {cells.length > 0 && (
                <g>
                  <g>{cells.map((i) => { const c = paintCellCenter(i); return <circle key={i} cx={c.x} cy={c.y} r={cell * 0.92} fill={dark} />; })}</g>
                  <g>{cells.map((i) => { const c = paintCellCenter(i); return <circle key={i} cx={c.x - 1.5} cy={c.y - 2.5} r={cell * 0.78} fill={light} />; })}</g>
                </g>
              )}
            </g>
            {toppings.map((d) => (
              <g key={d.id}>
                <FlatShadow x={d.x} y={d.y} r={20} />
                <Item asset={d.asset} x={d.x} y={d.y} rot={d.rot} scale={d.asset === "spinach:leaves" ? 1.9 : 1.7} landed={fx.landed === d.id} />
              </g>
            ))}
          </g>
        </g>
      ) : (
        <circle cx={PITA.cx} cy={PITA.cy} r="168" className="ck-ghost-outline" fill="none" strokeWidth="3" strokeDasharray="10 8" />
      )}
      <Steam on={glow === true && toast} at={[{ x: 340, y: 170 }, { x: 410, y: 150 }, { x: 470, y: 176 }]} />
      {medium && fx.pointer && (
        <g style={{ transform: `translate(${fx.pointer.x}px, ${fx.pointer.y}px)` }}>
          <g transform="rotate(-58) translate(0 -8)"><Spoon load={<ellipse cx="0" cy="-20" rx="14" ry="19" fill={dark} />} /></g>
        </g>
      )}
    </g>
  );
}

// ----------------------------------------------------- pan, pot, tray, tin ---

function Skillet({ pot = false }: { pot?: boolean }) {
  return (
    <g>
      <ellipse cx={PAN.cx} cy={PAN.cy + 182} rx="212" ry="24" fill="url(#fa-shadow)" />
      {pot ? (
        <g>
          <rect x={PAN.cx + 176} y={PAN.cy - 14} width="52" height="28" rx="14" fill="#3a3330" />
          <rect x={PAN.cx - 228} y={PAN.cy - 14} width="52" height="28" rx="14" fill="#3a3330" />
        </g>
      ) : (
        <g>
          <rect x={PAN.cx + 170} y={PAN.cy - 16} width="140" height="32" rx="16" fill="#3a3330" />
          <rect x={PAN.cx + 176} y={PAN.cy - 11} width="124" height="7" rx="3.5" fill="#fff" opacity=".18" />
        </g>
      )}
      <circle cx={PAN.cx} cy={PAN.cy + 5} r="194" fill="#242321" />
      <circle cx={PAN.cx} cy={PAN.cy} r="192" fill="url(#fa-pan-rim)" />
      <circle cx={PAN.cx} cy={PAN.cy} r="176" fill="url(#fa-pan)" />
      <path d="M 262 144 A 170 170 0 0 1 380 100" stroke="#fff" strokeWidth="6" fill="none" opacity=".25" strokeLinecap="round" />
    </g>
  );
}
const STREAM: Record<string, string> = {
  "milk:jug": "#f6f1e4", "sauce:bowl": "#c63b2a", "soy:cup": "#4a2614", "eggmix:bowl": "#f6d24c",
};
function PourFx({ fx, presenting }: { fx: Fx; presenting?: boolean }) {
  const spoon = fx.spoon;
  if (!spoon || spoon.kind !== "pour" || presenting) return null;
  const art = ART[spoon.asset];
  return (
    <g>
      <g key={spoon.key} className="ck-pour-path" style={{ "--x1": `${spoon.to.x}px`, "--y1": `${spoon.to.y}px`, "--x0": `${spoon.from.x}px`, "--y0": `${spoon.from.y}px` } as CSSProperties}>
        <g className="ck-pour-tilt"><g transform="scale(1.9)">{art?.draw({ pitch: 1 })}</g></g>
      </g>
      <path key={`s${spoon.key}`} className="ck-stream" pathLength={1}
        d={`M ${spoon.to.x - 20} ${spoon.to.y + 36} C ${spoon.to.x - 10} ${spoon.to.y + 100} ${PAN.cx - 10} ${PAN.cy - 80} ${PAN.cx} ${PAN.cy - 20}`}
        stroke={STREAM[spoon.asset] ?? "#ead39a"} strokeWidth="16" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Quesadilla({ dish, fx, presenting }: P) {
  const placed = dish.drops.some((d) => d.step === "place-tortilla");
  const h1 = heatOf(dish, "cook-1"), h2 = heatOf(dish, "cook-2");
  const folded = dish.flipped.includes(0);
  const fill = dish.drops.filter((d) => d.step === "fill");
  const flipping = fx.flip !== null && !presenting;
  const glow = fx.cooking && !presenting;
  const gold = Math.min(1, h1 * 0.35 + h2 * 0.75);
  return (
    <g>
      <Counter />
      {glow && <circle className="ck-glow" cx={PAN.cx} cy={PAN.cy} r="214" fill="url(#ck-heat)" />}
      <Skillet />
      {placed && !folded && (
        <g key={flipping ? fx.flip?.key : "open"} className={flipping ? "ck-flip" : undefined}>
          <ellipse cx={PAN.cx} cy={PAN.cy + 150} rx="150" ry="14" fill="url(#fa-shadow)" opacity=".6" />
          <g transform={`translate(${PAN.cx} ${PAN.cy}) scale(3.45)`}><TortillaWhole r={42} /></g>
          <circle cx={PAN.cx} cy={PAN.cy} r="146" fill="#c78d3c" opacity={gold * 0.5} />
          {h1 > 0 && (
            <g opacity={h1}>
              <circle cx={PAN.cx} cy={PAN.cy} r="124" fill="#f3d37e" />
              <circle cx={PAN.cx - 2} cy={PAN.cy - 3} r="112" fill="#fae6a0" opacity=".7" />
              {[[-60, -30], [50, 20], [-10, 60], [60, -60], [-70, 40]].map(([x, y], i) => <circle key={i} cx={PAN.cx + x} cy={PAN.cy + y} r={7 + (i % 3)} fill="#e3a63e" opacity=".5" />)}
            </g>
          )}
          {fill.map((d) => (
            <g key={d.id}>
              <FlatShadow x={d.x} y={d.y} r={20} />
              <Item asset={d.asset} x={d.x} y={d.y} rot={d.rot}
                scale={d.asset === "beans:pile" ? 2.6 : d.asset === "cheese:pile" ? 2.3 : 1.7}
                opacity={d.asset === "cheese:pile" ? 1 - h1 * 0.85 : 1} landed={fx.landed === d.id} />
            </g>
          ))}
        </g>
      )}
      {placed && folded && (
        <g key={flipping ? fx.flip?.key : "folded"} className={flipping ? "ck-flip" : undefined}>
          <g transform="translate(0 -64)">
          <clipPath id="ck-xfold-clip"><path d={`M ${PAN.cx - 152} ${PAN.cy} A 152 152 0 0 0 ${PAN.cx + 152} ${PAN.cy} Z`} /></clipPath>
          <ellipse cx={PAN.cx} cy={PAN.cy + 150} rx="162" ry="14" fill="url(#fa-shadow)" opacity=".6" />
          <path d={`M ${PAN.cx - 152} ${PAN.cy + 10} A 152 152 0 0 0 ${PAN.cx + 152} ${PAN.cy + 10} Z`} fill="#b27f3c" />
          <path d={`M ${PAN.cx - 152} ${PAN.cy} A 152 152 0 0 0 ${PAN.cx + 152} ${PAN.cy} Z`} fill="url(#fx-tortilla)" />
          <path d={`M ${PAN.cx - 152} ${PAN.cy} A 152 152 0 0 0 ${PAN.cx + 152} ${PAN.cy} Z`} fill="#c98a35" opacity={0.28 + gold * 0.5} />
          <g clipPath="url(#ck-xfold-clip)">
            {[-90, -40, 10, 60, 110].map((x, i) => <path key={i} d={`M ${PAN.cx + x} ${PAN.cy + 20} l 36 -30 l 8 80`} stroke="#b8742c" strokeWidth="6" fill="none" strokeLinecap="round" opacity={h2 * 0.3} />)}
          </g>
          <path d={`M ${PAN.cx - 140} ${PAN.cy + 6} L ${PAN.cx + 140} ${PAN.cy + 6}`} stroke="#f3d37e" strokeWidth="14" strokeLinecap="round" />
          <path d={`M ${PAN.cx - 120} ${PAN.cy + 4} L ${PAN.cx + 110} ${PAN.cy + 4}`} stroke="#fff3b8" strokeWidth="4" strokeLinecap="round" opacity=".8" />
          {[[-70, 8], [20, 10], [80, 8]].map(([x, y], i) => <ellipse key={i} cx={PAN.cx + x} cy={PAN.cy + y + 4} rx="14" ry="7" fill="#f3d37e" />)}
          {[1 / 3, 2 / 3].map((t) => <path key={t} d={`M ${PAN.cx} ${PAN.cy + 4} L ${PAN.cx + Math.cos(Math.PI * t) * 152} ${PAN.cy + Math.sin(Math.PI * t) * 152}`} stroke="#b8742c" strokeWidth="3" strokeLinecap="round" opacity={presenting ? 0.4 : 0} />)}
          <path d={`M ${PAN.cx - 100} ${PAN.cy + 50} C ${PAN.cx - 60} ${PAN.cy + 100} ${PAN.cx} ${PAN.cy + 112} ${PAN.cx + 60} ${PAN.cy + 100}`} stroke="#fff" strokeWidth="6" fill="none" opacity=".25" strokeLinecap="round" />
          </g>
        </g>
      )}
      {!placed && <circle cx={PAN.cx} cy={PAN.cy} r="150" className="ck-ghost-outline" fill="none" strokeWidth="3" strokeDasharray="10 8" />}
      <Steam on={glow === true} at={[{ x: 340, y: 190 }, { x: 410, y: 170 }, { x: 470, y: 196 }]} />
    </g>
  );
}

function PotMeal({ recipe, plan, dish, step, fx, presenting }: P) {
  const id = recipe.id;
  const oat = id === "oatmeal-bowl", pasta = id === "tomato-pasta", rice = id === "veggie-fried-rice";
  const stir = plan.find((s) => s.kind === "stir");
  const f = ease(stirAmount(dish, plan));
  const angle = fx.stirAngle ?? (stir ? dish.stir[stir.id] ?? 0 : 0);
  const heat = oat ? heatOf(dish, "simmer") : pasta ? heatOf(dish, "boil") : heatOf(dish, "fry");
  const poured = dish.poured[oat ? "pour-milk" : pasta ? "pour-sauce" : "pour-soy"] ?? false;
  const items = dish.drops.filter((d) => d.zone === "pan");
  const glow = fx.cooking && !presenting;
  const stirring = step?.kind === "stir";
  const center = { x: PAN.cx, y: PAN.cy };
  const waterAlpha = pasta ? 1 - ease(Math.max(0, (heat - 0.82) / 0.18)) : 0;
  const pastaDrop = items.find((d) => d.asset === "pasta:pile");
  // One serving of pasta always sits in the middle of the pot.
  const gx = PAN.cx, gy = PAN.cy;
  const egg = rice ? Math.min(1, Math.max(0, (heat - 0.25) / 0.4)) : 0;
  return (
    <g>
      <Counter />
      {(glow || step?.kind === "cook") && !presenting && <circle className={glow ? "ck-glow" : undefined} cx={PAN.cx} cy={PAN.cy} r="214" fill="url(#ck-heat)" opacity={glow ? 1 : 0.35} />}
      <Skillet pot={oat || pasta} />
      {pasta && waterAlpha > 0.02 && (
        <g opacity={waterAlpha}>
          <circle cx={PAN.cx} cy={PAN.cy} r="168" fill="#a9c9d6" />
          <circle cx={PAN.cx} cy={PAN.cy - 2} r="160" fill="#d2e8ef" opacity=".92" />
          {[[-70, -50, 12], [60, -30, 9], [-20, 70, 14], [90, 60, 8], [-100, 30, 10], [30, -90, 11]].map(([x, y, r], i) => (
            <circle key={i} cx={PAN.cx + x} cy={PAN.cy + y} r={Number(r) * (0.6 + heat * 0.8)} fill="none" stroke="#fff" strokeWidth="3" opacity={0.35 + heat * 0.5} />
          ))}
          <path d="M 270 190 A 150 140 0 0 1 380 130" stroke="#fff" strokeWidth="7" fill="none" opacity=".5" strokeLinecap="round" />
        </g>
      )}
      {oat && poured && (
        <g>
          <circle className="ck-spread-in" cx={PAN.cx} cy={PAN.cy} r="164" fill="#f8f3e6" style={{ transformOrigin: "400px 262px" }} />
          <circle cx={PAN.cx} cy={PAN.cy} r="164" fill="#e8d3a0" opacity={Math.min(1, Math.max(f * 0.55, heat * 0.9))} />
          {heat > 0.05 && [[-70, -40], [50, -60], [-20, 60], [80, 40], [-90, 30], [10, -10]].map(([x, y], i) => (
            <circle key={i} cx={PAN.cx + x} cy={PAN.cy + y} r={5 + (i % 3) * 2} fill="none" stroke="#fff" strokeWidth="2.4" opacity={0.3 + heat * 0.5} />
          ))}
          <g transform={`rotate(${angle} ${PAN.cx} ${PAN.cy})`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity={0.2 + f * 0.3}>
            <path d={`M ${PAN.cx - 100} ${PAN.cy} A 100 100 0 0 1 ${PAN.cx} ${PAN.cy - 100}`} />
            <path d={`M ${PAN.cx + 60} ${PAN.cy} A 60 60 0 0 1 ${PAN.cx} ${PAN.cy + 60}`} />
          </g>
        </g>
      )}
      {pasta && poured && (
        <circle className="ck-spread-in" cx={PAN.cx} cy={PAN.cy} r="150" fill="url(#fx-sauce)" style={{ transformOrigin: "400px 262px" }} />
      )}
      {rice && (
        <g>
          <circle cx={PAN.cx} cy={PAN.cy} r="168" fill={poured ? "#e6c58a" : "#f6ecd2"} opacity={Math.min(1, f * 4) * 0.95} />
          {f > 0.02 && Array.from({ length: 44 }, (_, i) => {
            const a = rnd(i + 70) * 6.28, r = Math.sqrt(rnd(i + 90)) * 128;
            const x = PAN.cx + Math.cos(a) * r, y = PAN.cy + Math.sin(a) * r;
            return <ellipse key={i} cx={x} cy={y} rx="9" ry="3.8" fill={poured ? "#e0b878" : "url(#fx-rice)"} opacity={f} transform={`rotate(${rnd(i + 5) * 180} ${x} ${y})`} />;
          })}
        </g>
      )}
      {pasta && (
        <g transform={`translate(${gx} ${gy})`} style={{ opacity: pastaDrop ? 1 : 0 }}>
          <g transform={`scale(3.6) rotate(${angle * 0.25})`}>
            <Noodles coat={poured ? f : 0} />
          </g>
        </g>
      )}
      {items.filter((d) => d.asset !== "pasta:pile").map((d) => {
        const fixedPlace = oat;
        const at = fixedPlace ? { x: d.x, y: d.y } : mixed(d.id, f, d, d.asset === "cheese:pile" ? 120 : 100, center);
        const melt = oat && d.asset === "oats:pile";
        const opacity = melt ? 1 - Math.min(1, Math.max(f, heat)) * 0.92 : 1;
        const isEgg = d.asset === "egg:whole";
        const asset = isEgg ? (egg > 0.5 ? "egg:scrambled" : "egg:cracked") : d.asset;
        const scale = d.asset === "rice:pile" ? 2.7 : d.asset === "peas:pile" ? 2 : d.asset === "oats:pile" ? 2 : isEgg ? 2 : d.asset === "cheese:pile" ? 1.9 : d.asset === "tomato:dice" ? 1.7 : 1.6;
        return (
          <g key={d.id}>
            {opacity > 0.4 && <FlatShadow x={at.x} y={at.y} r={22} />}
            <Item asset={asset} x={at.x} y={at.y} rot={d.rot + f * 120} scale={scale} opacity={opacity} landed={fx.landed === d.id} />
          </g>
        );
      })}
      <PourFx fx={fx} presenting={presenting} />
      {stirring && !presenting && (
        <g style={{ transformOrigin: `${PAN.cx}px ${PAN.cy}px`, transform: `rotate(${angle}deg)`, transition: fx.stirAngle === null ? "transform 360ms ease-out" : "none" }}>
          <g transform={`translate(${PAN.cx + 96} ${PAN.cy}) rotate(86)`}><Spoon /></g>
        </g>
      )}
      <Steam on={glow === true || (presenting === true && (oat || pasta))} at={[{ x: 330, y: 150 }, { x: 410, y: 130 }, { x: 480, y: 156 }]} />
    </g>
  );
}

/** Tangled noodles. `coat` runs from plain to covered in tomato sauce. */
function Noodles({ coat }: { coat: number }) {
  const rings = [0, 36, 72, 108, 144];
  return (
    <g fill="none">
      <ellipse cx="0" cy="14" rx="36" ry="10" fill="url(#fa-shadow)" />
      {[0, 1].map((layer) => (
        <g key={layer} opacity={layer === 0 ? 1 : coat}>
          {rings.map((a, i) => (
            <g key={a} transform={`rotate(${a})`}>
              <ellipse rx={29 - i * 2} ry={13 + (i % 2) * 3} stroke={layer ? "#a9301f" : "#c99a35"} strokeWidth="6.4" opacity=".55" transform="translate(1 2)" />
              <ellipse rx={29 - i * 2} ry={13 + (i % 2) * 3} stroke={layer ? "#d9573a" : "#efcb68"} strokeWidth="5.4" />
              <ellipse rx={29 - i * 2} ry={13 + (i % 2) * 3} stroke={layer ? "#f59a7e" : "#fff6c8"} strokeWidth="1.4" opacity=".6" strokeDasharray="14 40" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

const CUPS: Point[] = [{ x: 310, y: 196 }, { x: 400, y: 190 }, { x: 490, y: 196 }, { x: 310, y: 326 }, { x: 400, y: 332 }, { x: 490, y: 326 }];

function Tray({ dish, fx, presenting, kind }: P & { kind: "cookies" | "muffins" }) {
  const heat = heatOf(dish, "bake");
  const poured = dish.poured["pour"] ?? false;
  const cookies = dish.drops.filter((d) => d.zone === "pan");
  const glow = fx.cooking && !presenting;
  const bits = ["#4f9a3d", "#d6382c", "#f2b63a", "#6aa84f"];
  return (
    <g>
      <Counter />
      {glow && <circle className="ck-glow" cx={PAN.cx} cy={PAN.cy} r="214" fill="url(#ck-heat)" />}
      <ellipse cx="400" cy="452" rx="226" ry="22" fill="url(#fa-shadow)" />
      <rect x="196" y="80" width="408" height="372" rx="26" fill="#6e6b67" />
      <rect x="196" y="74" width="408" height="372" rx="26" fill="url(#fa-pan-rim)" />
      {kind === "cookies" ? (
        <g>
          <rect x="214" y="92" width="372" height="336" rx="14" fill="#8d8a85" />
          <rect x="218" y="96" width="364" height="328" rx="12" fill="#efe4c8" />
          <rect x="218" y="96" width="364" height="328" rx="12" fill="url(#fa-counter)" opacity=".5" />
          <path d="M 236 112 L 330 112" stroke="#fff" strokeWidth="6" opacity=".5" strokeLinecap="round" />
          {cookies.map((d) => (
            <g key={d.id}>
              <FlatShadow x={d.x} y={d.y + 6} r={32} />
              <Item asset="cookie:dough" x={d.x} y={d.y} rot={d.rot} scale={1.55} opacity={1 - heat} landed={fx.landed === d.id} />
              <Item asset="cookie:baked" x={d.x} y={d.y} rot={d.rot} scale={1.5 + heat * 0.1} opacity={heat} />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <rect x="214" y="92" width="372" height="336" rx="14" fill="url(#fx-tin)" />
          {CUPS.map((c, i) => {
            const mixBits = [0, 1, 2].map((k) => ({ x: (rnd(i * 9 + k) - 0.5) * 36, y: (rnd(i * 9 + k + 40) - 0.5) * 28, c: bits[(i + k) % 4] }));
            return (
              <g key={i}>
                <circle cx={c.x + 2} cy={c.y + 5} r="46" fill="#3c3a37" opacity=".5" />
                <circle cx={c.x} cy={c.y} r="45" fill="#8f928f" />
                <circle cx={c.x} cy={c.y} r="39" fill="#4b4946" />
                <circle cx={c.x} cy={c.y + 1} r="35" fill="#33312f" />
                {poured && (
                  <g className={presenting ? undefined : "ck-rise"}>
                    <circle cx={c.x} cy={c.y} r={31 + heat * 6} fill="url(#fx-muffin)" />
                    <circle cx={c.x} cy={c.y} r={31 + heat * 6} fill="url(#fx-muffin-baked)" opacity={heat} />
                    {mixBits.map((b, k) => <rect key={k} x={c.x + b.x - 3} y={c.y + b.y - 2.5} width="6" height="5" rx="1.6" fill={b.c} opacity={1 - heat * 0.35} transform={`rotate(${k * 50 + i * 20} ${c.x + b.x} ${c.y + b.y})`} />)}
                    {heat > 0.4 && [[-12, 8], [10, -6], [4, 12]].map(([x, y], k) => <circle key={k} cx={c.x + x} cy={c.y + y} r="3" fill="#a56a1c" opacity={heat * 0.45} />)}
                    <ellipse cx={c.x - 11} cy={c.y - 14} rx="11" ry="4" fill="#fff" opacity={0.3} transform={`rotate(-30 ${c.x - 11} ${c.y - 14})`} />
                  </g>
                )}
              </g>
            );
          })}
          <path d="M 232 108 L 360 108" stroke="#fff" strokeWidth="5" opacity=".4" strokeLinecap="round" />
        </g>
      )}
      <PourFx fx={fx} presenting={presenting} />
      <Steam on={glow === true} at={[{ x: 330, y: 150 }, { x: 410, y: 130 }, { x: 480, y: 156 }]} />
    </g>
  );
}

function ExtraPan(p: P) {
  switch (p.recipe.id) {
    case "banana-oat-cookies": return <Tray {...p} kind="cookies" />;
    case "egg-muffins": return <Tray {...p} kind="muffins" />;
    case "quesadilla": return <Quesadilla {...p} />;
    default: return <PotMeal {...p} />;
  }
}

// ------------------------------------------------------------------- entry ---

/** Draws a surface for the newer recipes, or returns null to use the original scenes. */
export function extraScene(props: SceneProps, fx: Fx): ReactNode | null {
  if (!EXTRA_RECIPES.has(props.recipe.id) || props.surface === "board" || props.surface === "glass") return null;
  const p: P = { ...props, fx };
  const body = props.surface === "bowl" ? <ExtraBowl {...p} />
    : props.surface === "plate" ? <ExtraPlate {...p} />
    : props.surface === "pita" ? <ExtraBread {...p} />
    : <ExtraPan {...p} />;
  return (
    <>
      <defs><ExtraDefs /></defs>
      {body}
    </>
  );
}
