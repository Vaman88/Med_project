import type { ReactNode } from "react";
import { EXTRA_ART, EXTRA_LABEL, ExtraDefs } from "./food-art-extra";

// Original, softly lit food illustrations. Every drawing is centered on (0,0)
// and shares one light direction (upper left), so assets match in scale,
// edges and shading wherever they are used.
export const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

type Stop = [number, string, number?];
function Grad({ id, stops, radial, x1 = 0, y1 = 0, x2 = 0, y2 = 1, cx = 0.4, cy = 0.35, r = 0.75 }: {
  id: string; stops: Stop[]; radial?: boolean;
  x1?: number; y1?: number; x2?: number; y2?: number; cx?: number; cy?: number; r?: number;
}) {
  const children = stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />);
  return radial
    ? <radialGradient id={id} cx={cx} cy={cy} r={r}>{children}</radialGradient>
    : <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{children}</linearGradient>;
}

export function FoodDefs() {
  return (
    <defs>
      <Grad id="fa-shadow" radial cx={0.5} cy={0.5} r={0.5} stops={[[0, "#4a3118", 0.42], [0.6, "#4a3118", 0.16], [1, "#4a3118", 0]]} />
      <Grad id="fa-banana-body" stops={[[0, "#fbefb8"], [0.3, "#f3da7c"], [0.7, "#e6bf4f"], [1, "#c99a33"]]} />
      <Grad id="fa-banana-flesh" radial cx={0.5} cy={0.45} r={0.6} stops={[[0, "#fffbe3"], [0.7, "#f8e8b0"], [1, "#eed48c"]]} />
      <Grad id="fa-banana-peel" stops={[[0, "#f6dd7d"], [1, "#d9ae45"]]} />
      <Grad id="fa-strawb" radial cx={0.34} cy={0.3} r={0.9} stops={[[0, "#f8666a"], [0.45, "#dc2f3d"], [0.85, "#aa1830"], [1, "#82112a"]]} />
      <Grad id="fa-strawb-flesh" radial cx={0.5} cy={0.55} r={0.6} stops={[[0, "#fde8e1"], [0.45, "#f7b8b0"], [1, "#ee7f82"]]} />
      <Grad id="fa-tomato" radial cx={0.36} cy={0.3} r={0.85} stops={[[0, "#f77c60"], [0.35, "#e04a30"], [0.75, "#c22a1a"], [1, "#8d150e"]]} />
      <Grad id="fa-tomato-flesh" radial cx={0.5} cy={0.5} r={0.65} stops={[[0, "#f8a58e"], [0.6, "#ea6a52"], [1, "#d24a35"]]} />
      <Grad id="fa-gel" radial cx={0.5} cy={0.5} r={0.6} stops={[[0, "#fbd48a"], [1, "#f09a52"]]} />
      <Grad id="fa-pepper" radial cx={0.33} cy={0.28} r={0.95} stops={[[0, "#f4624f"], [0.4, "#d63427"], [0.8, "#a82018"], [1, "#82130f"]]} />
      <Grad id="fa-carrot" stops={[[0, "#fcba68"], [0.28, "#f59236"], [0.62, "#e8741c"], [1, "#b9500f"]]} />
      <Grad id="fa-carrot-sheen" x2={1} y2={0} stops={[[0, "#ffffff", 0.2], [0.45, "#ffffff", 0], [1, "#7a2c00", 0.28]]} />
      <Grad id="fa-carrot-flesh" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#ffc47a"], [0.6, "#f9a043"], [1, "#e9761c"]]} />
      <Grad id="fa-carrot-core" radial cx={0.45} cy={0.4} r={0.7} stops={[[0, "#fff0c4"], [1, "#fbc977"]]} />
      <Grad id="fa-wall-orange" x2={1} y2={0} stops={[[0, "#a8470c"], [0.3, "#dd7420"], [1, "#9b4009"]]} />
      <Grad id="fa-cuc" radial cx={0.5} cy={0.5} r={0.6} stops={[[0, "#f4f9dc"], [0.6, "#dcebb0"], [1, "#bcd98a"]]} />
      <Grad id="fa-cuc-skin" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#6aa845"], [1, "#2f6420"]]} />
      <Grad id="fa-leaf" x2={1} y2={1} stops={[[0, "#8cc45d"], [1, "#3f7d2e"]]} />
      <Grad id="fa-husk" stops={[[0, "#b8de80"], [0.5, "#86bb55"], [1, "#4f8c34"]]} />
      <Grad id="fa-cob" stops={[[0, "#fff1a0"], [0.5, "#f8cf45"], [1, "#d99a14"]]} />
      <Grad id="fa-yogurt" x2={1} y2={0} stops={[[0, "#eadfc4"], [0.28, "#faf2de"], [0.55, "#fffcf1"], [1, "#eadfc4"]]} />
      <Grad id="fa-yogurt-top" radial cx={0.4} cy={0.4} r={0.75} stops={[[0, "#fffefa"], [0.7, "#fbf3df"], [1, "#efe3c8"]]} />
      <Grad id="fa-wood" stops={[[0, "#dcae76"], [1, "#c08b54"]]} />
      <Grad id="fa-board" stops={[[0, "#ebcb9e"], [0.5, "#dcb07a"], [1, "#cfa064"]]} />
      <Grad id="fa-ceramic" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#fffdf8"], [1, "#eee3d1"]]} />
      <Grad id="fa-ceramic-in" radial cx={0.5} cy={0.65} r={0.7} stops={[[0, "#f3ead8"], [1, "#d9c9ab"]]} />
      <Grad id="fa-glass" x2={1} y2={0} stops={[[0, "#ffffff", 0.7], [0.14, "#ffffff", 0.14], [0.5, "#dfeae2", 0.05], [0.84, "#ffffff", 0.12], [1, "#ffffff", 0.6]]} />
      <Grad id="fa-pita" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#f6dfb0"], [0.7, "#e6c284"], [1, "#cf9f5c"]]} />
      <Grad id="fa-pita-baked" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#e9bd77"], [0.7, "#cf9446"], [1, "#a8692a"]]} />
      <Grad id="fa-sauce" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#e8604a"], [1, "#bd3a28"]]} />
      <Grad id="fa-cheese" stops={[[0, "#fff1b8"], [1, "#f1d47b"]]} />
      <Grad id="fa-egg" radial cx={0.35} cy={0.3} r={0.85} stops={[[0, "#fbf0df"], [0.6, "#f0dcc0"], [1, "#d9bd98"]]} />
      <Grad id="fa-yolk" radial cx={0.38} cy={0.32} r={0.75} stops={[[0, "#ffd45a"], [0.6, "#f7a928"], [1, "#e0861a"]]} />
      <Grad id="fa-batter-raw" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#f4e2b2"], [1, "#e6cb8e"]]} />
      <Grad id="fa-batter-choc" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#6e4630"], [1, "#4d2f1f"]]} />
      <Grad id="fa-pan" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#65635f"], [1, "#2e2d2b"]]} />
      <Grad id="fa-pan-rim" x2={1} y2={1} stops={[[0, "#b9b6b0"], [1, "#6f6d69"]]} />
      <Grad id="fa-hummus" radial cx={0.45} cy={0.4} r={0.7} stops={[[0, "#f4e1ba"], [1, "#dfc08a"]]} />
      <Grad id="fa-bean" radial cx={0.32} cy={0.28} r={0.85} stops={[[0, "#6c6a68"], [0.5, "#2e2d2e"], [1, "#0f0e10"]]} />
      <Grad id="fa-corn" radial cx={0.33} cy={0.28} r={0.85} stops={[[0, "#fff08a"], [0.5, "#f7cb3c"], [1, "#dd9f12"]]} />
      <Grad id="fa-pancake" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#f1c778"], [0.7, "#dba04f"], [1, "#b97a32"]]} />
      <Grad id="fa-pancake-raw" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#f6e6bc"], [1, "#e8cd92"]]} />
      <Grad id="fa-pancake-side" x2={1} y2={0} stops={[[0, "#b9772f"], [0.35, "#dca155"], [0.7, "#d19347"], [1, "#a9692a"]]} />
      <Grad id="fa-brownie" radial cx={0.4} cy={0.3} r={0.9} stops={[[0, "#6a422b"], [1, "#3e2417"]]} />
      <Grad id="fa-steel" x2={0} y2={1} stops={[[0, "#f4f5f4"], [0.5, "#c9ccca"], [1, "#9ea3a1"]]} />
      <Grad id="fa-counter" x2={1} y2={1} stops={[[0, "#fbf6ea"], [1, "#efe6d2"]]} />
      <ExtraDefs />
      {/* cheap tiling textures, no filters */}
      {/* silhouettes reused to keep surface detail inside the food */}
      <clipPath id="fa-clip-carrot"><path d={CARROT_PATH} /></clipPath>
      <clipPath id="fa-clip-tomato"><path d={TOMATO_PATH} /></clipPath>
      <clipPath id="fa-clip-pepper"><path d={PEPPER_PATH} /></clipPath>
      <clipPath id="fa-clip-banana"><path d={BANANA_PATH} /></clipPath>
      <clipPath id="fa-clip-strawberry"><path d={STRAWB_PATH} /></clipPath>
    </defs>
  );
}
export function FoodDefsHost() {
  return (
    <svg className="fa-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <FoodDefs />
    </svg>
  );
}

