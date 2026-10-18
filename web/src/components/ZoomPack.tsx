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
  const focusPath = useRef<string[]>([]);
  const lastData = useRef<PackDatum | null>(null);
  // Re-layout (e.g. container resized) keeps the zoomed node; only new data resets to the root.
  useEffect(() => {
    let target: N = root;
    if (lastData.current === data && focusPath.current.length) {
      for (const name of focusPath.current) {
        const next = target.children?.find((c) => (c.data.id ?? c.data.name) === name) as N | undefined;
        if (!next) { target = root; break; }
        target = next;
      }
    }
    lastData.current = data;
    focusPath.current = target.ancestors().reverse().slice(1).map((a) => a.data.id ?? a.data.name);
    cancelAnimationFrame(anim.current);
    setFocus(target);
    setView([target.x, target.y, target.r * 2]);
    onFocus?.(target);
  }, [root]);

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
    focusPath.current = n.ancestors().reverse().slice(1).map((a) => a.data.id ?? a.data.name);
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
              {(n.data as any).recommended && kind === "supplier" && r > 6 && <circle r={r + 4} fill="none" stroke="#00646e" strokeWidth={3} pointerEvents="none" />}
            </g>
          );
        })}
        {visible.filter((n) => labelled(n) && n.r * k > 14).map((n) => {
          const r = n.r * k;
          const kind = n.data.kind;
          const fs = Math.max(9, Math.min(16, r / 4.5));
          return (
            <g key={`l-${n.data.id ?? n.data.name}`} transform={`translate(${tx(n)},${ty(n)})`} pointerEvents="none" textAnchor="middle">
              {kind === "item" ? <ItemLabel n={n} r={r} /> : kind === "supplier" ? <SupplierLabel n={n} r={r} onOpen={onOpenSupplier} /> : (
                <text y={-r + fs + 6} fontSize={fs} fontWeight={600} fill="#0f172a" style={{ paintOrder: "stroke", stroke: "#f8fafc", strokeWidth: 3 }}>{n.data.name}</text>
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
        <div className="mt-1 flex items-center gap-2"><span className="h-4 w-4 rounded-full border-[3px] border-petrol" /> recommended supplier</div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------- text that always fits inside its bubble
const CHAR_W = 0.58; // average glyph width relative to font size (Inter)
const chord = (r: number, y: number) => 2 * Math.sqrt(Math.max(0, r * r - y * y)) * 0.86;
const fitFs = (text: string, width: number, maxFs: number, minFs = 7) => {
  const fs = Math.min(maxFs, width / Math.max(1, text.length * CHAR_W));
  return fs >= minFs ? fs : 0;
};
/** Lay out lines top-to-bottom centred on 0; each line gets the largest size that fits the circle at its height. */
function fitLines(r: number, lines: { text: string; max: number; weight?: number; mono?: boolean }[]) {
  const gap = 0.25;
  let sizes = lines.map((l) => Math.min(l.max, r * 0.5));
  for (let pass = 0; pass < 3; pass++) {
    const total = sizes.reduce((a, b) => a + b * (1 + gap), 0);
    let y = -total / 2;
    sizes = lines.map((l, i) => {
      const yc = y + sizes[i] * 0.5;
      y += sizes[i] * (1 + gap);
      return fitFs(l.text, chord(r, Math.abs(yc) + sizes[i] * 0.5), l.max);
    });
  }
  const total = sizes.reduce((a, b) => a + (b ? b * (1 + gap) : 0), 0);
  let y = -total / 2;
  return lines.map((l, i) => {
    const fs = sizes[i];
    const out = { ...l, fs, y: y + fs * 0.85 };
    if (fs) y += fs * (1 + gap);
    return out;
  }).filter((l) => l.fs > 0);
}
const splitName = (s: string) => {
  const i = s.lastIndexOf(" ");
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s];
};

function ItemLabel({ n, r }: { n: N; r: number }) {
  const d = n.data as any;
  const lines = fitLines(r, [
    ...splitName(d.name).length > 1 && d.name.length > 16 ? splitName(d.name).map((t) => ({ text: t, max: 22, weight: 700 })) : [{ text: d.name, max: 22, weight: 700 }],
    { text: `${n.children?.length ?? 0} suppliers${d.quantity ? ` · qty ${d.quantity}` : ""}`, max: 13 },
    ...(d.recommended_name ? [{ text: "★ recommended", max: 12, weight: 700 }, { text: `${d.recommended_name} (risk ${d.risk})`, max: 12, weight: 600 }] : []),
  ]);
  return <>{lines.map((l, i) => (
    <text key={i} y={l.y} fontSize={l.fs} fontWeight={l.weight ?? 400} fill={l.text.startsWith("★") || l.text.includes("(risk") ? "#004a52" : "#0f172a"}
      style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>{l.text}</text>))}</>;
}

function SupplierLabel({ n, r, onOpen }: { n: N; r: number; onOpen: (id: string) => void }) {
  const d = n.data as any;
  const name = d.name.length > 14 && r < 90 ? splitName(d.name) : [d.name];
  const lines = fitLines(r, [
    { text: d.recommended ? "★ RECOMMENDED" : "RISK", max: 11, weight: d.recommended ? 700 : 400, mono: true },
    { text: String(d.risk), max: Math.min(40, r * 0.55), weight: 700, mono: true },
    ...name.map((t: string) => ({ text: t, max: 15, weight: 700 })),
    ...(r > 70 ? [{ text: `${d.country} · delivery ${d.delivery?.toFixed(0)}%`, max: 10 }] : []),
  ]);
  return <>{lines.map((l, i) => {
    const isName = name.includes(l.text) && !l.mono;
    return (
      <text key={i} y={l.y} fontSize={l.fs} fontWeight={l.weight ?? 400} fill="#fff" fontFamily={l.mono ? "JetBrains Mono" : undefined}
        textDecoration={isName ? "underline" : undefined} pointerEvents={isName ? "visiblePainted" : "none"} style={isName ? { cursor: "pointer" } : undefined}
        onClick={isName ? (e) => { e.stopPropagation(); onOpen(d.id); } : undefined}>
        {l.text}{isName && <title>Open supplier dashboard</title>}</text>);
  })}</>;
}
