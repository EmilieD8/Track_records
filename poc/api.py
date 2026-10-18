"""SupplyGuard API: FastAPI wrapper around the agents, data tools and extractor. Serves the React build too."""
import json
import queue
import threading
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import data_tools as dt
from agents import Run, build_system_prompt, run_supervisor
from config import ENRICH_DIR, NEBIUS_API_KEY, NVIDIA_API_KEY, OCR_MODELS, PROVIDERS, ROOT, TAVILY_API_KEY
from extract import chunk_docs, extract_file, list_files
from llm import list_models
from personas import load_personas, save_personas

app = FastAPI(title="SupplyGuard API")
from workspace import router as workspace_router  # noqa: E402
app.include_router(workspace_router)
STATE = {"docs": [], "folder": str(ROOT / "sample_docs")}
WEB_DIST = ROOT.parent / "web" / "dist"
PILLARS = {
    "Operations": ["Operational_Resilience_Score", "Quality_Risk_Score", "Sub_Tier_Visibility_Score", "Digital_Security_Score"],
    "Financial": ["Financial_Health_Score", "Credit_Rating_Score"],
    "Legal & governance": ["Compliance_Risk_Score", "Governance_Risk_Score"],
    "ESG & people": ["ESG_Performance_Score", "Safety_Incident_Score", "Labor_Stability_Score"],
    "Location": ["Geopolitical_Risk_Score", "Environmental_Exposure_Score", "Political_Stability_Score"],
    "Reputation": ["Industry_Benchmark_Score", "Market_Sentiment_Score", "Media_Sentiment_Score", "External_Intelligence_Score"],
}
CRIT_W = {"critical": 3, "mid": 2, "simple": 1}


