import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, Euro, EyeOff, Gauge, Network, Sparkles } from "lucide-react";
import { Bar as RBar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, eur, levelOf, LEVEL_COLOR, type SupplierRow } from "../api";
import { useApp } from "../App";
import { Card, Metric, RiskBadge, Tag } from "../components/ui";

export default function Dashboard() {
  const app = useApp();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.overview().then(setD); }, []);
  if (!d) return <div className="p-8 text-muted">Loading portfolio…</div>;
  const o = d.overview;

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">Rail supplier portfolio / risk telemetry</div>
          <h1 className="text-3xl font-bold tracking-tight">Structured Risk Ledger</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => app.go("workspace")}><Network size={15} /> Project mind map</button>
          <button className="btn btn-dark" onClick={() => app.askCopilot("Which suppliers should I worry about this week?")}><Sparkles size={15} /> Ask the agents</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Metric label="Active suppliers" value={o.suppliers.toLocaleString()} sub={`${eur(o.total_spend_eur)} PO volume`} icon={<Boxes size={18} />} />
        <Metric label="High + Critical" value={o.high_or_critical.toLocaleString()} sub={`${eur(o.spend_high_or_critical_eur)} of spend`} icon={<Gauge size={18} />} />
        <Metric label="Priority group" value={o.priority_suppliers} sub={`${eur(o.priority_spend_eur)} · big spend, high risk, hard to replace`} icon={<AlertTriangle size={18} />} tone="crit" />
        <Metric label="Hidden risks" value={o.hidden_risk_suppliers} sub={`${eur(o.hidden_risk_spend_eur)} · look fine, Critical on 1 score`} icon={<EyeOff size={18} />} />
        <Metric label="Risk exposure" value={eur(o.total_exposure_eur)} sub="Σ spend × risk / 100" icon={<Euro size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Exposure by rail part category" right={<Tag tone="sim">Simulated category</Tag>}>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={d.categories} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => eur(v)} tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                <YAxis type="category" dataKey="category" width={170} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, k) => (k === "exposure" ? eur(v) : v)} labelStyle={{ fontWeight: 600 }} />
                <RBar dataKey="exposure" radius={[0, 4, 4, 0]} barSize={12}>
                  {d.categories.map((c: any) => <Cell key={c.category} fill={LEVEL_COLOR[levelOf(c.risk)]} />)}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Hidden-risk queue" icon={<EyeOff size={16} />} right={<Tag>{d.hidden.length} shown</Tag>}>
          <div className="space-y-2">
            {d.hidden.map((s: SupplierRow) => (
              <button key={s.supplier_id} onClick={() => app.openSupplier(s.supplier_id)}
                className="w-full rounded border border-line bg-canvas p-2.5 text-left hover:border-petrol">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold">{s.supplier_id}</span><RiskBadge score={s.total_risk} /></div>
                <div className="mt-1 text-xs text-crit">{s.worst_factor} = {s.worst_score} (Critical) · {eur(s.po_volume_eur)}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Priority suppliers: act on these first" icon={<AlertTriangle size={16} />} right={<span className="font-mono text-xs text-muted">sorted by € exposure</span>}>
        <div className="overflow-auto">
          <table className="grid-table w-full">
            <thead><tr><th>Supplier</th><th>Category / country</th><th>Risk</th><th>Worst factor</th><th className="text-right">Spend</th><th className="text-right">Exposure</th><th className="text-right">Delivery</th><th></th></tr></thead>
            <tbody>
              {d.priority.map((s: SupplierRow) => (
                <tr key={s.supplier_id} className="cursor-pointer" onClick={() => app.openSupplier(s.supplier_id)}>
                  <td><div className="font-mono font-semibold">{s.supplier_id}</div><div className="text-xs text-muted">{s.name}</div></td>
                  <td><div>{s.category}</div><div className="text-xs text-muted">{s.country}</div></td>
                  <td><RiskBadge score={s.total_risk} level={s.level} /></td>
                  <td className="text-xs">{s.worst_factor} <span className="font-mono text-muted">({s.worst_score})</span></td>
                  <td className="text-right font-mono">{eur(s.po_volume_eur)}</td>
                  <td className="text-right font-mono font-semibold">{eur(s.exposure_eur)}</td>
                  <td className={`text-right font-mono ${s.delivery_rating < 85 ? "text-crit" : ""}`}>{s.delivery_rating.toFixed(1)}%</td>
                  <td><button className="btn btn-ghost !py-1 text-xs" onClick={(e) => { e.stopPropagation(); app.askCopilot(`Explain why ${s.supplier_id} is risky and what we should do.`); }}><Sparkles size={12} /> Ask</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