export const Shadow = ({ cx = 0, cy = 0, rx, ry, o = 1 }: { cx?: number; cy?: number; rx: number; ry: number; o?: number }) =>
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#fa-shadow)" opacity={o} />;

// ----------------------------------------------------------- whole foods ---

export const BANANA_PATH =
  "M -180 -22 C -150 6 -70 18 0 18 C 70 18 150 6 182 -24 C 186 -10 178 6 168 18 C 130 56 60 76 0 76 C -60 76 -130 56 -170 22 C -178 8 -184 -8 -180 -22 Z";
export const STRAWB_PATH =
  "M -112 0 C -112 -46 -62 -64 0 -60 C 70 -56 118 -30 126 0 C 118 30 70 56 0 60 C -62 64 -112 46 -112 0 Z";
export const PEPPER_PATH =
  "M -150 -10 C -150 -62 -96 -76 -50 -66 C -20 -78 28 -78 56 -64 C 104 -76 150 -58 150 -6 C 154 44 112 78 62 70 C 30 82 -26 82 -54 70 C -108 78 -152 44 -150 -10 Z";
export const CARROT_PATH =
  "M -135 -34 C -90 -45 -20 -40 50 -26 C 100 -16 130 -8 144 -1 C 148 1 148 3 144 5 C 130 12 100 20 50 30 C -20 44 -90 46 -135 34 C -146 20 -146 -20 -135 -34 Z";
export const TOMATO_PATH =
  "M -105 8 C -108 -52 -60 -88 0 -88 C 60 -88 108 -52 105 8 C 102 62 56 92 0 92 C -56 92 -102 62 -105 8 Z";

export const FOOD_SHAPES: Record<string, { path: string; length: number; fill: string; top: number; bottom: number }> = {
  banana: { path: BANANA_PATH, length: 362, fill: "url(#fa-banana-body)", top: -24, bottom: 76 },
  strawberry: { path: STRAWB_PATH, length: 238, fill: "url(#fa-strawb)", top: -62, bottom: 62 },
  pepper: { path: PEPPER_PATH, length: 300, fill: "url(#fa-pepper)", top: -80, bottom: 82 },
  carrot: { path: CARROT_PATH, length: 282, fill: "url(#fa-carrot)", top: -46, bottom: 46 },
  tomato: { path: TOMATO_PATH, length: 210, fill: "url(#fa-tomato)", top: -90, bottom: 94 },
};

// Strawberry seeds sit in a staggered lattice that thins toward the edges.
const BERRY_SEEDS = (() => {
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const x = -78 + i * 17.5;
    const h = 56 * Math.sqrt(Math.max(0, 1 - ((x - 12) / 122) ** 2));
    for (let j = -3; j <= 3; j++) {
      const y = (j + (i % 2 ? 0.5 : 0)) * h / 3.3;
      if (Math.abs(y) < h * 0.86) out.push({ x: x + (rnd(i * 9 + j + 20) - 0.5) * 2.4, y, r: 14 + (y / 56) * 30 });
    }
  }
  return out;
})();

