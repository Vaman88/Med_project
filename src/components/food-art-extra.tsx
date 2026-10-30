import type { ReactNode } from "react";

// More original food illustrations for the newer recipes. Same rules as
// food-art.tsx: every drawing is centered on (0,0), lit from the upper left,
// and uses soft gradients, one highlight and a contact shadow. This file does
// not import food-art.tsx (food-art.tsx imports this one), so it keeps its own
// tiny helpers and its own "fx-" gradient ids.

const rnd = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

type Stop = [number, string, number?];
function Grad({ id, stops, radial, x2 = 0, y2 = 1, cx = 0.36, cy = 0.3, r = 0.8 }: {
  id: string; stops: Stop[]; radial?: boolean; x2?: number; y2?: number; cx?: number; cy?: number; r?: number;
}) {
  const kids = stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />);
  return radial
    ? <radialGradient id={id} cx={cx} cy={cy} r={r}>{kids}</radialGradient>
    : <linearGradient id={id} x1={0} y1={0} x2={x2} y2={y2}>{kids}</linearGradient>;
}

/** Gradients for the extra art. Rendered inside the shared FoodDefs <defs>. */
export function ExtraDefs() {
  return (
    <>
      <Grad id="fx-grape" radial stops={[[0, "#9a6cc2"], [0.55, "#6a3d93"], [1, "#43235f"]]} />
      <Grad id="fx-blue" radial stops={[[0, "#6f86c9"], [0.55, "#3f5192"], [1, "#27325f"]]} />
      <Grad id="fx-orange" radial cx={0.4} cy={0.35} r={0.9} stops={[[0, "#ffc062"], [0.6, "#f58f1f"], [1, "#d96d0f"]]} />
      <Grad id="fx-orange-in" radial cx={0.45} cy={0.4} r={0.8} stops={[[0, "#ffd58a"], [1, "#f9a83a"]]} />
      <Grad id="fx-tortilla" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#fbf0d6"], [0.7, "#f0d9a8"], [1, "#d9b678"]]} />
      <Grad id="fx-avo-skin" radial cx={0.38} cy={0.3} r={0.95} stops={[[0, "#5f8a3a"], [0.6, "#3c6428"], [1, "#27421b"]]} />
      <Grad id="fx-avo-flesh" radial cx={0.5} cy={0.55} r={0.65} stops={[[0, "#f4efa0"], [0.55, "#d6e07c"], [1, "#9cbd4c"]]} />
      <Grad id="fx-pit" radial cx={0.35} cy={0.3} r={0.85} stops={[[0, "#b98557"], [0.6, "#8a5632"], [1, "#5e3a20"]]} />
      <Grad id="fx-spinach" x2={1} y2={1} stops={[[0, "#5fa34a"], [0.6, "#3d7d31"], [1, "#2c5e26"]]} />
      <Grad id="fx-rice" x2={1} y2={1} stops={[[0, "#fffaf0"], [1, "#e6d8ba"]]} />
      <Grad id="fx-pea" radial stops={[[0, "#c4e888"], [0.6, "#7ec24b"], [1, "#4c8a2e"]]} />
      <Grad id="fx-sauce" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#e8604a"], [0.7, "#c8402e"], [1, "#a82c20"]]} />
      <Grad id="fx-eggmix" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#fff0a8"], [0.7, "#fbd95a"], [1, "#e9b92f"]]} />
      <Grad id="fx-soy" radial cx={0.4} cy={0.35} r={0.8} stops={[[0, "#6b3a22"], [1, "#2e170d"]]} />
      <Grad id="fx-milk" x2={1} y2={0} stops={[[0, "#f1ebdc"], [0.3, "#ffffff"], [1, "#e8e0cd"]]} />
      <Grad id="fx-jug" x2={1} y2={0} stops={[[0, "#ffffff", 0.85], [0.2, "#e9f1ee", 0.35], [0.8, "#dce9e4", 0.28], [1, "#ffffff", 0.8]]} />
      <Grad id="fx-raisin" radial stops={[[0, "#8a5b6e"], [0.6, "#4e2c3e"], [1, "#2d1824"]]} />
      <Grad id="fx-cinnamon" stops={[[0, "#c97b38"], [1, "#8e4a1c"]]} />
      <Grad id="fx-dough" radial cx={0.4} cy={0.3} r={0.9} stops={[[0, "#f6e6bd"], [0.7, "#e6cd93"], [1, "#cfb06f"]]} />
      <Grad id="fx-cookie" radial cx={0.4} cy={0.3} r={0.95} stops={[[0, "#eab565"], [0.65, "#d19444"], [1, "#a96a28"]]} />
      <Grad id="fx-scramble" radial cx={0.4} cy={0.3} r={0.9} stops={[[0, "#fff2a6"], [0.7, "#fadb55"], [1, "#e3b32c"]]} />
      <Grad id="fx-crumb" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#fbefd0"], [0.7, "#f0d9a6"], [1, "#e1c186"]]} />
      <Grad id="fx-toast" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#e8b867"], [0.7, "#d19a4a"], [1, "#b2772e"]]} />
      <Grad id="fx-crust" x2={1} y2={1} stops={[[0, "#e3b274"], [1, "#c28a48"]]} />
      <Grad id="fx-avocado-spread" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#cfe27c"], [0.7, "#a8c95a"], [1, "#86a83e"]]} />
      <Grad id="fx-hummus-spread" radial cx={0.4} cy={0.35} r={0.85} stops={[[0, "#f4e2bb"], [1, "#dcbe86"]]} />
      <Grad id="fx-noodle" x2={1} y2={1} stops={[[0, "#f8dd86"], [1, "#e1b64a"]]} />
      <Grad id="fx-tin" x2={1} y2={1} stops={[[0, "#c9ccca"], [1, "#868a88"]]} />
      <Grad id="fx-muffin" radial cx={0.4} cy={0.3} r={0.9} stops={[[0, "#fff0a2"], [0.7, "#f3cb48"], [1, "#d49d26"]]} />
      <Grad id="fx-muffin-baked" radial cx={0.4} cy={0.3} r={0.9} stops={[[0, "#f5cf62"], [0.6, "#e0a233"], [1, "#b97420"]]} />
    </>
  );
}

