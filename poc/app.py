import threading
from pathlib import Path

import pandas as pd
import streamlit as st
from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx

import data_tools
from agents import Run, build_system_prompt, run_supervisor
from config import OCR_MODELS, EXPLAINER_PATH, NEBIUS_API_KEY, NVIDIA_API_KEY, PROVIDERS, TAVILY_API_KEY
from extract import chunk_docs, extract_file, list_files
from llm import list_models
from personas import load_personas, save_personas

st.set_page_config(page_title="SwitchPoint · Supplier Risk Agents", layout="wide")

ss = st.session_state
ss.setdefault("personas", load_personas())
ss.setdefault("persona_id", ss.personas[0]["id"])
ss.setdefault("chats", {})
ss.setdefault("docs", [])
ss.setdefault("folder", str(Path(__file__).resolve().parent / "sample_docs"))
ss.setdefault("browse_dir", ss.folder)
if ss.get("pending_folder"):
    ss.folder = ss.pop("pending_folder")


def persona() -> dict:
    return next(p for p in ss.personas if p["id"] == ss.persona_id)


@st.cache_data(ttl=600, show_spinner=False)
def cached_models(provider: str) -> list[str]:
    return list_models(provider)


# ---------------- dialogs ----------------
@st.dialog("Choose a shared folder", width="large")
def folder_dialog():
    cur = Path(ss.browse_dir).expanduser()
    if not cur.is_dir():
        cur = Path.home()
    st.code(str(cur), language=None)
    c1, c2, c3 = st.columns([1, 1, 2])
    if c1.button("Up one level", use_container_width=True):
        ss.browse_dir = str(cur.parent)
        st.rerun(scope="fragment")
    if c2.button("Home", use_container_width=True):
        ss.browse_dir = str(Path.home())
        st.rerun(scope="fragment")
    typed = c3.text_input("Or paste a path", value="", label_visibility="collapsed", placeholder="Paste a path and press Enter")
    if typed and Path(typed).expanduser().is_dir():
        ss.browse_dir = str(Path(typed).expanduser())
        st.rerun(scope="fragment")
    try:
        subdirs = sorted(p for p in cur.iterdir() if p.is_dir() and not p.name.startswith("."))
    except PermissionError:
        subdirs = []
    cols = st.columns(3)
    for i, p in enumerate(subdirs[:60]):
        if cols[i % 3].button(f"[dir] {p.name}", key=f"dir_{p}", use_container_width=True):
            ss.browse_dir = str(p)
            st.rerun(scope="fragment")
    files = list_files(str(cur)) if cur != Path("/") else []
    st.caption(f"{len(files)} supported files in this folder (incl. subfolders): pdf, docx, images, txt/md/csv/json")
    if files:
        st.dataframe(pd.DataFrame({"file": [str(f.relative_to(cur)) for f in files[:200]]}), height=180, use_container_width=True)
    if st.button("Use this folder", type="primary"):
        ss.pending_folder = str(cur)
        st.rerun()


@st.dialog("Add a persona")
def persona_dialog():
    with st.form("new_persona"):
        name = st.text_input("Name")
        role = st.text_input("Role", placeholder="e.g. Category Manager Signalling")
        dept = st.text_input("Department")
        focus = st.text_area("Focus", placeholder="What this person cares about")
        style = st.text_input("Answer style", value="Concise, cite sources")
        if st.form_submit_button("Create", type="primary") and name and role:
            pid = f"{name.lower().replace(' ', '_')}_{len(ss.personas)}"
            ss.personas.append({"id": pid, "name": name, "role": role, "department": dept, "focus": focus,
                                "style": style, "notes": "", "questions": []})
            save_personas(ss.personas)
            ss.persona_id = pid
            st.rerun()


# ---------------- sidebar ----------------
with st.sidebar:
    st.title("SwitchPoint")
    st.caption("Agentic supplier-risk assistant · Nemotron · Tavily")

    st.subheader("1 · Who are you?")
    ids = [p["id"] for p in ss.personas]
    ss.persona_id = st.selectbox("Persona", ids, index=ids.index(ss.persona_id),
                                 format_func=lambda i: f"{next(p for p in ss.personas if p['id'] == i)['name']} · "
                                                       f"{next(p for p in ss.personas if p['id'] == i)['role']}")
    p = persona()
    st.caption(f"**{p['department']}**  \nFocus: {p['focus']}")
    if st.button("Add persona", use_container_width=True):
        persona_dialog()

    st.subheader("2 · Model")
    llm_provider = st.selectbox("Provider", list(PROVIDERS), index=0 if NEBIUS_API_KEY else 1)
    models = cached_models(llm_provider)
    model = st.selectbox("Nemotron model", models, help="Nemotron chat models available with this key")
    custom = st.text_input("Override model id (optional)", value="")
    model = custom.strip() or model

    st.subheader("3 · Shared documents")
    st.text_input("Folder", key="folder")
    c1, c2 = st.columns(2)
    if c1.button("Browse…", use_container_width=True):
        ss.browse_dir = ss.folder
        folder_dialog()
    with st.expander("Extractor settings"):
        ocr_provider = st.selectbox("OCR provider", list(PROVIDERS), index=1)
        ocr_model = st.selectbox("NVIDIA OCR model", OCR_MODELS, accept_new_options=True,
                                 help="nemotron-parse = NVIDIA document OCR model; a VL model works as a fallback")
        st.caption("Text PDFs, DOCX, TXT/MD/CSV are read directly. Images and scanned PDFs go to the NVIDIA OCR model.")
    if c2.button("Extract", type="primary", use_container_width=True):
        files = list_files(ss.folder)
        bar = st.progress(0.0, text="Extracting…")
        docs = []
        for i, f in enumerate(files):
            docs.append(extract_file(f, ocr_provider, ocr_model))
            bar.progress((i + 1) / max(1, len(files)), text=f"{f.name}")
        ss.docs = docs
        bar.empty()
    ok = [d for d in ss.docs if d["chars"]]
    if ss.docs:
        st.caption(f"{len(ok)}/{len(ss.docs)} files extracted · {len(chunk_docs(ok))} chunks")

    st.subheader("4 · Internet search")
    web_enabled = st.toggle("Use Tavily web search", value=bool(TAVILY_API_KEY), disabled=not TAVILY_API_KEY)

    st.subheader("5 · Notes for the assistant")
    p["notes"] = st.text_area("Added to the system prompt", value=p.get("notes", ""), height=110,
                              placeholder="e.g. We are re-tendering brake suppliers in Q1. Prefer EU suppliers.",
                              key=f"notes_{p['id']}")
    if st.button("Save notes to persona", use_container_width=True):
        save_personas(ss.personas)
        st.toast("Notes saved")

    st.divider()
    st.caption("Keys: " + " · ".join(f"{n} {'OK' if k else 'missing'}" for n, k in
                                       [("Nebius", NEBIUS_API_KEY), ("NVIDIA", NVIDIA_API_KEY), ("Tavily", TAVILY_API_KEY)]))

