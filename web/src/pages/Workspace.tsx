import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Ban, Bot, FileUp, LayoutDashboard, Loader2, MessagesSquare, Network, Pencil, Send, ShieldAlert, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { api } from "../api";
import { useApp } from "../App";
import ZoomPack, { riskColor, type PackDatum } from "../components/ZoomPack";
import { Card, RiskBadge, Tag } from "../components/ui";

type Item = { item: string; category: string; quantity?: number | null; needed_by?: string | null; own_date?: boolean };
type Msg = { role: "bot" | "user"; text: string; chips?: string[] };
type Step = "items" | "constraints" | "priority" | "ready";

const START_CHIPS = ["240 brake control units and 480 bogie frames by March 2027", "Door drive units and HVAC roof units", "Upload my item list (PDF)"];
const CONSTRAINT_CHIPS = ["EU suppliers only", "No location constraint", "Add more items"];
const PRIORITY_CHIPS = ["Lowest risk", "Delivery reliability", "Proven high volume"];

// date inputs need YYYY-MM-DD; the parser returns free text such as "2027-03" or "March 2027"
const toISO = (s?: string | null) => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const d = new Date(s);
  return isNaN(+d) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Workspace() {
  const app = useApp();
  const { project, persona } = app;
  const [msgs, setMsgs] = useState<Msg[]>(project?.messages ?? []);
  const [items, setItems] = useState<Item[]>(project?.items ?? []);
  const [step, setStep] = useState<Step>((project as any)?.step ?? "items");
  const [euOnly, setEuOnly] = useState(!!project?.eu_only);
  const [priority, setPriority] = useState<string>((project as any)?.priority ?? "");
  const [phase, setPhase] = useState<"intake" | "results">((project as any)?.phase ?? "intake");
  const [perItem, setPerItem] = useState(project?.per_item ?? 8);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<PackDatum | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "item", dir: 1 });
  const [focusCat, setFocusCat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!msgs.length)
      setMsgs([{ role: "bot", text: `Hi ${persona?.name.split(" ")[0]}, let's set up "${project?.name}".\n\nWhat kind of items do you want to buy for this project? Describe them (quantities and needed-by dates help) or upload your item list as a PDF.`, chips: START_CHIPS }]);
  }, []);
  useEffect(() => { if (phase === "results" && items.length) build(false); }, [phase, euOnly, perItem, priority]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => {
    if (msgs.length) app.saveProject({ messages: msgs, items, eu_only: euOnly, per_item: perItem, showed: phase === "results", ...({ step, priority, phase } as any) });
  }, [msgs, items, euOnly, perItem, step, priority, phase]);

  const say = (m: Msg) => setMsgs((x) => [...x, m]);

  const build = async (switchPhase = true) => {
    setBusy(true);
    // recommendations are computed server-side from the very suppliers shown in each item bubble
    const b = await api.procurementBubbles(items, perItem, euOnly, priority || "Lowest risk");
    setData(b); setFocusCat(""); app.setProjectBubbles(b); setBusy(false);
    if (switchPhase) setPhase("results");
  };

  const gotItems = (found: Item[], source: string) => {
    if (!found.length) {
      say({ role: "bot", text: "I could not find items to procure in that. Please name the parts (e.g. brake control units, bogie frames, door drive units) or upload your item list.", chips: START_CHIPS });
      return;
    }
    const merged = [...items];
    for (const f of found.map((x) => ({ ...x, needed_by: toISO(x.needed_by), own_date: !!toISO(x.needed_by) }))) if (!merged.some((m) => m.category === f.category && m.item.toLowerCase() === f.item.toLowerCase())) merged.push(f);
    // items without their own date follow the first item's date
    const first = merged[0]?.needed_by;
    setItems(merged.map((m, k) => (k && !m.own_date && first ? { ...m, needed_by: first } : m)));
    const missing = found.filter((f) => !f.quantity || !f.needed_by).length;
    setStep("constraints");
    say({ role: "bot", text: `${source}I found ${found.length} item(s):\n${found.map((f) => `• ${f.item}${f.quantity ? ` × ${f.quantity}` : ""} (${f.category}${f.needed_by ? `, by ${f.needed_by}` : ""})`).join("\n")}` +
      (missing ? `\n\n${missing} item(s) have no quantity or date yet; set them in the item list below.` : "") +
      `\n\nPress Enter to build the dashboards, or pick a sourcing constraint first.`, chips: CONSTRAINT_CHIPS });
  };

  const handle = async (text: string) => {
    if (busy) return;
    // empty Enter once items are listed = send the request and build the dashboards
    if (!text.trim()) { if (items.length) { say({ role: "user", text: "Build dashboards" }); await build(); } return; }
    setInput("");
    if (text === "Upload my item list (PDF)") { fileRef.current?.click(); return; }
    say({ role: "user", text });
    if (text === "Add more items") { setStep("items"); say({ role: "bot", text: "Which other items do you need?" }); return; }
    if (step === "constraints" && (text === "EU suppliers only" || text === "No location constraint")) {
      setEuOnly(text === "EU suppliers only"); setStep("priority");
      say({ role: "bot", text: "Noted. What matters most when choosing between suppliers?", chips: PRIORITY_CHIPS }); return;
    }
    if (step === "priority" && PRIORITY_CHIPS.includes(text)) {
      setPriority(text); setStep("ready");
      say({ role: "bot", text: `Thanks. Summary of the request:\n• ${items.length} item(s): ${items.map((i) => i.item).join(", ")}\n• Suppliers: ${euOnly ? "EU only" : "any location"}\n• Priority: ${text.toLowerCase()}\n\nI can now look up which suppliers can deliver each item and assess their risk.`, chips: ["Build dashboards", "Add more items"] });
      return;
    }
    if (text === "Build dashboards") { await build(); return; }
    setBusy(true);
    try { const r = await api.procurementParse(text, app.model, app.provider); gotItems(r.items, ""); } finally { setBusy(false); }
  };

  const upload = async (f: File) => {
    say({ role: "user", text: `Uploaded: ${f.name}` });
    setBusy(true);
    try {
      const r = await api.procurementUpload(f, app.model, app.provider);
      if (r.error) say({ role: "bot", text: `I could not read ${r.file}: ${r.error}` });
      else gotItems(r.items, `I read ${r.file} (${r.method.startsWith("OCR") ? "NVIDIA OCR" : "text layer"}). `);
    } finally { setBusy(false); }
  };

  const editItem = (i: number, patch: Partial<Item>) => setItems(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  // the first item's date cascades to every item whose date was not edited individually
  const editDate = (i: number, d: string | null) => setItems(items.map((x, k) =>
    k === i ? { ...x, needed_by: d, own_date: i > 0 && !!d } : i === 0 && !x.own_date ? { ...x, needed_by: d } : x));
  const enterBuilds = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handle(""); } };

  const itemList = items.length > 0 && (
    <div className="rounded border border-line">
      <div className="flex items-center justify-between border-b border-line px-3 py-2"><span className="label">Items to procure ({items.length})</span>
        <span className="text-[11px] text-muted">first date applies to all · edit any row · Enter to build</span></div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_140px_24px] items-center gap-2 px-3 py-1.5 text-sm odd:bg-canvas">
          <span className="min-w-0">{it.item}<span className="block truncate text-[11px] text-muted">{it.category}</span></span>
          <input type="number" min={1} className="input !h-7 !px-1.5 text-xs" placeholder="qty" value={it.quantity ?? ""} onKeyDown={enterBuilds}
            onChange={(e) => editItem(i, { quantity: e.target.value ? +e.target.value : null })} />
          <input type="date" title={i ? "needed by (own date)" : "needed by (applies to all items)"} className={`input !h-7 !px-1.5 text-xs ${i && !it.own_date ? "text-muted" : ""}`}
            value={toISO(it.needed_by) ?? ""} onKeyDown={enterBuilds} onChange={(e) => editDate(i, e.target.value || null)} />
          <button className="text-muted hover:text-crit" onClick={() => setItems(items.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
        </div>))}
    </div>
  );

  // ------------------------------------------------------------ phase 1: intake chat only
  if (phase === "intake") {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
        <div className="mb-3">
          <div className="label">New procurement request · step 1 of 2</div>
          <h1 className="text-2xl font-bold tracking-tight">{project?.name}</h1>
          <p className="text-sm text-muted">Tell the assistant what you need. The dashboards are built once we know which items, and therefore which suppliers, are involved.</p>
        </div>
        <div className="card flex min-h-0 flex-1 flex-col p-4">
          <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                {m.role === "bot" && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-petrol text-white"><Bot size={16} /></div>}
                <div className={`max-w-[80%] ${m.role === "user" ? "rounded-lg bg-petrol px-3 py-2 text-white" : ""}`}>
                  <div className={m.role === "bot" ? "whitespace-pre-line rounded-lg bg-canvas px-4 py-2.5" : "whitespace-pre-line"}>{m.text}</div>
                  {m.chips && i === msgs.length - 1 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.chips.map((c) => (
                        <button key={c} onClick={() => handle(c)}
                          className={`rounded-full border px-3 py-1.5 text-left text-sm ${c === "Build dashboards" ? "border-petrol bg-petrol font-semibold text-white hover:bg-teal" : "border-petrol text-petrol hover:bg-tint"}`}>
                          {c === "Build dashboards" && <LayoutDashboard size={14} className="mr-1 inline" />}{c}</button>))}
                    </div>)}
                </div>
              </div>))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Nemotron is reading your request…</div>}
          </div>
          {itemList && <div className="mt-3">{itemList}</div>}
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); handle(input); }}>
            <button type="button" className="btn btn-ghost !px-3" title="Upload item list (PDF, image, DOCX)" onClick={() => fileRef.current?.click()}><FileUp size={17} /></button>
            <input className="input !h-11" value={input} onChange={(e) => setInput(e.target.value)} placeholder={items.length ? "Press Enter to build the dashboards, or type to add items…" : "Type your answer, e.g. 120 traction converters by June 2027…"} />
            <button className="btn btn-primary !px-5" disabled={busy}><Send size={15} /></button>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt,.md,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </form>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ phase 2: dashboards for this request
  // focusCat holds the focused item name (empty = all items)
  const recs = (data?.children ?? []).map((it: any) => ({ item: it.name, category: it.category, quantity: it.quantity, ...it.recommendation }));
  const suppliers = (data?.children ?? []).flatMap((it: any) => it.children.map((s: any) => ({ ...s, item: it.name, category: it.category })))
    .sort((a: any, b: any) => {
      const x = a[sort.key], y = b[sort.key];
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""))) * sort.dir;
    });
  const th = (key: string, label: string, right = false) => (
    <th className={`cursor-pointer select-none hover:text-petrol ${right ? "text-right" : ""}`} onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>
      {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : <span className="opacity-30"> ↕</span>}
    </th>);
  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label">Procurement request · step 2 of 2</div>
          <h1 className="text-2xl font-bold tracking-tight">{project?.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Tag>{items.length} items</Tag><Tag>{euOnly ? "EU suppliers only" : "any location"}</Tag>{priority && <Tag>priority: {priority}</Tag>}
            <Tag tone="sim">categories & locations simulated</Tag>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">suppliers per item {perItem}
            <input type="range" min={3} max={15} value={perItem} onChange={(e) => setPerItem(+e.target.value)} className="accent-[#00646e]" /></label>
          <button className="btn btn-ghost" onClick={() => setPhase("intake")}><Pencil size={14} /> Edit request</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Items → suppliers that can deliver them" icon={<Network size={16} />} right={<span className="font-mono text-[11px] text-muted">click an item · click a supplier for its dashboard</span>}>
          {data && data.children?.length ? (
            <ZoomPack data={data} height={600} onOpenSupplier={app.openSupplier} onFocus={(n) => setFocusCat(n.data.kind === "item" ? n.data.name : n.data.kind === "supplier" ? n.parent!.data.name : "")} />
          ) : <div className="flex h-[600px] items-center justify-center text-muted"><Loader2 className="mr-2 animate-spin" size={16} /> finding suppliers…</div>}
        </Card>

        <section className="card overflow-hidden border-2 border-petrol xl:self-start">
          <header className="bg-petrol px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-lg font-semibold"><ShoppingCart size={18} /> Recommended suppliers</div>
            <div className="font-mono text-[11px] text-teal-light">picked among the suppliers in each bubble · ranked by {(priority || "lowest risk").toLowerCase()}</div>
          </header>
          <div className="max-h-[620px] space-y-3 overflow-auto p-3">
            {focusCat && <div className="flex items-center justify-between rounded bg-tint px-2.5 py-1.5 text-xs"><span>Showing <b>{focusCat}</b> only</span>
              <span className="text-muted">click the background to see all items</span></div>}
            {recs.filter((r: any) => !focusCat || r.item === focusCat).map((r: any) => {
              const best = r.buy[0];
              const on = r.item === focusCat;
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
                      <div className="mt-1 text-[11px]">{best.reasons.join(" · ")}</div>
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
            <button className="btn btn-dark w-full justify-center" onClick={() => app.askCopilot(`For my project "${project?.name}" (${items.map((i) => i.item).join(", ")}): confirm the recommended suppliers with evidence from data, documents and the web.`)}>
              <Sparkles size={14} /> Ask the agents to justify</button>
          </div>
        </section>
      </div>

      <Card title={`Supplier risks for this request (${suppliers.length})`} icon={<ShieldAlert size={16} />}>
        <div className="max-h-[460px] overflow-auto">
          <table className="grid-table w-full">
            <thead><tr>{th("item", "Item")}{th("name", "Supplier")}{th("country", "Country")}{th("risk", "Total risk")}{th("worst", "Main risk driver")}{th("delivery", "Delivery", true)}{th("iris", "IRIS")}{th("recommended", "Status")}</tr></thead>
            <tbody>{suppliers.map((s: any) => (
              <tr key={s.item + s.id} className="cursor-pointer" onClick={() => app.openSupplier(s.id)}>
                <td className="text-xs">{s.item}</td>
                <td><div className="font-semibold text-petrol">{s.name}</div><div className="font-mono text-[10px] text-muted">{s.id}</div></td>
                <td className="text-xs">{s.country}</td>
                <td><RiskBadge score={s.risk} /></td>
                <td className="text-xs">{s.worst} <span className="font-mono text-muted">({s.worst_score})</span></td>
                <td className={`text-right font-mono text-xs ${s.delivery < 85 ? "text-crit" : ""}`}>{s.delivery?.toFixed(1)}%</td>
                <td className="text-xs">{s.iris ? "yes" : "–"}</td>
                <td>{s.recommended && <Tag tone="dark">recommended</Tag>}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Card>

      <button className="btn btn-ghost" onClick={() => setPhase("intake")}><MessagesSquare size={14} /> Back to the request chat</button>
    </div>
  );
}