const Shadow = ({ cx = 0, cy = 0, rx, ry, o = 1 }: { cx?: number; cy?: number; rx: number; ry: number; o?: number }) =>
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#fa-shadow)" opacity={o} />;

// ------------------------------------------------------------------ fruit ---

function Grape({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={r * 0.18} cy={r * 0.3} rx={r} ry={r} fill="#2b1540" opacity=".35" />
      <circle r={r} fill="url(#fx-grape)" />
      <ellipse cx={r * 0.1} cy={r * 0.25} rx={r * 0.7} ry={r * 0.55} fill="#a58ac0" opacity=".16" />
      <ellipse cx={-r * 0.36} cy={-r * 0.4} rx={r * 0.3} ry={r * 0.2} fill="#fff" opacity=".6" transform={`rotate(-35 ${-r * 0.36} ${-r * 0.4})`} />
    </g>
  );
}
export function GrapePile() {
  const pts: [number, number][] = [[-14, 6], [3, 9], [18, 5], [-6, -7], [10, -6], [-20, -5], [-1, -19]];
  return (
    <g>
      <Shadow cy={14} rx={34} ry={9} />
      <path d="M -1 -26 C 0 -34 6 -36 10 -34" stroke="#6b4a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
      {pts.map(([x, y], i) => <Grape key={i} x={x} y={y} r={11} />)}
    </g>
  );
}
export const GrapeSingle = () => (
  <g>
    <Shadow cy={20} rx={24} ry={7} />
    <Grape x={0} y={0} r={20} />
  </g>
);

export function BlueberryPile() {
  const pts: [number, number][] = [[-14, 6], [2, 10], [16, 4], [-5, -6], [10, -8], [-20, -6], [3, 0]];
  return (
    <g>
      <Shadow cy={14} rx={32} ry={9} />
      {pts.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse cx="1.5" cy="2.4" rx="8.6" ry="8.2" fill="#161d3a" opacity=".38" />
          <circle r="8.6" fill="url(#fx-blue)" />
          <ellipse cx="1" cy="2" rx="6" ry="4.5" fill="#b6c3e8" opacity=".2" />
          <g transform="translate(2 -1)" fill="#232f5c">
            <circle r="2.6" />
            {[0, 72, 144, 216, 288].map((a) => <path key={a} d="M 0 -2.2 L 1.3 -4.4 L -1.3 -4.4 Z" transform={`rotate(${a})`} />)}
          </g>
          <ellipse cx="-3.4" cy="-4" rx="2.8" ry="1.7" fill="#fff" opacity=".55" transform="rotate(-35 -3.4 -4)" />
        </g>
      ))}
    </g>
  );
}

