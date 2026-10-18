import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, ShieldX, ThumbsDown, ThumbsUp, UserCheck, BadgeCheck, Bot, Inbox as InboxIcon, Loader2, Mail, MailOpen, ScanSearch, Sparkles, TrainFront } from "lucide-react";
import { api, eur, type Email } from "../api";
import { useApp } from "../App";
import { RiskBadge, Tag } from "../components/ui";

const SCENARIOS = [
  { id: "brake_delay", label: "Brake supplier: 6-week delay" },
  { id: "door_delay", label: "Door supplier: 3-week delay + rework" },
  { id: "phishing", label: "Phishing: fake bank details + injection" },
];

function Delta({ label, before, after, fmt = (v: number) => String(v), worseUp = true }: { label: string; before: number; after: number; fmt?: (v: number) => string; worseUp?: boolean }) {
  const worse = worseUp ? after > before : after < before;
  return (
    <div className="rounded border border-line p-3">
      <div className="label">{label}</div>
      <div className="mt-1 flex items-baseline gap-2 font-mono">
        <span className="text-muted line-through decoration-1">{fmt(before)}</span>
        <ArrowRight size={13} className="self-center text-muted" />
        <span className={`text-2xl font-semibold ${worse ? "text-crit" : "text-low"}`}>{fmt(after)}</span>
      </div>
    </div>
  );
}

