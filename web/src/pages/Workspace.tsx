import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Ban, Bot, FileUp, Loader2, MessagesSquare, Network, Send, ShoppingCart, Sparkles, Trash2, Wand2 } from "lucide-react";
import { api, eur } from "../api";
import { useApp } from "../App";
import ZoomPack, { riskColor, type PackDatum } from "../components/ZoomPack";
import { Card, Metric, Tag } from "../components/ui";

type Item = { item: string; category: string; quantity?: number | null; needed_by?: string | null };
type Msg = { role: "bot" | "user"; text: string; chips?: string[] };

const KPI: Record<string, (o: any) => { label: string; value: string; sub?: string; crit?: boolean }> = {
  spend: (o) => ({ label: "Total spend", value: eur(o.total_spend_eur), sub: `${o.suppliers.toLocaleString()} suppliers` }),
  high_critical_spend: (o) => ({ label: "Spend at High/Critical", value: eur(o.spend_high_or_critical_eur), sub: `${o.high_or_critical.toLocaleString()} suppliers`, crit: true }),
  priority: (o) => ({ label: "Priority suppliers", value: String(o.priority_suppliers), sub: eur(o.priority_spend_eur), crit: true }),
  hidden: (o) => ({ label: "Hidden risks", value: String(o.hidden_risk_suppliers), sub: eur(o.hidden_risk_spend_eur) }),
  exposure: (o) => ({ label: "Risk exposure", value: eur(o.total_exposure_eur), sub: "Σ spend × risk" }),
  avg_risk: (o) => ({ label: "High+Critical share", value: `${Math.round((o.high_or_critical / o.suppliers) * 100)}%`, sub: "of suppliers" }),
  on_time: (o) => ({ label: "ESG concerns", value: String(o.esg_concern_suppliers), sub: "LkSG / CSDDD review" }),
};
const START_CHIPS = ["240 brake control units and 480 bogie frames for RegioFlex by March 2027", "Door drive units and HVAC roof units for ICX-300", "Upload my item list (PDF)"];
const AFTER_CHIPS = ["Show suppliers", "EU suppliers only", "Add more items"];

