from functools import lru_cache

import numpy as np
import pandas as pd

from config import DATASET_PATH, ENRICH_DIR

WEIGHTS = {
    "Operational_Resilience_Score": .10, "Financial_Health_Score": .10, "Quality_Risk_Score": .10,
    "Compliance_Risk_Score": .08, "Credit_Rating_Score": .06, "Safety_Incident_Score": .06,
    "Sub_Tier_Visibility_Score": .06, "Geopolitical_Risk_Score": .05, "Governance_Risk_Score": .05,
    "ESG_Performance_Score": .05, "Environmental_Exposure_Score": .04, "Labor_Stability_Score": .04,
    "Digital_Security_Score": .04, "Political_Stability_Score": .04, "Industry_Benchmark_Score": .04,
    "Market_Sentiment_Score": .03, "Media_Sentiment_Score": .03, "External_Intelligence_Score": .03,
}
SUBS = list(WEIGHTS)
PO, T = "Purchase Order Volume (EUR)", "Total_Risk_Index"
DELIV, CONF, CHG = "Supplier Delivery Rating", "Order Confirmation Rate", "Order Change Rate"
SRC, CX = "Sourcing Risk Level", "Supply Chain Complexity"


def level(score: float) -> str:
    return "Low" if score < 25 else "Medium" if score < 50 else "High" if score < 75 else "Critical"


def nice(col: str) -> str:
    return col.replace("_Score", "").replace("_", " ")


def total_from(scores: dict) -> int:
    return int(np.round(sum(WEIGHTS[k] * scores[k] for k in WEIGHTS)))


@lru_cache(maxsize=1)
def df() -> pd.DataFrame:
    d = pd.read_csv(DATASET_PATH)
    enr = ENRICH_DIR / "suppliers_enriched_SIMULATED.csv"
    if enr.exists():
        d = d.merge(pd.read_csv(enr).drop(columns=["data_label"]), on="supplierID", how="left")
    d["max_sub"] = d[SUBS].max(axis=1)
    d["worst_factor"] = d[SUBS].idxmax(axis=1).map(nice)
    d["n_critical"] = (d[SUBS] >= 75).sum(axis=1)
    d["exposure_eur"] = d[PO] * d[T] / 100
    d["hidden_risk"] = (d[T] < 50) & (d.max_sub >= 75)
    d["priority"] = (d[PO] >= d[PO].quantile(.75)) & (d[T] >= 50) & (d[SRC] == "High")
    d["replacement_difficulty"] = (60 * d[SRC].map({"Low": 0, "Medium": .5, "High": 1})
                                   + 40 * d[CX].map({"Simple": 0, "Moderate": .5, "Complex": 1}))
    d["esg_concern"] = (d.ESG_Performance_Score >= 75) | ((d.Labor_Stability_Score >= 75) & (d.Safety_Incident_Score >= 75))
    X = np.c_[np.ones(len(d)), d[SUBS].values]
    coef, *_ = np.linalg.lstsq(X, d[DELIV].values, rcond=None)
    d["delivery_expected"] = X @ coef
    d["delivery_surprise"] = d[DELIV] - d.delivery_expected
    return d


def _row_summary(r) -> dict:
    return {
        "supplier_id": r.supplierID, "name": r["Supplier Name"], "total_risk": int(r[T]), "level": r[f"{T}_Level"],
        "po_volume_eur": round(float(r[PO])), "exposure_eur": round(float(r.exposure_eur)),
        "worst_factor": r.worst_factor, "worst_score": int(r.max_sub), "n_critical": int(r.n_critical),
        "delivery_rating": round(float(r[DELIV]), 1), "confirmation_rate": round(float(r[CONF]), 1),
        "change_rate": round(float(r[CHG]), 1), "sourcing_risk": r[SRC], "complexity": r[CX],
        "hidden_risk": bool(r.hidden_risk), "priority": bool(r.priority),
        **({"country": r.country, "category": r.category, "simulated_fields": "country, category"} if "category" in r else {}),
    }


