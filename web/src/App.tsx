import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bell, Bot, Building2, ChevronDown, ChevronRight, FolderKanban, Home as HomeIcon, LogOut, Mail, Network, Plus, Settings, ShieldCheck, Trash2, X } from "lucide-react";
import { api, type Email, type Persona } from "./api";
import SettingsPage from "./pages/Setup";
import SupplierDive from "./pages/SupplierDive";
import Copilot from "./pages/Copilot";
import Login from "./pages/Login";
import Workspace from "./pages/Workspace";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import Guardrails from "./pages/Guardrails";

export type Page = "login" | "configure" | "home" | "inbox" | "guardrails" | "workspace" | "supplier" | "copilot" | "settings";
export interface UiConfig { per_item: number; panels: string[] }
export interface Project { id: string; name: string; created?: string; messages?: any[]; items?: any[]; eu_only?: boolean; per_item?: number; showed?: boolean; copilot?: any[]; folder?: string }

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
  project: Project | null;
  saveProject: (patch: Partial<Project>) => void;
  projectBubbles: any;
  setProjectBubbles: (b: any) => void;
  projects: Project[];
  saveProjectById: (id: string, patch: Partial<Project>) => void;
  createProject: (p: Partial<Project>, pg?: Page, question?: string) => Promise<void>;
  openProject: (id: string, pg?: Page) => void;
  inbox: Email[];
  refreshInbox: () => Promise<void>;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const SUB: { id: Page; label: string; icon: JSX.Element; needsRequest?: boolean }[] = [
  { id: "copilot", label: "Supervisor chat", icon: <Bot size={15} /> },
  { id: "workspace", label: "Request & dashboards", icon: <Network size={15} /> },
  { id: "supplier", label: "Supplier dashboard", icon: <Building2 size={15} />, needsRequest: true },
];

