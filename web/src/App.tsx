import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Bot, Building2, ChevronDown, ChevronRight, FolderKanban, LogOut, MessagesSquare, Plus, Settings, ShieldCheck, Trash2 } from "lucide-react";
import { api, type Persona } from "./api";
import SettingsPage from "./pages/Setup";
import SupplierDive from "./pages/SupplierDive";
import Copilot from "./pages/Copilot";
import Login from "./pages/Login";
import Workspace from "./pages/Workspace";

export type Page = "login" | "configure" | "workspace" | "supplier" | "copilot" | "settings";
export interface UiConfig { per_item: number; panels: string[] }
export interface Project { id: string; name: string; created?: string; messages?: any[]; items?: any[]; eu_only?: boolean; per_item?: number; showed?: boolean; copilot?: any[] }

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
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const SUB: { id: Page; label: string; icon: JSX.Element; needsRequest?: boolean }[] = [
  { id: "workspace", label: "Request & dashboards", icon: <MessagesSquare size={15} /> },
  { id: "supplier", label: "Supplier dashboard", icon: <Building2 size={15} />, needsRequest: true },
  { id: "copilot", label: "AI copilot", icon: <Bot size={15} /> },
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState<string | null>(null);
  const [projectBubbles, setProjectBubbles] = useState<any>(null);
  const saveTimer = useRef<number>();

  const refreshStatus = () => api.status().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { refreshStatus(); }, []);

  const project = projects.find((p) => p.id === activeId) ?? null;

  const createProject = async (name: string) => {
    if (!persona) return;
    const p = await api.saveUserProject(persona.email!, { name, messages: [], items: [], per_item: config?.per_item ?? 8 });
    setProjects((ps) => [...ps, p]);
    openProject(p.id);
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
      if (p.ui_config && p.ui_spec) {
        setConfig(p.ui_config); setSpec(p.ui_spec);
        if (ps.length) openProject(ps[ps.length - 1].id); else { setPage("workspace"); setNewName(""); }
      } else setPage("configure");
    },
    openSupplier: (id) => { setSupplierId(id); setPage("supplier"); },
    go: setPage,
    askCopilot: (q) => { setPending(q); setPage("copilot"); },
    pendingQuestion, clearPending: () => setPending(null),
    config, spec,
    setWorkspace: (c, s) => {
      setConfig(c); setSpec(s);
      if (persona) api.savePersona({ ...persona, ui_config: c, ui_spec: s }).then(setPersona);
      if (projects.length) openProject(activeId || projects[projects.length - 1].id); else { setPage("workspace"); setNewName(""); }
    },
    project, saveProject, projectBubbles, setProjectBubbles,
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
          {project && <div className="ml-6 hidden items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm md:flex"><FolderKanban size={14} />{project.name}</div>}
          <div className="flex-1" />
          <div className="hidden items-center gap-3 font-mono text-[11px] lg:flex">
            {status && (["nebius", "nvidia", "tavily"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${status.keys[k] ? "bg-emerald-400" : "bg-red-400"}`} />{k}</span>
            ))}
          </div>
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
            <button className="btn btn-primary w-full justify-center" onClick={() => setNewName("")}><Plus size={15} /> New project</button>
            {newName !== null && (
              <form className="mt-2 rounded border border-petrol p-2" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { createProject(newName.trim()); setNewName(null); } }}>
                <input autoFocus className="input !h-8 text-sm" placeholder="Project name, e.g. RegioFlex brakes 2027" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => setNewName(null)}>Cancel</button>
                  <button className="btn btn-primary !py-1 text-xs" disabled={!newName.trim()}>Create</button>
                </div>
              </form>
            )}
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
            {!projects.length && <p className="px-1 text-xs text-muted">No projects yet. Create one to start a procurement chat.</p>}
            <div className="flex-1" />
            <div className="mt-4 rounded bg-tint p-3">
              <div className="label flex items-center justify-between">Shared docs <span className="h-2 w-2 rounded-full bg-petrol" /></div>
              <div className="mt-1 font-mono text-sm">{status?.docs ?? 0} files extracted</div>
              <div className="text-xs text-muted">Model: {model.split("/").pop()}</div>
            </div>
          </nav>
          <main className="min-w-0 flex-1 overflow-auto">
            {page === "workspace" && (spec && project ? <Workspace key={project.id} /> :
              <div className="flex h-full flex-col items-center justify-center text-muted"><FolderKanban size={40} className="text-line-strong" />
                <p className="mt-2">Create a project with "New project" to start.</p></div>)}
            {page === "settings" && <SettingsPage />}
            {page === "supplier" && <SupplierDive />}
            {page === "copilot" && <Copilot key={project?.id ?? "none"} />}
          </main>
        </div>
      </div>
    </AppCtx.Provider>
  );
}