export function OrangeSegments() {
  const seg = (
    <g>
      <path d="M -20 0 A 20 20 0 0 0 20 0 Q 0 -8 -20 0 Z" fill="url(#fx-orange)" stroke="#d9731a" strokeWidth="1" />
      <path d="M -16 1 A 16 15 0 0 0 16 1 Q 0 -5 -16 1 Z" fill="url(#fx-orange-in)" />
      {[-9, -3, 3, 9].map((x) => <path key={x} d={`M ${x} 0 Q ${x * 0.9} 8 ${x * 0.8} 13`} stroke="#f7b95a" strokeWidth="1.6" fill="none" strokeLinecap="round" />)}
      <path d="M -14 3 Q -8 11 0 12" stroke="#fff" strokeWidth="2.2" fill="none" opacity=".5" strokeLinecap="round" />
    </g>
  );
  return (
    <g>
      <Shadow cy={16} rx={36} ry={9} />
      {([[-14, 7, -18], [14, 8, 14], [0, -9, 178]] as const).map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>{seg}</g>
      ))}
    </g>
  );
}

// -------------------------------------------------------------- vegetables ---

export function AvocadoHalf() {
  return (
    <g>
      <Shadow cy={34} rx={26} ry={7} />
      <path d="M 0 -34 C 14 -34 24 -14 28 6 C 32 26 18 38 0 38 C -18 38 -32 26 -28 6 C -24 -14 -14 -34 0 -34 Z" fill="url(#fx-avo-skin)" />
      <path d="M 0 -29 C 11 -29 20 -12 23.5 6 C 27 23 15 33 0 33 C -15 33 -27 23 -23.5 6 C -20 -12 -11 -29 0 -29 Z" fill="url(#fx-avo-flesh)" />
      <circle cx="0" cy="12" r="12.5" fill="#5e3a20" opacity=".35" transform="translate(1 2)" />
      <circle cx="0" cy="12" r="12.5" fill="url(#fx-pit)" />
      <ellipse cx="-4" cy="7" rx="4.5" ry="2.8" fill="#fff" opacity=".4" transform="rotate(-30 -4 7)" />
      <path d="M -14 -14 C -10 -22 -3 -26 3 -26" stroke="#fffde0" strokeWidth="3" fill="none" opacity=".6" strokeLinecap="round" />
    </g>
  );
}

function Leaf({ r, x, y, s = 1 }: { r: number; x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M 1.5 20 C -15 12 -21 -9 1 -26 C 22 -9 18 12 1.5 20 Z" fill="#1d3f19" opacity=".35" />
      <path d="M 0 18 C -16 10 -20 -10 0 -26 C 20 -10 16 10 0 18 Z" fill="url(#fx-spinach)" />
      <path d="M 0 17 L 0 -18" stroke="#a9d98f" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".7" />
      <path d="M -9 -8 C -7 -16 -3 -20 1 -21" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".35" strokeLinecap="round" />
    </g>
  );
}
export function SpinachLeaves() {
  return (
    <g>
      <Shadow cy={20} rx={34} ry={8} />
      <Leaf r={-52} x={-15} y={4} />
      <Leaf r={50} x={15} y={5} />
      <Leaf r={0} x={0} y={-2} s={1.08} />
    </g>
  );
}

export function PeasPile() {
  return (
    <g>
      <Shadow cy={12} rx={32} ry={9} />
      {Array.from({ length: 13 }, (_, i) => {
        const a = rnd(i + 4) * 6.28, r = Math.sqrt(rnd(i + 21)) * 21;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.7;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="1.2" cy="2" rx="6" ry="5.8" fill="#27471b" opacity=".35" />
            <circle r="6" fill="url(#fx-pea)" />
            <ellipse cx="-2" cy="-2.2" rx="2" ry="1.3" fill="#fff" opacity=".6" transform="rotate(-30 -2 -2.2)" />
          </g>
        );
      })}
    </g>
  );
}

// ------------------------------------------------------------ grains, dough ---

export function RicePile() {
  return (
    <g>
      <Shadow cy={11} rx={32} ry={10} />
      <ellipse cx="0" cy="2" rx="25" ry="15" fill="#cdbd98" opacity=".5" />
      {Array.from({ length: 46 }, (_, i) => {
        const a = rnd(i + 8) * 6.28, r = Math.sqrt(rnd(i + 31)) * 24;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.62 - 2;
        return <ellipse key={i} cx={x} cy={y} rx="5.4" ry="2.2" fill="url(#fx-rice)" transform={`rotate(${rnd(i + 3) * 180} ${x} ${y})`} />;
      })}
    </g>
  );
}

