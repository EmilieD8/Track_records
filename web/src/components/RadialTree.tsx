import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowUp } from "lucide-react";
import { eur } from "../api";
import { riskColor, type PackDatum } from "./ZoomPack";

// Radial hierarchy (Flourish "Hierarchy" style): root -> items (coloured branches) -> suppliers (leaves with a bar).
// Click a branch to fan it out on its own, click a supplier to open its dashboard.

const SERIES = ["#2a78d6", "#6250d6", "#1baf7a", "#eb6834", "#e87ba4", "#eda100", "#008300"];
const METRICS = {
  risk: { label: "Risk score", get: (s: PackDatum) => s.risk ?? 0, fmt: (v: number) => String(Math.round(v)) },
  po: { label: "PO volume", get: (s: PackDatum) => s.po ?? 0, fmt: eur },
  exposure: { label: "Exposure €", get: (s: PackDatum) => ((s.po ?? 0) * (s.risk ?? 0)) / 100, fmt: eur },
} as const;
type Metric = keyof typeof METRICS;
type Leaf = { s: PackDatum; g: number; a: number; r: number; x: number; y: number; show: boolean };

const T = "transform .65s cubic-bezier(.4,0,.2,1), opacity .45s, d .65s cubic-bezier(.4,0,.2,1)";
const deg = (a: number) => (a * 180) / Math.PI;