/** Surface details drawn on top of a whole food (clipped with it when cut). */
export function FoodDetail({ food }: { food: string }) {
  switch (food) {
    case "banana":
      return (
        <g>
          <g clipPath="url(#fa-clip-banana)" fill="none" strokeLinecap="round">
            <path d="M -170 -8 C -120 22 -50 32 10 32 C 80 32 140 16 174 -12" stroke="#d9b043" strokeWidth="2" opacity=".35" />
            <path d="M -158 22 C -110 46 -50 54 6 54 C 70 54 120 44 158 22" stroke="#d9b043" strokeWidth="2" opacity=".3" />
            <path d="M -150 4 C -100 22 -40 28 12 26 C 70 24 120 12 160 -8" stroke="#fffbe0" strokeWidth="6" opacity=".6" />
            <path d="M -130 10 C -90 22 -50 26 -10 25" stroke="#fff" strokeWidth="2.4" opacity=".75" />
            <path d={BANANA_PATH} stroke="#c99a33" strokeWidth="8" opacity=".16" />
          </g>
          <path d="M -176 -24 C -184 -34 -190 -42 -190 -52 L -179 -56 C -177 -46 -171 -38 -164 -29 Z" fill="#b2a557" />
          <rect x="-193" y="-61" width="17" height="8" rx="3" fill="#7a5d36" transform="rotate(-18 -184 -57)" />
          <path d="M 178 -24 C 184 -26 188 -30 188 -36 L 181 -38 C 180 -32 177 -28 172 -24 Z" fill="#7a5d36" />
        </g>
      );
    case "strawberry":
      return (
        <g>
          <g clipPath="url(#fa-clip-strawberry)">
            <path d={STRAWB_PATH} fill="none" stroke="#8a1228" strokeWidth="8" opacity=".14" />
            {BERRY_SEEDS.filter((_, i) => i % 2 === 0).map((s, i) => (
              <ellipse key={i} cx={s.x} cy={s.y} rx="1.8" ry="2.8" fill="#fbe39a" opacity=".9" transform={`rotate(${s.r} ${s.x} ${s.y})`} />
            ))}
            <path d="M -66 -42 C -20 -56 50 -50 96 -26" stroke="#fff" strokeWidth="7" opacity=".55" fill="none" strokeLinecap="round" />
            <ellipse cx="-30" cy="-34" rx="14" ry="5" fill="#fff" opacity=".35" transform="rotate(-12 -30 -34)" />
          </g>
          <g stroke="#4c9a3a" strokeWidth="0.8" strokeLinejoin="round">
            {[[-62, 0.85], [-32, 1], [0, 1.05], [32, 1], [62, 0.85], [150, 0.5], [-150, 0.5], [180, 0.42]].map(([a, k], i) => (
              <path key={i} d="M 0 0 C -10 -12 -34 -14 -48 -4 C -34 0 -22 6 0 6 Z" fill={i % 2 ? "url(#fa-leaf)" : "#58a042"} transform={`translate(-96 0) rotate(${a}) scale(${k} ${k * 0.85})`} />
            ))}
            <circle cx="-96" cy="0" r="8" fill="#3f7f31" />
            <path d="M -98 -4 C -108 -2 -118 -4 -124 -12" fill="none" stroke="#4f9a3d" strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>
      );
    case "pepper":
      return (
        <g>
          <g clipPath="url(#fa-clip-pepper)">
            <path d="M -48 -70 C -58 -20 -56 34 -40 78" stroke="#a82018" strokeWidth="5" opacity=".18" fill="none" />
            <path d="M 54 -66 C 66 -20 64 34 50 76" stroke="#a82018" strokeWidth="5" opacity=".18" fill="none" />
            <path d={PEPPER_PATH} fill="none" stroke="#9c1c14" strokeWidth="8" opacity=".14" />
            <path d="M 70 62 C 100 56 124 38 132 16" stroke="#ff8a78" strokeWidth="5" opacity=".22" fill="none" strokeLinecap="round" />
            <path d="M -116 -22 C -116 -52 -88 -64 -60 -60" stroke="#fff" strokeWidth="10" opacity=".6" strokeLinecap="round" fill="none" />
            <ellipse cx="-122" cy="2" rx="4" ry="10" fill="#fff" opacity=".4" />
          </g>
          <g transform="translate(32 2)">
            <ellipse cx="4" cy="-72" rx="27" ry="9" fill="#5a9a40" />
            <ellipse cx="-3" cy="-75" rx="15" ry="4" fill="#a6d878" opacity=".7" />
            <path d="M -4 -72 C -8 -90 2 -106 22 -104 C 29 -99 25 -92 17 -90 C 11 -86 13 -78 17 -70 Z" fill="url(#fa-leaf)" />
          </g>
        </g>
      );
    case "carrot":
      return (
        <g>
          <path d={CARROT_PATH} fill="url(#fa-carrot-sheen)" />
          <g clipPath="url(#fa-clip-carrot)">
            <g fill="none" strokeLinecap="round">
              {[-96, -52, -8, 36, 78].map((x, i) => {
                const t = (x + 135) / 285, h = 44 * (1 - Math.pow(t, 1.5) * 0.95) * 0.72;
                return <path key={i} d={`M ${x} ${-h} Q ${x + 4} 0 ${x} ${h}`} stroke="#d8731a" strokeWidth="2" opacity=".28" />;
              })}
            </g>
            <path d={CARROT_PATH} fill="none" stroke="#b9500f" strokeWidth="8" opacity=".14" />
            <path d="M -118 -22 C -70 -33 -10 -30 44 -16" stroke="#ffe3b8" strokeWidth="7" opacity=".45" fill="none" strokeLinecap="round" />
            <path d="M -104 -29 C -76 -34 -48 -34 -20 -30" stroke="#fff" strokeWidth="2.4" opacity=".7" fill="none" strokeLinecap="round" />
          </g>
          <ellipse cx="-139" cy="0" rx="8" ry="30" fill="#7fae48" />
          <ellipse cx="-141" cy="-6" rx="3" ry="15" fill="#b6d476" opacity=".6" />
          <g fill="none" strokeLinecap="round">
            <path d="M -142 -12 C -154 -20 -162 -28 -172 -32" stroke="#5aa43a" strokeWidth="8" />
            <path d="M -144 0 C -158 0 -166 1 -176 0" stroke="#68b844" strokeWidth="9" />
            <path d="M -142 12 C -154 20 -162 28 -172 32" stroke="#5aa43a" strokeWidth="8" />
            <path d="M -143 -12 C -154 -19 -162 -26 -170 -30 M -146 -2 C -158 -2 -166 -1 -174 -2 M -143 12 C -154 19 -162 26 -170 30" stroke="#b8e080" strokeWidth="2" opacity=".7" />
          </g>
        </g>
      );
    case "tomato":
      return (
        <g>
          <g clipPath="url(#fa-clip-tomato)">
            <ellipse cx="0" cy="-80" rx="60" ry="22" fill="#a52a15" opacity=".2" />
            <path d={TOMATO_PATH} fill="none" stroke="#a52a15" strokeWidth="8" opacity=".14" />
            <path d="M 60 70 C 84 56 98 34 102 12" stroke="#ff8a70" strokeWidth="5" opacity=".25" fill="none" strokeLinecap="round" />
            <path d="M -78 -30 C -74 -58 -50 -74 -22 -76" stroke="#fff" strokeWidth="9" opacity=".6" strokeLinecap="round" fill="none" />
            <ellipse cx="-80" cy="-12" rx="4.5" ry="10" fill="#fff" opacity=".45" transform="rotate(10 -80 -12)" />
          </g>
          <g transform="translate(0 -82) scale(.64 .32)">
            {[0, 72, 144, 216, 288].map((a) => (
              <path key={a} d="M 0 0 C 10 -14 36 -12 54 8 C 34 2 14 8 0 6 Z" fill="url(#fa-leaf)" transform={`rotate(${a - 18})`} />
            ))}
          </g>
          <ellipse cx="0" cy="-82" rx="9" ry="5" fill="#5f9a3e" />
          <path d="M -4 -80 C -6 -94 -2 -104 6 -109 L 13 -104 C 9 -98 7 -90 7 -80 Z" fill="url(#fa-leaf)" />
        </g>
      );
    default:
      return null;
  }
}

