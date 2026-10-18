import { useEffect, useState } from "react";
import { Check, Loader2, LogIn, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { api } from "../api";
import { useApp, type UiConfig } from "../App";

const PANELS: { id: string; label: string; hint: string }[] = [
  { id: "bubbles", label: "Item bubbles", hint: "items → suppliers that can deliver them → risk" },
  { id: "recommendations", label: "Buying recommendations", hint: "who to buy from, who to avoid" },
    { id: "kpis", label: "KPI strip", hint: "spend, exposure, priority, hidden risks" },
  { id: "copilot", label: "AI copilot shortcut", hint: "ask the agents about this view" },
];
const STEPS = ["Loading your profile", "Selecting risk signals for your role", "Nemotron is designing your layout", "Preparing your projects"];

export default function Login({ configure }: { configure: boolean }) {
  const app = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cfg, setCfg] = useState<UiConfig>({ per_item: 8, panels: PANELS.map((p) => p.id) });
  const [gen, setGen] = useState(-1);
  const p = app.persona;

  useEffect(() => { api.demoAccounts().then(setAccounts); }, []);
  useEffect(() => { if (p?.ui_config) setCfg({ per_item: p.ui_config.per_item ?? 8, panels: p.ui_config.panels ?? PANELS.map((x) => x.id) }); }, [p?.id]);

  const signIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr("");
    try { app.signIn(await api.login(email)); } catch { setErr("Unknown account. Use one of the demo accounts below."); }
  };

  const generate = async () => {
    if (!p) return;
    setGen(0);
    const tick = setInterval(() => setGen((g) => Math.min(STEPS.length - 1, g + 1)), 900);
    try {
      const spec = await api.generateUi({ persona: p, config: { ...cfg, categories: [] }, model: app.model, provider: app.provider });
      app.setWorkspace(cfg, spec);
    } finally { clearInterval(tick); setGen(-1); }
  };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="flex min-h-full bg-gradient-to-br from-petrol-dark via-[#00545c] to-slate-ink">
      <div className="hidden w-[38%] flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3"><ShieldCheck size={34} className="text-teal-light" />
          <div><div className="text-2xl font-semibold">SupplyGuard</div><div className="font-mono text-[10px] tracking-[.2em] text-teal-light">PROCUREMENT INTELLIGENCE · RAIL</div></div></div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">See supplier risk early.<br />Switch suppliers in time.</h1>
          <p className="mt-4 max-w-md text-teal-light">Agents on NVIDIA Nemotron read your supplier data, documents (Nemotron Parse OCR) and the web (Tavily), then build a workspace for your role.</p>
        </div>
        <div className="font-mono text-[11px] text-teal-light/70">10,000 suppliers · €20.4 bn spend · 18 risk signals per supplier</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="card w-full max-w-xl p-8">
          {!configure && (
            <form onSubmit={signIn}>
              <div className="label">Sign in</div>
              <h2 className="mt-1 text-2xl font-semibold">Welcome to SupplyGuard</h2>
              <label className="mt-6 block"><span className="label">Work email</span>
                <input className="input mt-1" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="firstname.lastname@railco.eu" /></label>
              <label className="mt-3 block"><span className="label">Password</span>
                <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="any value in this demo" /></label>
              {err && <div className="mt-2 text-sm text-crit">{err}</div>}
              <button className="btn btn-primary mt-5 w-full justify-center !py-2.5" disabled={!email}><LogIn size={16} /> Sign in</button>
              <div className="mt-6 rounded bg-canvas p-3">
                <div className="label mb-1.5">Demo accounts (prototype: no real authentication)</div>
                {accounts.map((a) => (
                  <button type="button" key={a.email} onClick={() => setEmail(a.email)} className="flex w-full justify-between py-0.5 text-left font-mono text-[11px] hover:text-petrol">
                    <span>{a.email}</span><span className="text-muted">{a.role}</span></button>))}
              </div>
            </form>
          )}

          {configure && p && (
            <>
              <div className="label">Configure your UI</div>
              <h2 className="mt-1 text-2xl font-semibold">Hi {p.name.split(" ")[0]}, how should your workspace look?</h2>
              <p className="text-sm text-muted">{p.role} · {p.department}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div><div className="label mb-1">Suppliers shown per item: {cfg.per_item}</div>
                  <input type="range" min={3} max={15} value={cfg.per_item} onChange={(e) => setCfg({ ...cfg, per_item: +e.target.value })} className="w-full accent-[#00646e]" /></div>
                <div><div className="label mb-2">Panels</div>
                  {PANELS.map((x) => (
                    <label key={x.id} className="mb-1.5 flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1 accent-[#00646e]" checked={cfg.panels.includes(x.id)} onChange={() => setCfg({ ...cfg, panels: toggle(cfg.panels, x.id) })} />
                      <span>{x.label}<span className="block text-[11px] text-muted">{x.hint}</span></span></label>))}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
                <div className="font-mono text-[11px] text-muted">Layout generated by {app.model.split("/").pop()}</div>
                <button className="btn btn-primary !px-6 !py-3 text-base" onClick={generate} disabled={gen >= 0}>
                  {gen >= 0 ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />} Generate my UI</button>
              </div>
              {gen >= 0 && (
                <div className="mt-4 space-y-1.5 rounded-md bg-tint p-4">
                  {STEPS.map((s, i) => (
                    <div key={s} className={`flex items-center gap-2 font-mono text-xs ${i <= gen ? "text-petrol" : "text-muted/60"}`}>
                      {i < gen ? <Check size={13} /> : i === gen ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}{s}</div>))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
