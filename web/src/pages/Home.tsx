import { useEffect, useState } from "react";
import { ArrowRight, Bot, Database, FileSearch, Folder, FolderKanban, Globe, Mail, Send, Sparkles, TrainFront, X, Zap } from "lucide-react";
import { api } from "../api";
import { SiemensLogo, useApp, type Page, type Project } from "../App";
import { Tag } from "../components/ui";

type Example = { title: string; hint: string; icon: JSX.Element; tag: string; project: Partial<Project>; page: Page; question?: string; email?: string };

const bot = (text: string) => [{ role: "bot", text, chips: ["Show suppliers", "EU suppliers only", "Add more items"] }];

const EXAMPLES: Example[] = [
  {
    title: "RegioFlex EMU · brakes & bogies 2027", tag: "Items → suppliers", icon: <TrainFront size={18} />, page: "workspace",
    hint: "240 brake control units and 480 bogie frames for March 2027, with supplier risk per item.",
    project: {
      name: "RegioFlex brakes & bogies 2027", showed: true,
      items: [{ item: "Brake control unit BCU-7", category: "Brake systems", quantity: 240, needed_by: "2027-03" },
        { item: "Bogie frame", category: "Bogies & wheelsets", quantity: 480, needed_by: "2027-03" }],
      messages: bot("Example project loaded: 2 items for RegioFlex. The supplier tree is on the right."),
    },
  },
  {
    title: "ICX-300 · doors, HVAC & traction", tag: "Items → suppliers", icon: <TrainFront size={18} />, page: "workspace",
    hint: "Door drive units, HVAC roof units and traction converters for the high-speed fleet.",
    project: {
      name: "ICX-300 doors, HVAC & traction", showed: true,
      items: [{ item: "Door drive unit DDU-4", category: "Doors & access systems", quantity: 960 },
        { item: "HVAC roof unit", category: "HVAC", quantity: 120 },
        { item: "Traction converter", category: "Traction & propulsion", quantity: 60 }],
      messages: bot("Example project loaded: 3 items for ICX-300. The supplier tree is on the right."),
    },
  },
  {
    title: "Supplier delay alert by email", tag: "Email connector", icon: <Mail size={18} />, page: "inbox", email: "brake_delay",
    hint: "Your recommended brake supplier emails a 6-week delay. The agent reads it and recalculates the risk.",
    project: {
      name: "RegioFlex brakes (delay alert demo)", showed: true,
      items: [{ item: "Brake control unit BCU-7", category: "Brake systems", quantity: 240, needed_by: "2027-03" }],
      messages: bot("Example project loaded: brake control units for RegioFlex."),
    },
  },
  {
    title: "Ask the supervisor", tag: "Agents + tools", icon: <Bot size={18} />, page: "copilot",
    hint: "Which suppliers should I worry about this week? The supervisor picks data, documents, email and web tools.",
    project: { name: "Weekly risk check" }, question: "Which suppliers should I worry about this week, and why?",
  },
];

