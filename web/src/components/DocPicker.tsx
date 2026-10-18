import { useRef, useState } from "react";
import { CheckCircle2, FilePlus2, FolderUp, Loader2 } from "lucide-react";
import { useApp } from "../App";

const ACCEPT = ".pdf,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.tif,.tiff";

/** Pick single files or a whole folder from the user's own computer; uploaded, extracted (OCR) and given to the Document Agent. */
export default function DocPicker({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const files = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true); setMsg(`Reading ${list.length} file(s)…`);
    const fd = new FormData();
    for (const f of Array.from(list)) fd.append("files", f, (f as any).webkitRelativePath || f.name);
    fd.append("provider", app.status?.keys?.nvidia ? "NVIDIA API (build.nvidia.com)" : app.provider);
    try {
      const r = await fetch("/api/docs/upload", { method: "POST", body: fd }).then((x) => x.json());
      setMsg(`${r.added.length} file(s) added${r.skipped ? `, ${r.skipped} unsupported skipped` : ""} · ${r.docs.length} documents available`);
      app.refreshStatus();
    } catch (e) { setMsg(`Upload failed: ${e}`); }
    finally { setBusy(false); }
  };

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !py-1 text-xs" disabled={busy} onClick={() => files.current?.click()}><FilePlus2 size={14} /> Add files</button>
        <button type="button" className="btn btn-ghost !py-1 text-xs" disabled={busy} onClick={() => folder.current?.click()}><FolderUp size={14} /> Add folder</button>
      </div>
      {msg && <span className="flex items-center gap-1.5 text-[11px] text-muted">{busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} className="text-low" />}{msg}</span>}
      <input ref={files} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={folder} type="file" multiple hidden {...({ webkitdirectory: "", directory: "" } as any)} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