def _get(sid: str):
    d = df()
    hit = d[d.supplierID.str.upper() == sid.strip().upper()]
    if hit.empty:
        raise ValueError(f"Unknown supplier id {sid}")
    return hit.iloc[0]


# ---------------- tools ----------------

def portfolio_overview() -> dict:
    d = df()
    lv = d.groupby(f"{T}_Level")[PO].agg(["count", "sum"])
    return {
        "suppliers": len(d), "total_spend_eur": round(float(d[PO].sum())),
        "spend_by_level_eur": {k: round(float(v)) for k, v in lv["sum"].items()},
        "count_by_level": {k: int(v) for k, v in lv["count"].items()},
        "high_or_critical": int((d[T] >= 50).sum()),
        "spend_high_or_critical_eur": round(float(d.loc[d[T] >= 50, PO].sum())),
        "hidden_risk_suppliers": int(d.hidden_risk.sum()),
        "hidden_risk_spend_eur": round(float(d.loc[d.hidden_risk, PO].sum())),
        "priority_suppliers": int(d.priority.sum()),
        "priority_spend_eur": round(float(d.loc[d.priority, PO].sum())),
        "esg_concern_suppliers": int(d.esg_concern.sum()),
        "total_exposure_eur": round(float(d.exposure_eur.sum())),
    }


SORTS = {
    "exposure": ("exposure_eur", False), "total_risk": (T, False), "spend": (PO, False),
    "delivery_worst": (DELIV, True), "confirmation_worst": (CONF, True), "change_rate": (CHG, False),
    "delivery_surprise": ("delivery_surprise", True), "n_critical": ("n_critical", False),
}


def rank_suppliers(sort_by: str = "exposure", n: int = 10, level: str | None = None, sourcing_risk: str | None = None,
                   complexity: str | None = None, min_spend_eur: float | None = None, hidden_risk_only: bool = False,
                   priority_only: bool = False, esg_concern_only: bool = False, critical_factor: str | None = None,
                   category: str | None = None, country: str | None = None) -> dict:
    d = df()
    if category and "category" in d: d = d[d.category.str.lower().str.contains(category.lower(), regex=False)]
    if country and "country" in d: d = d[(d.country.str.lower() == country.lower()) | (d.country_code.str.lower() == country.lower())]
    if level: d = d[d[f"{T}_Level"].str.lower() == level.lower()]
    if sourcing_risk: d = d[d[SRC].str.lower() == sourcing_risk.lower()]
    if complexity: d = d[d[CX].str.lower() == complexity.lower()]
    if min_spend_eur: d = d[d[PO] >= min_spend_eur]
    if hidden_risk_only: d = d[d.hidden_risk]
    if priority_only: d = d[d.priority]
    if esg_concern_only: d = d[d.esg_concern]
    if critical_factor:
        col = next((c for c in SUBS if critical_factor.lower().replace(" ", "_") in c.lower()), None)
        if col: d = d[d[col] >= 75]
    col, asc = SORTS.get(sort_by, SORTS["exposure"])
    total_matches = len(d)
    d = d.sort_values(col, ascending=asc).head(max(1, min(int(n), 20)))
    return {"total_matches": total_matches, "matches_shown": len(d), "sorted_by": sort_by, "suppliers": [_row_summary(r) for _, r in d.iterrows()]}


def get_supplier(supplier_id: str) -> dict:
    r = _get(supplier_id)
    contrib = sorted(({"factor": nice(c), "score": int(r[c]), "level": level(r[c]), "weight": WEIGHTS[c],
                       "points": round(float(WEIGHTS[c] * r[c]), 2)} for c in SUBS), key=lambda x: -x["points"])
    out = _row_summary(r)
    out.update({"score_breakdown": contrib, "delivery_expected_from_scores": round(float(r.delivery_expected), 1),
                "replacement_difficulty": round(float(r.replacement_difficulty)), "esg_concern": bool(r.esg_concern),
                "formula": "total = round(sum(weight x score)); points = weight x score"})
    return out


