import { useEffect, useMemo, useRef, useState } from "react";
import { hierarchy, pack, type HierarchyCircularNode } from "d3-hierarchy";
import { interpolateZoom } from "d3-interpolate";
import { scaleLinear } from "d3-scale";
import { easeCubicInOut } from "d3-ease";
import { ChevronRight, ZoomOut } from "lucide-react";
import { eur } from "../api";

export type PackDatum = {
  name: string; kind: "root" | "category" | "item" | "supplier" | "factor"; id?: string; category?: string; current?: boolean | string; units?: number; single_source?: boolean; quantity?: number | null; needed_by?: string | null; risk?: number; value?: number;
  po?: number; delivery?: number; country?: string; hidden?: boolean; priority?: boolean; spend?: number; n_total?: number; weight?: number;
  children?: PackDatum[];
};
type N = HierarchyCircularNode<PackDatum>;

export const riskColor = scaleLinear<string>().domain([0, 30, 50, 70, 100]).range(["#047857", "#10b981", "#f59e0b", "#ef4444", "#b91c1c"]).clamp(true);

export default function ZoomPack({ data, onFocus, onOpenSupplier, height = 640 }: {
  data: PackDatum; onFocus?: (n: N) => void; onOpenSupplier: (id: string) => void; height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  const H = height;
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.floor(e.contentRect.width))));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const root = useMemo(() => {
    const h = hierarchy<PackDatum>(data).sum((d) => (d.children ? 0 : d.value ?? 1)).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return pack<PackDatum>().size([W, H]).padding((d) => (d.depth === 0 ? 16 : d.depth === 1 ? 8 : 2))(h);
  }, [data, W, H]);

  const [focus, setFocus] = useState<N>(root);
  const [view, setView] = useState<[number, number, number]>([root.x, root.y, root.r * 2]);
  const [hover, setHover] = useState<N | null>(null);
  const anim = useRef(0);
  useEffect(() => { setFocus(root); setView([root.x, root.y, root.r * 2]); }, [root]);

  const zoomTo = (n: N) => {
    cancelAnimationFrame(anim.current);
    const from = view;
    const i = interpolateZoom(from, [n.x, n.y, n.r * 2]);
    const dur = Math.min(1100, Math.max(600, i.duration));
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setView(i(easeCubicInOut(k)) as [number, number, number]);
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
    setFocus(n);
    onFocus?.(n);
  };

  const k = Math.min(W, H) / view[2];
  const tx = (n: N) => (n.x - view[0]) * k + W / 2;
  const ty = (n: N) => (n.y - view[1]) * k + H / 2;

  // performance: factor bubbles are only drawn inside the focused supplier
  const visible = root.descendants().filter((n) => n.depth > 0 &&
    ((n.data.kind !== "factor" && n.data.kind !== "supplier") || n.parent === focus || (n.data.kind === "supplier" && n.parent?.data.kind !== "item")));
  const labelled = (n: N) => n.parent === focus || (n === focus && focus.data.kind === "supplier" && false);
  const path = focus.ancestors().reverse();

  return (
    <div ref={wrap} className="relative w-full select-none overflow-hidden rounded-md border border-line bg-[#f8fafc]" style={{ height: H }}>
      <svg width={W} height={H} onClick={() => focus.parent && zoomTo(focus.parent as N)} style={{ cursor: focus.parent ? "zoom-out" : "default" }}>
        <defs>
          <radialGradient id="shine" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff" stopOpacity=".55" /><stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {visible.map((n) => {
          const r = n.r * k;
          if (r < 0.6) return null;
          const kind = n.data.kind;
          const col = riskColor(n.data.risk ?? 50);
          const isCat = kind === "category" || kind === "item";
          return (
            <g key={`${n.depth}-${n.data.id ?? n.data.name}-${n.parent?.data.name}`} transform={`translate(${tx(n)},${ty(n)})`}
              onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); if (kind === "factor") return; if (kind === "supplier") { if (n.parent === focus || n.parent?.data.kind !== "item") onOpenSupplier(n.data.id!); else zoomTo(n.parent as N); return; } if (focus !== n) zoomTo(n); }}
              style={{ cursor: kind === "factor" ? "default" : kind === "supplier" ? "pointer" : "zoom-in" }}>
              <circle r={r} fill={col} fillOpacity={kind === "item" && n !== focus ? 0.55 : isCat ? 0.13 : kind === "factor" ? 0.85 : 0.82}
                stroke={isCat ? col : hover === n ? "#0f172a" : "#fff"} strokeOpacity={isCat ? 0.55 : 1} strokeWidth={isCat ? 1.5 : hover === n ? 2 : 1.2} />
              {!isCat && r > 6 && <circle r={r} fill="url(#shine)" pointerEvents="none" />}
              {n.data.current === true && kind === "supplier" && r > 6 && <circle r={r + 3.5} fill="none" stroke="#00646e" strokeWidth={2.5} pointerEvents="none" />}
            </g>
          );
        })}
        {visible.filter((n) => labelled(n) && n.r * k > 16).map((n) => {
          const r = n.r * k;
          const kind = n.data.kind;
          const fs = Math.max(9, Math.min(16, r / 4.5));
          return (
            <g key={`l-${n.data.id ?? n.data.name}`} transform={`translate(${tx(n)},${ty(n)})`} pointerEvents="none" textAnchor="middle">
              {kind === "item" ? (
                <>
                  <text y={-2} fontSize={Math.max(11, Math.min(22, r / 5))} fontWeight={700} fill="#0f172a" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{n.data.name}</text>
                  <text y={Math.max(11, Math.min(22, r / 5)) + 6} fontSize={Math.max(9, Math.min(14, r / 8))} fill="#0f172a" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>
                    {n.children?.length ?? 0} suppliers · best risk {n.data.risk}{n.data.quantity ? ` · qty ${n.data.quantity}` : ""}</text>
                </>
              ) : kind === "category" ? (
                <>
                  <text y={-r + fs + 6} fontSize={fs} fontWeight={600} fill="#0f172a" style={{ paintOrder: "stroke", stroke: "#f8fafc", strokeWidth: 3 }}>{n.data.name}</text>
                  {n.data.category && <text y={-r + fs * 2 + 8} fontSize={Math.max(8, fs * 0.7)} fill="#64748b" style={{ paintOrder: "stroke", stroke: "#f8fafc", strokeWidth: 3 }}>{n.data.kind === "item" ? `${n.children?.length ?? 0} suppliers · best risk ${n.data.risk}${n.data.quantity ? ` · qty ${n.data.quantity}` : ""}` : n.data.category}</text>}
                </>
              ) : (
                kind === "supplier" ? (
                  <>
                    <text y={-fs * 0.1} fontSize={fs * 1.5} fontWeight={700} fill="#fff" fontFamily="JetBrains Mono">{n.data.risk}</text>
                    <text y={-fs * 1.45} fontSize={Math.max(8, fs * 0.5)} fill="#fff" opacity={0.9} fontFamily="JetBrains Mono">RISK</text>
                    <text y={fs * 1.25} fontSize={Math.max(9, fs * 0.72)} fill="#fff" fontWeight={700} textDecoration="underline"
                      pointerEvents="visiblePainted" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onOpenSupplier(n.data.id!); }}>
                      {n.data.name}<title>Open supplier dashboard</title></text>
                    {r > 60 && <text y={fs * 2.3} fontSize={Math.max(8, fs * 0.5)} fill="#fff" opacity={0.85}>{n.data.country} · delivery {n.data.delivery?.toFixed(0)}%</text>}
                  </>
                ) : (
                  <>
                    <text y={-fs * 0.2} fontSize={fs * 1.25} fontWeight={700} fill="#fff" fontFamily="JetBrains Mono">{n.data.risk}</text>
                    {r > 34 && <text y={fs * 1.05} fontSize={Math.max(8, fs * 0.62)} fill="#fff" fontWeight={600}>{n.data.name}</text>}
                  </>
                )
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1 rounded bg-white/95 px-2 py-1 font-mono text-[11px] shadow-sm">
        {path.map((n, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="text-muted" />}
            <button className={i === path.length - 1 ? "font-semibold text-petrol" : "text-muted hover:text-petrol"} onClick={() => zoomTo(n as N)}>{n.data.kind === "supplier" ? n.data.id : n.data.name}</button>
          </span>
        ))}
        {focus.parent && <button className="ml-2 text-muted hover:text-petrol" onClick={() => zoomTo(focus.parent as N)}><ZoomOut size={13} /></button>}
      </div>

      {hover && hover !== focus && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-line bg-white px-3 py-2 text-xs shadow">
          <div className="font-semibold">{hover.data.kind === "supplier" ? `${hover.data.id} · ${hover.data.name}` : hover.data.name}</div>
          <div className="font-mono">risk <b style={{ color: riskColor(hover.data.risk ?? 0) }}>{hover.data.risk}</b>
            {hover.data.kind === "supplier" && <> · {eur(hover.data.po)} · delivery {hover.data.delivery?.toFixed(0)}%</>}
            {hover.data.kind === "item" && <> · {hover.data.category} · {hover.children?.length} suppliers</>}
            {hover.data.kind === "factor" && <> · weight {Math.round((hover.data.weight ?? 0) * 100)}%</>}</div>
          <div className="text-muted">{hover.data.kind === "supplier" ? "click to open the supplier dashboard" : hover.data.kind === "factor" ? "" : "click to see suppliers"}</div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 rounded-md border border-line bg-white/95 p-2.5 text-[11px] shadow-sm">
        <div className="label mb-1">Bubble encoding</div>
        <div className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-[#10b981]" /> big + green = low risk</div>
        <div className="mt-1 flex items-center gap-2"><span className="ml-1.5 h-3 w-3 rounded-full bg-[#ef4444]" /><span className="ml-1.5">small + red = high risk</span></div>

      </div>
    </div>
  );
}