export const SiemensLogo = ({ white = false, className = "h-5" }: { white?: boolean; className?: string }) => (
  <img src={white ? "/siemens-logo-white.svg" : "/siemens-logo.svg"} alt="Siemens" className={className} />
);

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [projectBubbles, setProjectBubbles] = useState<any>(null);
  const saveTimer = useRef<number>();

  const [inbox, setInbox] = useState<Email[]>([]);
  const [toast, setToast] = useState<Email | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const refreshStatus = () => api.status().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { refreshStatus(); }, []);
  // email connector: poll the inbox, pop a toast for every new unread email
  const refreshInbox = async () => {
    const m = await api.inbox().catch(() => null);
    if (!m) return;
    if (seen.current) { const fresh = m.find((x) => !x.read && !seen.current!.has(x.id)); if (fresh) setToast(fresh); }
    seen.current = new Set(m.map((x) => x.id));
    setInbox(m);
  };
  useEffect(() => {
    if (!persona || (persona as any).connectors?.email === false) { setInbox([]); return; }
    refreshInbox();
    const t = window.setInterval(refreshInbox, 8000);
    return () => window.clearInterval(t);
  }, [persona?.id, (persona as any)?.connectors?.email]);
  const unread = inbox.filter((m) => !m.read).length;

  const project = projects.find((p) => p.id === activeId) ?? null;

  const createProject = async (init: Partial<Project>, pg: Page = "workspace", question?: string) => {
    if (!persona) return;
    const p = await api.saveUserProject(persona.email!, { messages: [], items: [], per_item: config?.per_item ?? 8, ...init });
    setProjects((ps) => [...ps, p]);
    openProject(p.id, pg);
    if (question) setPending(question);
  };
  const openProject = (id: string, pg: Page = "workspace") => {
    setActiveId(id); setExpanded((e) => ({ ...e, [id]: true })); setProjectBubbles(null); setPage(pg);
  };
  const saveProject = (patch: Partial<Project>) => {
    if (!persona || !project) return;
    const next = { ...project, ...patch };
    setProjects((ps) => ps.map((p) => (p.id === next.id ? next : p)));
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => api.saveUserProject(persona.email!, next), 500);
  };

  // used by background work (e.g. a supervisor run) that may finish while another project is open
  const saveProjectById = (id: string, patch: Partial<Project>) => {
    if (!persona) return;
    setProjects((ps) => {
      const cur = ps.find((x) => x.id === id);
      if (!cur) return ps;
      const next = { ...cur, ...patch };
      api.saveUserProject(persona.email!, next);
      return ps.map((x) => (x.id === id ? next : x));
    });
  };

  const updatePersona = async (patch: Partial<Persona>) => {
    if (!persona) return;
    setPersona(await api.savePersona({ ...persona, ...patch }));
  };

  const ctx: Ctx = {
    persona, updatePersona, provider, setProvider, model, setModel, web, setWeb, status, refreshStatus, supplierId,
    signIn: async (p) => {
      setPersona(p);
      const ps = await api.userProjects(p.email!);
      setProjects(ps);
      if (p.ui_config && p.ui_spec) { setConfig(p.ui_config); setSpec(p.ui_spec); }
      setPage("configure");  // always confirm sources, authorisations and model after sign-in
    },
    openSupplier: (id) => { setSupplierId(id); setPage("supplier"); },
    go: setPage,
    askCopilot: (q) => { setPending(q); setPage("copilot"); },
    pendingQuestion, clearPending: () => setPending(null),
    config, spec,
    setWorkspace: (c, s) => {
      setConfig(c); setSpec(s);
      if (persona) api.savePersona({ ...persona, ui_config: c, ui_spec: s }).then(setPersona);
      setPage("home");
    },
    project, saveProject, saveProjectById, projectBubbles, setProjectBubbles, projects, createProject, openProject, inbox, refreshInbox,
  };

  if (page === "login" || page === "configure" || !persona)
    return <AppCtx.Provider value={ctx}><Login configure={page === "configure" && !!persona} /></AppCtx.Provider>;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="flex h-full flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 bg-petrol-dark px-5 text-white">
          <button className="flex items-center gap-2" onClick={() => setPage("home")} title="Home">
            <ShieldCheck className="text-teal-light" size={26} />
            <div className="text-left leading-tight">
              <div className="text-lg font-semibold">SupplyGuard</div>
              <div className="font-mono text-[9px] tracking-[.18em] text-teal-light">PROCUREMENT INTELLIGENCE · RAIL</div>
            </div>
          </button>
          <div className="ml-2 hidden items-center gap-2 border-l border-white/20 pl-4 sm:flex">
            <SiemensLogo white className="h-4" />
            <span className="font-mono text-[9px] tracking-[.14em] text-teal-light">MOBILITY</span>
          </div>
          {project && <div className="ml-6 hidden items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm md:flex"><FolderKanban size={14} />{project.name}</div>}
          <div className="flex-1" />
          <div className="hidden items-center gap-3 font-mono text-[11px] lg:flex">
            {status && (["nebius", "nvidia", "tavily"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${status.keys[k] ? "bg-emerald-400" : "bg-red-400"}`} />{k}</span>
            ))}
          </div>
          <button onClick={() => setPage("guardrails")} title="Security layer: guardrails, Validator Agent, human approval"
            className="hidden items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-emerald-300 hover:bg-emerald-400/20 md:flex">
            <ShieldCheck size={13} /> GUARDRAILS ON</button>
          <button onClick={() => setPage("inbox")} title="Email inbox" className={`relative rounded p-2 hover:bg-white/15 ${page === "inbox" ? "bg-white/20" : ""}`}>
            <Bell size={19} />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit px-1 font-mono text-[10px] font-bold">{unread}</span>}
          </button>
          <button onClick={() => setPage("settings")} title="Settings" className={`rounded p-2 hover:bg-white/15 ${page === "settings" ? "bg-white/20" : ""}`}><Settings size={19} /></button>
          <div className="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal font-semibold">{persona.name[0]}</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{persona.name}</div>
              <div className="font-mono text-[10px] text-teal-light">{persona.role}</div>
            </div>
            <button title="Sign out" className="ml-1 rounded p-1 hover:bg-white/15"
              onClick={() => { setPersona(null); setConfig(null); setSpec(null); setProjects([]); setActiveId(""); setPage("login"); }}><LogOut size={15} /></button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <nav className="flex w-64 shrink-0 flex-col overflow-auto border-r border-line bg-white p-3">
            <button className="btn btn-primary w-full justify-center" onClick={() => setPage("home")}><Plus size={15} /> New project</button>
            <div className="mt-3 space-y-0.5">
              {([["home", "Home", <HomeIcon size={15} />], ["inbox", "Email inbox", <Mail size={15} />], ["guardrails", "Guardrails & approvals", <ShieldCheck size={15} />]] as const).map(([id, label, icon]) => (
                <button key={id} onClick={() => setPage(id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] ${page === id ? "bg-tint-2 font-semibold text-petrol-dark" : "hover:bg-canvas"}`}>
                  {icon}{label}{id === "inbox" && unread > 0 && <span className="ml-auto rounded-full bg-crit px-1.5 font-mono text-[10px] font-bold text-white">{unread}</span>}</button>))}
            </div>
            <div className="label mb-1 mt-4 px-1">My projects ({projects.length})</div>
            {projects.map((p) => {
              const open = expanded[p.id];
              const active = p.id === activeId;
              return (
                <div key={p.id} className={`mb-1 rounded ${active ? "bg-tint" : ""}`}>
                  <div className="group flex items-center">
                    <button className="p-1.5 text-muted" onClick={() => setExpanded((e) => ({ ...e, [p.id]: !open }))}>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
                    <button className={`min-w-0 flex-1 truncate py-2 text-left text-sm ${active ? "font-semibold text-petrol-dark" : ""}`} onClick={() => openProject(p.id)} title={p.name}>
                      <FolderKanban size={14} className="mr-1.5 inline text-petrol" />{p.name}
                    </button>
                    <span className="mr-1 font-mono text-[10px] text-muted">{p.items?.length ?? 0}</span>
                    <button className="mr-1 hidden p-1 text-muted hover:text-crit group-hover:block" title="Delete project"
                      onClick={() => { api.deleteUserProject(persona.email!, p.id); setProjects((ps) => ps.filter((x) => x.id !== p.id)); if (active) setActiveId(""); }}><Trash2 size={13} /></button>
                  </div>
                  {open && (
                    <div className="mb-1 ml-7 border-l border-line pl-2">
                      {SUB.map((s) => {
                        const locked = s.needsRequest && !p.showed;
                        return (
                          <button key={s.id} disabled={locked} title={locked ? "Available once the request chat is complete" : ""} onClick={() => openProject(p.id, s.id)}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] ${locked ? "cursor-not-allowed text-muted/50" : active && page === s.id ? "bg-tint-2 font-semibold text-petrol-dark" : "text-slate-ink hover:bg-canvas"}`}>
                            {s.icon}{s.label}</button>);
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {!projects.length && <p className="px-1 text-xs text-muted">No projects yet. Start one from Home.</p>}
            <div className="flex-1" />
            <div className="mt-4 rounded bg-tint p-3">
              <div className="label flex items-center justify-between">Shared docs <span className="h-2 w-2 rounded-full bg-petrol" /></div>
              <div className="mt-1 font-mono text-sm">{status?.docs ?? 0} files extracted</div>
              <div className="text-xs text-muted">Model: {model.split("/").pop()}</div>
            </div>
          </nav>
          <main className="relative min-w-0 flex-1 overflow-auto">
            {page === "home" && <Home />}
            {page === "inbox" && <Inbox />}
            {page === "guardrails" && <Guardrails />}
            {page === "workspace" && (spec && project ? <Workspace key={project.id} /> :
              <div className="flex h-full flex-col items-center justify-center text-muted"><FolderKanban size={40} className="text-line-strong" />
                <p className="mt-2">Open a project or start one from Home.</p></div>)}
            {page === "settings" && <SettingsPage />}
            {page === "supplier" && <SupplierDive />}
            {page === "copilot" && <Copilot key={project?.id ?? "none"} />}
          </main>
          {toast && (
            <div className="fixed bottom-5 right-5 z-50 w-96 rounded-md border-l-4 border-crit bg-white p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-crit" />
                <div className="min-w-0 flex-1">
                  <div className="label !text-crit">New email · email connector</div>
                  <div className="mt-0.5 text-sm font-semibold">{toast.subject}</div>
                  <div className="truncate font-mono text-[11px] text-muted">{toast.from}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-primary !py-1 text-xs" onClick={() => { setToast(null); setPage("inbox"); }}>Open &amp; analyse</button>
                    <button className="btn btn-ghost !py-1 text-xs" onClick={() => setToast(null)}>Later</button>
                  </div>
                </div>
                <button onClick={() => setToast(null)} className="text-muted"><X size={15} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppCtx.Provider>
  );
}