def compare_suppliers(supplier_ids: list[str]) -> dict:
    rows = []
    for sid in supplier_ids[:6]:
        r = _get(sid)
        row = _row_summary(r)
        row.update({nice(c): int(r[c]) for c in SUBS})
        rows.append(row)
    return {"suppliers": rows}


def what_if(supplier_id: str, changes: dict) -> dict:
    r = _get(supplier_id)
    scores = {c: float(r[c]) for c in SUBS}
    applied = {}
    for k, v in changes.items():
        col = next((c for c in SUBS if k.lower().replace(" ", "_") in c.lower()), None)
        if col:
            scores[col] = float(np.clip(v, 0, 100))
            applied[nice(col)] = {"from": int(r[col]), "to": int(scores[col])}
    new_total = total_from(scores)
    return {"supplier_id": r.supplierID, "changes": applied, "total_before": int(r[T]), "total_after": new_total,
            "level_before": level(r[T]), "level_after": level(new_total),
            "exposure_before_eur": round(float(r.exposure_eur)), "exposure_after_eur": round(float(r[PO] * new_total / 100))}


def find_alternatives(supplier_id: str, n: int = 5) -> dict:
    r, d = _get(supplier_id), df()
    if "category" in d:
        pool, rule = d[d.category == r.category], f"same SIMULATED category '{r.category}', lower risk, delivery at least as good"
    else:
        pool, rule = d[d[CX] == r[CX]], "proxy: same complexity"
    pool = pool[(pool.supplierID != r.supplierID) & (pool[T] < r[T]) & (pool[DELIV] >= r[DELIV])]
    pool = pool.assign(capable=pool[PO] >= 0.2 * r[PO], score=pool[T] - 0.3 * pool[DELIV])
    pool = pool.sort_values(["capable", "score"], ascending=[False, True])
    rule += "; prefers suppliers already handling >=20% of this volume (capacity proxy)"
    return {"for_supplier": r.supplierID, "match_rule": rule,
            "alternatives": [_row_summary(x) | ({"iris_certified": bool(x.iris_certified)} if "iris_certified" in x else {})
                             for _, x in pool.head(max(1, min(int(n), 10))).iterrows()]}


def _simulate_history(r) -> pd.DataFrame:
    """On-the-fly SIMULATED 24-month history anchored to today's values (same recipe as scripts/make_demo_data.py)."""
    import zlib
    rng = np.random.default_rng(zlib.crc32(r.supplierID.encode()))
    months = pd.period_range(end=pd.Period("2026-10", "M"), periods=24, freq="M").astype(str)
    series = {}
    for c in SUBS:
        e = np.zeros(24)
        e[0] = rng.normal(0, 8)
        for i in range(1, 24):
            e[i] = .85 * e[i - 1] + rng.normal(0, 3.0)
        series[c] = np.clip(np.round(r[c] + e - e[-1] * np.linspace(0, 1, 24)), 0, 100)
    total = np.round(sum(WEIGHTS[c] * series[c] for c in SUBS))
    deliv = np.clip(r[DELIV] + rng.normal(0, 1.2, 24), 60, 100)
    deliv[-1] = r[DELIV]
    return pd.DataFrame({"supplierID": r.supplierID, "month": months, "total_risk": total.astype(int),
                         "financial_health": series["Financial_Health_Score"].astype(int), "quality_risk": series["Quality_Risk_Score"].astype(int),
                         "operational_resilience": series["Operational_Resilience_Score"].astype(int),
                         "geopolitical": series["Geopolitical_Risk_Score"].astype(int), "delivery_rating": deliv.round(1), "data_label": "SIMULATED"})