export function PastaPile() {
  return (
    <g>
      <Shadow cy={16} rx={40} ry={11} />
      {[0, 36, 72, 108, 144].map((a, i) => (
        <g key={a} transform={`rotate(${a})`} fill="none">
          <ellipse rx={29 - i * 2} ry={13 + (i % 2) * 3} stroke="#c99a35" strokeWidth="6.4" opacity=".55" transform="translate(1 2)" />
          <ellipse rx={29 - i * 2} ry={13 + (i % 2) * 3} stroke="url(#fx-noodle)" strokeWidth="5.4" />
          <ellipse rx={29 - i * 2} ry={13 + (i % 2) * 3} stroke="#fff6c8" strokeWidth="1.4" opacity=".6" strokeDasharray="14 40" />
        </g>
      ))}
    </g>
  );
}

export function RaisinPile() {
  return (
    <g>
      <Shadow cy={10} rx={28} ry={8} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = rnd(i + 6) * 6.28, r = Math.sqrt(rnd(i + 15)) * 17;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.7;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rnd(i) * 180})`}>
            <ellipse cx="1" cy="1.8" rx="6.4" ry="4.4" fill="#1c0e16" opacity=".4" />
            <ellipse rx="6.4" ry="4.4" fill="url(#fx-raisin)" />
            <ellipse cx="-2.2" cy="-1.8" rx="2" ry="1" fill="#fff" opacity=".4" />
          </g>
        );
      })}
    </g>
  );
}

export function CinnamonPile() {
  return (
    <g>
      <Shadow cy={10} rx={28} ry={8} />
      <path d="M -24 8 C -20 -8 -8 -16 0 -16 C 10 -16 20 -8 24 8 C 10 14 -10 14 -24 8 Z" fill="url(#fx-cinnamon)" />
      <path d="M -14 -2 C -8 -11 4 -12 12 -4" stroke="#e0a063" strokeWidth="3.6" fill="none" strokeLinecap="round" opacity=".7" />
      <g transform="translate(6 -9) rotate(-24)">
        <rect x="-17" y="-3.6" width="34" height="7.2" rx="3.6" fill="#8a4719" />
        <rect x="-15" y="-2.6" width="30" height="2.6" rx="1.3" fill="#c98547" opacity=".8" />
        <ellipse cx="17" cy="0" rx="2.4" ry="3.6" fill="#5e300f" />
      </g>
    </g>
  );
}

function lumpPath({ r, seed }: { r: number; seed: number }) {
  const n = 10;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 6.283, k = 0.9 + rnd(seed * 9 + i) * 0.2;
    return [Math.cos(a) * r * k, Math.sin(a) * r * k * 0.86] as const;
  });
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${mid(pts[n - 1], pts[0]).join(" ")}`;
  for (let i = 0; i < n; i++) d += ` Q ${pts[i].join(" ")} ${mid(pts[i], pts[(i + 1) % n]).join(" ")}`;
  return d + " Z";
}
export function CookieDough() {
  return (
    <g>
      <Shadow cy={16} rx={30} ry={9} />
      <path d={lumpPath({ r: 22, seed: 3 })} fill="#b9985a" transform="translate(1 3)" />
      <path d={lumpPath({ r: 22, seed: 3 })} fill="url(#fx-dough)" />
      {[[-8, -3], [9, 5], [2, -10]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="3.6" ry="2.6" fill="url(#fx-raisin)" />)}
      <ellipse cx="-9" cy="-12" rx="8" ry="3" fill="#fff" opacity=".28" transform="rotate(-20 -9 -12)" />
    </g>
  );
}
export function CookieBaked() {
  return (
    <g>
      <Shadow cy={18} rx={34} ry={10} />
      <path d={lumpPath({ r: 27, seed: 7 })} fill="#8c5a24" transform="translate(1 4)" />
      <path d={lumpPath({ r: 27, seed: 7 })} fill="url(#fx-cookie)" />
      <path d={lumpPath({ r: 21, seed: 7 })} fill="none" stroke="#b97b34" strokeWidth="2" opacity=".35" />
      {[[-9, -4], [10, 6], [3, -12], [-6, 9]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <ellipse rx="4.2" ry="3" fill="url(#fx-raisin)" />
          <ellipse cx="-1.4" cy="-1.2" rx="1.4" ry=".8" fill="#fff" opacity=".4" />
        </g>
      ))}
      <path d="M -17 -14 C -8 -21 5 -21 12 -17" stroke="#fff3cf" strokeWidth="3.2" fill="none" opacity=".45" strokeLinecap="round" />
    </g>
  );
}

