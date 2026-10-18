import { useState } from "react";
import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldX, ThumbsDown, ThumbsUp, UserCheck } from "lucide-react";
import { api } from "../api";
import { useApp } from "../App";

export type Check = { name: string; status: "pass" | "warn" | "fail"; detail: string };
export type Action = { id: number; text: string; status: "pending" | "approved" | "rejected" };
export type Validation = { verdict: "pass" | "warn" | "block"; checks: Check[]; actions: Action[] };

const ST = {
  pass: { cls: "text-low", icon: <CheckCircle2 size={13} /> },
  warn: { cls: "text-med", icon: <ShieldAlert size={13} /> },
  fail: { cls: "text-crit", icon: <ShieldX size={13} /> },
};
const VERDICT = {
  pass: { label: "Validated", cls: "border-low bg-[#ecfdf5] text-low", icon: <ShieldCheck size={15} /> },
  warn: { label: "Validated with warnings", cls: "border-med bg-[#fffbeb] text-med", icon: <ShieldAlert size={15} /> },
  block: { label: "Blocked by the Validator Agent", cls: "border-crit bg-[#fef2f2] text-crit", icon: <ShieldX size={15} /> },
};

/** Validator Agent verdict + human-in-the-loop approval of every proposed action. */
export default function ValidationCard({ v, context, onChange }: { v: Validation; context: string; onChange: (v: Validation) => void }) {
  const app = useApp();
  const [open, setOpen] = useState(v.verdict !== "pass");
  const vd = VERDICT[v.verdict];
  const decide = (a: Action, decision: "approved" | "rejected") => {
    api.decide(app.persona?.email ?? "", a.text, decision, context);
    onChange({ ...v, actions: v.actions.map((x) => (x.id === a.id ? { ...x, status: decision } : x)) });
  };
  return (
    <div className="mt-2 space-y-2">
      <div className={`rounded border px-3 py-2 ${vd.cls}`}>
        <button className="flex w-full items-center justify-between text-left text-xs font-semibold" onClick={() => setOpen(!open)}>
          <span className="flex items-center gap-1.5">{vd.icon} {vd.label}</span>
          <span className="font-mono text-[10px] font-normal">{v.checks.filter((c) => c.status === "pass").length}/{v.checks.length} checks passed · {open ? "hide" : "details"}</span>
        </button>
        {open && (
          <ul className="mt-2 space-y-1 border-t border-current/20 pt-2">
            {v.checks.map((c) => (
              <li key={c.name} className="flex items-start gap-1.5 text-xs text-slate-ink">
                <span className={`mt-0.5 ${ST[c.status].cls}`}>{ST[c.status].icon}</span><b className="shrink-0">{c.name}</b><span className="text-muted">{c.detail}</span></li>))}
          </ul>
        )}
      </div>
      {v.actions.length > 0 && v.verdict !== "block" && (
        <div className="rounded border-2 border-petrol bg-white p-3">
          <div className="label mb-2 flex items-center gap-1.5 !text-petrol"><UserCheck size={14} /> You decide · nothing runs without your approval</div>
          {v.actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-t border-line py-1.5 text-sm first:border-0">
              <span className={a.status === "rejected" ? "text-muted line-through" : ""}>{a.text}</span>
              {a.status === "pending" ? (
                <span className="flex shrink-0 gap-1.5">
                  <button className="btn btn-primary !px-2 !py-1 text-xs" onClick={() => decide(a, "approved")}><ThumbsUp size={12} /> Approve</button>
                  <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => decide(a, "rejected")}><ThumbsDown size={12} /> Reject</button>
                </span>
              ) : <span className={`shrink-0 font-mono text-[11px] font-semibold ${a.status === "approved" ? "text-low" : "text-crit"}`}>{a.status} · logged</span>}
            </div>))}
        </div>
      )}
    </div>
  );
}