chunks = chunk_docs([d for d in ss.docs if d["chars"]])

# ---------------- main ----------------
tab_chat, tab_data, tab_docs, tab_prompt = st.tabs(["Assistant", "Data guide", "Documents", "System prompt"])

AGENT_LABEL = {"Supervisor": "Supervisor", "Data Agent": "Data", "Document Agent": "Documents", "Web Agent": "Web"}


def render_event(e, container):
    tag = AGENT_LABEL.get(e.agent, e.agent)
    if e.kind == "tool_call":
        container.markdown(f"`{tag}` → **{e.text.split('(')[0]}** `{e.text[len(e.text.split('(')[0]):][:200]}`")
    elif e.kind == "tool_result":
        rows = None
        if isinstance(e.data, dict):
            for key in ("suppliers", "alternatives", "results", "hits", "score_breakdown"):
                if isinstance(e.data.get(key), list) and e.data[key]:
                    rows = e.data[key]
                    break
            if e.data.get("error"):
                container.error(f"{tag} · {e.text}: {e.data['error']}")
        if rows and not e.text.startswith("ask_"):
            container.dataframe(pd.DataFrame(rows), use_container_width=True, height=min(320, 38 + 35 * len(rows)))
    elif e.kind == "plan":
        container.markdown(f"`{tag}` {e.text}")
    elif e.kind == "answer" and e.agent != "Supervisor":
        container.markdown(f"`{tag}` finished · {len(e.text)} chars")


with tab_chat:
    p = persona()
    chat = ss.chats.setdefault(p["id"], [])
    st.markdown(f"#### Hi {p['name'].split()[0]}, what do you want to know about your suppliers?")
    qcols = st.columns(max(1, len(p.get("questions", [])[:3])))
    clicked = None
    for i, q in enumerate(p.get("questions", [])[:3]):
        if qcols[i].button(q, key=f"q_{p['id']}_{i}", use_container_width=True):
            clicked = q

    for m in chat:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])
            if m.get("events"):
                with st.expander(f"Agent trace · {len(m['events'])} steps"):
                    for e in m["events"]:
                        render_event(e, st)

    question = st.chat_input("Ask the supervisor agent…") or clicked
    if question:
        with st.chat_message("user"):
            st.markdown(question)
        with st.chat_message("assistant"):
            status = st.status("Supervisor is planning…", expanded=True)
            ctx = get_script_run_ctx()
            run = Run(on_event=lambda e: (render_event(e, status),
                                          status.update(label=f"{e.agent}: {e.kind.replace('_', ' ')}")),
                      thread_init=lambda: add_script_run_ctx(threading.current_thread(), ctx), provider=llm_provider)
            try:
                answer = run_supervisor(question, chat, p, p.get("notes", ""), model, chunks, web_enabled, run)
                status.update(label=f"Done · {len(run.events)} agent steps", state="complete", expanded=False)
            except Exception as ex:
                answer = f"**Error:** {ex}"
                status.update(label="Failed", state="error")
            st.markdown(answer)
        chat += [{"role": "user", "content": question}, {"role": "assistant", "content": answer, "events": run.events}]

with tab_data:
    ov = data_tools.portfolio_overview()
    c = st.columns(4)
    c[0].metric("Suppliers", f"{ov['suppliers']:,}")
    c[1].metric("Total spend", f"€{ov['total_spend_eur'] / 1e9:.1f} bn")
    c[2].metric("Spend at High/Critical", f"€{ov['spend_high_or_critical_eur'] / 1e9:.1f} bn")
    c[3].metric("Hidden risks", f"{ov['hidden_risk_suppliers']:,}")
    if EXPLAINER_PATH.exists():
        st.iframe(EXPLAINER_PATH, height=1400)
    else:
        st.info("data_explainer.html not found next to the dataset.")

with tab_docs:
    if not ss.docs:
        st.info("Pick a folder in the sidebar and press Extract.")
    for d in ss.docs:
        with st.expander(f"{d['name']} · {d['method']} · {d['chars']:,} chars"):
            if d["error"]:
                st.error(d["error"])
            st.text(d["text"][:5000] or "(empty)")

with tab_prompt:
    st.caption("The exact supervisor system prompt built from the persona, enabled sources and notes.")
    st.code(build_system_prompt(persona(), {"data": True, "docs": len(chunks), "web": web_enabled}, persona().get("notes", "")),
            language=None)