export function EggScramble() {
  return (
    <g>
      <Shadow cy={13} rx={30} ry={9} />
      {([[-12, 3, 14], [8, 6, 12], [1, -7, 13], [16, -4, 9], [-5, 11, 9]] as const).map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d={lumpPath({ r: r + 1, seed: i + 11 })} fill="#c99b1c" opacity=".5" transform="translate(1 2)" />
          <path d={lumpPath({ r, seed: i + 11 })} fill="url(#fx-scramble)" />
          <ellipse cx={-r * 0.3} cy={-r * 0.4} rx={r * 0.4} ry={r * 0.2} fill="#fff" opacity=".55" />
        </g>
      ))}
    </g>
  );
}

/** A round slice of country bread. `toast` goes from soft (0) to golden (1). */
export function BreadSlice({ toast = 0, r = 40 }: { toast?: number; r?: number }) {
  const k = r / 40;
  return (
    <g transform={`scale(${k})`}>
      <ellipse cx="0" cy="42" rx="42" ry="7" fill="url(#fa-shadow)" opacity=".7" />
      <circle r="40" fill="url(#fx-crust)" />
      <circle r="37" fill="url(#fx-crumb)" />
      <circle r="37" fill="url(#fx-toast)" opacity={toast} />
      <circle r="37" fill="none" stroke="#a96d2f" strokeWidth="2" opacity={0.18 + toast * 0.3} />
      <path d="M -26 -20 A 33 33 0 0 1 -2 -33" stroke="#fff" strokeWidth="4" fill="none" opacity=".5" strokeLinecap="round" />
    </g>
  );
}

export const TortillaWhole = ({ r = 42 }: { r?: number }) => (
  <g>
    <circle r={r + 2} fill="#c7a56a" opacity=".5" transform="translate(1 2)" />
    <circle r={r} fill="url(#fx-tortilla)" />
    <circle r={r - 5} fill="none" stroke="#e7cf9c" strokeWidth="1.5" opacity=".8" />
    <path d={`M ${-r * 0.62} ${-r * 0.5} A ${r * 0.8} ${r * 0.8} 0 0 1 ${-r * 0.05} ${-r * 0.8}`} stroke="#fff" strokeWidth="3.4" fill="none" opacity=".5" strokeLinecap="round" />
  </g>
);

// --------------------------------------------------------- bowls and jugs ----

function SmallBowl({ children }: { children: ReactNode }) {
  return (
    <g>
      <Shadow cy={26} rx={44} ry={12} />
      <ellipse cx="0" cy="8" rx="40" ry="30" fill="#ecdfc8" />
      <ellipse cx="0" cy="0" rx="40" ry="30" fill="#fffdf8" />
      <ellipse cx="0" cy="1" rx="33" ry="23" fill="url(#fa-ceramic-in)" />
      {children}
      <path d="M -32 -12 A 36 26 0 0 1 -4 -24" stroke="#fff" strokeWidth="3.5" fill="none" opacity=".85" strokeLinecap="round" />
    </g>
  );
}
export const SauceBowl = () => (
  <SmallBowl>
    <ellipse cx="0" cy="-1" rx="29" ry="19" fill="url(#fx-sauce)" />
    <path d="M -14 -2 C -6 -10 6 -10 14 -2 C 8 6 -8 6 -14 -2 Z" fill="none" stroke="#9e2a1e" strokeWidth="2" opacity=".6" />
    <path d="M -16 -8 C -8 -14 2 -14 8 -11" stroke="#ffd2c8" strokeWidth="3" fill="none" opacity=".6" strokeLinecap="round" />
  </SmallBowl>
);
export const SoyCup = () => (
  <SmallBowl>
    <ellipse cx="0" cy="-1" rx="29" ry="19" fill="url(#fx-soy)" />
    <path d="M -16 -8 C -8 -14 2 -14 8 -11" stroke="#fff" strokeWidth="3" fill="none" opacity=".4" strokeLinecap="round" />
  </SmallBowl>
);
export const EggMixBowl = () => (
  <SmallBowl>
    <ellipse cx="0" cy="-1" rx="29" ry="19" fill="url(#fx-eggmix)" />
    {[[-12, -2, "#4f9a3d"], [8, -6, "#d6382c"], [13, 5, "#4f9a3d"], [-4, 7, "#f2b63a"], [-15, 6, "#d6382c"], [3, -1, "#4f9a3d"]].map(([x, y, c], i) => (
      <rect key={i} x={Number(x) - 2.6} y={Number(y) - 2.2} width="5.2" height="4.4" rx="1.6" fill={String(c)} transform={`rotate(${i * 37} ${x} ${y})`} />
    ))}
    <path d="M -16 -8 C -8 -14 2 -14 8 -11" stroke="#fff" strokeWidth="3" fill="none" opacity=".55" strokeLinecap="round" />
  </SmallBowl>
);

