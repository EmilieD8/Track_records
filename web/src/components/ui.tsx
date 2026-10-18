import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LEVEL_COLOR, levelOf, type Level } from "../api";

const BADGE: Record<Level, string> = {
  Low: "bg-[#ecfdf5] border-[#a7f3d0] text-low",
  Medium: "bg-[#fffbeb] border-[#fcd34d] text-med",
  High: "bg-[#fff7ed] border-[#fdba74] text-high",
  Critical: "bg-[#fef2f2] border-[#fca5a5] text-crit",
};

export function RiskBadge({ score, level }: { score?: number; level?: Level }) {
  const lv = level ?? levelOf(score ?? 0);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${BADGE[lv]}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: LEVEL_COLOR[lv] }} />
      {score != null && <span>{score}</span>}
      {lv}
    </span>
  );
}

export function Metric({ label, value, sub, icon, tone }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "crit" }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={`label ${tone === "crit" ? "!text-crit" : ""}`}>{label}</div>
        {icon && <div className="text-petrol">{icon}</div>}
      </div>
      <div className={`metric mt-2 text-2xl ${tone === "crit" ? "text-crit" : ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Card({ title, icon, right, children, className = "", defaultOpen = true }: { title?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className={`flex items-center justify-between gap-3 px-4 py-3 ${open ? "border-b border-line" : ""}`}>
          <button className="flex min-w-0 items-center gap-2 text-left font-semibold" onClick={() => setOpen(!open)} title={open ? "Collapse" : "Expand"}>
            {open ? <ChevronDown size={16} className="shrink-0 text-muted" /> : <ChevronRight size={16} className="shrink-0 text-muted" />}
            {icon && <span className="text-petrol">{icon}</span>}
            {title}
          </button>
          {open && right}
        </header>
      )}
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

export function Tag({ children, tone = "tint" }: { children: ReactNode; tone?: "tint" | "sim" | "dark" }) {
  const cls = tone === "sim" ? "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]" : tone === "dark" ? "bg-petrol text-white border-petrol" : "bg-tint text-petrol border-tint-2";
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>;
}

export function Bar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-sm bg-line">
      <div className="h-1.5 rounded-sm" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color ?? LEVEL_COLOR[levelOf(value)] }} />
    </div>
  );
}
