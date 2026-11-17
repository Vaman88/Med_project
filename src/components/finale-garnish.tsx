import type { ReactNode } from "react";
import type { GarnishKind } from "@/lib/plating";

type Spot = { cx: number; cy: number; rx: number; ry: number };

// A fixed pseudo-random scatter, so the same dish always looks the same.
const scatter = (n: number, spot: Spot, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2.399963 + seed) % (Math.PI * 2), r = Math.sqrt((i + 0.5) / n);
    return { x: spot.cx + Math.cos(a) * spot.rx * r, y: spot.cy + Math.sin(a) * spot.ry * r, rot: (i * 47 + seed * 13) % 180 };
  });

function MintSprig({ x, y, s = 1, rot = 0 }: { x: number; y: number; s?: number; rot?: number }) {
  const leaf = (r: number, light: boolean) => (
    <g transform={`rotate(${r})`}>
      <path d="M0 0 C10 -16 32 -16 38 -2 C30 8 12 8 0 0Z" fill={light ? "#5fbf4a" : "#3f9a34"} stroke="#24601c" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2 0 C14 -3 26 -4 35 -2" fill="none" stroke="#9ee07f" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 -2 l4 -6 M22 -3 l4 -6 M14 -1 l4 5 M24 -2 l4 5" stroke="#2e7a24" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>{leaf(-150, false)}{leaf(-30, true)}{leaf(-90, true)}<circle r="3.4" fill="#2e7a24" /></g>;
}

/** The finishing touch drawn on top of the plated dish. */
export function Garnish({ kind, spot }: { kind: GarnishKind; spot: Spot }) {
  let body: ReactNode = null;
  if (kind === "mint") body = <MintSprig x={spot.cx + spot.rx * 0.1} y={spot.cy - spot.ry * 0.1} s={1.25} rot={-10} />;
  else if (kind === "honey") {
    const { cx, cy, rx, ry } = spot;
    let d = `M ${cx - rx * 0.8} ${cy - ry * 0.45}`;
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 5;
      d += ` Q ${cx - rx * 0.8 + rx * 1.6 * (t - 0.1)} ${cy + (i % 2 ? -1 : 1) * ry * 0.75} ${cx - rx * 0.8 + rx * 1.6 * t} ${cy - ry * 0.45 + ry * 0.9 * t * (i % 2 ? 1 : 0.4)}`;
    }
    body = (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke="#b06a08" strokeWidth="11" opacity=".55" />
        <path d={d} stroke="#f5a623" strokeWidth="8" opacity=".9" />
        <path d={d} stroke="#ffe08a" strokeWidth="2.6" opacity=".9" />
      </g>
    );
  } else if (kind === "herbs") body = scatter(18, spot, 1.3).map((p, i) => (
    <path key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} d="M-5 0 C-3 -4 3 -4 5 0 C3 4 -3 4 -5 0Z" fill={i % 3 ? "#3f9a34" : "#5fbf4a"} stroke="#24601c" strokeWidth="1" />
  ));
  else if (kind === "seeds") body = scatter(26, spot, 2.1).map((p, i) => (
    <ellipse key={i} cx={p.x} cy={p.y} rx="3.4" ry="2" transform={`rotate(${p.rot} ${p.x} ${p.y})`} fill="#fff4d6" stroke="#b8975a" strokeWidth=".8" />
  ));
  else {
    const color = kind === "cocoa" ? "#4a2a18" : "#9a5a24";
    body = (
      <g>
        <ellipse cx={spot.cx} cy={spot.cy} rx={spot.rx * 0.7} ry={spot.ry * 0.7} fill={color} opacity=".12" />
        {scatter(46, spot, 0.7).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i % 4 ? 1.6 : 2.4} fill={color} opacity=".8" />)}
      </g>
    );
  }
  return <g className="ck-garnish">{body}</g>;
}

/** Twinkling stars around the dish for the reveal (they play a few times, then rest). */
export function Sparkles({ spot }: { spot: Spot }) {
  const at = [[-1.05, -0.9], [1.1, -0.55], [-1.2, 0.45], [0.95, 0.95], [0.1, -1.25]];
  return (
    <g className="ck-sparkles" aria-hidden="true">
      {at.map(([dx, dy], i) => (
        <path key={i} className="ck-sparkle" style={{ animationDelay: `${i * 180}ms` }}
          transform={`translate(${spot.cx + dx * spot.rx} ${spot.cy + dy * spot.ry * 1.6}) scale(${i % 2 ? 0.8 : 1.15})`}
          d="M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14Z" fill="#ffd23f" stroke="#fff" strokeWidth="2" />
      ))}
    </g>
  );
}

/** Soft steam over a dish that was cooked hot. */
export function Steam({ spot }: { spot: Spot }) {
  return (
    <g className="ck-finale-steam" aria-hidden="true" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round">
      {[-0.35, 0, 0.35].map((dx, i) => (
        <path key={i} className="ck-steam" style={{ animationDelay: `${i * 420}ms` }}
          d={`M ${spot.cx + dx * spot.rx} ${spot.cy - spot.ry * 0.6} q -14 -18 0 -36 q 14 -18 0 -36`} opacity=".6" />
      ))}
    </g>
  );
}