export default function Inbox() {
  const app = useApp();
  const [sel, setSel] = useState<Email | null>(null);
  const [res, setRes] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!sel && app.inbox.length) setSel(app.inbox.find((m) => !m.read) ?? app.inbox[0]); }, [app.inbox]);

  const analyse = async (m: Email) => {
    setBusy(true);
    try { const r = await api.analyzeEmail(m.id, app.model, app.provider); setRes((x) => ({ ...x, [m.id]: r })); app.refreshInbox(); }
    finally { setBusy(false); }
  };
  const askSupervisor = (m: Email) => app.askCopilot(
    `A new email arrived: "${m.subject}" (email id ${m.id}). Read it, extract the disruption, recalculate the supplier risk and tell me what it means for my project and who I should buy from instead.`);

  const r = sel ? res[sel.id] : null;
  const im = r?.impact;
  const decide = async (m: Email, decision: "approved" | "rejected") => {
    const e = await api.emailDecision(m.id, app.persona?.email ?? "", decision);
    setRes((x) => ({ ...x, [m.id]: { ...x[m.id], email: e } }));
    app.refreshInbox();
  };
  const status = r?.email?.analysis?.status ?? "proposed";
  const hitProjects = im ? app.projects.filter((p) => p.items?.some((i: any) => i.category === im.supplier.category)) : [];

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-80 shrink-0 flex-col border-r border-line bg-white">
        <div className="border-b border-line p-4">
          <div className="flex items-center gap-2 font-semibold"><InboxIcon size={17} className="text-petrol" /> Procurement inbox <Tag tone="sim">simulated</Tag></div>
          <p className="mt-1 text-xs text-muted">Email connector. The Email Agent reads supplier messages and recalculates risk.</p>
          <div className="mt-3 space-y-1.5">
            {SCENARIOS.map((s) => (
              <button key={s.id} className="btn btn-ghost w-full justify-start text-xs" onClick={async () => { const m = await api.simulateEmail(s.id); await app.refreshInbox(); setSel(m); }}>
                <Sparkles size={13} className="text-petrol" /> Simulate: {s.label}</button>))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {app.inbox.map((m) => (
            <button key={m.id} onClick={() => setSel(m)}
              className={`block w-full border-b border-line px-4 py-3 text-left ${sel?.id === m.id ? "bg-tint" : "hover:bg-canvas"}`}>
              <div className="flex items-center gap-2">
                {m.read ? <MailOpen size={14} className="text-muted" /> : <Mail size={14} className="text-crit" />}
                <span className={`truncate font-mono text-[11px] ${m.read ? "text-muted" : "font-bold"}`}>{m.from}</span>
              </div>
              <div className={`mt-1 line-clamp-2 text-sm ${m.read ? "" : "font-semibold"}`}>{m.subject}</div>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted">
                <span>{m.received.replace("T", " ").slice(0, 16)}</span>
                {m.analysis && <span>risk {m.analysis.risk_before} → <b className="text-crit">{m.analysis.risk_after}</b></span>}
              </div>
            </button>))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-auto p-6">
        {!sel ? <div className="flex h-full items-center justify-center text-muted">No email selected.</div> : (
          <div className="mx-auto max-w-4xl space-y-5">
            <article className="card p-5">
              <div className="font-mono text-[11px] text-muted">From {sel.from} · {sel.received.replace("T", " ")}</div>
              <h1 className="mt-1 text-xl font-semibold">{sel.subject}</h1>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{sel.body}</pre>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <button className="btn btn-primary" onClick={() => analyse(sel)} disabled={busy}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />} Analyse &amp; recalculate risk</button>
                <button className="btn btn-dark" onClick={() => askSupervisor(sel)}><Bot size={15} /> Ask the supervisor</button>
              </div>
            </article>

            {busy && <div className="card flex items-center gap-2 p-4 text-sm text-muted"><Loader2 size={15} className="animate-spin" /> Email Agent is reading the email with {app.model.split("/").pop()} and recomputing the risk…</div>}

            {r?.security_flags && (
              <section className="card overflow-hidden border-2 border-crit">
                <header className="flex items-center gap-2 bg-crit px-5 py-3 font-semibold text-white"><ShieldX size={18} /> Security guardrail: suspicious email, nothing executed</header>
                <div className="space-y-2 p-5 text-sm">
                  <p>{r.note}</p>
                  <div className="label">Instruction patterns found in untrusted content</div>
                  <ul className="list-disc pl-5 font-mono text-xs text-crit">{r.security_flags.map((f: string) => <li key={f}>{f}</li>)}</ul>
                  <p className="text-xs text-muted">Email text is treated as data, never as instructions. Bank details are redacted before any model sees them.</p>
                </div>
              </section>
            )}
            {r && !im && !r.security_flags && <div className="card p-4 text-sm text-muted">{r.note ?? "No supplier disruption found in this email."}</div>}

            {im && (
              <section className="card overflow-hidden border-2 border-crit/60">
                <header className="flex flex-wrap items-center justify-between gap-2 bg-[#fef2f2] px-5 py-3">
                  <div className="flex items-center gap-2 font-semibold text-crit"><AlertTriangle size={18} /> Disruption detected · {im.delay_weeks}-week delay</div>
                  <div className="font-mono text-[11px] text-muted">extracted by {r.event.extracted_by}</div>
                </header>
                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <button className="text-lg font-semibold text-petrol-dark hover:underline" onClick={() => app.openSupplier(im.supplier.id)}>{im.supplier.name}</button>
                      <div className="font-mono text-xs text-muted">{im.supplier.id} · {im.supplier.category} · {im.supplier.country}</div>
                      {r.event.reason && <div className="mt-1 text-sm">“{r.event.reason}”{r.event.part ? ` · ${r.event.part}` : ""}{r.event.po ? ` · ${r.event.po}` : ""}</div>}
                    </div>
                    <div className="flex items-center gap-2"><RiskBadge score={im.risk_before} /><ArrowRight size={14} /><RiskBadge score={im.risk_after} /></div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Delta label="Total risk" before={im.risk_before} after={im.risk_after} />
                    <Delta label="Delivery rating" before={im.delivery_before} after={im.delivery_after} fmt={(v) => `${v.toFixed(0)}%`} worseUp={false} />
                    <Delta label="Risk exposure" before={im.exposure_before_eur} after={im.exposure_after_eur} fmt={eur} />
                    <div className="rounded border border-line p-3">
                      <div className="label">Line-stop risk</div>
                      <div className={`metric mt-1 text-2xl ${im.line_stop_weeks ? "text-crit" : "text-low"}`}>{im.line_stop_weeks} wk</div>
                      <div className="text-[11px] text-muted">delay {im.delay_weeks} wk vs safety stock {im.safety_stock_weeks} wk</div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded border border-line p-3 text-sm">
                      <div className="label mb-1.5">What changed</div>
                      <ul className="space-y-1">
                        {Object.entries(im.score_changes).map(([k, v]: any) => <li key={k} className="font-mono text-xs">{k}: {v.from} → <b>{v.to}</b></li>)}
                        <li className="text-xs">{im.open_orders} open orders · {eur(im.open_order_value_eur)} affected</li>
                        {im.recommendable_before && !im.recommendable_after && <li className="font-semibold text-crit">{status === "approved" ? "Removed from recommended suppliers" : "Would be removed from recommended suppliers"} (delivery below 90%)</li>}
                        {im.trainsets_affected > 0 && <li className="flex items-center gap-1 text-xs"><TrainFront size={13} /> {im.affected_fleets.map((f: any) => `${f.fleet} (${f.trainsets})`).join(", ")}</li>}
                        {hitProjects.map((p) => <li key={p.id} className="text-xs">Your project <button className="font-semibold text-petrol hover:underline" onClick={() => app.openProject(p.id)}>{p.name}</button> needs {im.supplier.category.toLowerCase()}</li>)}
                      </ul>
                    </div>
                    <div className="rounded border border-line p-3">
                      <div className="label mb-1.5">Buy from instead</div>
                      {im.alternatives.map((a: any, i: number) => (
                        <button key={a.id} onClick={() => app.openSupplier(a.id)} className="mb-1.5 flex w-full items-center justify-between rounded border border-line px-2.5 py-1.5 text-left text-sm hover:border-petrol">
                          <span className="flex items-center gap-1.5">{i === 0 && <BadgeCheck size={14} className="text-low" />}{a.name} <span className="font-mono text-[10px] text-muted">{a.id} · {a.country}</span></span>
                          <RiskBadge score={a.risk} /></button>))}
                    </div>
                  </div>
                  <div className={`flex flex-wrap items-center justify-between gap-3 rounded border-2 p-3 ${status === "approved" ? "border-low bg-[#ecfdf5]" : status === "rejected" ? "border-line bg-canvas" : "border-petrol bg-tint"}`}>
                    <div className="flex items-center gap-2 text-sm"><UserCheck size={17} className="text-petrol" />
                      {status === "proposed" ? <span><b>Your decision:</b> apply the recalculated risk to recommendations and the supplier tree?</span>
                        : <span>Recalculated risk <b>{status}</b> by you · written to the audit log</span>}</div>
                    {status === "proposed" ? (
                      <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => decide(sel, "approved")}><ThumbsUp size={14} /> Approve &amp; apply</button>
                        <button className="btn btn-ghost" onClick={() => decide(sel, "rejected")}><ThumbsDown size={14} /> Reject</button>
                      </div>) : <button className="btn btn-ghost !py-1 text-xs" onClick={() => decide(sel, status === "approved" ? "rejected" : "approved")}>Undo</button>}
                  </div>
                  <details className="text-xs text-muted"><summary className="cursor-pointer font-semibold">How the new risk is calculated</summary>
                    <p className="mt-1">{im.method}</p><p className="mt-1">{im.label}</p></details>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