/** Half-height of the carrot at x, following its taper. */
function carrotHalf(x: number): number {
  const pts: [number, number][] = [[-135, 34], [-90, 44], [-20, 40], [50, 28], [100, 17], [144, 3]];
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, h0] = pts[i - 1], [x1, h1] = pts[i];
      return h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
    }
  }
  return 3;
}

/** The inside of a food, seen on a fresh cut. */
export function CutFace({ food, x, side }: { food: string; x: number; side: "left" | "right" }) {
  const cx = x + (side === "left" ? 4 : -4);
  const t = Math.min(1, Math.abs(x) / 182);
  const round = (w: number) => Math.sqrt(Math.max(0.15, 1 - (x / w) ** 2));
  const cy = food === "banana" ? 47 * (1 - t * t) : (FOOD_SHAPES[food].top + FOOD_SHAPES[food].bottom) / 2;
  const ry = food === "banana" ? 21 + 8 * (1 - t * t)
    : food === "strawberry" ? 54 * round(125)
    : food === "tomato" ? 88 * round(105)
    : food === "pepper" ? 74 * round(150)
    : food === "carrot" ? Math.max(3, carrotHalf(x))
    : 40;
  if (food === "carrot") {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx="10" ry={ry} fill="url(#fa-carrot-flesh)" stroke="#d2681a" strokeWidth="2.4" />
        <ellipse cx={cx} cy={cy} rx="5" ry={ry * 0.58} fill="url(#fa-carrot-core)" />
        <path d={`M ${cx - 3} ${cy - ry * 0.4} L ${cx - 8} ${cy - ry * 0.8} M ${cx - 3} ${cy + ry * 0.4} L ${cx - 8} ${cy + ry * 0.8}`} stroke="#fbb25a" strokeWidth="1.2" opacity=".8" />
        <path d={`M ${cx - 6} ${cy - ry * 0.78} Q ${cx} ${cy - ry * 0.95} ${cx + 5} ${cy - ry * 0.7}`} stroke="#fff" strokeWidth="1.6" opacity=".6" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (food === "pepper") {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx="11" ry={ry} fill="#f8e9d2" stroke="#d63a2b" strokeWidth="4" />
        <ellipse cx={cx} cy={cy} rx="6" ry={ry * 0.8} fill="#f0d6b6" opacity=".7" />
        {[-0.4, 0, 0.4].map((o, i) => <ellipse key={i} cx={cx + (i % 2 ? 2 : -2)} cy={cy + o * ry} rx="2.2" ry="3.2" fill="#fbf1c8" stroke="#d8c48a" strokeWidth=".6" />)}
      </g>
    );
  }
  if (food === "tomato") {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx="11" ry={ry} fill="url(#fa-tomato-flesh)" stroke="#d4472f" strokeWidth="2.4" />
        <ellipse cx={cx} cy={cy} rx="3" ry={ry * 0.55} fill="#f8d8b8" opacity=".9" />
        {[-0.5, 0.5].map((o) => (
          <g key={o}>
            <ellipse cx={cx} cy={cy + o * ry} rx="6" ry={ry * 0.26} fill="url(#fa-gel)" stroke="#e58a4a" strokeWidth=".8" />
            {[-0.1, 0.1].map((p) => <ellipse key={p} cx={cx + (p > 0 ? 2 : -2)} cy={cy + o * ry + p * ry} rx="1.8" ry="2.6" fill="#f7eaa8" stroke="#cdb560" strokeWidth=".4" />)}
          </g>
        ))}
        <path d={`M ${cx - 6} ${cy - ry * 0.85} Q ${cx} ${cy - ry * 0.98} ${cx + 5} ${cy - ry * 0.8}`} stroke="#fff" strokeWidth="1.6" opacity=".55" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  const flesh = food === "banana" ? "url(#fa-banana-flesh)" : "url(#fa-strawb-flesh)";
  const edge = food === "banana" ? "#e2c066" : "#b82a38";
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="9" ry={ry} fill={flesh} stroke={edge} strokeWidth="2" />
      {food === "banana" && <ellipse cx={cx} cy={cy} rx="2.2" ry="5" fill="#d8c06c" opacity=".8" />}
      {food === "strawberry" && <ellipse cx={cx} cy={cy} rx="3" ry={ry * 0.5} fill="#fdf1ea" opacity=".85" />}
    </g>
  );
}

// --------------------------------------------------------------- pieces ----