def clean(o):
    """JSON-safe: numpy scalars -> python, NaN -> None."""
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if np.isnan(o) else float(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


def bom() -> pd.DataFrame:
    return pd.read_csv(ENRICH_DIR / "fleet_bom_SIMULATED.csv").fillna("")


def node_info(sid: str) -> dict:
    r = dt._get(sid)
    out = dt._row_summary(r)
    out["pillars"] = {p: round(float(np.mean([r[c] for c in cols])), 1) for p, cols in PILLARS.items()}
    for k in ("lead_time_weeks", "safety_stock_weeks", "iris_certified", "qualified_alternatives", "category_criticality"):
        if k in r:
            out[k] = r[k]
    return clean(out)


# ---------------------------------------------------------------- meta
@app.get("/api/status")
def status():
    return {"keys": {"nebius": bool(NEBIUS_API_KEY), "nvidia": bool(NVIDIA_API_KEY), "tavily": bool(TAVILY_API_KEY)},
            "providers": list(PROVIDERS), "ocr_models": OCR_MODELS, "folder": STATE["folder"],
            "docs": len(STATE["docs"])}


@app.get("/api/models")
def models(provider: str = "NVIDIA API (build.nvidia.com)"):
    return {"models": list_models(provider)}


@app.get("/api/personas")
def personas():
    return load_personas()


class Persona(BaseModel):
    id: str | None = None
    email: str = ""
    ui_config: dict | None = None
    ui_spec: dict | None = None
    name: str
    role: str
    department: str = ""
    focus: str = ""
    style: str = "Concise, cite sources"
    notes: str = ""
    seniority: str = ""
    questions: list[str] = []


class Login(BaseModel):
    email: str


@app.post("/api/login")
def login(req: Login):
    """Demo sign-in: the email identifies the user (no password check in this prototype)."""
    p = next((x for x in load_personas() if x["email"].lower() == req.email.strip().lower()), None)
    if not p:
        raise HTTPException(401, "Unknown user")
    return p


@app.get("/api/demo-accounts")
def demo_accounts():
    return [{"email": p["email"], "name": p["name"], "role": p["role"]} for p in load_personas()]


@app.post("/api/personas")
def upsert_persona(p: Persona):
    ps = load_personas()
    d = p.model_dump()
    d["id"] = d["id"] or f"{p.name.lower().replace(' ', '_')}_{len(ps)}"
    ps = [x for x in ps if x["id"] != d["id"]] + [d]
    save_personas(ps)
    return d


# ---------------------------------------------------------------- data
@app.get("/api/overview")
def overview():
    ov = dt.portfolio_overview()
    top = dt.rank_suppliers(sort_by="exposure", n=20, priority_only=True)["suppliers"]
    hidden = dt.rank_suppliers(sort_by="spend", n=10, hidden_risk_only=True)["suppliers"]
    d = dt.df()
    cats = (d.groupby("category").agg(spend=(dt.PO, "sum"), exposure=("exposure_eur", "sum"), risk=(dt.T, "mean"),
                                       n=("supplierID", "count")).reset_index().sort_values("exposure", ascending=False)
            if "category" in d else pd.DataFrame())
    return clean({"overview": ov, "priority": top, "hidden": hidden, "categories": cats.round(1).to_dict("records")})


@app.get("/api/suppliers")
def suppliers(sort_by: str = "exposure", n: int = 20, level: str | None = None, category: str | None = None,
              hidden_risk_only: bool = False, priority_only: bool = False, q: str | None = None):
    if q:
        d = dt.df()
        hit = d[d.supplierID.str.contains(q, case=False) | d["Supplier Name"].str.contains(q, case=False)].head(n)
        return clean({"suppliers": [dt._row_summary(r) for _, r in hit.iterrows()]})
    return clean(dt.rank_suppliers(sort_by=sort_by, n=n, level=level, category=category,
                                   hidden_risk_only=hidden_risk_only, priority_only=priority_only))


@app.get("/api/supplier/{sid}")
def supplier(sid: str):
    try:
        base = dt.get_supplier(sid)
    except ValueError as e:
        raise HTTPException(404, str(e))
    sid = base["supplier_id"]
    docs = [{"name": d["name"], "method": d["method"],
             "snippet": d["text"][max(0, d["text"].find(sid) - 200): d["text"].find(sid) + 600]}
            for d in STATE["docs"] if sid in d["text"]]
    return clean({**base, **node_info(sid), "history": dt.risk_history(sid), "fleet": dt.fleet_impact(sid),
                  "alternatives": dt.find_alternatives(sid, 5)["alternatives"], "documents": docs})


class WhatIf(BaseModel):
    changes: dict[str, float]


@app.post("/api/supplier/{sid}/what-if")
def what_if(sid: str, body: WhatIf):
    return clean(dt.what_if(sid, body.changes))


@app.get("/api/fleets")
def fleets():
    b = bom()
    return [{"fleet": f, "trainsets": int(g.trainsets.iloc[0]), "assemblies": len(g)} for f, g in b.groupby("fleet")]


@app.get("/api/graph")
def graph(fleet: str, candidates: int = 3):
    """Mind map: fleet -> assemblies -> candidate suppliers (current primary + best alternatives)."""
    b = bom()
    g = b[b.fleet == fleet]
    if g.empty:
        raise HTTPException(404, "unknown fleet")
    assemblies = []
    for _, row in g.iterrows():
        prim = row.primary_supplier
        alts = [a["supplier_id"] for a in dt.find_alternatives(prim, candidates)["alternatives"]]
        if row.second_source and row.second_source not in alts:
            alts = [row.second_source] + alts[: candidates - 1]
        assemblies.append({"assembly": row.assembly, "units_per_trainset": int(row.units_per_trainset),
                           "single_source": bool(row.single_source), "primary": prim,
                           "candidates": [node_info(s) for s in [prim] + alts]})
    return {"fleet": fleet, "trainsets": int(g.trainsets.iloc[0]), "assemblies": assemblies}


class OrderSel(BaseModel):
    selection: dict[str, str]  # assembly -> supplier id
    volumes: dict[str, float] = {}  # assembly -> order volume EUR (defaults to chosen supplier's PO volume)


@app.post("/api/order-risk")
def order_risk(body: OrderSel):
    """Aggregate risk of a set of supplier choices (one per assembly). Exact maths, no LLM."""
    rows = []
    for asm, sid in body.selection.items():
        r = dt._get(sid)
        w = CRIT_W.get(r.get("category_criticality", "mid"), 2)
        rows.append((asm, r, w))
    if not rows:
        raise HTTPException(400, "empty selection")
    wsum = sum(w for *_, w in rows)
    avg = sum(w * r[dt.T] for _, r, w in rows) / wsum
    pillars = {p: round(sum(w * np.mean([r[c] for c in cols]) for _, r, w in rows) / wsum, 1) for p, cols in PILLARS.items()}
    weakest = max(rows, key=lambda x: x[1][dt.T])
    on_time = float(np.prod([r[dt.DELIV] / 100 for _, r, _ in rows]))
    return clean({
        "weighted_risk": round(avg, 1), "level": dt.level(avg), "pillars": pillars,
        "weakest_link": {"assembly": weakest[0], "supplier_id": weakest[1].supplierID, "total_risk": int(weakest[1][dt.T])},
        "on_time_probability": round(on_time * 100, 1),
        "exposure_eur": round(sum(body.volumes.get(a, float(r[dt.PO])) * float(r[dt.T]) / 100 for a, r, _ in rows)),
        "order_volume_eur": round(sum(body.volumes.get(a, float(r[dt.PO])) for a, r, _ in rows)),
        "suppliers": len(rows),
        "method": "criticality-weighted mean of supplier totals (critical=3, mid=2, simple=1); weakest link = max; "
                  "on-time = product of delivery ratings",
    })


# ---------------------------------------------------------------- documents
@app.get("/api/fs")
def fs(path: str | None = None):
    p = Path(path or STATE["folder"]).expanduser()
    if not p.is_dir():
        raise HTTPException(400, "not a directory")
    try:
        dirs = sorted(x.name for x in p.iterdir() if x.is_dir() and not x.name.startswith("."))
    except PermissionError:
        dirs = []
    files = list_files(str(p))
    return {"path": str(p), "parent": str(p.parent), "dirs": dirs[:200],
            "files": [str(f.relative_to(p)) for f in files[:300]], "file_count": len(files)}


class ExtractReq(BaseModel):
    folder: str
    provider: str = "NVIDIA API (build.nvidia.com)"
    model: str = "nvidia/nemotron-parse"


@app.post("/api/extract")
def extract(req: ExtractReq):
    files = list_files(req.folder)
    STATE["folder"] = req.folder
    STATE["docs"] = [extract_file(f, req.provider, req.model) for f in files]
    return docs_list()


@app.get("/api/docs")
def docs_list():
    return [{"name": d["name"], "path": d["path"], "method": d["method"], "chars": d["chars"], "error": d["error"],
             "preview": d["text"][:1500]} for d in STATE["docs"]]


# ---------------------------------------------------------------- agents
class ChatReq(BaseModel):
    question: str
    persona_id: str
    notes: str = ""
    model: str = "nvidia/nemotron-3-super-120b-a12b"
    provider: str = "NVIDIA API (build.nvidia.com)"
    web: bool = True
    history: list[dict] = []


def _persona(pid: str) -> dict:
    return next((p for p in load_personas() if p["id"] == pid), load_personas()[0])


@app.post("/api/system-prompt")
def system_prompt(req: ChatReq):
    chunks = chunk_docs([d for d in STATE["docs"] if d["chars"]])
    return {"prompt": build_system_prompt(_persona(req.persona_id), {"data": True, "docs": len(chunks), "web": req.web},
                                          req.notes)}


@app.post("/api/chat")
def chat(req: ChatReq):
    q: queue.Queue = queue.Queue()
    chunks = chunk_docs([d for d in STATE["docs"] if d["chars"]])
    persona = _persona(req.persona_id)

    def emit(e):
        data = e.data if isinstance(e.data, dict) else None
        q.put({"type": "event", **clean(asdict(e) | {"data": data})})

    def work():
        run = Run(on_event=emit, provider=req.provider)
        try:
            ans = run_supervisor(req.question, req.history, persona, req.notes, req.model, chunks,
                                 req.web and bool(TAVILY_API_KEY), run)
            q.put({"type": "final", "answer": ans})
        except Exception as ex:
            q.put({"type": "error", "error": str(ex)})
        q.put(None)

    threading.Thread(target=work, daemon=True).start()

    def stream():
        while (item := q.get()) is not None:
            yield f"data: {json.dumps(item, default=str)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.on_event("startup")
def _auto_extract():
    if not (NVIDIA_API_KEY or NEBIUS_API_KEY) or not Path(STATE["folder"]).is_dir():
        return
    provider = "NVIDIA API (build.nvidia.com)" if NVIDIA_API_KEY else "Nebius Token Factory"
    threading.Thread(target=lambda: STATE.update(docs=[extract_file(f, provider, OCR_MODELS[0])
                                                       for f in list_files(STATE["folder"])]), daemon=True).start()


# ---------------------------------------------------------------- frontend
if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = WEB_DIST / path
        return FileResponse(f if path and f.is_file() else WEB_DIST / "index.html")