export default function Workspace() {
  const app = useApp();
  const { spec, config, persona, project } = app;
  const [ov, setOv] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>(project?.messages ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>(project?.items ?? []);
  const [euOnly, setEuOnly] = useState(!!project?.eu_only);
  const [perItem, setPerItem] = useState(project?.per_item ?? config?.per_item ?? 8);
  const [showed, setShowed] = useState(!!project?.showed);
  const [allRecs, setAllRecs] = useState<any[]>([]);
  const [data, setData] = useState<PackDatum | null>(null);
  const [focusCat, setFocusCat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.overview().then((r) => setOv(r.overview));
    if (!msgs.length)
      setMsgs([{ role: "bot", text: `Hi ${persona?.name.split(" ")[0]}. What do you need to procure for "${project?.name}"? Describe the items (quantity, needed-by date) or upload your item list as a PDF.`, chips: START_CHIPS }]);
    else if (showed && items.length) showSuppliers(items, euOnly, false);
  }, []);
  // chat memory: persist the conversation and the item list with the project
  useEffect(() => { if (msgs.length) app.saveProject({ messages: msgs, items, eu_only: euOnly, per_item: perItem, showed }); }, [msgs, items, euOnly, perItem, showed]);
  useEffect(() => { bottom.current?.scrollTo({ top: bottom.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  const say = (m: Msg) => setMsgs((x) => [...x, m]);
  const addItems = (found: Item[], source: string) => {
    const merged = [...items];
    for (const f of found) if (!merged.some((m) => m.category === f.category && m.item.toLowerCase() === f.item.toLowerCase())) merged.push(f);
    setItems(merged);
    if (!found.length) {
      say({ role: "bot", text: "I could not find procurable items in that. Try naming the parts (e.g. brake units, bogie frames, doors), or ask the AI copilot a general question.", chips: ["Ask the AI copilot instead"] });
      return;
    }
    say({ role: "bot", text: `${source} I found ${found.length} item(s):\n${found.map((f) => `• ${f.item}${f.quantity ? ` × ${f.quantity}` : ""} (${f.category}${f.needed_by ? `, by ${f.needed_by}` : ""})`).join("\n")}\n\nAny preference before I look for suppliers?`, chips: AFTER_CHIPS });
  };

  const showSuppliers = async (list = items, eu = euOnly, announce = true) => {
    if (!list.length) return;
    setBusy(true);
    const [b, r] = await Promise.all([api.procurementBubbles(list, perItem, eu), api.procurementRecs(list)]);
    setData(b); setAllRecs(r); setFocusCat(""); setBusy(false); setShowed(true);
    app.setProjectBubbles(b);
    if (announce) say({ role: "bot", text: `Here are ${b.children.length} item bubbles${eu ? " (EU suppliers only)" : ""}. Click an item to see the suppliers that can deliver it with their risk score; click a supplier to open its dashboard. My recommended supplier for each item is on the right.` });
  };

  const handle = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput("");
    if (text === "Upload my item list (PDF)") { fileRef.current?.click(); return; }
    if (text === "Ask the AI copilot instead") { app.askCopilot(msgs.filter((m) => m.role === "user").pop()?.text ?? ""); return; }
    say({ role: "user", text });
    if (text === "Show suppliers") return showSuppliers();
    if (text === "EU suppliers only") { setEuOnly(true); say({ role: "bot", text: "Noted: only suppliers based in the EU.", chips: ["Show suppliers", "Add more items"] }); return; }
    if (text === "Add more items") { say({ role: "bot", text: "Sure, which other items do you need?" }); return; }
    setBusy(true);
    try { const r = await api.procurementParse(text, app.model, app.provider); addItems(r.items, ""); }
    finally { setBusy(false); }
  };

  const upload = async (f: File) => {
    say({ role: "user", text: `Uploaded: ${f.name}` });
    setBusy(true);
    try {
      const r = await api.procurementUpload(f, app.model, app.provider);
      if (r.error) say({ role: "bot", text: `I could not read ${r.file}: ${r.error}` });
      else addItems(r.items, `I read ${r.file} (${r.method.startsWith("OCR") ? "NVIDIA OCR" : "text layer"}).`);
    } finally { setBusy(false); }
  };

  if (!spec || !config) return null;
  const has = (p: string) => spec.panels.includes(p);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Tag tone="dark">Generated UI</Tag><span className="font-mono text-[10px] text-muted">by {spec.generated_by}</span></div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{spec.title}</h1>
          <p className="mt-1 text-petrol">{spec.greeting}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => app.go("configure")}><Wand2 size={14} /> Reconfigure</button>
      </div>

      {has("kpis") && ov && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {spec.kpis.map((k: string) => { const m = KPI[k]?.(ov); return m && <Metric key={k} label={m.label} value={m.value} sub={m.sub} tone={m.crit ? "crit" : undefined} />; })}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_310px]">
        <Card title="What do you need to procure?" icon={<MessagesSquare size={16} />} right={<Tag>Nemotron</Tag>}>
          <div ref={bottom} className="h-[460px] space-y-3 overflow-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                {m.role === "bot" && <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-petrol text-white"><Bot size={15} /></div>}
                <div className={`max-w-[85%] ${m.role === "user" ? "rounded-lg bg-petrol px-3 py-2 text-sm text-white" : ""}`}>
                  <div className={m.role === "bot" ? "whitespace-pre-line rounded-lg bg-canvas px-3 py-2 text-sm" : "whitespace-pre-line"}>{m.text}</div>
                  {m.chips && i === msgs.length - 1 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.chips.map((c) => <button key={c} className="rounded-full border border-petrol px-2.5 py-1 text-left text-xs text-petrol hover:bg-tint" onClick={() => handle(c)}>{c}</button>)}
                    </div>)}
                </div>
              </div>))}
            {busy && <div className="flex items-center gap-2 text-xs text-muted"><Loader2 size={13} className="animate-spin" /> working…</div>}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); handle(input); }}>
            <button type="button" className="btn btn-ghost !px-2.5" title="Upload item list (PDF, image, DOCX)" onClick={() => fileRef.current?.click()}><FileUp size={16} /></button>
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. 120 traction converters for ICX-300…" />
            <button className="btn btn-primary" disabled={busy}><Send size={14} /></button>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt,.md,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </form>
          {items.length > 0 && (
            <div className="mt-4 rounded border border-line">
              <div className="flex items-center justify-between border-b border-line px-3 py-2"><span className="label">Items to procure ({items.length})</span>
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" className="accent-[#00646e]" checked={euOnly} onChange={(e) => setEuOnly(e.target.checked)} /> EU only</label></div>
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm odd:bg-canvas">
                  <span>{it.item}{it.quantity ? <span className="font-mono text-xs text-muted"> × {it.quantity}</span> : null}<span className="block text-[11px] text-muted">{it.category}{it.needed_by ? ` · by ${it.needed_by}` : ""}</span></span>
                  <button className="text-muted hover:text-crit" onClick={() => setItems(items.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
                </div>))}
              <div className="flex items-center gap-3 border-t border-line px-3 py-2">
                <span className="text-xs text-muted">Suppliers per item: {perItem}</span>
                <input type="range" min={3} max={15} value={perItem} onChange={(e) => setPerItem(+e.target.value)} className="flex-1 accent-[#00646e]" />
                <button className="btn btn-primary !py-1 text-xs" onClick={() => showSuppliers()}><Network size={13} /> Show suppliers</button>
              </div>
            </div>
          )}
        </Card>

        <div className="min-w-0 space-y-5">
          {has("bubbles") && (
            <Card title="Items → suppliers that can deliver them" icon={<Network size={16} />}
              right={<span className="font-mono text-[11px] text-muted">click an item · click a supplier for its dashboard</span>}>
              {data && data.children?.length ? (
                <ZoomPack data={data} height={620} onOpenSupplier={app.openSupplier}
                  onFocus={(n) => setFocusCat(n.data.kind === "item" ? n.data.category! : "")} />
              ) : (
                <div className="flex h-[560px] flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-canvas text-center text-muted">
                  <Network size={34} className="text-line-strong" />
                  <p className="mt-2 max-w-sm text-sm">Tell the assistant what you need to procure, or upload your item list. One bubble per item will appear here.</p>
                </div>
              )}
            </Card>
          )}

        </div>

        {has("recommendations") && (
          <section className="card overflow-hidden border-2 border-petrol xl:sticky xl:top-4 xl:self-start">
            <header className="bg-petrol px-4 py-3 text-white">
              <div className="flex items-center gap-2 text-lg font-semibold"><ShoppingCart size={18} /> Recommended suppliers</div>
              <div className="font-mono text-[11px] text-teal-light">{spec.recommendation_focus} · exact risk ranking</div>
            </header>
            <div className="max-h-[680px] space-y-3 overflow-auto p-3">
              {!allRecs.length && <p className="p-2 text-sm text-muted">Tell the assistant what you need. The best supplier for each item will appear here.</p>}
              {[...allRecs].sort((a, b) => (b.category === focusCat ? 1 : 0) - (a.category === focusCat ? 1 : 0)).map((r) => {
                const best = r.buy[0];
                const on = r.category === focusCat;
                return (
                  <div key={r.item} className={`rounded-md border p-3 ${on ? "border-petrol bg-tint ring-1 ring-petrol" : "border-line"}`}>
                    <div className="label">{r.item}{r.quantity ? ` × ${r.quantity}` : ""}</div>
                    {best ? (
                      <button onClick={() => app.openSupplier(best.id)} className="mt-1.5 w-full rounded border border-[#a7f3d0] bg-[#ecfdf5] p-2.5 text-left hover:ring-1 hover:ring-low">
                        <div className="flex items-center justify-between gap-2">
                          <div><div className="flex items-center gap-1 text-base font-semibold text-petrol-dark"><BadgeCheck size={16} className="text-low" />{best.name}</div>
                            <div className="font-mono text-[10px] text-muted">{best.id} · {best.country}</div></div>
                          <div className="text-right"><div className="metric text-3xl" style={{ color: riskColor(best.risk) }}>{best.risk}</div><div className="font-mono text-[9px] text-muted">RISK</div></div>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-ink">{best.reasons.join(" · ")}</div>
                      </button>
                    ) : <p className="text-xs text-muted">No supplier meets the criteria.</p>}
                    {on && r.buy.slice(1).map((b: any, i: number) => (
                      <button key={b.id} onClick={() => app.openSupplier(b.id)} className="mt-1.5 flex w-full items-center justify-between rounded border border-line bg-white px-2.5 py-1.5 text-left text-sm hover:border-petrol">
                        <span>{i + 2}. {b.name}</span><span className="font-mono font-bold" style={{ color: riskColor(b.risk) }}>{b.risk}</span></button>))}
                    {r.avoid[0] && (
                      <button onClick={() => app.openSupplier(r.avoid[0].id)} className="mt-1.5 flex w-full items-center justify-between rounded border border-[#fca5a5] bg-[#fef2f2] px-2.5 py-1.5 text-left text-xs text-crit">
                        <span><Ban size={12} className="mr-1 inline" />Avoid {r.avoid[0].name}</span><span className="font-mono font-bold">{r.avoid[0].risk}</span></button>)}
                  </div>
                );
              })}
              {has("copilot") && allRecs.length > 0 && (
                <button className="btn btn-dark w-full justify-center" onClick={() => app.askCopilot(`For my project "${project?.name}" (${items.map((i) => i.item).join(", ")}): confirm the recommended suppliers with evidence from data, documents and the web.`)}>
                  <Sparkles size={14} /> Ask the agents to justify</button>)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
