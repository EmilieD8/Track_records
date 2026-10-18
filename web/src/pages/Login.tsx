import { useEffect, useState } from "react";
import { ArrowRight, Check, Cpu, Database, Folder, Globe, KeyRound, Loader2, LogIn, Mail, ShieldCheck, Sparkles, UserCog, Wand2 } from "lucide-react";
import { api } from "../api";
import { SiemensLogo, useApp, type UiConfig } from "../App";
import DocPicker from "../components/DocPicker";

const PANELS = ["bubbles", "recommendations", "copilot"];
const STEPS = ["Saving your profile and connectors", "Indexing your project folder", "Nemotron is designing your layout", "Preparing your projects"];

type Conn = { db: boolean; email: boolean; web: boolean; folder: string };

/** Connector row with a simulated OAuth-style authorisation (least-privilege, read-only scope). */
function Authorize({ icon, title, scope, on, onChange, optional = true, disabled = false, note }: {
  icon: JSX.Element; title: string; scope: string; on: boolean; onChange: (v: boolean) => void; optional?: boolean; disabled?: boolean; note?: string;
}) {
  const [busy, setBusy] = useState(false);
  const connect = () => { setBusy(true); setTimeout(() => { setBusy(false); onChange(true); }, 900); };
  return (
    <div className={`flex items-center gap-3 rounded border p-3 ${on ? "border-low bg-[#f0fdf4]" : "border-line"}`}>
      <span className="text-petrol">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}{!optional && <span className="ml-1 text-crit">*</span>}</div>
        <div className="font-mono text-[10px] text-muted">{on ? `connected · scope ${scope}` : note ?? `requests scope ${scope}`}</div>
      </div>
      {on ? (
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-low"><ShieldCheck size={13} /> authorised</span>
          {optional && <button className="text-[11px] text-muted hover:text-crit" onClick={() => onChange(false)}>revoke</button>}
        </span>
      ) : (
        <button className="btn btn-ghost !py-1 text-xs" disabled={busy || disabled} onClick={connect}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} {busy ? "Authorising…" : "Authorise"}</button>
      )}
    </div>
  );
}