def risk_history(supplier_id: str) -> dict:
    f = ENRICH_DIR / "risk_history_monthly_SIMULATED.csv"
    h = pd.read_csv(f) if f.exists() else pd.DataFrame()
    h = h[h.supplierID == _get(supplier_id).supplierID] if len(h) else h
    if h.empty:
        h = _simulate_history(_get(supplier_id))
    first, last = h.iloc[0], h.iloc[-1]
    return {"supplier_id": supplier_id, "label": "SIMULATED monthly history (24 months, anchored to today's values)",
            "change_24m": {"total_risk": int(last.total_risk - first.total_risk),
                           "financial_health": int(last.financial_health - first.financial_health),
                           "delivery_rating": round(float(last.delivery_rating - first.delivery_rating), 1)},
            "history": h.drop(columns=["supplierID", "data_label"]).to_dict("records")}


def fleet_impact(supplier_id: str) -> dict:
    r = _get(supplier_id)
    f = ENRICH_DIR / "fleet_bom_SIMULATED.csv"
    bom = pd.read_csv(f) if f.exists() else pd.DataFrame(columns=["primary_supplier"])
    hits = bom[bom.primary_supplier == r.supplierID]
    lead, stock = (int(r.lead_time_weeks), int(r.safety_stock_weeks)) if "lead_time_weeks" in r else (None, None)
    return {"supplier_id": r.supplierID, "label": "SIMULATED fleet bill of materials",
            "category": r.get("category"), "lead_time_weeks": lead, "safety_stock_weeks": stock,
            "weeks_uncovered_if_supplier_stops": (lead - stock) if lead is not None else None,
            "affected_fleets": hits.drop(columns=["data_label"]).fillna("").to_dict("records"),
            "trainsets_affected": int(hits.trainsets.sum()) if len(hits) else 0}


TOOLS = {
    "portfolio_overview": (portfolio_overview, "KPIs for the whole supplier portfolio (spend, risk levels, hidden risks, priority group, exposure).", {}),
    "rank_suppliers": (rank_suppliers, "List suppliers filtered and sorted. Use for top-N, hidden risks, priority group, ESG concerns, worst delivery, etc.", {
        "sort_by": {"type": "string", "enum": list(SORTS)}, "n": {"type": "integer", "description": "max 20"},
        "level": {"type": "string", "enum": ["Low", "Medium", "High", "Critical"]},
        "sourcing_risk": {"type": "string", "enum": ["Low", "Medium", "High"]},
        "complexity": {"type": "string", "enum": ["Simple", "Moderate", "Complex"]},
        "min_spend_eur": {"type": "number"}, "hidden_risk_only": {"type": "boolean"},
        "priority_only": {"type": "boolean"}, "esg_concern_only": {"type": "boolean"},
        "critical_factor": {"type": "string", "description": "only suppliers Critical (>=75) on this factor, e.g. 'Quality_Risk'"},
        "category": {"type": "string", "description": "SIMULATED rail part category, e.g. 'Brake systems', 'Bogies', 'Signalling'"},
        "country": {"type": "string", "description": "SIMULATED country name or ISO code"}}),
    "get_supplier": (get_supplier, "Full profile of one supplier including the exact score breakdown (points per factor).", {
        "supplier_id": {"type": "string"}}),
    "compare_suppliers": (compare_suppliers, "Side-by-side comparison of 2-6 suppliers on all scores and KPIs.", {
        "supplier_ids": {"type": "array", "items": {"type": "string"}}}),
    "what_if": (what_if, "Recompute a supplier's total risk exactly if some sub-scores change, e.g. {'Financial_Health': 50}.", {
        "supplier_id": {"type": "string"}, "changes": {"type": "object", "additionalProperties": {"type": "number"}}}),
    "find_alternatives": (find_alternatives, "Rank lower-risk alternative suppliers in the same (simulated) part category.", {
        "supplier_id": {"type": "string"}, "n": {"type": "integer"}}),
    "risk_history": (risk_history, "24-month SIMULATED trend of a supplier's risk and delivery rating.", {
        "supplier_id": {"type": "string"}}),
    "fleet_impact": (fleet_impact, "Which (simulated) train fleets and assemblies depend on a supplier, lead time vs safety stock.", {
        "supplier_id": {"type": "string"}}),
}
