"""Email connector (SIMULATED inbox, MCP-style tools): incoming supplier emails -> extracted event -> recalculated risk.

The inbox is in memory. `POST /api/email/simulate` drops a fake incoming supplier email into it so the demo can show the
agent reading the email, extracting the disruption and recomputing the supplier risk with exact maths (no LLM numbers).
"""
import json
import re
from datetime import datetime

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import data_tools as dt
from llm import chat

router = APIRouter(prefix="/api/email")

SEED = [
    {"id": "m1", "from": "orders@nordic-bogie-works.example", "supplier_id": "SUPP_06901",
     "subject": "Order confirmation PO-2026-31207 (bogie frames)", "received": "2026-10-14T09:12:00",
     "body": "Dear buyer,\n\nwe confirm PO-2026-31207 for 24 bogie frames, delivery week 6/2027 as requested.\n\nBest regards\nOrder desk"},
    {"id": "m2", "from": "newsletter@railsupply-news.example", "supplier_id": None,
     "subject": "Weekly rail supply digest", "received": "2026-10-16T07:00:00",
     "body": "Steel scrap prices stable, copper +3% month on month. EU CSDDD guidance published."},
]

SCENARIOS = {
    "brake_delay": {
        "from": "logistics@elite-systems-250.example", "supplier_id": "SUPP_01703",
        "subject": "URGENT: delivery delay BCU-7 brake control units (PO-2026-48113)",
        "body": ("Dear Ms Weber,\n\nwe regret to inform you that deliveries of the BCU-7 brake control units under "
                 "PO-2026-48113 (120 units, RegioFlex) will be delayed by approximately 6 weeks.\n\n"
                 "Root cause: a furnace failure at our casting sub-supplier. Because of current cash-flow constraints the "
                 "replacement castings can only be ordered against prepayment.\n\n"
                 "New expected shipment: week 2/2027 instead of week 47/2026. We will send a recovery plan by Friday.\n\n"
                 "Kind regards\nSupply Chain Management, Elite Systems 250 (SUPP_01703)")},
    "door_delay": {
        "from": "sales@prime-solutions-778.example", "supplier_id": "SUPP_04288",
        "subject": "Door drive units DDU-4: revised delivery schedule",
        "body": ("Hello,\n\nfollowing NCR-2026-0871 we are re-qualifying the motor sub-supplier for the DDU-4 door drive "
                 "units. Open orders will ship 3 weeks later than confirmed. Quality rework on 37 units is ongoing.\n\n"
                 "Best regards\nPrime Solutions 778 (SUPP_04288)")},
}

INBOX: list[dict] = [dict(m, read=True) for m in SEED]
DISRUPTED: dict[str, dict] = {}  # supplier id -> latest assessed impact; used by recommendations and bubbles
METHOD = ("delay -> Operational Resilience +5 per week of delay (max +30); sub-supplier cause -> Sub-Tier Visibility +15; "
          "cash-flow / prepayment -> Financial Health +15; quality / NCR / rework -> Quality Risk +15; "
          "total = round(sum(weight x score)); projected delivery = rating - 2.5 per week (max -25); "
          "line-stop weeks = max(0, delay - safety stock); "
          "recommendable = risk < 50 and delivery >= 90% (same rule as the buying recommendations)")


def _find(eid: str) -> dict:
    m = next((x for x in INBOX if x["id"] == eid), None)
    if not m:
        raise HTTPException(404, f"unknown email {eid}")
    return m


def _regex_extract(m: dict) -> dict:
    text = f"{m['subject']}\n{m['body']}"
    sid = re.search(r"SUPP_\d{5}", text)
    weeks = re.search(r"(\d+)\s*weeks?", text, re.I)
    po = re.search(r"PO-\d{4}-\d{4,5}", text)
    return {"supplier_id": sid.group(0) if sid else m.get("supplier_id"), "delay_weeks": int(weeks.group(1)) if weeks else 0,
            "po": po.group(0) if po else None, "part": None, "reason": None, "extracted_by": "regex"}