export function BananaSlice({ pitch = 1 }: { pitch?: number }) {
  const t = pitch < 1 ? 7 : 3;
  return (
    <g>
      <ellipse cx="0" cy={t} rx="25" ry={25 * pitch} fill="#e3c25e" />
      {pitch < 1 && <rect x="-25" y="0" width="50" height={t} fill="#ecce72" />}
      <ellipse cx="0" cy="0" rx="25" ry={25 * pitch} fill="url(#fa-banana-peel)" />
      <ellipse cx="0" cy="0" rx="21.5" ry={21.5 * pitch} fill="url(#fa-banana-flesh)" />
      <ellipse cx="0" cy="0" rx="11" ry={11 * pitch} fill="none" stroke="#f1dfa0" strokeWidth="1.4" opacity=".7" />
      <ellipse cx="0" cy={0} rx="2.6" ry={2.6 * pitch} fill="#e6d083" />
      <path d={`M -14 ${-10 * pitch} Q 0 ${-18 * pitch} 14 ${-10 * pitch}`} stroke="#fff" strokeWidth="2.4" opacity=".6" fill="none" strokeLinecap="round" />
    </g>
  );
}
export function StrawberrySlice({ pitch = 1 }: { pitch?: number }) {
  return (
    <g transform={`scale(1 ${pitch})`}>
      <path d="M0 -21 C 17 -24 24 -9 19 5 C 15 19 6 28 0 33 C -6 28 -15 19 -19 5 C -24 -9 -17 -24 0 -21 Z" fill="url(#fa-strawb)" />
      <path d="M0 -17.5 C 14 -19.5 20 -7 16 4 C 12.5 15.5 5 23.5 0 28 C -5 23.5 -12.5 15.5 -16 4 C -20 -7 -14 -19.5 0 -17.5 Z" fill="url(#fa-strawb-flesh)" />
      <path d="M0 -10 C 6 -8 7 4 0 18 C -7 4 -6 -8 0 -10 Z" fill="#fdf1ea" opacity=".9" />
      <path d="M -12 -14 C -6 -19 3 -19 8 -16" stroke="#fff" strokeWidth="2.4" opacity=".65" fill="none" strokeLinecap="round" />
    </g>
  );
}
export function TomatoDice() {
  return (
    <g>
      {[[-14, 6, 0], [10, 8, 18], [-2, -12, -12], [16, -8, 30]].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <rect x="-11" y="-8" width="22" height="19" rx="5" fill="#d9442e" />
          <rect x="-11" y="-11" width="22" height="19" rx="5" fill="url(#fa-tomato-flesh)" />
          <ellipse cx="-3" cy="-3.5" rx="5.5" ry="3.4" fill="url(#fa-gel)" />
          <path d="M -8 -8 Q -2 -11 5 -9" stroke="#fff" strokeWidth="1.6" opacity=".6" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}
const DICE_COLORS = ["#d93a2b", "#cf3225", "#e04535", "#d63a2a", "#c92d22", "#e0463a"];
export function PepperPiece() {
  return (
    <g>
      {([[-12, -9], [0, -9], [12, -9], [-6, 4], [6, 4]] as const).map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${(i % 2 ? 1 : -1) * 6})`}>
          <rect x="-6" y="-4" width="12" height="11" rx="3" fill="#c42f22" />
          <rect x="-6" y="-5.5" width="12" height="11" rx="3" fill={DICE_COLORS[i]} stroke="#ffc2b6" strokeWidth=".9" />
          <rect x="-4.6" y="-4.4" width="5.6" height="2.4" rx="1.2" fill="#fff" opacity=".6" />
        </g>
      ))}
    </g>
  );
}
export function PepperStrip() {
  return (
    <g>
      <rect x="-30" y="-8" width="60" height="18" rx="9" fill="#a9561a" opacity=".3" transform="translate(2 4)" />
      <rect x="-30" y="-9" width="60" height="19" rx="9.5" fill="#d79a1c" />
      <rect x="-30" y="-9" width="60" height="16" rx="8" fill="#f6c73e" />
      <rect x="-28" y="3" width="56" height="5" rx="2.5" fill="#fbe7a2" opacity=".75" />
      <rect x="-26" y="-6" width="48" height="4.5" rx="2.2" fill="#fff" opacity=".5" />
      <path d="M -24 0 Q 0 -2 24 0" stroke="#d08a14" strokeWidth="1.2" opacity=".5" fill="none" />
    </g>
  );
}
export function CarrotCoin({ pitch = 1 }: { pitch?: number }) {
  const t = pitch < 1 ? 5 : 3;
  return (
    <g>
      <ellipse cx="0" cy={t} rx="23" ry={23 * pitch} fill="#e8741c" />
      {pitch < 1 && <rect x="-23" y="0" width="46" height={t} fill="#e8741c" />}
      <g transform={`scale(1 ${pitch})`}>
        <ellipse cx="0" cy="0" rx="23" ry="23" fill="url(#fa-carrot-flesh)" stroke="#ee8a2e" strokeWidth="1.6" />
        <ellipse cx="0" cy="0" rx="14" ry="14" fill="none" stroke="#ef8a2a" strokeWidth="1.2" opacity=".55" />
        <ellipse cx="0" cy="0" rx="9.5" ry="9.5" fill="url(#fa-carrot-core)" />
        <path d="M -15 -9 Q 0 -19 15 -9" stroke="#fff" strokeWidth="2.4" opacity=".6" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}
export function CarrotStick() {
  return (
    <g>
      <rect x="-30" y="-8" width="60" height="18" rx="6" fill="#a9561a" opacity=".28" transform="translate(2 4)" />
      <rect x="-30" y="-9" width="60" height="19" rx="6" fill="#d5701a" />
      <rect x="-30" y="-9" width="60" height="16" rx="6" fill="url(#fa-carrot)" />
      <rect x="-27" y="-5" width="54" height="7" rx="3.5" fill="url(#fa-carrot-core)" opacity=".85" />
      <rect x="-24" y="-7.4" width="40" height="2.4" rx="1.2" fill="#fff" opacity=".6" />
      <ellipse cx="29" cy="-1" rx="3" ry="7" fill="url(#fa-carrot-flesh)" stroke="#cd6217" strokeWidth="1" />
    </g>
  );
}
export function CucumberSlice({ pitch = 1 }: { pitch?: number }) {
  const t = pitch < 1 ? 5 : 3;
  return (
    <g>
      <ellipse cx="0" cy={t} rx="22" ry={22 * pitch} fill="#4c8a34" />
      {pitch < 1 && <rect x="-22" y="0" width="44" height={t} fill="#4c8a34" />}
      <g transform={`scale(1 ${pitch})`}>
        <ellipse cx="0" cy="0" rx="22" ry="22" fill="url(#fa-cuc-skin)" />
        <ellipse cx="0" cy="0" rx="18.5" ry="18.5" fill="url(#fa-cuc)" />
        {[90, 210, 330].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return <ellipse key={deg} cx={Math.cos(a) * 7.5} cy={Math.sin(a) * 7.5} rx="3.6" ry="5" fill="#f1f7cc" transform={`rotate(${deg - 90} ${Math.cos(a) * 7.5} ${Math.sin(a) * 7.5})`} />;
        })}
        <path d="M -14 -9 Q 0 -19 14 -9" stroke="#fff" strokeWidth="2.2" opacity=".55" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}
export function YogurtDollop() {
  return (
    <g>
      <Shadow cy={14} rx={30} ry={9} />
      <path d="M -28 8 C -34 -8 -18 -24 -2 -22 C 6 -34 26 -30 28 -14 C 38 -8 36 8 26 12 C 12 18 -12 18 -28 8 Z" fill="url(#fa-yogurt)" />
      <path d="M -26 8 C -10 15 12 15 26 10 C 14 18 -12 19 -26 8 Z" fill="#e4d7bb" opacity=".7" />
      <path d="M -18 -4 C -8 -12 4 -12 12 -4 M -10 4 C 0 -2 10 0 18 4" stroke="#e9dfc8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M -16 -14 C -10 -20 -2 -20 4 -17" stroke="#fff" strokeWidth="3.4" opacity=".95" fill="none" strokeLinecap="round" />
      <ellipse cx="-12" cy="-12" rx="2.6" ry="1.4" fill="#fff" />
    </g>
  );
}
export function CheeseShred() {
  const strands = [[-8, -3, 28], [4, 6, -20], [10, -8, 70], [-4, 8, 110], [-12, 7, 150]];
  return (
    <g strokeLinecap="round" fill="none">
      {strands.map(([x, y, r], i) => (
        <path key={`b${i}`} d="M -10 1 Q 0 -4 10 1" stroke="#cf9f32" strokeWidth="5" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
      {strands.map(([x, y, r], i) => (
        <path key={`m${i}`} d="M -10 0 Q 0 -5 10 0" stroke="#efc968" strokeWidth="4.2" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
      {strands.map(([x, y, r], i) => (
        <path key={`h${i}`} d="M -8 -1.4 Q 0 -5.6 8 -1.4" stroke="#fff4bd" strokeWidth="1.6" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
    </g>
  );
}
export function OatsPile() {
  return (
    <g>
      <Shadow cy={10} rx={30} ry={9} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = rnd(i) * 6.28, r = Math.sqrt(rnd(i + 3)) * 22;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.7;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rnd(i + 7) * 180})`}>
            <ellipse cx=".6" cy="1" rx="6.8" ry="3.8" fill="#d2b87c" opacity=".55" />
            <ellipse rx="6.5" ry="3.6" fill={i % 3 ? "#f3e6c6" : "#ead7a8"} />
            <ellipse cx="-2" cy="-1.2" rx="2.4" ry=".9" fill="#fff" opacity=".5" />
          </g>
        );
      })}
    </g>
  );
}

