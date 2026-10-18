import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Callable

import data_tools
import email_connector
from extract import search_chunks
from llm import chat
from web import web_search

MAX_STEPS = 6
MAX_TOOL_CHARS = 12000


@dataclass
class Event:
    agent: str
    kind: str  # plan | tool_call | tool_result | answer | error
    text: str
    data: dict | None = None


@dataclass
class Run:
    events: list = field(default_factory=list)
    on_event: Callable | None = None
    thread_init: Callable | None = None
    provider: str = "Nebius Token Factory"

    def emit(self, agent, kind, text, data=None):
        e = Event(agent, kind, text, data)
        self.events.append(e)
        if self.on_event:
            self.on_event(e)


def _spec(name, desc, props):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props}}}


def _loop(agent: str, system: str, task: str, tools: dict, model: str, run: Run, max_steps: int = MAX_STEPS) -> str:
    """Generic tool-calling loop. tools: name -> (fn, desc, props)."""
    specs = [_spec(n, d, p) for n, (_, d, p) in tools.items()]
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": task}]
    for _ in range(max_steps):
        msg = chat(model, msgs, specs or None, provider=run.provider)
        calls = msg.tool_calls or []
        msgs.append({"role": "assistant", "content": msg.content or "",
                     **({"tool_calls": [c.model_dump() for c in calls]} if calls else {})})
        if not calls:
            run.emit(agent, "answer", msg.content or "")
            return msg.content or ""

        def execute(c):
            fn = tools.get(c.function.name)
            try:
                args = json.loads(c.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            run.emit(agent, "tool_call", f"{c.function.name}({json.dumps(args, ensure_ascii=False)[:300]})", args)
            try:
                res = fn[0](**args) if fn else {"error": f"unknown tool {c.function.name}"}
            except Exception as e:
                res = {"error": str(e)}
            run.emit(agent, "tool_result", c.function.name, res)
            return c.id, json.dumps(res, ensure_ascii=False, default=str)[:MAX_TOOL_CHARS]

        with ThreadPoolExecutor(max_workers=4, initializer=run.thread_init) as ex:
            for cid, content in ex.map(execute, calls):
                msgs.append({"role": "tool", "tool_call_id": cid, "content": content})
    msgs.append({"role": "user", "content": "Stop calling tools. Give your final answer now."})
    msg = chat(model, msgs, provider=run.provider)
    run.emit(agent, "answer", msg.content or "")
    return msg.content or ""


DATA_SYS = """You are the Data Agent of a railway supplier-risk system. You answer ONLY from tool results over the
supplier dataset (10,000 suppliers, scores 0=no risk..100=max risk; levels Low<25<=Medium<50<=High<75<=Critical).
Total_Risk_Index = round(sum(weight x sub-score)); 'points' in a breakdown = weight x score.
Never invent numbers or supplier ids. Call all the tools you need IN PARALLEL in your first turn (one turn, several
tool calls), then answer. Return a compact factual summary (max 150 words) with the key numbers and supplier ids.
Country, part category, certificates, lead times, history and fleet BOM are SIMULATED enrichment; label them as such."""

DOC_SYS = """You are the Document Agent. You search documents the user shared (contracts, audits, certificates, OCR'd scans).
Use search_documents (try 2-3 different keyword queries if needed). Quote short passages and always cite as [doc: <file name>].
If nothing relevant is found, say so plainly. Max 120 words."""

EMAIL_SYS = """You are the Email Agent. You use the email connector: list_inbox, read_email, then assess_delay to recompute
a supplier's risk after a reported disruption (delay weeks and causes taken from the email text). Never invent numbers:
report risk before -> after, level change, exposure change, projected delivery, line-stop weeks vs safety stock, affected
fleets and the best alternative from the tool result. Cite as [email: <subject>]. Max 150 words."""

WEB_SYS = """You are the Web Intelligence Agent. Use web_search (Tavily) to find recent, relevant public information:
news on disruptions, commodity prices, regions, regulations, or real companies. Supplier names in the internal dataset are
anonymized, so search by topic/category/region instead of those names. Cite every fact as [web: <url>]. Max 120 words."""

SUP_SYS = """You are the Supervisor Agent of "SwitchPoint", an agentic supplier-risk assistant for a railway company.
You plan, decide which data sources are needed, delegate to specialist agents, and write the final answer.

USER PROFILE
- Name: {name}
- Role: {role}
- Department: {department}
- Focus: {focus}
- Preferred style: {style}

AVAILABLE AGENTS / DATA SOURCES
{sources}

RULES
- In your FIRST turn call `delegate` once, filling every task field you need. Usually one round is enough.
- If shared documents are available and the question concerns specific suppliers, ALWAYS also ask the document agent
  (audits, certificates, contracts, incident reports often explain the scores).
- Use the web agent for current external context (disruptions, regions, commodities, regulation) when it adds value.
- Every number must come from an agent result. Never invent supplier ids or figures.
- Cite sources inline: [data], [doc: file], [web: url]. Mark simulated information as SIMULATED.
- Write "Recommended actions (need approval)" as a bulleted list: the user approves or rejects each one.
- Tailor the answer to the user's role and focus. Max ~250 words: a 1-2 sentence bottom line, then the key evidence
  (at most one table, max 6 rows), then max 4 'Recommended actions (need approval)'.
{notes}"""


def build_system_prompt(persona: dict, sources: dict, notes: str, boundaries: dict | None = None) -> str:
    from guardrails import DEFAULT_BOUNDARIES, boundary_rules
    lines = []
    lines.append("Call the tool `delegate` with one task per agent you need; the agents run IN PARALLEL.")
    if sources.get("data"):
        lines.append("- data_task -> Data Agent: supplier dataset (risk scores, spend, delivery, exposure, hidden risks, what-if, "
                     "alternatives, simulated country/category, 24-month history, fleet impact)")
    if sources.get("docs"):
        lines.append(f"- document_task -> Document Agent: {sources['docs']} shared document chunks (audits, certificates, contracts, OCR scans)")
    if sources.get("email"):
        lines.append("- email_task -> Email Agent: email connector (procurement inbox). Use it when the user mentions an email, "
                     "a new message, a supplier notification or a delay, and to recalculate risk after a reported disruption")
    if sources.get("web"):
        lines.append("- web_task -> Web Agent: live internet search via Tavily")
    note_block = f"\nUSER NOTES (always respect these)\n{notes.strip()}" if notes.strip() else ""
    note_block += "\n" + boundary_rules(boundaries or DEFAULT_BOUNDARIES)
    return SUP_SYS.format(sources="\n".join(lines) or "- none", notes=note_block,
                          **{k: persona.get(k, "") for k in ("name", "role", "department", "focus", "style")})


def run_supervisor(question: str, history: list, persona: dict, notes: str, model: str,
                   chunks: list | None, web_enabled: bool, run: Run, boundaries: dict | None = None,
                   email_enabled: bool = True) -> str:
    sources = {"data": True, "email": email_enabled, "docs": len(chunks) if chunks else 0, "web": web_enabled}
    system = build_system_prompt(persona, sources, notes, boundaries)

    data_tools_map = data_tools.TOOLS
    doc_tools = {"search_documents": (lambda query, k=5: {"hits": search_chunks(chunks or [], query, k)},
                                      "Keyword search over shared documents; returns matching passages.",
                                      {"query": {"type": "string"}, "k": {"type": "integer"}})}
    web_tools = {"web_search": (web_search, "Search the internet (Tavily).",
                                {"query": {"type": "string"}, "topic": {"type": "string", "enum": ["general", "news"]},
                                 "max_results": {"type": "integer"}})}

    agents = {"data_task": ("Data Agent", DATA_SYS, data_tools_map, MAX_STEPS)}
    if email_enabled:
        agents["email_task"] = ("Email Agent", EMAIL_SYS, email_connector.TOOLS, 4)
    if sources["docs"]:
        agents["document_task"] = ("Document Agent", DOC_SYS, doc_tools, 3)
    if web_enabled:
        agents["web_task"] = ("Web Agent", WEB_SYS, web_tools, 2)

    def delegate(**tasks):
        jobs = [(k, v) for k, v in tasks.items() if k in agents and isinstance(v, str) and v.strip()]

        def work(job):
            k, task = job
            name, sys_prompt, tools, steps = agents[k]
            return name, _loop(name, sys_prompt, task, tools, model, run, steps)

        with ThreadPoolExecutor(max_workers=3, initializer=run.thread_init) as ex:
            return dict(ex.map(work, jobs))

    props = {k: {"type": "string", "description": f"sub-task for the {v[0]} (omit if not needed)"} for k, v in agents.items()}
    sub = {"delegate": (delegate, "Send sub-tasks to specialist agents; all run in parallel.", props)}

    run.emit("Supervisor", "plan", f"Sources available: {', '.join(k for k, v in sources.items() if v)}")
    convo = "".join(f"{m['role'].upper()}: {m['content'][:1500]}\n" for m in history[-6:])
    task = (f"Conversation so far:\n{convo}\n" if convo else "") + f"USER QUESTION: {question}"
    return _loop("Supervisor", system, task, sub, model, run)