export default function Login({ configure }: { configure: boolean }) {
  const app = useApp();
  const [account, setAccount] = useState<any>(null);
  const [err, setErr] = useState("");
  const [gen, setGen] = useState(-1);
  const [models, setModels] = useState<string[]>([]);
  const [draft, setDraft] = useState({ name: "", role: "" });
  const [conn, setConn] = useState<Conn>({ db: false, email: true, web: true, folder: "" });
  const [cfg, setCfg] = useState<UiConfig>({ per_item: 8, panels: PANELS });
  const p = app.persona;

  // one demo profile: the strategic buyer
  useEffect(() => { api.demoAccounts().then((a) => setAccount(a.find((x) => x.email.startsWith("lena")) ?? a[0])); }, []);
  useEffect(() => {
    if (!p) return;
    setDraft({ name: p.name, role: p.role });
    const c = (p as any).connectors ?? {};
    setConn({ db: !!c.db, email: c.email ?? true, web: c.web ?? !!app.status?.keys?.tavily, folder: c.folder ?? app.status?.folder ?? "" });
    if (p.ui_config) setCfg({ per_item: p.ui_config.per_item ?? 8, panels: p.ui_config.panels ?? PANELS });
  }, [p?.id, app.status?.folder]);
  useEffect(() => { if (configure) api.models(app.provider).then((r) => { setModels(r.models); if (!r.models.includes(app.model)) app.setModel(r.models[0]); }); }, [app.provider, configure]);

  const signIn = async () => {
    setErr("");
    try { app.signIn(await api.login(account.email)); } catch { setErr("Could not sign in."); }
  };

  const finish = async () => {
    if (!p) return;
    setGen(0);
    const tick = setInterval(() => setGen((g) => Math.min(STEPS.length - 1, g + 1)), 900);
    try {
      app.setWeb(conn.web);
      const persona = { ...p, ...draft, connectors: conn } as any;
      await app.updatePersona(persona);
      if (conn.folder && conn.folder !== app.status?.folder)
        api.extract(conn.folder, app.provider, "nvidia/nemotron-parse").then(app.refreshStatus).catch(() => undefined);
      const spec = p.ui_spec && p.ui_config ? p.ui_spec : await api.generateUi({ persona, config: { ...cfg, categories: [] }, model: app.model, provider: app.provider });
      app.setWorkspace(cfg, spec);
    } finally { clearInterval(tick); setGen(-1); }
  };

  return (
    <div className="flex min-h-full bg-gradient-to-br from-petrol-dark via-[#00545c] to-slate-ink">
      <div className="hidden w-[34%] flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3"><ShieldCheck size={34} className="text-teal-light" />
          <div><div className="text-2xl font-semibold">SupplyGuard</div><div className="font-mono text-[10px] tracking-[.2em] text-teal-light">PROCUREMENT INTELLIGENCE · RAIL</div></div></div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">See supplier risk early.<br />Switch suppliers in time.</h1>
          <p className="mt-4 max-w-md text-teal-light">Agents on NVIDIA Nemotron read your supplier data, documents, inbox and the web. You set the boundaries and approve every action.</p>
        </div>
        <div className="flex items-center gap-3"><span className="font-mono text-[10px] tracking-[.18em] text-teal-light/80">PROJECT SPONSOR</span><SiemensLogo white className="h-6" /></div>
        <div className="font-mono text-[11px] text-teal-light/70">10,000 suppliers · €20.4 bn spend · 18 risk signals per supplier</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        {!configure && (
          <div className="card w-full max-w-md p-8">
            <div className="flex items-center justify-between"><div className="label">Sign in</div><SiemensLogo className="h-4" /></div>
            <h2 className="mt-1 text-2xl font-semibold">Welcome to SupplyGuard</h2>
            {account && (
              <button onClick={signIn} className="group mt-6 flex w-full items-center gap-4 rounded-md border-2 border-petrol p-4 text-left transition hover:bg-tint">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-petrol text-lg font-semibold text-white">{account.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{account.name}</div>
                  <div className="text-xs text-muted">{account.role}</div>
                  <div className="font-mono text-[11px] text-muted">{account.email}</div>
                </div>
                <span className="btn btn-primary"><LogIn size={15} /> Continue</span>
              </button>
            )}
            {err && <div className="mt-2 text-sm text-crit">{err}</div>}
            <p className="mt-4 text-center font-mono text-[10px] text-muted">Prototype · single demo profile · SSO in production</p>
          </div>
        )}

        {configure && p && (
          <div className="card w-full max-w-3xl p-8">
            <div className="label">Step 2 of 2 · customise your profile</div>
            <h2 className="mt-1 text-2xl font-semibold">Hi {p.name.split(" ")[0]}, connect your sources</h2>
            <p className="text-sm text-muted">SupplyGuard only reads what you authorise here. You can change it later in Settings and Guardrails.</p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="space-y-3">
                <div className="label flex items-center gap-1.5"><UserCog size={13} /> Profile</div>
                <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
                <input className="input" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role" />
                <div className="label flex items-center gap-1.5 pt-2"><Cpu size={13} /> Model</div>
                <select className="input" value={app.provider} onChange={(e) => app.setProvider(e.target.value)}>
                  {(app.status?.providers ?? []).map((x: string) => <option key={x}>{x}</option>)}</select>
                <select className="input font-mono text-xs" value={app.model} onChange={(e) => app.setModel(e.target.value)}>
                  {models.map((m) => <option key={m}>{m}</option>)}</select>
                <div className="label pt-2">Suppliers per item: {cfg.per_item}</div>
                <input type="range" min={3} max={15} value={cfg.per_item} onChange={(e) => setCfg({ ...cfg, per_item: +e.target.value })} className="w-full accent-[#00646e]" />
              </section>

              <section className="space-y-3">
                <div className="label flex items-center gap-1.5"><ShieldCheck size={13} /> Data sources &amp; authorisation</div>
                <Authorize icon={<Database size={18} />} title="Supplier risk database" scope="suppliers.read (read-only)" optional={false}
                  on={conn.db} onChange={(v) => setConn({ ...conn, db: v })} />
                <div className="rounded border border-line p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Folder size={16} className="text-petrol" /> Project documents folder</div>
                  <input className="input mt-2 font-mono text-xs" value={conn.folder} onChange={(e) => setConn({ ...conn, folder: e.target.value })} placeholder="server folder path (optional)" />
                  <div className="mt-2"><DocPicker compact /></div>
                  <div className="mt-1 font-mono text-[10px] text-muted">server path or files from your computer · read by the Document Agent · OCR via Nemotron Parse</div>
                </div>
                <Authorize icon={<Mail size={18} />} title="Email connector (procurement inbox)" scope="mail.read (no sending)"
                  on={conn.email} onChange={(v) => setConn({ ...conn, email: v })} />
                <Authorize icon={<Globe size={18} />} title="Internet search (Tavily)" scope="outbound queries, no internal data"
                  on={conn.web} onChange={(v) => setConn({ ...conn, web: v })} disabled={!app.status?.keys?.tavily}
                  note={app.status?.keys?.tavily ? undefined : "no Tavily key configured"} />
              </section>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
              <div className="font-mono text-[11px] text-muted">{conn.db ? "Ready" : "Authorise the supplier database to continue"}</div>
              <button className="btn btn-primary !px-6 !py-3 text-base" onClick={finish} disabled={gen >= 0 || !conn.db || !draft.name}>
                {gen >= 0 ? <Loader2 size={18} className="animate-spin" /> : p.ui_spec ? <ArrowRight size={18} /> : <Wand2 size={18} />}
                {p.ui_spec ? "Continue" : "Generate my workspace"}</button>
            </div>
            {gen >= 0 && (
              <div className="mt-4 space-y-1.5 rounded-md bg-tint p-4">
                {STEPS.map((s, i) => (
                  <div key={s} className={`flex items-center gap-2 font-mono text-xs ${i <= gen ? "text-petrol" : "text-muted/60"}`}>
                    {i < gen ? <Check size={13} /> : i === gen ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}{s}</div>))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
