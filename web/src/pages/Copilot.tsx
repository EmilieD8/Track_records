import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Database, FileSearch, Globe, Loader2, Mail, Send, Sparkles, Terminal, Workflow } from "lucide-react";
import { api, streamChat, type AgentEvent } from "../api";
import { useApp } from "../App";
import { Tag } from "../components/ui";

type Msg = { role: "user" | "assistant"; content: string; events?: AgentEvent[]; ms?: number };

const AGENT_STYLE: Record<string, { icon: JSX.Element; cls: string }> = {
  Supervisor: { icon: <Workflow size={13} />, cls: "bg-petrol text-white" },
  "Data Agent": { icon: <Database size={13} />, cls: "bg-[#dbeafe] text-[#1e40af]" },
  "Document Agent": { icon: <FileSearch size={13} />, cls: "bg-[#fef3c7] text-[#92400e]" },
  "Web Agent": { icon: <Globe size={13} />, cls: "bg-[#dcfce7] text-[#166534]" },
  "Email Agent": { icon: <Mail size={13} />, cls: "bg-[#fce7f3] text-[#9d174d]" },
};

function Trace({ events, live }: { events: AgentEvent[]; live?: boolean }) {
  return (
    <div className="space-y-1.5">
      {events.filter((e) => e.kind !== "tool_result" || e.data?.error).map((e, i) => {
        const st = AGENT_STYLE[e.agent] ?? AGENT_STYLE.Supervisor;
        return (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${st.cls}`}>{st.icon}{e.agent.replace(" Agent", "")}</span>
            <span className="min-w-0 break-words font-mono text-[11px] text-slate-ink">
              {e.kind === "tool_call" ? <>→ <b>{e.text.split("(")[0]}</b><span className="text-muted">({e.text.slice(e.text.indexOf("(") + 1, 160)}</span></>
                : e.kind === "answer" ? <span className="text-low">✓ finished</span>
                : e.kind === "tool_result" ? <span className="text-crit">{String(e.data?.error)}</span>
                : e.text}
            </span>
          </div>
        );
      })}
      {live && <div className="flex items-center gap-2 text-xs text-muted"><Loader2 size={12} className="animate-spin" /> agents working…</div>}
    </div>
  );
}

export default function Copilot() {
  const app = useApp();
  const [msgs, setMsgs] = useState<Msg[]>(app.project?.copilot ?? []);
  const [input, setInput] = useState("");
  const [live, setLive] = useState<AgentEvent[] | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const p = app.persona;

  const body = (question: string) => ({ question, persona_id: p?.id, notes: p?.notes ?? "", model: app.model, provider: app.provider, web: app.web,
    history: msgs.map((m) => ({ role: m.role, content: m.content })) });

  const send = async (q: string) => {
    if (!q.trim() || live) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    const evs: AgentEvent[] = [];
    setLive([]);
    const t0 = performance.now();
    let answer = "";
    try {
      await streamChat(body(q), (m) => {
        if (m.type === "event") { evs.push(m as AgentEvent); setLive([...evs]); }
        if (m.type === "final") answer = m.answer;
        if (m.type === "error") answer = `**Error:** ${m.error}`;
      });
    } catch (e) { answer = `**Error:** ${e}`; }
    setMsgs((m) => [...m, { role: "assistant", content: answer, events: evs, ms: performance.now() - t0 }]);
    setLive(null);
  };

  useEffect(() => { if (app.pendingQuestion) { const q = app.pendingQuestion; app.clearPending(); send(q); } }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, live]);
  // memory: keep the conversation with the project (tool payloads dropped to stay small)
  useEffect(() => { if (msgs.length && app.project) app.saveProject({ copilot: msgs.map((m) => ({ ...m, events: m.events?.map((e) => ({ ...e, data: e.kind === "tool_result" && e.data?.error ? e.data : null })) })) }); }, [msgs]);

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-petrol text-white"><Bot size={20} /></div>
            <div><div className="flex items-center gap-2 text-lg font-semibold">Chat with SupplyGuard AI <Tag>Supervisor + 4 agents</Tag></div>
              <div className="text-xs text-muted">Answers from the dataset, your shared documents and the web, with every claim cited</div></div>
          </div>
          <div className="text-right font-mono text-[11px] text-muted"><div>{app.model}</div><div>{app.provider}</div></div>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-6">
          {msgs.length === 0 && !live && (
            <div className="mx-auto max-w-2xl pt-10 text-center">
              <Sparkles className="mx-auto text-petrol" size={30} />
              <h2 className="mt-2 text-2xl font-semibold">Hi {p?.name.split(" ")[0]}, what do you want to know about your suppliers?</h2>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {(p?.questions ?? []).map((q) => <button key={q} className="btn btn-ghost" onClick={() => send(q)}>{q}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end"><div className="max-w-2xl rounded-lg bg-petrol px-4 py-2.5 text-sm text-white">{m.content}</div></div>
          ) : (
            <div key={i} className="max-w-4xl">
              <div className="card p-5">
                <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-petrol">SupplyGuard Intelligence Agent</span>
                  <span className="font-mono text-[11px] text-muted">{((m.ms ?? 0) / 1000).toFixed(0)}s · {m.events?.length} agent steps</span></div>
                <div className="md text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
              </div>
              {m.events && (
                <details className="mt-2 rounded border border-line bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-muted">Agent trace</summary>
                  <div className="mt-2"><Trace events={m.events} /></div></details>
              )}
            </div>
          ))}
          {live && (
            <div className="card max-w-4xl border-teal p-4">
              <div className="label mb-2 flex items-center gap-2"><Workflow size={13} /> Live agent trace</div>
              <Trace events={live} live />
            </div>
          )}
          <div ref={bottom} />
        </div>

        <div className="border-t border-line bg-white p-4">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input className="input !h-11" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about suppliers, fleets, documents, lead times…" />
            <button className="btn btn-primary !px-5" disabled={!!live}>{live ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send</button>
          </form>
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 space-y-4 overflow-auto border-l border-line bg-white p-5 xl:block">
        <div className="label">Active persona</div>
        {p && <div className="rounded border border-line p-3">
          <div className="font-semibold">{p.name}</div><div className="font-mono text-xs text-muted">{p.role}</div>
          <div className="mt-2 text-xs"><b>Focus:</b> {p.focus}</div>
          {p.notes && <div className="mt-2 rounded bg-tint p-2 font-mono text-[11px]">"{p.notes}"</div>}
        </div>}
        <div className="label">Sources the supervisor can use</div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><Database size={14} className="text-petrol" /> Supplier dataset (10,000)</li>
          <li className="flex items-center gap-2"><FileSearch size={14} className="text-petrol" /> {app.status?.docs ?? 0} shared documents</li>
          <li className="flex items-center gap-2"><Mail size={14} className="text-petrol" /> Email inbox ({app.inbox.filter((m) => !m.read).length} unread)</li>
          <li className="flex items-center gap-2"><Globe size={14} className="text-petrol" /> Web search {app.web ? "on" : "off"}</li>
        </ul>
        <button className="btn btn-ghost w-full justify-center" onClick={async () => setPrompt((await api.systemPrompt(body(""))).prompt)}><Terminal size={14} /> Show system prompt</button>
        {prompt && <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-ink p-3 font-mono text-[10.5px] text-teal-light">{prompt}</pre>}
      </aside>
    </div>
  );
}