def extract_event(m: dict, model: str, provider: str) -> dict:
    """LLM reads the email and returns a structured disruption event; regex fallback without a model."""
    prompt = f"""Read this supplier email and return ONLY JSON:
{{"supplier_id": "SUPP_xxxxx"|null, "part": str|null, "po": str|null, "quantity": int|null, "delay_weeks": int,
 "reason": str (max 15 words), "causes": list from ["sub_supplier","cash_flow","quality","capacity","logistics"]}}
EMAIL FROM {m['from']}
SUBJECT: {m['subject']}
{m['body']}"""
    try:
        msg = chat(model, [{"role": "user", "content": prompt}], provider=provider, max_tokens=400)
        ev = json.loads(re.search(r"\{.*\}", msg.content or "", re.S).group(0))
        ev["extracted_by"] = model
    except Exception as e:
        ev = _regex_extract(m) | {"extracted_by": f"regex fallback ({str(e)[:60]})"}
    ev["supplier_id"] = ev.get("supplier_id") or m.get("supplier_id")
    ev["delay_weeks"] = int(ev.get("delay_weeks") or 0)
    if not ev.get("causes"):
        low = m["body"].lower()
        ev["causes"] = [c for c, words in {"sub_supplier": ["sub-supplier", "sub supplier", "casting"],
                                           "cash_flow": ["cash-flow", "cash flow", "prepayment"],
                                           "quality": ["ncr", "rework", "quality"]}.items() if any(w in low for w in words)]
    return ev


def assess(sid: str, delay_weeks: int, causes: list[str]) -> dict:
    """Exact recomputation of the supplier risk after a reported delay."""
    from workspace import orders, recommendations
    r = dt._get(sid)
    changes = {"Operational_Resilience_Score": float(r.Operational_Resilience_Score) + min(30, 5 * delay_weeks)}
    if "sub_supplier" in causes:
        changes["Sub_Tier_Visibility_Score"] = float(r.Sub_Tier_Visibility_Score) + 15
    if "cash_flow" in causes:
        changes["Financial_Health_Score"] = float(r.Financial_Health_Score) + 15
    if "quality" in causes:
        changes["Quality_Risk_Score"] = float(r.Quality_Risk_Score) + 15
    wi = dt.what_if(r.supplierID, changes)
    fl = dt.fleet_impact(r.supplierID)
    stock = fl["safety_stock_weeks"] or 0
    open_orders = [o for o in orders(r.supplierID)["orders"] if o["status"] == "open"]
    deliv_after = round(float(np.clip(r[dt.DELIV] - min(25, 2.5 * delay_weeks), 0, 100)), 1)
    return {
        "supplier": {"id": r.supplierID, "name": r["Supplier Name"], "category": r.category, "country": r.country},
        "delay_weeks": delay_weeks, "causes": causes,
        "risk_before": wi["total_before"], "risk_after": wi["total_after"],
        "level_before": wi["level_before"], "level_after": wi["level_after"], "score_changes": wi["changes"],
        "exposure_before_eur": wi["exposure_before_eur"], "exposure_after_eur": wi["exposure_after_eur"],
        "delivery_before": round(float(r[dt.DELIV]), 1),
        "delivery_after": deliv_after,
        "recommendable_before": bool(r[dt.T] < 50 and r[dt.DELIV] >= 90),
        "recommendable_after": bool(wi["total_after"] < 50 and deliv_after >= 90),
        "lead_time_weeks": fl["lead_time_weeks"], "safety_stock_weeks": stock,
        "line_stop_weeks": max(0, delay_weeks - stock),
        "affected_fleets": [{"fleet": f["fleet"], "assembly": f["assembly"], "trainsets": f["trainsets"]} for f in fl["affected_fleets"]],
        "trainsets_affected": fl["trainsets_affected"],
        "open_orders": len(open_orders), "open_order_value_eur": sum(o["value_eur"] for o in open_orders),
        "alternatives": [b for b in recommendations(r.category, 4)[0]["buy"] if b["id"] != r.supplierID][:3],
        "method": METHOD, "label": "score changes are rule-based estimates; fleets, stock and orders are SIMULATED",
    }