export default function Home() {
  const app = useApp();
  const p = app.persona;
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("");
  const [browse, setBrowse] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (app.status?.folder && !folder) setFolder(app.status.folder); }, [app.status]);
  const openBrowse = async (path?: string) => setBrowse(await api.fs(path ?? folder));

  const indexFolder = (f: string) => {
    // document agent reads this folder; extraction (incl. OCR) runs in the background
    if (f && f !== app.status?.folder) api.extract(f, app.provider, "nvidia/nemotron-parse").then(app.refreshStatus).catch(() => undefined);
  };

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true);
    indexFolder(folder);
    try { await app.createProject({ name: name.trim() || q.trim().slice(0, 48), folder }, "copilot", q.trim()); }
    finally { setBusy(false); }
  };

  const example = async (x: Example) => {
    setBusy(true);
    try {
      if (x.email) await api.simulateEmail(x.email);
      await app.createProject({ ...x.project, folder: app.status?.folder }, x.page, x.question);
      if (x.email) await app.refreshInbox();
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <section className="text-center">
        <div className="flex items-center justify-center gap-3 text-muted">
          <SiemensLogo className="h-5" /><span className="font-mono text-[10px] tracking-[.18em]">MOBILITY · SUPPLYGUARD</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Hi {p?.name.split(" ")[0]}, what do you need today?</h1>
        <p className="mt-2 text-muted">Ask the SupplyGuard supervisor. It calls the right agents and tools: supplier data, your documents, the email inbox and the web.</p>

        <form onSubmit={start} className="card mx-auto mt-6 max-w-3xl p-3 text-left shadow-md focus-within:border-petrol focus-within:ring-1 focus-within:ring-petrol">
          <textarea autoFocus rows={3} value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(); } }}
            placeholder="e.g. I need 240 brake control units for RegioFlex by March 2027. Who should I buy from, and did any supplier report a delay?"
            className="w-full resize-none border-0 p-2 text-base outline-none focus:shadow-none" />
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <label className="flex min-w-[180px] flex-1 items-center gap-1.5 rounded border border-line px-2">
              <FolderKanban size={14} className="text-petrol" />
              <input className="h-8 w-full text-sm outline-none" placeholder="Project name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex min-w-[240px] flex-[1.4] items-center gap-1.5 rounded border border-line px-2">
              <Folder size={14} className="text-petrol" />
              <input className="h-8 w-full font-mono text-xs outline-none" placeholder="Project folder path" value={folder} onChange={(e) => setFolder(e.target.value)} title="Documents in this folder are read by the Document Agent" />
              <button type="button" className="text-xs font-semibold text-petrol hover:underline" onClick={() => openBrowse()}>Browse</button>
            </label>
            <button className="btn btn-primary !px-5 !py-2" disabled={!q.trim() || busy}><Send size={15} /> Ask</button>
          </div>
        </form>
        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">
          {(p?.questions ?? []).map((x) => (
            <button key={x} onClick={() => setQ(x)} className="rounded-full border border-line-strong bg-white px-3 py-1 text-xs hover:border-petrol hover:text-petrol">{x}</button>))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2"><Zap size={16} className="text-petrol" /><h2 className="font-semibold">Start from an example</h2>
          <span className="text-xs text-muted">one click, ready for a demo</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXAMPLES.map((x) => (
            <button key={x.title} disabled={busy} onClick={() => example(x)}
              className="card group flex flex-col p-4 text-left transition hover:border-petrol hover:shadow-md disabled:opacity-60">
              <div className="flex items-center justify-between"><span className="text-petrol">{x.icon}</span><Tag>{x.tag}</Tag></div>
              <div className="mt-2 font-semibold leading-snug">{x.title}</div>
              <p className="mt-1 flex-1 text-xs text-muted">{x.hint}</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-petrol">Open <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
            </button>))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <h2 className="mb-3 font-semibold">Your projects ({app.projects.length})</h2>
          {!app.projects.length && <p className="text-sm text-muted">No projects yet. Ask a question above or open an example.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {[...app.projects].reverse().map((x) => (
              <button key={x.id} onClick={() => app.openProject(x.id, x.items?.length ? "workspace" : "copilot")} className="card flex items-center gap-3 p-3 text-left hover:border-petrol">
                <FolderKanban size={18} className="shrink-0 text-petrol" />
                <div className="min-w-0"><div className="truncate text-sm font-semibold">{x.name}</div>
                  <div className="truncate font-mono text-[10px] text-muted">{x.items?.length ?? 0} items{x.folder ? ` · ${x.folder}` : ""}</div></div>
              </button>))}
          </div>
        </section>
        <section className="card p-4">
          <div className="label mb-2">Connected tools (supervisor)</div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Database size={14} className="text-petrol" /> Supplier data · 10,000 suppliers</li>
            <li className="flex items-center gap-2"><FileSearch size={14} className="text-petrol" /> Documents · {app.status?.docs ?? 0} files</li>
            <li className="flex items-center gap-2"><Mail size={14} className="text-petrol" /> Email inbox · {app.inbox.filter((m) => !m.read).length} unread <Tag tone="sim">simulated</Tag></li>
            <li className="flex items-center gap-2"><Globe size={14} className="text-petrol" /> Web search {app.web && app.status?.keys?.tavily ? "on" : "off"}</li>
          </ul>
          <button className="btn btn-ghost mt-3 w-full justify-center text-xs" onClick={async () => { await api.simulateEmail("brake_delay"); app.refreshInbox(); }}>
            <Sparkles size={13} /> Simulate incoming supplier email</button>
        </section>
      </div>

      {browse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-ink/40 backdrop-blur-[2px]" onClick={() => setBrowse(null)}>
          <div className="card w-[640px] max-w-[92vw] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Choose the project folder</h3>
              <button onClick={() => setBrowse(null)}><X size={18} /></button></div>
            <div className="mt-2 rounded bg-canvas p-2 font-mono text-xs">{browse.path}</div>
            <div className="mt-3 grid max-h-72 grid-cols-2 gap-1 overflow-auto">
              <button className="btn btn-ghost justify-start" onClick={() => openBrowse(browse.parent)}>.. up</button>
              {browse.dirs.map((d: string) => (
                <button key={d} className="btn btn-ghost justify-start truncate" onClick={() => openBrowse(`${browse.path}/${d}`)}><Folder size={14} />{d}</button>))}
            </div>
            <p className="mt-3 text-xs text-muted">{browse.file_count} supported files in this folder (incl. subfolders)</p>
            <div className="mt-3 flex justify-end">
              <button className="btn btn-primary" onClick={() => { setFolder(browse.path); setBrowse(null); }}>Use this folder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
