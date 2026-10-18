"""Endpoints for the generated workspace: bubble hierarchy, recommendations, buying history, buyer notes, UI generation."""
import copy
import json
import re
import zlib
from datetime import date, timedelta

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel

import data_tools as dt
from config import ROOT
from llm import chat

router = APIRouter(prefix="/api")
NOTES_PATH = ROOT / "data" / "buyer_notes.json"
TODAY = date(2026, 10, 18)

PARTS = {
    "Brake systems": ["Brake control unit BCU-7", "Brake caliper unit", "Brake pad set"],
    "Bogies & wheelsets": ["Bogie frame", "Wheelset", "Axle bearing unit"],
    "Traction & propulsion": ["Traction converter", "Traction motor", "Gearbox"],
    "Signalling & ETCS": ["ETCS onboard unit", "Balise transmission module", "DMI screen"],
    "Doors & access systems": ["Door drive unit DDU-4", "Door leaf", "Step module"],
    "HVAC": ["HVAC roof unit", "Cab climate unit"],
}


def _size(score: float) -> float:
    return round(max(4.0, 100 - float(score)) ** 1.5 / 10, 2)


def _f(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else x


# ---------------------------------------------------------------- projects & mind map
def _bom():
    import pandas as pd
    return pd.read_csv(ROOT / "data" / "enrichment" / "fleet_bom_SIMULATED.csv").fillna("")


@router.get("/projects")
def projects():
    b = _bom()
    return [{"id": f, "name": f"Project {f}", "trainsets": int(g.trainsets.iloc[0]), "items": len(g)} for f, g in b.groupby("fleet")]


def _supplier_node(r) -> dict:
    factors = [{"name": dt.nice(c), "kind": "factor", "risk": int(r[c]), "weight": dt.WEIGHTS[c], "value": _size(r[c])} for c in dt.SUBS]
    return {"name": r["Supplier Name"], "id": r.supplierID, "kind": "supplier", "risk": int(r[dt.T]),
            "po": float(r[dt.PO]), "delivery": float(r[dt.DELIV]), "country": r.country,
            "hidden": bool(r.hidden_risk), "priority": bool(r.priority), "children": factors}


@router.get("/bubbles")
def bubbles(project: str, per_item: int = 8):
    """Mind map: project -> items in the project (BOM) -> qualified suppliers per item (with risk) -> 18 risks."""
    b, d = _bom(), dt.df()
    g = b[b.fleet == project]
    items = []
    for _, row in g.iterrows():
        pool = d[d.category == row.assembly].nlargest(60, dt.PO)
        ids = [row.primary_supplier] + ([row.second_source] if row.second_source else [])
        ids += [s for s in pool.supplierID if s not in ids][: max(0, per_item - len(ids))]
        sup = d.set_index("supplierID").loc[ids].reset_index()
        part = PARTS.get(row.assembly, [row.assembly])[0]
        items.append({"name": part, "kind": "item", "category": row.assembly, "units": int(row.units_per_trainset),
                      "single_source": bool(row.single_source), "current": row.primary_supplier,
                      "risk": int(d.loc[d.supplierID == row.primary_supplier, dt.T].iloc[0]),
                      "children": [_supplier_node(r) | {"current": r.supplierID == row.primary_supplier} for _, r in sup.iterrows()]})
    return {"name": f"Project {project}", "kind": "root", "trainsets": int(g.trainsets.iloc[0]) if len(g) else 0, "children": items}


# ---------------------------------------------------------------- recommendations
@router.get("/recommendations")
def recommendations(category: str = "", n: int = 3):
    from email_connector import DISRUPTED
    d = dt.df()
    cats = [category] if category else sorted(d.category.unique())
    out = []
    for cat in cats:
        g = d[d.category == cat]
        med = g[dt.PO].median()
        pool = g[(g[dt.T] < 50) & (g[dt.DELIV] >= 90) & (g[dt.PO] >= med)]
        pool = pool[~pool.supplierID.isin([k for k, v in DISRUPTED.items() if not v["recommendable_after"]])]
        pool = pool.assign(score=pool[dt.T] - 0.5 * (pool[dt.DELIV] - 90) - 5 * pool.iris_certified.astype(int))
        buy = []
        for _, r in pool.nsmallest(n, "score").iterrows():
            reasons = [f"risk {int(r[dt.T])} ({r[f'{dt.T}_Level']})", f"delivery {r[dt.DELIV]:.0f}%"]
            if r.iris_certified:
                reasons.append("IRIS certified")
            if r.max_sub < 75:
                reasons.append("no Critical sub-score")
            reasons.append(f"already handles €{r[dt.PO] / 1e6:.1f}M/yr")
            buy.append({"id": r.supplierID, "name": r["Supplier Name"], "risk": int(r[dt.T]), "country": r.country,
                        "delivery": float(r[dt.DELIV]), "reasons": reasons})
        avoid = [{"id": r.supplierID, "name": r["Supplier Name"], "risk": int(r[dt.T]),
                  "reason": f"{r.worst_factor} {int(r.max_sub)}, €{r.exposure_eur / 1e6:.1f}M exposed"}
                 for _, r in g[g[dt.T] >= 60].nlargest(2, "exposure_eur").iterrows()]
        avoid = [{"id": k, "name": dt._get(k)["Supplier Name"], "risk": v["risk_after"],
                  "reason": f"reported {v['delay_weeks']}-week delay (email), delivery now {v['delivery_after']:.0f}%"}
                 for k, v in DISRUPTED.items() if not v["recommendable_after"] and dt._get(k).category == cat] + avoid
        out.append({"category": cat, "buy": buy, "avoid": avoid})
    return out


# ---------------------------------------------------------------- buying history (SIMULATED)
@router.get("/supplier/{sid}/orders")
def orders(sid: str):
    r = dt._get(sid)
    rng = np.random.default_rng(zlib.crc32(r.supplierID.encode()))
    parts = PARTS.get(r.category, [f"{r.category} component"])
    annual = float(r[dt.PO])
    n_orders = int(np.clip(annual / 250_000, 6, 48))
    p_on_time, p_conf, p_change = r[dt.DELIV] / 100, r[dt.CONF] / 100, r[dt.CHG] / 100
    rows = []
    for i in range(n_orders):
        placed = TODAY - timedelta(days=int(rng.integers(5, 730)))
        lead = int(r.get("lead_time_weeks", 12) or 12) * 7
        promised = placed + timedelta(days=lead)
        late = 0 if rng.random() < p_on_time else int(rng.exponential(12) + 2)
        delivered = promised + timedelta(days=late)
        status = "open" if delivered > TODAY else ("late" if late else "on time")
        value = annual * 2 / n_orders * float(rng.uniform(.5, 1.5))
        rows.append({"po": f"PO-{placed.year}-{int(rng.integers(10000, 99999))}", "placed": placed.isoformat(),
                     "part": parts[int(rng.integers(len(parts)))], "value_eur": round(value),
                     "promised": promised.isoformat(), "delivered": None if status == "open" else delivered.isoformat(),
                     "days_late": late if status != "open" else None, "status": status,
                     "confirmed_in_time": bool(rng.random() < p_conf), "changed": bool(rng.random() < p_change)})
    rows.sort(key=lambda x: x["placed"], reverse=True)
    done = [x for x in rows if x["status"] != "open"]
    return {"label": "SIMULATED purchase-order ledger (consistent with delivery/confirmation/change rates)",
            "orders": rows, "on_time_pct": round(100 * sum(x["status"] == "on time" for x in done) / max(1, len(done)), 1),
            "total_value_eur": round(sum(x["value_eur"] for x in rows))}


# ---------------------------------------------------------------- buyer notes
SEED_NOTES = {
    "SUPP_09733": [
        {"author": "Lena Weber", "role": "Strategic Buyer", "date": "2026-09-30", "rating": 4,
         "text": "Q3 business review: on-time delivery of brake control units dropped to 74%. Management mentioned cash-flow pressure; two casting sub-suppliers now on prepayment."},
        {"author": "Jonas Richter", "role": "Risk Manager", "date": "2026-10-06", "rating": 3,
         "text": "Single source for RegioFlex and ICX-300 brakes. Asked procurement to start qualifying a second source and request a bank guarantee on open orders > €5M."}],
    "SUPP_06901": [
        {"author": "Lena Weber", "role": "Strategic Buyer", "date": "2026-08-21", "rating": 5,
         "text": "Long-standing bogie partner, good engineering support. Welding line running 2 shifts instead of 3 (labour shortage). EN 15085 certificate renewal still pending."}],
    "SUPP_04288": [
        {"author": "Aylin Demir", "role": "Maintenance Engineer", "date": "2026-09-25", "rating": 4,
         "text": "NCR-2026-0871: 37 door drive units overheating. Supplier changed motor sub-supplier without PCN. 100% incoming inspection until corrective action."}],
}


def _load_notes() -> dict:
    if NOTES_PATH.exists():
        return json.loads(NOTES_PATH.read_text())
    return copy.deepcopy(SEED_NOTES)


@router.get("/supplier/{sid}/notes")
def get_notes(sid: str):
    return _load_notes().get(dt._get(sid).supplierID, [])


class Note(BaseModel):
    author: str
    role: str = ""
    text: str
    rating: int = 3


@router.post("/supplier/{sid}/notes")
def add_note(sid: str, note: Note):
    sid = dt._get(sid).supplierID
    notes = _load_notes()
    notes.setdefault(sid, []).insert(0, note.model_dump() | {"date": date.today().isoformat()})
    NOTES_PATH.parent.mkdir(parents=True, exist_ok=True)
    NOTES_PATH.write_text(json.dumps(notes, indent=2, ensure_ascii=False))
    return notes[sid]


# ---------------------------------------------------------------- generative UI spec
PANELS = ["bubbles", "recommendations", "kpis", "hidden_risks", "copilot"]
KPIS = ["spend", "high_critical_spend", "priority", "hidden", "exposure", "avg_risk", "on_time"]


class GenReq(BaseModel):
    persona: dict
    config: dict
    model: str = "nvidia/nemotron-3-super-120b-a12b"
    provider: str = "NVIDIA API (build.nvidia.com)"


def _fallback(p: dict, c: dict) -> dict:
    return {"title": f"{p.get('role', 'Buyer')} workspace", "greeting": f"Welcome {p.get('name', '').split(' ')[0]}",
            "summary": f"Focused on {', '.join(c.get('categories') or ['all categories'])}.",
            "kpis": ["spend", "high_critical_spend", "priority", "hidden"], "panels": [x for x in PANELS if x in c.get("panels", PANELS)],
            "highlight_categories": c.get("categories", [])[:3], "recommendation_focus": "lowest risk with proven delivery"}


@router.post("/generate-ui")
def generate_ui(req: GenReq):
    p, c = req.persona, req.config
    prompt = f"""You design a dashboard for a railway procurement user. Return ONLY a JSON object, no prose.
User: {json.dumps({k: p.get(k) for k in ('name', 'role', 'department', 'focus', 'seniority', 'notes')})}
User configuration: {json.dumps(c)}
JSON schema:
{{"title": str (max 6 words), "greeting": str (max 12 words, personal),
 "summary": str (max 30 words: what this workspace focuses on and why, in the user's language of work),
 "kpis": list of 4 from {KPIS},
 "panels": ordered list from {PANELS} (only panels the user enabled: {c.get('panels', PANELS)}),
 "highlight_categories": list of up to 3 rail part categories from the configuration,
 "recommendation_focus": str (max 10 words)}}"""
    try:
        msg = chat(req.model, [{"role": "user", "content": prompt}], provider=req.provider, max_tokens=600)
        spec = json.loads(re.search(r"\{.*\}", msg.content or "", re.S).group(0))
        fb = _fallback(p, c)
        spec["kpis"] = [k for k in spec.get("kpis", []) if k in KPIS][:4] or fb["kpis"]
        spec["panels"] = [x for x in spec.get("panels", []) if x in c.get("panels", PANELS)] or fb["panels"]
        for k in ("title", "greeting", "summary", "recommendation_focus"):
            spec[k] = str(spec.get(k) or fb[k])[:200]
        spec["highlight_categories"] = [x for x in spec.get("highlight_categories", []) if x in (c.get("categories") or [])][:3]
        spec["generated_by"] = req.model
        return spec
    except Exception as e:
        return _fallback(p, c) | {"generated_by": f"fallback ({str(e)[:80]})"}


@router.get("/categories")
def categories():
    d = dt.df()
    return [{"category": k, "n": int(len(g)), "spend": float(g[dt.PO].sum()), "criticality": g.category_criticality.iloc[0]}
            for k, g in d.groupby("category")]


# ---------------------------------------------------------------- news (Tavily)
@router.get("/supplier/{sid}/news")
def supplier_news(sid: str):
    from concurrent.futures import ThreadPoolExecutor
    from urllib.parse import urlparse

    from config import TAVILY_API_KEY
    from web import web_search
    r = dt._get(sid)
    if not TAVILY_API_KEY:
        return {"note": "Tavily key missing", "items": []}
    topic = r.category.split(" &")[0].lower()
    queries = [f"railway {topic} supplier news 2026", f"{r.country} {topic} manufacturing supply chain disruption",
               f"rail rolling stock {topic} shortage delay"]
    with ThreadPoolExecutor(3) as ex:
        res = list(ex.map(lambda q: web_search(q, topic="news", max_results=5), queries))
    seen, items = set(), []
    for q, rr in zip(queries, res):
        for x in rr.get("results", []):
            if x["url"] in seen:
                continue
            seen.add(x["url"])
            items.append({**x, "source": urlparse(x["url"]).netloc.replace("www.", ""), "query": q})
    return {"note": f"Supplier names are anonymized, so news is searched by part category ({r.category}) and country ({r.country}).",
            "items": items[:12]}


# ---------------------------------------------------------------- procurement intake (chat / PDF -> items -> supplier bubbles)
EU = {"Germany", "France", "Austria", "Netherlands", "Sweden", "Denmark", "Belgium", "Poland", "Czechia", "Spain",
      "Italy", "Portugal", "Hungary", "Romania", "Slovakia"}


def _categories() -> list[str]:
    return sorted(dt.df().category.unique())


def _keyword_items(text: str) -> list[dict]:
    """Fallback without LLM: match part names / category words line by line."""
    out, low = [], text.lower()
    for cat in _categories():
        words = [w for w in re.findall(r"[a-z]+", cat.lower()) if len(w) > 3] + \
                [w.lower() for p in PARTS.get(cat, []) for w in re.findall(r"[A-Za-z]+", p) if len(w) > 4]
        if any(w in low for w in words):
            out.append({"item": PARTS.get(cat, [cat])[0], "category": cat, "quantity": None, "needed_by": None})
    return out


def parse_items(text: str, model: str, provider: str) -> dict:
    cats = _categories()
    prompt = f"""Extract the items a railway buyer needs to procure from the text below.
Return ONLY JSON: {{"project": str|null, "items": [{{"item": str (short part name), "category": one of {cats},
"quantity": int|null, "needed_by": str|null}}]}}. Map every item to the closest category. Ignore anything that is not an item.
TEXT:
{text[:6000]}"""
    try:
        msg = chat(model, [{"role": "user", "content": prompt}], provider=provider, max_tokens=1200)
        js = json.loads(re.search(r"\{.*\}", msg.content or "", re.S).group(0))
        items = [i for i in js.get("items", []) if isinstance(i, dict) and i.get("category") in cats and i.get("item")]
        return {"project": js.get("project"), "items": items, "parsed_by": model}
    except Exception as e:
        return {"project": None, "items": _keyword_items(text), "parsed_by": f"keyword fallback ({str(e)[:60]})"}


class ParseReq(BaseModel):
    text: str
    model: str = "nvidia/nemotron-3-super-120b-a12b"
    provider: str = "NVIDIA API (build.nvidia.com)"


@router.post("/procurement/parse")
def procurement_parse(req: ParseReq):
    return parse_items(req.text, req.model, req.provider)


from fastapi import File, Form, UploadFile  # noqa: E402


@router.post("/procurement/upload")
async def procurement_upload(file: UploadFile = File(...), model: str = Form("nvidia/nemotron-3-super-120b-a12b"),
                             provider: str = Form("NVIDIA API (build.nvidia.com)"), ocr_model: str = Form("nvidia/nemotron-parse")):
    from pathlib import Path

    from extract import extract_file
    up = ROOT / ".cache" / "uploads"
    up.mkdir(parents=True, exist_ok=True)
    dest = up / Path(file.filename or "upload.pdf").name
    dest.write_bytes(await file.read())
    ocr_provider = "NVIDIA API (build.nvidia.com)" if "nemotron-parse" in ocr_model else provider
    rec = extract_file(dest, ocr_provider, ocr_model)
    if rec["error"]:
        return {"file": dest.name, "method": rec["method"], "error": rec["error"], "items": []}
    return {"file": dest.name, "method": rec["method"], "chars": rec["chars"], **parse_items(rec["text"], model, provider)}


class BubbleReq(BaseModel):
    items: list[dict]
    per_item: int = 8
    eu_only: bool = False


@router.post("/procurement/bubbles")
def procurement_bubbles(req: BubbleReq):
    """Root -> one bubble per requested item -> suppliers that can deliver it (name + risk)."""
    from email_connector import DISRUPTED
    d = dt.df()
    children = []
    for it in req.items:
        pool = d[d.category == it["category"]]
        if req.eu_only:
            pool = pool[pool.country.isin(EU)]
        pool = pool.nlargest(max(3, req.per_item), dt.PO)  # proven volume = can deliver
        sups = [{"name": r["Supplier Name"], "id": r.supplierID, "kind": "supplier", "risk": int(r[dt.T]), "value": _size(r[dt.T]),
                 "po": float(r[dt.PO]), "delivery": float(r[dt.DELIV]), "country": r.country} for _, r in pool.iterrows()]
        for s in sups:  # suppliers with an analysed disruption email carry the recalculated values
            if s["id"] in DISRUPTED:
                x = DISRUPTED[s["id"]]
                s.update(risk=x["risk_after"], value=_size(x["risk_after"]), delivery=x["delivery_after"], alert=f"{x['delay_weeks']}-week delay reported")
        if sups:
            children.append({"name": it["item"], "kind": "item", "category": it["category"], "quantity": it.get("quantity"),
                             "needed_by": it.get("needed_by"), "risk": min(s["risk"] for s in sups), "n": len(sups), "children": sups})
    return {"name": "Procurement request", "kind": "root", "children": children}


# ---------------------------------------------------------------- user procurement projects (chat memory)
USER_PROJECTS = ROOT / "data" / "user_projects.json"


def _load_up() -> dict:
    return json.loads(USER_PROJECTS.read_text()) if USER_PROJECTS.exists() else {}


@router.get("/user-projects")
def list_user_projects(email: str):
    return _load_up().get(email.lower(), [])


class UserProject(BaseModel):
    email: str
    project: dict


@router.post("/user-projects")
def save_user_project(req: UserProject):
    allp = _load_up()
    mine = allp.setdefault(req.email.lower(), [])
    p = dict(req.project)
    p.setdefault("id", f"p{int(__import__('time').time() * 1000)}")
    p.setdefault("created", date.today().isoformat())
    p["updated"] = date.today().isoformat()
    allp[req.email.lower()] = [x for x in mine if x["id"] != p["id"]] + [p]
    USER_PROJECTS.parent.mkdir(parents=True, exist_ok=True)
    USER_PROJECTS.write_text(json.dumps(allp, indent=2, ensure_ascii=False))
    return p


@router.delete("/user-projects/{pid}")
def delete_user_project(pid: str, email: str):
    allp = _load_up()
    allp[email.lower()] = [x for x in allp.get(email.lower(), []) if x["id"] != pid]
    USER_PROJECTS.write_text(json.dumps(allp, indent=2, ensure_ascii=False))
    return {"ok": True}


class RecReq(BaseModel):
    items: list[dict]


@router.post("/procurement/recommendations")
def procurement_recommendations(req: RecReq):
    """Best supplier per requested item (exact data, no LLM)."""
    out = []
    for it in req.items:
        r = recommendations(it["category"], 3)
        out.append({"item": it["item"], "category": it["category"], "quantity": it.get("quantity"), **(r[0] if r else {"buy": [], "avoid": []})})
    return out
