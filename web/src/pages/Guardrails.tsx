import { useEffect, useState } from "react";
import { CheckCircle2, FileWarning, Lock, ScrollText, ShieldCheck, SlidersHorizontal, UserCheck } from "lucide-react";
import { api, eur } from "../api";
import { useApp } from "../App";
import { Card, Tag } from "../components/ui";

const LAYERS = [
  { key: "input", title: "1 · Input guardrail", icon: <Lock size={16} /> },
  { key: "untrusted", title: "2 · Untrusted content", icon: <FileWarning size={16} /> },
  { key: "validator", title: "3 · Validator Agent", icon: <ShieldCheck size={16} /> },
  { key: "human", title: "4 · Human in the loop", icon: <UserCheck size={16} /> },
];

export default function Guardrails() {
  const app = useApp();
  const user = app.persona?.email ?? "";
  const [b, setB] = useState<any>(null);
  const [rules, setRules] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);

  const load = () => { api.boundaries(user).then(setB); api.audit(user).then(setLog); };
  useEffect(() => { load(); api.rules().then(setRules); }, [user]);
  const save = async () => { setB(await api.setBoundaries(user, b)); api.audit(user).then(setLog); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const toggle = (k: string, label: string, hint: string) => (
    <label className="flex items-start gap-3 rounded border border-line p-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#00646e]" checked={!!b?.[k]} onChange={(e) => setB({ ...b, [k]: e.target.checked })} />
      <span><span className="text-sm font-semibold">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <div className="flex items-center gap-2"><Tag tone="dark">Security layer</Tag><span className="font-mono text-[11px] text-low">● guardrails active</span></div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Guardrails, boundaries &amp; human approval</h1>
        <p className="mt-1 max-w-3xl text-muted">The agents propose; you decide. You set the boundaries below. The Validator Agent checks every answer against them
          and against the data before you see it. No action and no risk change happens without your approval. Every decision is logged.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {LAYERS.map((l) => (
          <div key={l.key} className="card p-4">
            <div className="flex items-center gap-2 font-semibold text-petrol-dark"><span className="text-petrol">{l.icon}</span>{l.title}</div>
            <ul className="mt-2 space-y-1">{(rules?.[l.key] ?? []).map((r: string) => (
              <li key={r} className="flex gap-1.5 text-xs"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-low" />{r}</li>))}</ul>
          </div>))}
      </div>

      <Card title="My boundaries (enforced on every answer)" icon={<SlidersHorizontal size={17} />} right={<span className="font-mono text-xs text-muted">{user}</span>}>
        {b && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-line p-3">
              <div className="text-sm font-semibold">Maximum risk of a recommended supplier: <span className="font-mono text-petrol">{b.max_recommend_risk}</span></div>
              <input type="range" min={10} max={75} value={b.max_recommend_risk} onChange={(e) => setB({ ...b, max_recommend_risk: +e.target.value })} className="mt-2 w-full accent-[#00646e]" />
              <div className="text-xs text-muted">Answers that recommend a riskier supplier are blocked.</div>
            </div>
            <div className="rounded border border-line p-3">
              <div className="text-sm font-semibold">Approval required above <span className="font-mono text-petrol">{eur(b.approval_threshold_eur)}</span> PO volume</div>
              <input type="range" min={0} max={20} value={Math.round(b.approval_threshold_eur / 1e6)} onChange={(e) => setB({ ...b, approval_threshold_eur: +e.target.value * 1e6 })} className="mt-2 w-full accent-[#00646e]" />
              <div className="text-xs text-muted">Actions on larger suppliers are only proposals until you approve them.</div>
            </div>
            {toggle("eu_only", "EU suppliers only", "Recommendations outside the EU are blocked.")}
            {toggle("require_iris", "IRIS certification required", "Rail quality standard ISO/TS 22163.")}
            {toggle("allow_web", "Allow internet search", "Off = no query leaves the company network (Web Agent disabled).")}
            {toggle("block_on_violation", "Block answers that break a boundary", "Off = show them with a warning instead.")}
            <div className="flex justify-end md:col-span-2">
              <button className="btn btn-primary" onClick={save}><ShieldCheck size={15} /> {saved ? "Saved & logged" : "Save boundaries"}</button>
            </div>
          </div>
        )}
      </Card>

      <Card title={`Audit log (${log.length})`} icon={<ScrollText size={17} />}>
        {!log.length ? <p className="text-sm text-muted">No events yet. Chat with the supervisor, approve an action or change a boundary.</p> : (
          <div className="max-h-96 overflow-auto rounded border border-line">
            <table className="grid-table w-full">
              <thead><tr><th>Time</th><th>Event</th><th>Detail</th><th>Decision</th></tr></thead>
              <tbody>{log.map((x, i) => (
                <tr key={i}><td className="whitespace-nowrap font-mono text-[11px]">{x.time.replace("T", " ")}</td>
                  <td><Tag tone={x.kind === "blocked_input" ? "sim" : "tint"}>{x.kind.replace("_", " ")}</Tag></td>
                  <td className="max-w-md text-xs">{x.text}</td>
                  <td className={`font-mono text-[11px] font-semibold ${/reject|block/.test(x.decision) ? "text-crit" : /approv|pass/.test(x.decision) ? "text-low" : ""}`}>{x.decision}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