/** One glossy black bean, kidney shaped, lit from the upper left. */
export const Bean = ({ x = 0, y = 0, r = 0, s = 1 }: { x?: number; y?: number; r?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M -7 0.5 C -7 -4.2 -2 -5.4 2.5 -4.8 C 7 -4 8 -0.5 6.6 2.6 C 5 5.4 0 5.6 -3 5 C -6 4.2 -7 2.6 -7 0.5 Z" fill="url(#fa-bean)" />
    <path d="M -4 -3 C -1.5 -4.2 1.5 -4.2 3.6 -3.2" stroke="#fff" strokeWidth="1.1" opacity=".6" fill="none" strokeLinecap="round" />
    <ellipse cx="3.6" cy="3.6" rx="1.5" ry=".7" fill="#7d7a76" opacity=".7" />
  </g>
);
/** One corn kernel, a rounded tooth with a bright wet highlight. */
export const Kernel = ({ x = 0, y = 0, r = 0, s = 1 }: { x?: number; y?: number; r?: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M -4.6 -3.2 C -4.6 -6.4 4.6 -6.4 4.6 -3.2 C 5 1 3 5.4 0 6.6 C -3 5.4 -5 1 -4.6 -3.2 Z" fill="url(#fa-corn)" />
    <ellipse cx="-1.6" cy="-3.4" rx="1.5" ry="0.9" fill="#fffbe0" opacity=".85" />
  </g>
);

function scatter(count: number, rx: number, ry: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = rnd(seed + i) * 6.28, r = Math.sqrt(rnd(seed + i + 40));
    return { x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r, rot: rnd(seed + i + 80) * 360 };
  }).sort((p, q) => p.y - q.y);
}
export function BeansPile() {
  return (
    <g>
      <Shadow cy={10} rx={30} ry={9} />
      {scatter(14, 20, 14, 2).map((p, i) => <Bean key={i} x={p.x} y={p.y} r={p.rot} s={1} />)}
    </g>
  );
}
export function CornPile() {
  return (
    <g>
      <Shadow cy={10} rx={30} ry={9} />
      {scatter(18, 21, 14.5, 5).map((p, i) => <Kernel key={i} x={p.x} y={p.y} r={p.rot} s={0.95} />)}
    </g>
  );
}
/** A husked cob lying across the frame: kernels in rows that curve with the cob. */
export function CornCob() {
  const rows = [-2, -1, 0, 1, 2];
  return (
    <g>
      <Shadow cy={26} rx={96} ry={11} />
      {/* husk leaves behind the stalk end */}
      <path d="M -96 -8 C -128 -44 -150 -30 -152 -10 C -138 -16 -120 -10 -100 4 Z" fill="url(#fa-husk)" stroke="#3f7a2b" strokeWidth="1.4" />
      <path d="M -96 10 C -130 40 -152 28 -154 8 C -140 14 -120 10 -100 -2 Z" fill="url(#fa-husk)" stroke="#3f7a2b" strokeWidth="1.4" />
      <path d="M -100 0 C -126 -22 -140 -18 -146 -10 M -100 2 C -126 22 -140 18 -146 10" stroke="#d3ec9f" strokeWidth="1.4" fill="none" opacity=".8" />
      <rect x="-118" y="-5" width="30" height="10" rx="4" fill="#b8a05a" stroke="#7a6a30" strokeWidth="1" />
      {/* the cob */}
      <path d="M -96 -2 C -96 -28 -70 -34 -30 -34 L 52 -34 C 92 -34 108 -16 108 0 C 108 16 92 34 52 34 L -30 34 C -70 34 -96 28 -96 2 Z" fill="url(#fa-cob)" stroke="#c98a0c" strokeWidth="1.6" />
      {rows.map((row) => {
        const th = row * 0.43, ky = Math.sin(th) * 31, kh = Math.cos(th) * 7.2;
        return Array.from({ length: 15 }, (_, c) => {
          const x = -88 + c * 13 + (row % 2 ? 6.5 : 0);
          const taper = x > 52 ? Math.max(0.45, 1 - (x - 52) / 90) : 1;
          if (x > 100) return null;
          return (
            <g key={`${row}-${c}`} transform={`translate(${x} ${ky * taper})`}>
              <ellipse cx="0" cy={kh * 0.25} rx="6" ry={kh * taper} fill="#d29316" opacity=".55" />
              <ellipse cx="0" cy="0" rx="5.6" ry={kh * 0.92 * taper} fill="url(#fa-corn)" />
              <ellipse cx="-1.8" cy={-kh * 0.4 * taper} rx="1.9" ry={Math.max(0.5, kh * 0.3 * taper)} fill="#fffbe0" opacity=".8" />
            </g>
          );
        });
      })}
      <path d="M -80 -26 C -40 -32 20 -32 80 -26" stroke="#fff" strokeWidth="5" opacity=".28" fill="none" strokeLinecap="round" />
      <path d="M 104 -4 C 114 -12 122 -6 120 2 M 104 2 C 116 6 124 14 118 18" stroke="#c9b27a" strokeWidth="1.4" fill="none" opacity=".9" />
    </g>
  );
}
export function CocoaPile() {
  return (
    <g>
      <Shadow cy={10} rx={28} ry={9} />
      <path d="M -26 8 C -22 -10 -8 -18 0 -18 C 10 -18 22 -8 26 8 C 12 14 -12 14 -26 8 Z" fill="#5d3720" />
      <path d="M -26 8 C -22 -10 -8 -18 0 -18 C -10 -6 -16 2 -20 10 Z" fill="#7b4a2c" opacity=".8" />
      <path d="M -16 -2 C -8 -14 6 -14 14 -4" stroke="#9a6643" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".8" />
    </g>
  );
}
export function EggWhole() {
  return (
    <g>
      <Shadow cy={26} rx={22} ry={7} />
      <path d="M0 -28 C 16 -28 24 -4 22 10 C 20 24 10 28 0 28 C -10 28 -20 24 -22 10 C -24 -4 -16 -28 0 -28 Z" fill="url(#fa-egg)" />
      <path d="M -12 -15 C -14 -5 -14 4 -12 11" stroke="#fff" strokeWidth="4.4" opacity=".75" fill="none" strokeLinecap="round" />
      <path d="M 12 12 C 10 20 4 24 -2 25" stroke="#c9a97e" strokeWidth="3" opacity=".4" fill="none" strokeLinecap="round" />
    </g>
  );
}
export function EggCracked() {
  return (
    <g>
      <path d="M -26 2 C -28 -12 -12 -22 2 -19 C 16 -22 30 -10 26 4 C 28 16 12 22 0 20 C -14 22 -28 14 -26 2 Z" fill="#ece3c9" opacity=".7" transform="translate(0 2)" />
      <path d="M -26 0 C -28 -14 -12 -22 2 -19 C 16 -22 30 -10 26 2 C 28 14 12 20 0 18 C -14 20 -28 12 -26 0 Z" fill="#fffcee" />
      <ellipse cx="0" cy="0" rx="10" ry="9.5" fill="url(#fa-yolk)" />
      <ellipse cx="-3" cy="-3.4" rx="3.2" ry="2" fill="#fff4b8" opacity=".9" />
      <path d="M -20 -10 C -14 -15 -8 -16 -2 -15" stroke="#fff" strokeWidth="2.2" opacity=".8" fill="none" strokeLinecap="round" />
    </g>
  );
}
export function PitaWhole() {
  return (
    <g>
      <circle r="168" fill="url(#fa-pita)" />
      <circle r="156" fill="none" stroke="#f9ebc8" strokeWidth="3" opacity=".5" />
      <circle r="165" fill="none" stroke="#c99650" strokeWidth="6" opacity=".18" />
      <path d="M -118 -80 A 150 150 0 0 1 20 -150" stroke="#fff3d6" strokeWidth="10" fill="none" opacity=".5" strokeLinecap="round" />
    </g>
  );
}
export function MashBlob({ r = 1 }: { r?: number }) {
  return (
    <g transform={`scale(${r})`}>
      <path d="M -34 8 C -38 -10 -20 -22 0 -20 C 18 -24 38 -14 36 6 C 38 22 18 30 0 28 C -22 30 -36 22 -34 8 Z" fill="#cfb26a" opacity=".6" />
      <path d="M -34 6 C -38 -12 -20 -24 0 -22 C 18 -26 38 -16 36 4 C 38 20 18 28 0 26 C -22 28 -36 20 -34 6 Z" fill="#f6e6ae" />
      <path d="M -20 -2 C -8 -9 6 -9 18 -2 M -14 9 C -4 4 8 5 20 10" stroke="#e8d192" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M -20 -14 C -10 -20 2 -20 10 -17" stroke="#fffbe8" strokeWidth="3.4" opacity=".85" fill="none" strokeLinecap="round" />
    </g>
  );
}

// --------------------------------------------------------- small bowls ----

function SmallBowl({ children, rim = "#fffdf8" }: { children: ReactNode; rim?: string }) {
  return (
    <g>
      <Shadow cy={26} rx={44} ry={12} />
      <ellipse cx="0" cy="8" rx="40" ry="30" fill="#ecdfc8" />
      <ellipse cx="0" cy="0" rx="40" ry="30" fill={rim} />
      <ellipse cx="0" cy="1" rx="33" ry="23" fill="url(#fa-ceramic-in)" />
      {children}
      <path d="M -32 -12 A 36 26 0 0 1 -4 -24" stroke="#fff" strokeWidth="3.5" fill="none" opacity=".85" strokeLinecap="round" />
    </g>
  );
}
export const YogurtBowl = () => <SmallBowl>
  <ellipse cx="0" cy="-1" rx="29" ry="19" fill="url(#fa-yogurt-top)" />
  <path d="M -14 -4 C -6 -10 6 -10 14 -4 M -8 4 C 0 0 8 1 14 5" stroke="#e8dec6" strokeWidth="2" fill="none" strokeLinecap="round" />
  <path d="M -16 -10 C -8 -15 2 -15 8 -12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
</SmallBowl>;
export const BeansBowl = () => <SmallBowl>
  <ellipse cx="0" cy="-1" rx="30" ry="20" fill="#1c1b1c" />
  {scatter(28, 26, 16, 21).map((p, i) => <Bean key={i} x={p.x} y={p.y - 1} r={p.rot} s={1.05} />)}
</SmallBowl>;
export const CornBowl = () => <SmallBowl>
  <ellipse cx="0" cy="-1" rx="30" ry="20" fill="#d99a14" />
  {scatter(44, 26, 16.5, 31).map((p, i) => <Kernel key={i} x={p.x} y={p.y - 1} r={p.rot} s={0.98} />)}
</SmallBowl>;
export const HummusBowl = () => <SmallBowl>
  <ellipse cx="0" cy="-1" rx="29" ry="19" fill="url(#fa-hummus)" />
  <path d="M -18 0 C -10 -10 6 -11 17 -3 C 8 7 -9 8 -18 0 Z" fill="none" stroke="#d6ae6a" strokeWidth="2" />
  <ellipse cx="0" cy="-2" rx="11" ry="5.5" fill="none" stroke="#d9a63a" strokeWidth="2.4" opacity=".75" />
  <g><ellipse cx="2" cy="-2" rx="4.4" ry="3.6" fill="#ecc882" /><ellipse cx="0.6" cy="-3.4" rx="1.4" ry="1" fill="#fff0c8" opacity=".8" /></g>
  <path d="M -14 -9 C -7 -14 1 -14 6 -12" stroke="#fff" strokeWidth="2.6" opacity=".55" fill="none" strokeLinecap="round" />
</SmallBowl>;
export const BatterBowl = ({ chocolate = false }: { chocolate?: boolean }) => <SmallBowl>
  <ellipse cx="0" cy="-1" rx="29" ry="19" fill={chocolate ? "url(#fa-batter-choc)" : "url(#fa-batter-raw)"} />
  <path d="M -16 -2 C -6 -10 6 -10 16 -2 C 8 6 -8 6 -16 -2 Z" fill="none" stroke={chocolate ? "#3a2114" : "#d6b979"} strokeWidth="2" opacity=".7" />
  <path d="M -16 -9 C -8 -14 2 -14 8 -11" stroke={chocolate ? "#9a6a4a" : "#fff7e0"} strokeWidth="2.6" opacity=".6" fill="none" strokeLinecap="round" />
</SmallBowl>;

// ----------------------------------------------------------- the registry ---

export type Art = { fit: number; draw: (o: { pitch: number; chocolate?: boolean }) => ReactNode };
const wholeBanana = () => <g transform="rotate(-24) scale(.215) translate(0 -26)"><path d={BANANA_PATH} fill="url(#fa-banana-body)" /><FoodDetail food="banana" /></g>;
const wholeBerry = () => <g transform="translate(3 0) scale(.265)"><path d={STRAWB_PATH} fill="url(#fa-strawb)" /><FoodDetail food="strawberry" /></g>;
const wholePepper = () => <g transform="translate(0 4) scale(.27)"><path d={PEPPER_PATH} fill="url(#fa-pepper)" /><FoodDetail food="pepper" /></g>;
const wholeCarrot = () => <g transform="translate(4 0) scale(.265)"><path d={CARROT_PATH} fill="url(#fa-carrot)" /><FoodDetail food="carrot" /></g>;
const wholeTomato = () => <g transform="translate(0 5) scale(.33)"><path d={TOMATO_PATH} fill="url(#fa-tomato)" /><FoodDetail food="tomato" /></g>;

export const ART: Record<string, Art> = {
  "banana:whole": { fit: 38, draw: wholeBanana },
  "banana:slice": { fit: 32, draw: ({ pitch }) => <BananaSlice pitch={pitch} /> },
  "banana:mash": { fit: 42, draw: () => <MashBlob /> },
  "strawberry:whole": { fit: 38, draw: wholeBerry },
  "strawberry:slice": { fit: 34, draw: ({ pitch }) => <StrawberrySlice pitch={pitch} /> },
  "pepper:whole": { fit: 40, draw: wholePepper },
  "pepper:piece": { fit: 32, draw: () => <PepperPiece /> },
  "pepper:strip": { fit: 38, draw: () => <PepperStrip /> },
  "carrot:whole": { fit: 42, draw: wholeCarrot },
  "carrot:stick": { fit: 36, draw: () => <CarrotStick /> },
  "carrot:coin": { fit: 32, draw: ({ pitch }) => <CarrotCoin pitch={pitch} /> },
  "cucumber:slice": { fit: 32, draw: ({ pitch }) => <CucumberSlice pitch={pitch} /> },
  "tomato:whole": { fit: 38, draw: wholeTomato },
  "tomato:dice": { fit: 32, draw: () => <TomatoDice /> },
  "yogurt:dollop": { fit: 40, draw: () => <YogurtDollop /> },
  "yogurt:bowl": { fit: 52, draw: () => <YogurtBowl /> },
  "beans:bowl": { fit: 52, draw: () => <BeansBowl /> },
  "corn:bowl": { fit: 52, draw: () => <CornBowl /> },
  "hummus:bowl": { fit: 52, draw: () => <HummusBowl /> },
  "batter:bowl": { fit: 52, draw: ({ chocolate }) => <BatterBowl chocolate={chocolate} /> },
  "oats:pile": { fit: 36, draw: () => <OatsPile /> },
  "beans:pile": { fit: 36, draw: () => <BeansPile /> },
  "corn:pile": { fit: 36, draw: () => <CornPile /> },
  "corn:cob": { fit: 40, draw: () => <g transform="rotate(-22) translate(14 0) scale(.23)"><CornCob /></g> },
  "cocoa:pile": { fit: 34, draw: () => <CocoaPile /> },
  "egg:whole": { fit: 34, draw: () => <EggWhole /> },
  "egg:cracked": { fit: 30, draw: () => <EggCracked /> },
  "cheese:pile": { fit: 30, draw: () => <CheeseShred /> },
  "pita:whole": { fit: 44, draw: () => <g transform="scale(.24)"><PitaWhole /></g> },
  ...EXTRA_ART,
};

export const ASSET_LABEL: Record<string, string> = {
  "banana:whole": "Banana", "banana:slice": "Banana slices", "banana:mash": "Mashed banana",
  "strawberry:whole": "Strawberry", "strawberry:slice": "Strawberry slices",
  "pepper:whole": "Bell pepper", "pepper:piece": "Pepper pieces", "pepper:strip": "Pepper strips",
  "carrot:whole": "Carrot", "carrot:coin": "Carrot coins", "carrot:stick": "Carrot sticks", "corn:cob": "Corn on the cob", "cucumber:slice": "Cucumber slices",
  "tomato:whole": "Tomato", "tomato:dice": "Tomato pieces",
  "yogurt:dollop": "Yogurt", "yogurt:bowl": "Yogurt", "beans:bowl": "Black beans", "corn:bowl": "Corn",
  "hummus:bowl": "Hummus", "batter:bowl": "Batter", "oats:pile": "Oats", "beans:pile": "Black beans",
  "cocoa:pile": "Cocoa", "egg:whole": "Egg", "pita:whole": "Pita", "cheese:pile": "Cheese", "corn:pile": "Corn",
  ...EXTRA_LABEL,
};

/** A single ingredient as a small picture, for trays and questions. */
export function AssetIcon({ asset, size = 56, chocolate }: { asset: string; size?: number; chocolate?: boolean }) {
  const art = ART[asset];
  if (!art) return null;
  const f = art.fit;
  return (
    <svg className="ck-icon" width={size} height={size} viewBox={`${-f} ${-f} ${f * 2} ${f * 2}`} aria-hidden="true" focusable="false">
      {art.draw({ pitch: 1, chocolate })}
    </svg>
  );
}
