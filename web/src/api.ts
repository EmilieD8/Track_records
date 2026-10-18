export type Level = "Low" | "Medium" | "High" | "Critical";

export interface SupplierRow {
  supplier_id: string;
  name: string;
  total_risk: number;
  level: Level;
  po_volume_eur: number;
  exposure_eur: number;
  worst_factor: string;
  worst_score: number;
  n_critical: number;
  delivery_rating: number;
  confirmation_rate: number;
  change_rate: number;
  sourcing_risk: string;
  complexity: string;
  hidden_risk: boolean;
  priority: boolean;
  country?: string;
  category?: string;
  pillars?: Record<string, number>;
  lead_time_weeks?: number;
  safety_stock_weeks?: number;
  iris_certified?: boolean;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  department: string;
  focus: string;
  style: string;
  notes: string;
  seniority?: string;
  email?: string;
  ui_config?: any;
  ui_spec?: any;
  questions: string[];
}

export interface AgentEvent {
  agent: string;
  kind: "plan" | "tool_call" | "tool_result" | "answer" | "error";
  text: string;
  data: Record<string, unknown> | null;
}

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const post = <T,>(url: string, body: unknown) =>
  j<T>(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  status: () => j<any>("/api/status"),
  models: (provider: string) => j<{ models: string[] }>(`/api/models?provider=${encodeURIComponent(provider)}`),
  personas: () => j<Persona[]>("/api/personas"),
  savePersona: (p: Partial<Persona>) => post<Persona>("/api/personas", p),
  overview: () => j<any>("/api/overview"),
  suppliers: (params: Record<string, string>) => j<{ suppliers: SupplierRow[] }>(`/api/suppliers?${new URLSearchParams(params)}`),
  supplier: (id: string) => j<any>(`/api/supplier/${id}`),
  whatIf: (id: string, changes: Record<string, number>) => post<any>(`/api/supplier/${id}/what-if`, { changes }),
  orderRisk: (selection: Record<string, string>, volumes: Record<string, number> = {}) => post<any>("/api/order-risk", { selection, volumes }),
  fs: (path?: string) => j<any>(`/api/fs${path ? `?path=${encodeURIComponent(path)}` : ""}`),
  extract: (folder: string, provider: string, model: string) => post<any[]>("/api/extract", { folder, provider, model }),
  docs: () => j<any[]>("/api/docs"),
  systemPrompt: (body: any) => post<{ prompt: string }>("/api/system-prompt", body),
  categories: () => j<any[]>("/api/categories"),
  bubbles: (project: string, per: number) => j<any>(`/api/bubbles?${new URLSearchParams({ project, per_item: String(per) })}`),
  projects: () => j<any[]>("/api/projects"),
  login: (email: string) => post<Persona>("/api/login", { email }),
  demoAccounts: () => j<{ email: string; name: string; role: string }[]>("/api/demo-accounts"),
  news: (id: string) => j<any>(`/api/supplier/${id}/news`),
  procurementParse: (text: string, model: string, provider: string) => post<any>("/api/procurement/parse", { text, model, provider }),
  procurementUpload: (file: File, model: string, provider: string) => {
    const fd = new FormData();
    fd.append("file", file); fd.append("model", model); fd.append("provider", provider);
    return j<any>("/api/procurement/upload", { method: "POST", body: fd });
  },
  userProjects: (email: string) => j<any[]>(`/api/user-projects?email=${encodeURIComponent(email)}`),
  saveUserProject: (email: string, project: any) => post<any>("/api/user-projects", { email, project }),
  deleteUserProject: (email: string, id: string) => j<any>(`/api/user-projects/${id}?email=${encodeURIComponent(email)}`, { method: "DELETE" }),
  procurementBubbles: (items: any[], per_item: number, eu_only: boolean, priority = "Lowest risk") => post<any>("/api/procurement/bubbles", { items, per_item, eu_only, priority }),
  recommendations: (category: string) => j<any[]>(`/api/recommendations?${new URLSearchParams({ category })}`),
  generateUi: (body: any) => post<any>("/api/generate-ui", body),
  orders: (id: string) => j<any>(`/api/supplier/${id}/orders`),
  notes: (id: string) => j<any[]>(`/api/supplier/${id}/notes`),
  addNote: (id: string, note: any) => post<any[]>(`/api/supplier/${id}/notes`, note),
  inbox: () => j<Email[]>("/api/email/inbox"),
  simulateEmail: (scenario: string) => post<Email>("/api/email/simulate", { scenario }),
  analyzeEmail: (id: string, model: string, provider: string) => post<any>(`/api/email/${id}/analyze`, { model, provider }),
};

export interface Email {
  id: string; from: string; subject: string; body: string; received: string; read: boolean;
  supplier_id: string | null; scenario?: string; analysis?: { risk_before: number; risk_after: number };
}

export async function streamChat(body: any, onMsg: (m: any) => void) {
  const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.body) throw new Error("no stream");
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) if (p.startsWith("data: ")) onMsg(JSON.parse(p.slice(6)));
  }
}

export const eur = (v: number | undefined | null) =>
  v == null ? "–" : v >= 1e9 ? `€${(v / 1e9).toFixed(1)} bn` : v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `€${Math.round(v / 1e3)}k` : `€${Math.round(v)}`;

export const levelOf = (s: number): Level => (s < 25 ? "Low" : s < 50 ? "Medium" : s < 75 ? "High" : "Critical");
export const LEVEL_COLOR: Record<Level, string> = { Low: "#059669", Medium: "#d97706", High: "#ea580c", Critical: "#dc2626" };

