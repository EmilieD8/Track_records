import { createContext, useContext, useEffect, useState } from "react";
import { BarChart3, Bot, Building2, LayoutGrid, LogOut, Settings, ShieldCheck } from "lucide-react";
import { api, type Persona } from "./api";
import SettingsPage from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import SupplierDive from "./pages/SupplierDive";
import Copilot from "./pages/Copilot";
import Login from "./pages/Login";
import Workspace from "./pages/Workspace";

export type Page = "login" | "configure" | "workspace" | "dashboard" | "supplier" | "copilot" | "settings";
export interface UiConfig { project: string; per_item: number; panels: string[] }

interface Ctx {
  persona: Persona | null;
  signIn: (p: Persona) => void;
  updatePersona: (patch: Partial<Persona>) => Promise<void>;
  provider: string;
  setProvider: (p: string) => void;
  model: string;
  setModel: (m: string) => void;
  web: boolean;
  setWeb: (b: boolean) => void;
  status: any;
  refreshStatus: () => void;
  supplierId: string;
  openSupplier: (id: string) => void;
  go: (p: Page) => void;
  askCopilot: (q: string) => void;
  pendingQuestion: string | null;
  clearPending: () => void;
  config: UiConfig | null;
  spec: any;
  setWorkspace: (c: UiConfig, s: any) => void;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const NAV: { id: Page; label: string; icon: JSX.Element }[] = [
  { id: "workspace", label: "Project Mind Map", icon: <LayoutGrid size={17} /> },
  { id: "dashboard", label: "Risk Dashboard", icon: <BarChart3 size={17} /> },
  { id: "supplier", label: "Supplier Deep Dive", icon: <Building2 size={17} /> },
  { id: "copilot", label: "AI Copilot Chat", icon: <Bot size={17} /> },
];

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [config, setConfig] = useState<UiConfig | null>(null);
  const [spec, setSpec] = useState<any>(null);
  const [provider, setProvider] = useState("NVIDIA API (build.nvidia.com)");
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b");
  const [web, setWeb] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [supplierId, setSupplierId] = useState("SUPP_09733");
  const [pendingQuestion, setPending] = useState<string | null>(null);

  const refreshStatus = () => api.status().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { refreshStatus(); }, []);

  const updatePersona = async (patch: Partial<Persona>) => {
    if (!persona) return;
    const saved = await api.savePersona({ ...persona, ...patch });
    setPersona(saved);
  };

  const ctx: Ctx = {
    persona, updatePersona, provider, setProvider, model, setModel, web, setWeb, status, refreshStatus, supplierId,
    signIn: (p) => {
      setPersona(p);
      if (p.ui_config?.project && p.ui_spec) { setConfig(p.ui_config); setSpec(p.ui_spec); setPage("workspace"); }
      else setPage("configure");
    },
    openSupplier: (id) => { setSupplierId(id); setPage("supplier"); },
    go: setPage,
    askCopilot: (q) => { setPending(q); setPage("copilot"); },
    pendingQuestion, clearPending: () => setPending(null),
    config, spec,
    setWorkspace: (c, s) => {
      setConfig(c); setSpec(s); setPage("workspace");
      if (persona) api.savePersona({ ...persona, ui_config: c, ui_spec: s }).then(setPersona);
    },
  };

  if (page === "login" || page === "configure" || !persona)
    return <AppCtx.Provider value={ctx}><Login configure={page === "configure" && !!persona} /></AppCtx.Provider>;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="flex h-full flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 bg-petrol-dark px-5 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-teal-light" size={26} />
            <div className="leading-tight">
              <div className="text-lg font-semibold">SupplyGuard</div>
              <div className="font-mono text-[9px] tracking-[.18em] text-teal-light">PROCUREMENT INTELLIGENCE · RAIL</div>
            </div>
          </div>
          {config && <div className="ml-6 hidden rounded bg-white/10 px-3 py-1.5 font-mono text-xs md:block">Project {config.project}</div>}
          <div className="flex-1" />
          <div className="hidden items-center gap-3 font-mono text-[11px] lg:flex">
            {status && (["nebius", "nvidia", "tavily"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${status.keys[k] ? "bg-emerald-400" : "bg-red-400"}`} />{k}</span>
            ))}
          </div>
          <button onClick={() => setPage("settings")} title="Settings"
            className={`rounded p-2 hover:bg-white/15 ${page === "settings" ? "bg-white/20" : ""}`}><Settings size={19} /></button>
          <div className="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal font-semibold">{persona.name[0]}</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{persona.name}</div>
              <div className="font-mono text-[10px] text-teal-light">{persona.role}</div>
            </div>
            <button title="Sign out" className="ml-1 rounded p-1 hover:bg-white/15"
              onClick={() => { setPersona(null); setConfig(null); setSpec(null); setPage("login"); }}><LogOut size={15} /></button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <nav className="flex w-60 shrink-0 flex-col border-r border-line bg-white p-3">
            <div className="label mb-2 px-2 pt-2">Analytical modules</div>
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setPage(n.id)}
                className={`mb-1 flex items-center gap-3 rounded px-3 py-2.5 text-left text-sm ${page === n.id ? "bg-tint-2 font-semibold text-petrol-dark" : "text-slate-ink hover:bg-canvas"}`}>
                {n.icon}{n.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="rounded bg-tint p-3">
              <div className="label flex items-center justify-between">Shared docs <span className="h-2 w-2 rounded-full bg-petrol" /></div>
              <div className="mt-1 font-mono text-sm">{status?.docs ?? 0} files extracted</div>
              <div className="text-xs text-muted">Model: {model.split("/").pop()}</div>
            </div>
          </nav>
          <main className="min-w-0 flex-1 overflow-auto">
            {page === "workspace" && (spec ? <Workspace /> : <div className="p-8 text-muted">Generate your UI first.</div>)}
            {page === "settings" && <SettingsPage />}
            {page === "dashboard" && <Dashboard />}
            {page === "supplier" && <SupplierDive />}
            {page === "copilot" && <Copilot />}
          </main>
        </div>
      </div>
    </AppCtx.Provider>
  );
}
