import { useEffect, useState } from "react";
import { ExternalLink, FileText, FlaskConical, Newspaper, MapPin, MessageSquarePlus, NotebookPen, Receipt, Search, Sparkles, Star, Train, TrendingUp } from "lucide-react";
import { Bar as RBar, BarChart, Cell, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, eur, LEVEL_COLOR, levelOf } from "../api";
import { useApp } from "../App";
import { Bar, Card, Metric, RiskBadge, Tag } from "../components/ui";

export default function SupplierDive() {
  const app = useApp();
  const [s, setS] = useState<any>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<any[]>([]);
  const [factor, setFactor] = useState("");
  const [val, setVal] = useState(50);
  const [wi, setWi] = useState<any>(null);
  const [orders, setOrders] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [rating, setRating] = useState(3);
  const [groups, setGroups] = useState<{ label: string; items: { id: string; name: string; risk: number }[] }[]>([]);
  const [news, setNews] = useState<any>(null);
  const [allNews, setAllNews] = useState(false);

  useEffect(() => {
    const out: typeof groups = [];
    const pri = api.suppliers({ priority_only: "true", n: "20" }).then((r) =>
      out.push({ label: "Priority suppliers (portfolio)", items: r.suppliers.map((s) => ({ id: s.supplier_id, name: s.name, risk: s.total_risk })) }));
    const proj = app.config ? api.bubbles(app.config.project, app.config.per_item).then((b) => {
      for (const it of b.children) out.unshift({ label: `${b.name} · ${it.name}`, items: it.children.map((s: any) => ({ id: s.id, name: s.name, risk: s.risk })) });
    }) : Promise.resolve();
    Promise.all([pri, proj]).then(() => setGroups([...out]));
  }, [app.config?.project]);

  useEffect(() => {
    setS(null); setWi(null);
    api.supplier(app.supplierId).then((r) => { setS(r); setFactor(r.score_breakdown[0].factor); setVal(r.score_breakdown[0].score); });
    api.orders(app.supplierId).then(setOrders);
    api.notes(app.supplierId).then(setNotes);
    setNews(null); setAllNews(false);
    api.news(app.supplierId).then(setNews).catch(() => setNews({ items: [], note: "news unavailable" }));
  }, [app.supplierId]);
  useEffect(() => { if (q.length >= 3) api.suppliers({ q, n: "8" }).then((r) => setHits(r.suppliers)); else setHits([]); }, [q]);
  useEffect(() => { if (s && factor) api.whatIf(s.supplier_id, { [factor.replace(/ /g, "_")]: val }).then(setWi); }, [factor, val]);

  if (!s) return <div className="p-8 text-muted">Loading supplier…</div>;
  const hist = s.history?.history ?? [];
  const radar = Object.entries(s.pillars as Record<string, number>).map(([k, v]) => ({ pillar: k, score: v }));

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-xs uppercase tracking-wider text-muted">Strategic sourcing › {s.category} › {s.supplier_id}</div>
        <div className="flex flex-wrap items-center gap-2">
        <select className="input !w-96" value={app.supplierId} onChange={(e) => app.openSupplier(e.target.value)}>
          {!groups.some((g) => g.items.some((i) => i.id === app.supplierId)) && <option value={app.supplierId}>{app.supplierId}</option>}
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((i) => <option key={g.label + i.id} value={i.id}>{i.id} · {i.name} · risk {i.risk}</option>)}
            </optgroup>))}
        </select>
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-2.5 text-muted" />
          <input className="input !pl-9" placeholder="Search supplier id or name…" value={q} onChange={(e) => setQ(e.target.value)} />
          {hits.length > 0 && (
            <div className="card absolute z-20 mt-1 w-full">
              {hits.map((h) => (
                <button key={h.supplier_id} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
                  onClick={() => { app.openSupplier(h.supplier_id); setQ(""); }}>
                  <span><b className="font-mono">{h.supplier_id}</b> {h.name}</span><RiskBadge score={h.total_risk} />
                </button>))}
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{s.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag>{s.supplier_id}</Tag><Tag>{s.category}</Tag>
            {s.priority && <Tag tone="dark">Priority group</Tag>}
            {s.hidden_risk && <Tag tone="sim">Hidden risk</Tag>}
            <span className="flex items-center gap-1 text-sm text-muted"><MapPin size={14} />{s.country}</span>
            <Tag tone="sim">country / category simulated</Tag>
          </div>
        </div>
        <div className="card flex items-center gap-6 p-4">
          <div><div className="label">Overall total risk index</div>
            <div className="metric text-5xl" style={{ color: LEVEL_COLOR[levelOf(s.total_risk)] }}>{s.total_risk}<span className="text-lg text-muted"> / 100</span></div>
            {s.history?.change_24m && <div className="font-mono text-xs text-muted">{s.history.change_24m.total_risk >= 0 ? "▲" : "▼"} {Math.abs(s.history.change_24m.total_risk)} pts in 24 months</div>}
          </div>
          <div className="space-y-2"><RiskBadge level={s.level} /><div className="font-mono text-xs">{s.n_critical} / 18 scores Critical</div></div>
          <button className="btn btn-dark" onClick={() => app.askCopilot(`Explain why ${s.supplier_id} is ${s.level} and what we should do.`)}><Sparkles size={14} /> Ask agents</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Metric label="Purchase volume" value={eur(s.po_volume_eur)} sub={`exposure ${eur(s.exposure_eur)}`} />
        <Metric label="Delivery rating" value={`${s.delivery_rating}%`} sub={`expected ${s.delivery_expected_from_scores}% from scores`} tone={s.delivery_rating < s.delivery_expected_from_scores - 3 ? "crit" : undefined} />
        <Metric label="Confirmation rate" value={`${s.confirmation_rate}%`} />
        <Metric label="Order change rate" value={`${s.change_rate}%`} />
        <Metric label="Sourcing risk" value={s.sourcing_risk} sub={`${s.qualified_alternatives ?? "?"} qualified alternatives`} />
        <Metric label="Lead time / stock" value={`${s.lead_time_weeks ?? "–"} / ${s.safety_stock_weeks ?? "–"} wks`} sub={s.complexity + " supply chain"} />
      </div>

      <Card title="News & market intelligence" icon={<Newspaper size={16} />} right={<Tag>Live · Tavily</Tag>}>
        {!news && <p className="text-sm text-muted">Searching the web…</p>}
        {news && <p className="mb-3 text-xs text-muted">{news.note}</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[...(news?.items ?? [])].sort((a: any, b: any) => (Date.parse(b.published_date) || 0) - (Date.parse(a.published_date) || 0))
            .slice(0, allNews ? undefined : 4).map((n: any) => (
            <a key={n.url} href={n.url} target="_blank" rel="noreferrer" className="group rounded border border-line p-3 hover:border-petrol hover:bg-canvas">
              <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted"><span className="truncate">{n.source}</span><span>{n.published_date ? String(n.published_date).slice(0, 16) : ""}</span></div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold group-hover:text-petrol">{n.title}</div>
              <p className="mt-1 line-clamp-3 text-xs text-muted">{n.content}</p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-petrol"><ExternalLink size={10} /> open source</div>
            </a>))}
        </div>
        {news?.items.length > 4 && (
          <button className="btn btn-ghost mr-2 mt-3" onClick={() => setAllNews(!allNews)}>{allNews ? "Show only the 4 latest" : `Show ${news.items.length - 4} more news`}</button>)}
        <button className="btn btn-ghost mt-3" onClick={() => app.askCopilot(`What recent news or disruptions could affect ${s.supplier_id} (${s.category}, ${s.country})? Use the web.`)}>
          <Sparkles size={13} /> Ask the web agent for an analysis</button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="24-month risk trajectory" icon={<TrendingUp size={16} />} right={<Tag tone="sim">Simulated history</Tag>}>
          {hist.length ? (
            <div className="h-72"><ResponsiveContainer>
              <LineChart data={hist}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} interval={2} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="total_risk" name="Total risk" stroke="#00646e" strokeWidth={2.5} dot={false} />
                <Line dataKey="financial_health" name="Financial health risk" stroke="#dc2626" strokeWidth={1.5} dot={false} />
                <Line dataKey="quality_risk" name="Quality risk" stroke="#d97706" strokeWidth={1.5} dot={false} />
                <Line dataKey="delivery_rating" name="Delivery rating %" stroke="#64748b" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer></div>
          ) : <p className="text-sm text-muted">No simulated history for this supplier.</p>}
        </Card>
        <Card title="Risk pillars">
          <div className="h-72"><ResponsiveContainer>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#00646e" fill="#00646e" fillOpacity={0.35} strokeWidth={1.5} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="All 18 risks → Total Risk Index" right={<Tag>Total = Σ weight × risk</Tag>}>
          <p className="mb-3 text-xs text-muted">The <b>Total_Risk_Index</b> is a weighted average of all 18 risk categories (0 = no risk, 100 = maximum risk). Each bar is one risk; the number after the arrow is how many points it adds to the total of <b>{s.total_risk}</b>.</p>
          <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
            {s.score_breakdown.map((b: any) => (
              <div key={b.factor}>
                <div className="flex justify-between text-xs"><span>{b.factor} <span className="text-muted">({Math.round(b.weight * 100)}%)</span></span>
                  <span className="font-mono">{b.score} → <b>+{b.points.toFixed(1)}</b></span></div>
                <Bar value={b.score} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="What-if simulator" icon={<FlaskConical size={16} />}>
          <label className="label">Factor</label>
          <select className="input mt-1" value={factor} onChange={(e) => { setFactor(e.target.value); setVal(s.score_breakdown.find((b: any) => b.factor === e.target.value).score); }}>
            {s.score_breakdown.map((b: any) => <option key={b.factor}>{b.factor}</option>)}
          </select>
          <div className="mt-3 flex items-center gap-3"><input type="range" min={0} max={100} value={val} onChange={(e) => setVal(+e.target.value)} className="flex-1 accent-[#00646e]" />
            <span className="metric w-10 text-right">{val}</span></div>
          {wi && (
            <div className="mt-4 rounded bg-canvas p-3">
              <div className="flex items-center justify-between"><span className="text-sm">Total risk</span>
                <span className="metric text-xl">{wi.total_before} → <span style={{ color: LEVEL_COLOR[levelOf(wi.total_after)] }}>{wi.total_after}</span></span></div>
              <div className="flex items-center justify-between text-sm"><span>Level</span><span>{wi.level_before} → <b>{wi.level_after}</b></span></div>
              <div className="flex items-center justify-between text-sm"><span>Exposure</span><span className="font-mono">{eur(wi.exposure_before_eur)} → {eur(wi.exposure_after_eur)}</span></div>
            </div>
          )}
          <p className="mt-2 text-xs text-muted">Exact: the total is a fixed weighted sum of the 18 scores.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Buying history" icon={<Receipt size={16} />} right={<Tag tone="sim">Simulated PO ledger</Tag>}>
          {orders && (
            <>
              <div className="mb-3 grid grid-cols-3 gap-3">
                <div><div className="label">Orders (24 months)</div><div className="metric text-xl">{orders.orders.length}</div></div>
                <div><div className="label">Ordered value</div><div className="metric text-xl">{eur(orders.total_value_eur)}</div></div>
                <div><div className="label">Delivered on time</div><div className={`metric text-xl ${orders.on_time_pct < 85 ? "text-crit" : "text-low"}`}>{orders.on_time_pct}%</div></div>
              </div>
              <div className="h-40"><ResponsiveContainer>
                <BarChart data={[...orders.orders].reverse()}>
                  <XAxis dataKey="placed" tick={{ fontSize: 9, fontFamily: "JetBrains Mono" }} minTickGap={30} />
                  <YAxis tickFormatter={(v) => eur(v)} tick={{ fontSize: 9, fontFamily: "JetBrains Mono" }} width={55} />
                  <Tooltip formatter={(v: number) => eur(v)} labelFormatter={(l) => `placed ${l}`} />
                  <RBar dataKey="value_eur" name="order value" radius={[3, 3, 0, 0]}>
                    {[...orders.orders].reverse().map((o: any) => <Cell key={o.po} fill={o.status === "late" ? "#ef4444" : o.status === "open" ? "#94a3b8" : "#10b981"} />)}
                  </RBar>
                </BarChart>
              </ResponsiveContainer></div>
              <div className="mb-2 flex gap-3 text-[11px] text-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#10b981]" />on time</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ef4444]" />late</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#94a3b8]" />open</span></div>
              <div className="max-h-64 overflow-auto rounded border border-line">
                <table className="grid-table w-full"><thead><tr><th>PO</th><th>Placed</th><th>Part</th><th className="text-right">Value</th><th>Promised</th><th>Status</th></tr></thead>
                  <tbody>{orders.orders.map((o: any) => (
                    <tr key={o.po}><td className="font-mono text-xs">{o.po}</td><td className="font-mono text-xs">{o.placed}</td><td className="text-xs">{o.part}{o.changed && <span className="ml-1 text-[10px] text-med">changed</span>}</td>
                      <td className="text-right font-mono text-xs">{eur(o.value_eur)}</td><td className="font-mono text-xs">{o.promised}</td>
                      <td className="text-xs">{o.status === "late" ? <span className="font-semibold text-crit">{o.days_late}d late</span> : o.status === "open" ? <span className="text-muted">open</span> : <span className="text-low">on time</span>}</td></tr>))}
                  </tbody></table>
              </div>
            </>
          )}
        </Card>
        <Card title="Buyer notes" icon={<NotebookPen size={16} />} right={<Tag>{notes.length}</Tag>}>
          <div className="mb-3 rounded border border-line p-2">
            <textarea className="h-16 w-full resize-none text-sm outline-none" placeholder="Add a note about this supplier…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <div className="flex items-center justify-between">
              <div className="flex">{[1, 2, 3, 4, 5].map((i) => <button key={i} onClick={() => setRating(i)}><Star size={14} className={i <= rating ? "fill-[#f59e0b] text-[#f59e0b]" : "text-line-strong"} /></button>)}</div>
              <button className="btn btn-primary !py-1 text-xs" disabled={!noteText.trim()} onClick={async () => {
                setNotes(await api.addNote(s.supplier_id, { author: app.persona?.name ?? "Buyer", role: app.persona?.role ?? "", text: noteText, rating }));
                setNoteText("");
              }}><MessageSquarePlus size={12} /> Add note</button>
            </div>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {notes.map((n, i) => (
              <div key={i} className="rounded bg-tint p-3">
                <div className="flex items-center justify-between"><div><span className="text-sm font-semibold">{n.author}</span> <span className="font-mono text-[10px] text-muted">{n.role}</span></div>
                  <span className="font-mono text-[10px] text-muted">{n.date}</span></div>
                <div className="my-1 flex">{[1, 2, 3, 4, 5].map((k) => <Star key={k} size={11} className={k <= n.rating ? "fill-[#f59e0b] text-[#f59e0b]" : "text-line-strong"} />)}</div>
                <p className="text-xs italic leading-relaxed">"{n.text}"</p>
              </div>))}
            {!notes.length && <p className="text-sm text-muted">No notes yet for this supplier.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Fleet impact" icon={<Train size={16} />} right={<Tag tone="sim">Simulated BOM</Tag>}>
          {s.fleet?.affected_fleets?.length ? (
            <>
              <div className="metric text-3xl">{s.fleet.trainsets_affected} <span className="text-sm text-muted">trainsets depend on it</span></div>
              {s.fleet.weeks_uncovered_if_supplier_stops > 0 && <div className="mt-1 text-sm text-crit">{s.fleet.weeks_uncovered_if_supplier_stops} weeks uncovered if it stops (lead {s.fleet.lead_time_weeks} wks vs stock {s.fleet.safety_stock_weeks} wks)</div>}
              <ul className="mt-2 space-y-1 text-sm">{s.fleet.affected_fleets.map((f: any) => <li key={f.fleet}>• {f.fleet}: {f.assembly} {f.single_source ? <b className="text-crit">(single source)</b> : ""}</li>)}</ul>
            </>
          ) : <p className="text-sm text-muted">Not a primary supplier in the simulated fleet BOM.</p>}
        </Card>
        <Card title="Lower-risk alternatives (same category)">
          <div className="space-y-2">{s.alternatives.map((a: any) => (
            <button key={a.supplier_id} onClick={() => app.openSupplier(a.supplier_id)} className="flex w-full items-center justify-between rounded border border-line p-2 text-left hover:border-petrol">
              <div><div className="font-mono text-xs font-semibold">{a.supplier_id}</div><div className="text-xs text-muted">{a.country} · delivery {a.delivery_rating}%</div></div>
              <RiskBadge score={a.total_risk} />
            </button>))}
            {!s.alternatives.length && <p className="text-sm text-muted">No lower-risk alternative found.</p>}
          </div>
        </Card>
        <Card title="Evidence from shared documents" icon={<FileText size={16} />}>
          {s.documents.length ? s.documents.map((d: any) => (
            <div key={d.name} className="mb-3 rounded border border-line p-2">
              <div className="flex items-center justify-between"><span className="truncate text-xs font-semibold">{d.name}</span>{d.method.startsWith("OCR") && <Tag tone="dark">OCR</Tag>}</div>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] text-muted">{d.snippet}</pre>
            </div>)) : <p className="text-sm text-muted">No extracted document mentions this supplier. Extract the shared folder in Workspace Setup.</p>}
        </Card>
      </div>
    </div>
  );
}
