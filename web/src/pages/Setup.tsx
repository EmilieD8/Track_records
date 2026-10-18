import { useEffect, useState } from "react";
import { CheckCircle2, FileSearch, Folder, FolderOpen, Globe, Loader2, ScanText, UserCog, Wand2, X } from "lucide-react";
import { api, type Persona } from "../api";
import { useApp } from "../App";
import { Card, Tag } from "../components/ui";

const SENIORITY = ["Junior Buyer", "Senior Buyer / Lead Specialist", "Category Manager", "Head of Procurement", "Executive"];

export default function Setup() {
  const app = useApp();
  const { persona } = app;
  const [draft, setDraft] = useState<Persona | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [browse, setBrowse] = useState<any | null>(null);
  const [ocrProvider, setOcrProvider] = useState("NVIDIA API (build.nvidia.com)");
  const [ocrModel, setOcrModel] = useState("nvidia/nemotron-parse");
  const [docs, setDocs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (persona) setDraft({ ...persona }); }, [persona?.id]);
  useEffect(() => { api.models(app.provider).then((r) => { setModels(r.models); if (!r.models.includes(app.model)) app.setModel(r.models[0]); }); }, [app.provider]);
  useEffect(() => { if (app.status && !folder) setFolder(app.status.folder); api.docs().then(setDocs); }, [app.status]);

  const [saved, setSaved] = useState(false);
  const save = async () => {
    if (!draft) return;
    await app.updatePersona(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const extract = async () => {
    setBusy(true);
    try { setDocs(await api.extract(folder, ocrProvider, ocrModel)); app.refreshStatus(); } finally { setBusy(false); }
  };
  const openBrowse = async (p?: string) => setBrowse(await api.fs(p ?? folder));

  const field = (k: keyof Persona, label: string, ph = "") => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input mt-1" value={(draft?.[k] as string) ?? ""} placeholder={ph}
        onChange={(e) => setDraft((d) => (d ? { ...d, [k]: e.target.value } : d))} />
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <div className="label">Settings</div>
        <h1 className="text-3xl font-bold tracking-tight">Your profile, data sources and model</h1>
      </div>

      <Card title="Your profile" icon={<UserCog size={18} />} right={<span className="font-mono text-xs text-muted">{persona?.email}</span>}>
        {draft && (
          <div className="grid gap-4 md:grid-cols-2">
            {field("name", "Name")}
            {field("role", "Role", "e.g. Category Manager Signalling")}
            <label className="block">
              <span className="label">Seniority level</span>
              <select className="input mt-1" value={draft.seniority ?? ""} onChange={(e) => setDraft({ ...draft, seniority: e.target.value })}>
                <option value="">–</option>{SENIORITY.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            {field("department", "Department / procurement focus area")}
            {field("focus", "What you care about", "e.g. delivery, alternatives, ESG")}
            {field("style", "Answer style")}
            <label className="block md:col-span-2">
              <span className="label">Notes for the assistant (added to the system prompt)</span>
              <textarea className="mt-1 h-24 w-full rounded border border-line-strong p-2 text-sm" value={draft.notes}
                placeholder="e.g. We re-tender brake suppliers in Q1. Prefer EU suppliers. Never recommend suppliers without IRIS certification."
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </label>
            <div className="flex justify-end gap-2 md:col-span-2">
              <button className="btn btn-ghost" onClick={() => app.go("configure")}><Wand2 size={15} /> Reconfigure &amp; regenerate my UI</button>
              <button className="btn btn-primary" onClick={save} disabled={!draft.name || !draft.role}>
                <CheckCircle2 size={15} /> {saved ? "Saved" : "Save profile"}</button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="2 · Shared documents" icon={<FolderOpen size={18} />} right={<Tag>NVIDIA OCR</Tag>}>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" value={folder} onChange={(e) => setFolder(e.target.value)} />
            <button className="btn btn-ghost" onClick={() => openBrowse()}><Folder size={14} /> Browse</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label><span className="label">OCR provider</span>
              <select className="input mt-1" value={ocrProvider} onChange={(e) => setOcrProvider(e.target.value)}>
                {(app.status?.providers ?? []).map((p: string) => <option key={p}>{p}</option>)}
              </select></label>
            <label><span className="label">Extractor model</span>
              <select className="input mt-1" value={ocrModel} onChange={(e) => setOcrModel(e.target.value)}>
                {(app.status?.ocr_models ?? []).map((m: string) => <option key={m}>{m}</option>)}
              </select></label>
          </div>
          <p className="mt-2 text-xs text-muted">Text PDFs, DOCX, TXT/MD/CSV are read directly; images and scanned PDFs go through NVIDIA Nemotron Parse.</p>
          <button className="btn btn-primary mt-3" onClick={extract} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={15} /> : <ScanText size={15} />} {busy ? "Extracting…" : "Extract folder"}
          </button>
          {docs.length > 0 && (
            <div className="mt-4 max-h-64 overflow-auto rounded border border-line">
              <table className="grid-table w-full">
                <thead><tr><th>File</th><th>Method</th><th className="text-right">Chars</th></tr></thead>
                <tbody>{docs.map((d) => (
                  <tr key={d.path}><td className="max-w-[220px] truncate" title={d.path}>{d.name}</td>
                    <td>{d.method.startsWith("OCR") ? <Tag tone="dark">OCR</Tag> : <span className="font-mono text-xs text-muted">{d.method}</span>}{d.error && <span className="ml-1 text-crit">!</span>}</td>
                    <td className="text-right font-mono">{d.chars.toLocaleString()}</td></tr>))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="3 · Model & internet" icon={<FileSearch size={18} />} right={<Tag>Nemotron</Tag>}>
          <label className="block"><span className="label">Provider</span>
            <select className="input mt-1" value={app.provider} onChange={(e) => app.setProvider(e.target.value)}>
              {(app.status?.providers ?? []).map((p: string) => <option key={p}>{p}</option>)}
            </select></label>
          <label className="mt-3 block"><span className="label">Model</span>
            <select className="input mt-1 font-mono text-xs" value={app.model} onChange={(e) => app.setModel(e.target.value)}>
              {models.map((m) => <option key={m}>{m}</option>)}
            </select></label>
          <label className="mt-4 flex items-center gap-3 rounded border border-line p-3">
            <input type="checkbox" className="h-4 w-4 accent-[#00646e]" checked={app.web} onChange={(e) => app.setWeb(e.target.checked)} disabled={!app.status?.keys.tavily} />
            <Globe size={16} className="text-petrol" />
            <div><div className="text-sm font-semibold">Internet search (Tavily)</div>
              <div className="text-xs text-muted">Web agent adds live news on regions, commodities, regulation</div></div>
          </label>

        </Card>
      </div>

      {browse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-ink/40 backdrop-blur-[2px]" onClick={() => setBrowse(null)}>
          <div className="card w-[640px] max-w-[92vw] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Choose a shared folder</h3>
              <button onClick={() => setBrowse(null)}><X size={18} /></button></div>
            <div className="mt-2 rounded bg-canvas p-2 font-mono text-xs">{browse.path}</div>
            <div className="mt-3 grid max-h-72 grid-cols-2 gap-1 overflow-auto">
              <button className="btn btn-ghost justify-start" onClick={() => openBrowse(browse.parent)}>.. up</button>
              {browse.dirs.map((d: string) => (
                <button key={d} className="btn btn-ghost justify-start truncate" onClick={() => openBrowse(`${browse.path}/${d}`)}><Folder size={14} />{d}</button>
              ))}
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
