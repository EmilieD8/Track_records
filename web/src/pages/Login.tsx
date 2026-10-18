import { useEffect, useState } from "react";
import { Check, Loader2, LogIn, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { api } from "../api";
import { SiemensLogo, useApp, type UiConfig } from "../App";

const PANELS: { id: string; label: string; hint: string }[] = [
  { id: "bubbles", label: "Item bubbles", hint: "items → suppliers that can deliver them → risk" },
  { id: "recommendations", label: "Buying recommendations", hint: "who to buy from, who to avoid" },
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

  // demo: pre-fill the first profile so "Sign in" works without typing
  useEffect(() => { api.demoAccounts().then((all) => {
    const a = [...all].sort((x, y) => Number(y.email.startsWith("lena")) - Number(x.email.startsWith("lena"))); // demo persona first
    setAccounts(a); if (a[0]) { setEmail((e) => e || a[0].email); setPassword((x) => x || "demo"); } }); }, []);
  useEffect(() => { if (p?.ui_config) setCfg({ per_item: p.ui_config.per_item ?? 8, panels: p.ui_config.panels ?? PANELS.map((x) => x.id) }); }, [p?.id]);

  const signIn = async (e?: React.FormEvent, as = email) => {
    e?.preventDefault();
    setErr("");
    try { app.signIn(await api.login(as)); } catch { setErr("Unknown account. Use one of the demo accounts below."); }
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
        <div className="flex items-center gap-3"><span className="font-mono text-[10px] tracking-[.18em] text-teal-light/80">PROJECT SPONSOR</span><SiemensLogo white className="h-6" /></div>
        <div className="font-mono text-[11px] text-teal-light/70">10,000 suppliers · €20.4 bn spend · 18 risk signals per supplier</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="card w-full max-w-xl p-8">
          {!configure && (
            <form onSubmit={signIn}>
              <div className="flex items-center justify-between"><div className="label">Sign in</div><SiemensLogo className="h-4" /></div>
              <h2 className="mt-1 text-2xl font-semibold">Welcome to SupplyGuard</h2>
              <div className="label mb-2 mt-5">Choose your profile · one click</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.map((a) => (
                  <button type="button" key={a.email} onClick={() => signIn(undefined, a.email)}
                    className="group flex items-center gap-3 rounded-md border border-line p-3 text-left transition hover:border-petrol hover:bg-tint">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol font-semibold text-white">{a.name[0]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      <div className="truncate text-[11px] text-muted">{a.role}</div>
                      <div className="truncate font-mono text-[10px] text-muted">{a.email}</div>
                    </div>
                    <LogIn size={15} className="shrink-0 text-muted group-hover:text-petrol" />
                  </button>))}
              </div>
              <div className="mt-5 flex items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-line" />or sign in with email<span className="h-px flex-1 bg-line" /></div>
              <label className="mt-3 block"><span className="label">Work email</span>
                <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="firstname.lastname@railco.eu" /></label>
              <label className="mt-3 block"><span className="label">Password</span>
                <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="any value in this demo" /></label>
              {err && <div className="mt-2 text-sm text-crit">{err}</div>}
              <button className="btn btn-primary mt-5 w-full justify-center !py-2.5" disabled={!email}><LogIn size={16} /> Sign in</button>
              <p className="mt-3 text-center font-mono text-[10px] text-muted">Prototype: no real authentication</p>
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