# ---------------------------------------------------------------- endpoints
@router.get("/disruptions")
def disruptions():
    return DISRUPTED


@router.get("/inbox")
def inbox():
    return sorted(INBOX, key=lambda m: m["received"], reverse=True)


class Simulate(BaseModel):
    scenario: str = "brake_delay"


@router.post("/simulate")
def simulate(req: Simulate):
    s = SCENARIOS.get(req.scenario)
    if not s:
        raise HTTPException(400, f"scenario must be one of {list(SCENARIOS)}")
    m = s | {"id": f"m{len(INBOX) + 1}", "received": datetime.now().isoformat(timespec="seconds"), "read": False, "scenario": req.scenario}
    INBOX.append(m)
    return m


class AnalyzeReq(BaseModel):
    model: str = "nvidia/nemotron-3-super-120b-a12b"
    provider: str = "NVIDIA API (build.nvidia.com)"


@router.post("/{eid}/analyze")
def analyze(eid: str, req: AnalyzeReq):
    m = _find(eid)
    m["read"] = True
    ev = extract_event(m, req.model, req.provider)
    if not ev["supplier_id"]:
        return {"email": m, "event": ev, "impact": None, "note": "No supplier referenced in this email."}
    try:
        impact = assess(ev["supplier_id"], ev["delay_weeks"], ev["causes"])
    except ValueError as e:
        return {"email": m, "event": ev, "impact": None, "note": str(e)}
    m["analysis"] = {"risk_before": impact["risk_before"], "risk_after": impact["risk_after"]}
    DISRUPTED[impact["supplier"]["id"]] = {k: impact[k] for k in ("risk_after", "delivery_after", "delay_weeks", "recommendable_after")} | {
        "email": m["subject"]}
    return {"email": m, "event": ev, "impact": impact}


# ---------------------------------------------------------------- agent tools (MCP-style connector)
def tool_list_inbox(unread_only: bool = False) -> dict:
    return {"connector": "email (SIMULATED inbox)",
            "emails": [{k: m[k] for k in ("id", "from", "subject", "received", "read", "supplier_id")}
                       for m in inbox() if m["read"] is False or not unread_only]}


def tool_read_email(email_id: str) -> dict:
    m = _find(email_id)
    m["read"] = True
    return {k: m[k] for k in ("id", "from", "subject", "received", "body", "supplier_id")}


def tool_assess_delay(supplier_id: str, delay_weeks: int, causes: list[str] | None = None) -> dict:
    impact = assess(supplier_id, int(delay_weeks), causes or [])
    DISRUPTED[impact["supplier"]["id"]] = {k: impact[k] for k in ("risk_after", "delivery_after", "delay_weeks", "recommendable_after")}
    return impact


TOOLS = {
    "list_inbox": (tool_list_inbox, "List emails in the procurement inbox (email connector).",
                   {"unread_only": {"type": "boolean"}}),
    "read_email": (tool_read_email, "Read the full text of one email by id.", {"email_id": {"type": "string"}}),
    "assess_delay": (tool_assess_delay, "Recompute a supplier's risk exactly after a reported delivery delay: new total risk, "
                     "level, exposure, projected delivery, line-stop weeks vs safety stock, affected fleets, open orders, alternatives.",
                     {"supplier_id": {"type": "string"}, "delay_weeks": {"type": "integer"},
                      "causes": {"type": "array", "items": {"type": "string", "enum": ["sub_supplier", "cash_flow", "quality", "capacity", "logistics"]}}}),
}