export default function RadialTree({ data, onOpenSupplier, height = 640 }: {
  data: PackDatum; onOpenSupplier: (id: string) => void; height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  const H = height;
  const [metric, setMetric] = useState<Metric>("risk");
  const [focus, setFocus] = useState<number | null>(null);
  const [hover, setHover] = useState<{ s: PackDatum; g: number } | null>(null);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.floor(e.contentRect.width))));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setFocus(null), [data]);

  const groups = data.children ?? [];
  const color = (g: number) => SERIES[g % SERIES.length];
  const M = METRICS[metric];
  const maxV = Math.max(1, ...groups.flatMap((g) => (g.children ?? []).map(M.get)));

  const geo = useMemo(() => {
    const cx = W / 2, cy = H / 2;
    const leafR = Math.max(90, Math.min(W, H) / 2 - 125);
    const groupR = leafR * 0.55;
    const n = groups.reduce((k, g) => k + (g.children?.length ?? 0), 0);
    const gap = 1.6;
    const unit = (2 * Math.PI) / Math.max(1, n + gap * groups.length);
    let cur = -Math.PI / 2 + (gap * unit) / 2;
    const leaves: Leaf[] = [];
    const gpos = groups.map((g, gi) => {
      const kids = g.children ?? [];
      const a0 = cur;
      kids.forEach((s, i) => { const a = a0 + i * unit; leaves.push({ s, g: gi, a, r: leafR, x: cx, y: cy, show: true }); });
      const a1 = a0 + Math.max(0, kids.length - 1) * unit;
      cur = a1 + unit * (1 + gap);
      const ga = (a0 + a1) / 2;
      return { a0, a1, ga, x: cx + groupR * Math.cos(ga), y: cy + groupR * Math.sin(ga), r: groupR };
    });
    const thick = Math.max(2, Math.min(11, unit * leafR * 0.72));

    if (focus == null) return { cx, cy, leafR, groupR, gpos, leaves, thick, barMax: 46, center: { x: cx, y: cy } };

    // focused branch fans out to the right of its node, other branches fade away
    const kids = leaves.filter((l) => l.g === focus);
    const barMax = Math.min(120, W * 0.14);
    const gx = Math.max(40, W * 0.1), gy = H / 2;
    const R = Math.max(80, Math.min(H * 0.42, W - gx - barMax - 170));
    const span = Math.min(Math.PI * 0.75, Math.max(Math.PI / 4, kids.length * 0.16));
    kids.forEach((l, i) => { l.a = -span / 2 + (kids.length > 1 ? (i * span) / (kids.length - 1) : span / 2); l.r = R; l.x = gx; l.y = gy; });
    leaves.forEach((l) => { l.show = l.g === focus; });
    const fthick = Math.max(3, Math.min(26, (span / Math.max(1, kids.length)) * R * 0.75));
    return { cx, cy, leafR: R, groupR, gpos, leaves, thick: fthick, barMax, center: { x: gx, y: gy } };
  }, [groups, W, H, focus]);

  const polar = (ox: number, oy: number, a: number, r: number) => [ox + r * Math.cos(a), oy + r * Math.sin(a)] as const;
  const link = (l: Leaf) => {
    if (focus != null) {
      const [x1, y1] = polar(l.x, l.y, l.a, l.r);
      return `M${l.x},${l.y} C${l.x},${l.y} ${x1},${y1} ${x1},${y1}`;
    }
    const gp = geo.gpos[l.g];
    const mid = (geo.groupR + geo.leafR) / 2;
    const [x0, y0] = polar(geo.cx, geo.cy, gp.ga, geo.groupR);
    const [c1x, c1y] = polar(geo.cx, geo.cy, gp.ga, mid);
    const [c2x, c2y] = polar(geo.cx, geo.cy, l.a, mid);
    const [x1, y1] = polar(geo.cx, geo.cy, l.a, geo.leafR);
    return `M${x0},${y0} C${c1x},${c1y} ${c2x},${c2y} ${x1},${y1}`;
  };
  const barLen = (s: PackDatum) => Math.max(1.5, (M.get(s) / maxV) * geo.barMax);
  const lbl = (s: PackDatum) => s.name.length > 22 && focus == null ? `${s.name.slice(0, 21)}…` : s.name;

  return (
    <div ref={wrap} className="relative w-full select-none overflow-hidden rounded-md border border-line bg-white" style={{ height: H }}>
      <svg width={W} height={H} onClick={() => focus != null && setFocus(null)} fontFamily="Inter, system-ui, sans-serif">
        {/* trunk: centre -> item */}
        {geo.gpos.map((gp, gi) => (
          <line key={`t${gi}`} x1={geo.cx} y1={geo.cy} x2={gp.x} y2={gp.y} stroke="#cbd5e1" strokeWidth={1.2}
            style={{ transition: T, opacity: focus == null ? 1 : 0 }} />
        ))}
        {/* branch arcs along the leaves */}
        {focus == null && geo.gpos.map((gp, gi) => {
          if (gp.a1 <= gp.a0) return null;
          const [x0, y0] = polar(geo.cx, geo.cy, gp.a0, geo.leafR);
          const [x1, y1] = polar(geo.cx, geo.cy, gp.a1, geo.leafR);
          return <path key={`arc${gi}`} d={`M${x0},${y0} A${geo.leafR},${geo.leafR} 0 ${gp.a1 - gp.a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`}
            fill="none" stroke={color(gi)} strokeOpacity={0.45} strokeWidth={1.5} />;
        })}
        {/* item -> supplier links */}
        {geo.leaves.map((l, i) => (
          <path key={`l${i}`} d={link(l)} fill="none" stroke={focus == null ? color(l.g) : "#cbd5e1"} strokeOpacity={focus == null ? 0.35 : 1}
            strokeWidth={1} style={{ transition: T, opacity: l.show ? 1 : 0 }} />
        ))}
        {/* leaves: risk node + metric bar + label */}
        {geo.leaves.map((l, i) => {
          const ox = focus == null ? geo.cx : l.x, oy = focus == null ? geo.cy : l.y;
          const left = Math.cos(l.a) < -1e-6;
          const len = barLen(l.s);
          const on = hover?.s === l.s;
          return (
            <g key={`n${i}`} style={{ transform: `translate(${ox}px,${oy}px) rotate(${deg(l.a)}deg)`, transition: T, opacity: l.show ? 1 : 0, cursor: "pointer" }}
              pointerEvents={l.show ? "all" : "none"}
              onMouseEnter={() => setHover({ s: l.s, g: l.g })} onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); if (l.s.id) onOpenSupplier(l.s.id); }}>
              <rect x={l.r + 4} y={-geo.thick / 2} width={len} height={geo.thick} rx={Math.min(2, geo.thick / 3)} fill={color(l.g)} fillOpacity={on ? 1 : 0.85} />
              <circle cx={l.r} cy={0} r={focus == null ? 3.2 : 5} fill={riskColor(l.s.risk ?? 50)} stroke="#fff" strokeWidth={1.2} />
              <g transform={`translate(${l.r + len + 8},0)${left ? " rotate(180)" : ""}`}>
                <text dy="0.32em" textAnchor={left ? "end" : "start"} fontSize={focus == null ? 10.5 : 13} fill={on ? "#0f172a" : "#334155"}
                  fontWeight={on ? 700 : 500}>
                  {(l.s as any).alert ? "⚠ " : ""}{lbl(l.s)}{focus != null ? `  ·  ${M.fmt(M.get(l.s))}` : ""}
                </text>
              </g>
              <rect x={l.r - 6} y={-Math.max(6, geo.thick / 2)} width={len + 150} height={Math.max(12, geo.thick)} fill="transparent" />
            </g>
          );
        })}
        {/* item nodes */}
        {groups.map((g, gi) => {
          const gp = geo.gpos[gi];
          const isF = focus === gi;
          const x = isF ? geo.center.x : gp.x, y = isF ? geo.center.y : gp.y;
          const hide = focus != null && !isF;
          return (
            <g key={`g${gi}`} style={{ transform: `translate(${x}px,${y}px)`, transition: T, opacity: hide ? 0 : 1, cursor: "pointer" }}
              pointerEvents={hide ? "none" : "all"} onClick={(e) => { e.stopPropagation(); setFocus(isF ? null : gi); }}>
              <circle r={isF ? 6 : 5} fill={color(gi)} stroke="#fff" strokeWidth={1.5} />
              <text x={isF ? -4 : 0} y={isF ? -30 : -10} textAnchor={isF ? "start" : "middle"} fontSize={isF ? 14 : 11.5} fontWeight={700}
                fill="#0f172a" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 4, textTransform: isF ? "uppercase" : "none" }}>
                {g.name}</text>
              {isF && <text x={-4} y={-14} textAnchor="start" fontSize={11} fill="#64748b" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 4 }}>
                {g.children?.length} suppliers · best risk {g.risk}{g.quantity ? ` · qty ${g.quantity}` : ""}</text>}
            </g>
          );
        })}
        {focus == null && <circle cx={geo.cx} cy={geo.cy} r={3} fill="#94a3b8" />}
      </svg>

      <div className="absolute right-3 top-3 flex overflow-hidden rounded border border-line-strong text-xs font-semibold shadow-sm">
        {(Object.keys(METRICS) as Metric[]).map((k) => (
          <button key={k} onClick={() => setMetric(k)} className={`px-2.5 py-1 ${metric === k ? "bg-slate-ink text-white" : "bg-white text-slate-ink hover:bg-canvas"}`}>
            {METRICS[k].label}</button>))}
      </div>

      {focus != null && (
        <button title="Back to all items" onClick={() => setFocus(null)}
          className="absolute right-3 top-12 flex h-10 w-10 items-center justify-center rounded-full bg-canvas shadow hover:bg-tint"><ArrowUp size={22} /></button>
      )}

      <div className="absolute left-3 top-3 max-w-[45%] rounded bg-white/95 p-2 text-[11px] shadow-sm">
        <div className="label mb-1">Items</div>
        {groups.map((g, gi) => (
          <button key={gi} onClick={() => setFocus(focus === gi ? null : gi)}
            className={`flex w-full items-center gap-1.5 truncate py-0.5 text-left hover:text-petrol ${focus === gi ? "font-semibold" : ""}`}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color(gi) }} />{g.name}</button>))}
      </div>

      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-line bg-white px-3 py-2 text-xs shadow">
          <div className="flex items-center gap-1.5 font-semibold"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(hover.g) }} />{hover.s.id} · {hover.s.name}</div>
          <div className="mt-0.5 font-mono">risk <b style={{ color: riskColor(hover.s.risk ?? 0) }}>{hover.s.risk}</b> · PO {eur(hover.s.po)} · delivery {hover.s.delivery?.toFixed(0)}% · {hover.s.country}</div>
          {(hover.s as any).alert && <div className="mt-0.5 flex items-center gap-1 text-crit"><AlertTriangle size={12} />{(hover.s as any).alert} (recalculated from email)</div>}
          <div className="text-muted">click to open the supplier dashboard</div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 rounded-md border border-line bg-white/95 p-2.5 text-[11px] shadow-sm">
        <div className="label mb-1">Encoding</div>
        <div className="flex items-center gap-2"><span className="h-2 w-6 rounded-sm bg-slate-400" /> bar = {M.label.toLowerCase()}</div>
        <div className="mt-1 flex items-center gap-2"><span className="flex gap-0.5">{[10, 40, 60, 90].map((v) => <span key={v} className="h-2.5 w-2.5 rounded-full" style={{ background: riskColor(v) }} />)}</span> dot = risk (low → high)</div>
      </div>
    </div>
  );
}