export function MilkJug() {
  return (
    <g>
      <Shadow cy={40} rx={34} ry={9} />
      <path d="M 24 -6 C 44 -10 44 22 24 22" stroke="#cfdcd6" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M -22 -22 L 22 -22 L 26 30 Q 26 40 17 40 L -17 40 Q -26 40 -26 30 Z" fill="#f4f8f6" opacity=".65" />
      <path d="M -24 0 L 25 0 L 26 30 Q 26 40 17 40 L -17 40 Q -26 40 -26 30 Z" fill="url(#fx-milk)" />
      <path d="M -24 0 Q 0 5 25 0" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".8" />
      <path d="M -22 -22 L -36 -28 L -22 -12" fill="#eef4f1" />
      <path d="M -22 -22 L 22 -22 L 26 30 Q 26 40 17 40 L -17 40 Q -26 40 -26 30 Z" fill="url(#fx-jug)" stroke="#d3e0da" strokeWidth="1.5" />
      <path d="M -17 -14 L -20 28" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".75" />
    </g>
  );
}

// --------------------------------------------------------------- registry ----

export type ExtraArt = { fit: number; draw: (o: { pitch: number; chocolate?: boolean }) => ReactNode };

export const EXTRA_ART: Record<string, ExtraArt> = {
  "grape:pile": { fit: 36, draw: () => <GrapePile /> },
  "grape:single": { fit: 26, draw: () => <GrapeSingle /> },
  "blueberry:pile": { fit: 34, draw: () => <BlueberryPile /> },
  "orange:segments": { fit: 38, draw: () => <OrangeSegments /> },
  "avocado:half": { fit: 40, draw: () => <AvocadoHalf /> },
  "spinach:leaves": { fit: 36, draw: () => <SpinachLeaves /> },
  "peas:pile": { fit: 34, draw: () => <PeasPile /> },
  "rice:pile": { fit: 36, draw: () => <RicePile /> },
  "pasta:pile": { fit: 42, draw: () => <PastaPile /> },
  "raisin:pile": { fit: 32, draw: () => <RaisinPile /> },
  "cinnamon:pile": { fit: 32, draw: () => <CinnamonPile /> },
  "cookie:dough": { fit: 32, draw: () => <CookieDough /> },
  "cookie:baked": { fit: 36, draw: () => <CookieBaked /> },
  "egg:scrambled": { fit: 32, draw: () => <EggScramble /> },
  "bread:slice": { fit: 46, draw: () => <BreadSlice /> },
  "tortilla:whole": { fit: 46, draw: () => <TortillaWhole /> },
  "sauce:bowl": { fit: 52, draw: () => <SauceBowl /> },
  "soy:cup": { fit: 52, draw: () => <SoyCup /> },
  "eggmix:bowl": { fit: 52, draw: () => <EggMixBowl /> },
  "milk:jug": { fit: 48, draw: () => <MilkJug /> },
};

export const EXTRA_LABEL: Record<string, string> = {
  "grape:pile": "Grapes", "grape:single": "Grapes", "blueberry:pile": "Blueberries",
  "orange:segments": "Orange pieces", "avocado:half": "Avocado", "spinach:leaves": "Spinach",
  "peas:pile": "Peas", "rice:pile": "Rice", "pasta:pile": "Pasta", "raisin:pile": "Raisins",
  "cinnamon:pile": "Cinnamon", "cookie:dough": "Cookie dough", "cookie:baked": "Cookie",
  "egg:scrambled": "Scrambled egg", "bread:slice": "Bread", "tortilla:whole": "Tortilla",
  "sauce:bowl": "Tomato sauce", "soy:cup": "Soy sauce", "eggmix:bowl": "Egg mixture", "milk:jug": "Milk",
};
