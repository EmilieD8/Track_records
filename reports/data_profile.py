#!/usr/bin/env python3
"""
Supplier risk dataset: validation + derived features.

Usage:
    python data_profile.py path/to/supplier_risk_dataset.csv [--out enriched.csv] [--quiet]

Requires: pandas, numpy. Optional: scikit-learn (anomaly detection, delivery-rating model).

Everything here is derived from the analysis in reports/01_data_analysis.md:
  * Level mapping (all 19 score columns): Low 0-24, Medium 25-49, High 50-74, Critical 75-100.
  * Total_Risk_Index == np.round(sum(w_i * score_i)) with the exact weights in WEIGHTS
    (numpy round = round-half-to-even; reproduces 10,000/10,000 rows).
  * The 18 sub-scores form 6 correlated blocks (r ~0.71 within, ~0.47 across; geo block ~0.23).
"""
import argparse
import sys

import numpy as np
import pandas as pd

# ---------------------------------------------------------------- constants
WEIGHTS = {
    "Operational_Resilience_Score": 0.10,
    "Financial_Health_Score": 0.10,
    "Quality_Risk_Score": 0.10,
    "Compliance_Risk_Score": 0.08,
    "Credit_Rating_Score": 0.06,
    "Safety_Incident_Score": 0.06,
    "Sub_Tier_Visibility_Score": 0.06,
    "Geopolitical_Risk_Score": 0.05,
    "Governance_Risk_Score": 0.05,
    "ESG_Performance_Score": 0.05,
    "Environmental_Exposure_Score": 0.04,
    "Labor_Stability_Score": 0.04,
    "Digital_Security_Score": 0.04,
    "Political_Stability_Score": 0.04,
    "Industry_Benchmark_Score": 0.04,
    "Market_Sentiment_Score": 0.03,
    "Media_Sentiment_Score": 0.03,
    "External_Intelligence_Score": 0.03,
}
SUB_SCORES = list(WEIGHTS)
ALL_SCORES = ["Total_Risk_Index"] + SUB_SCORES

# Latent blocks found via correlation clustering (within-block r ~0.71, geo ~0.52)
BLOCKS = {
    "blk_operations": ["Operational_Resilience_Score", "Quality_Risk_Score",
                       "Sub_Tier_Visibility_Score", "Digital_Security_Score"],
    "blk_financial": ["Financial_Health_Score", "Credit_Rating_Score"],
    "blk_legal": ["Compliance_Risk_Score", "Governance_Risk_Score"],
    "blk_esg_people": ["ESG_Performance_Score", "Labor_Stability_Score", "Safety_Incident_Score"],
    "blk_reputation": ["Industry_Benchmark_Score", "Media_Sentiment_Score",
                       "External_Intelligence_Score", "Market_Sentiment_Score"],
    "blk_geo": ["Environmental_Exposure_Score", "Geopolitical_Risk_Score", "Political_Stability_Score"],
}
CORE_WEIGHT_FACTORS = ["Operational_Resilience_Score", "Financial_Health_Score",
                       "Quality_Risk_Score", "Compliance_Risk_Score"]  # 38% of total weight

LEVEL_BINS = [-0.1, 24.5, 49.5, 74.5, 100.1]
LEVEL_LABELS = ["Low", "Medium", "High", "Critical"]
SOURCING_MAP = {"Low": 0, "Medium": 1, "High": 2}
COMPLEXITY_MAP = {"Simple": 0, "Moderate": 1, "Complex": 2}

VOL = "Purchase Order Volume (EUR)"
CHG = "Order Change Rate"
DEL = "Supplier Delivery Rating"
CONF = "Order Confirmation Rate"


def score_to_level(s):
    return pd.cut(s, LEVEL_BINS, labels=LEVEL_LABELS).astype(str)


# ---------------------------------------------------------------- validation
def validate(df):
    """Return a dict of data-quality checks."""
    r = {}
    r["rows"], r["cols"] = df.shape
    r["nulls"] = int(df.isna().sum().sum())
    r["dup_rows"] = int(df.duplicated().sum())
    r["dup_ids"] = int(df["supplierID"].duplicated().sum())
    r["dup_names"] = int(df["Supplier Name"].duplicated().sum())
    r["scores_out_of_range"] = int(((df[ALL_SCORES] < 0) | (df[ALL_SCORES] > 100)).sum().sum())
    r["pct_out_of_range"] = int(((df[[CHG, DEL, CONF]] < 0) | (df[[CHG, DEL, CONF]] > 100)).sum().sum())
    r["level_mismatches"] = {c: int((score_to_level(df[c]) != df[c + "_Level"]).sum()) for c in ALL_SCORES}
    recomputed = np.round(sum(df[c] * w for c, w in WEIGHTS.items()).round(6))
    r["total_index_mismatches"] = int((recomputed != df["Total_Risk_Index"]).sum())
    r["po_volume_at_cap_50M"] = int((df[VOL] >= 5e7).sum())
    r["po_volume_at_floor_10k"] = int((df[VOL] <= 1e4).sum())
    r["delivery_rating_at_100"] = int((df[DEL] >= 100).sum())
    return r


# ---------------------------------------------------------------- features
def pct_rank(s):
    return s.rank(pct=True) * 100


def add_features(df, use_ml=True):
    d = df.copy()
    sub = d[SUB_SCORES]

    # Pillar/block scores
    for b, cols in BLOCKS.items():
        d[b] = d[cols].mean(axis=1).round(1)

    # Sub-score extremes
    d["max_sub_score"] = sub.max(axis=1)
    d["worst_factor"] = sub.idxmax(axis=1).str.replace("_Score", "", regex=False)
    d["n_critical"] = (sub >= 75).sum(axis=1)
    d["n_high_plus"] = (sub >= 50).sum(axis=1)
    d["n_critical_core"] = (d[CORE_WEIGHT_FACTORS] >= 75).sum(axis=1)
    d["subscore_spread"] = sub.std(axis=1).round(2)

    # Hidden risk: overall looks fine (<50) but a sub-score is critical.
    d["hidden_risk"] = (d["Total_Risk_Index"] < 50) & (d["n_critical"] >= 1)
    # Strong variant: total Low/Medium but >=90 on a sub-score or critical on a core factor
    d["hidden_risk_strong"] = (d["Total_Risk_Index"] < 50) & (
        (d["max_sub_score"] >= 90) | (d["n_critical_core"] >= 1))

    # Replaceability (0 easy .. 100 very hard to replace)
    src = d["Sourcing Risk Level"].map(SOURCING_MAP)
    cx = d["Supply Chain Complexity"].map(COMPLEXITY_MAP)
    d["sourcing_num"], d["complexity_num"] = src, cx
    d["replacement_difficulty"] = (src / 2 * 60 + cx / 2 * 40).round(1)

    # Spend & exposure
    d["spend_share_pct"] = (d[VOL] / d[VOL].sum() * 100).round(4)
    d["spend_pctile"] = pct_rank(d[VOL]).round(1)
    d["exposure_eur"] = (d[VOL] * d["Total_Risk_Index"] / 100).round(2)
    d["exposure_pctile"] = pct_rank(d["exposure_eur"]).round(1)
    # Expected-loss style variant that also punishes hard-to-replace suppliers
    d["exposure_adj_eur"] = (d["exposure_eur"] * (1 + d["replacement_difficulty"] / 100)).round(2)

    # Delivery risk 0..100 (higher = worse). Uses the empirical ranges, not 0-100 raw.
    late = (100 - d[DEL]) / (100 - d[DEL].min())
    unconf = (100 - d[CONF]) / (100 - d[CONF].min())
    churn = d[CHG] / d[CHG].max()
    d["delivery_risk"] = ((0.5 * late + 0.3 * unconf + 0.2 * churn) * 100).round(1)

    # ESG concern
    d["esg_concern"] = (d["ESG_Performance_Score"] >= 75) | (
        (d["Labor_Stability_Score"] >= 75) & (d["Safety_Incident_Score"] >= 75))

    # Priority quadrant: high spend (top 25%) + High/Critical total risk + hard to replace
    d["priority_quadrant"] = (d["spend_pctile"] >= 75) & (d["Total_Risk_Index"] >= 50) & (
        d["Sourcing Risk Level"] == "High")
    # Composite criticality 0..100 for ranking
    d["criticality"] = (0.40 * d["Total_Risk_Index"] + 0.30 * d["spend_pctile"]
                        + 0.20 * d["replacement_difficulty"] + 0.10 * d["delivery_risk"]).round(1)

    # Persona = dominant block (if it stands out), else overall band
    blk = d[list(BLOCKS)]
    dom = blk.idxmax(axis=1).str.replace("blk_", "", regex=False)
    persona_names = {"operations": "Fragile Operator", "financial": "Financial Distress",
                     "legal": "Compliance Liability", "esg_people": "ESG / Labour Hotspot",
                     "reputation": "Reputation Watch", "geo": "Geo-Exposed"}
    d["persona"] = np.where(d["Total_Risk_Index"] >= 65, "Systemic High Risk",
                   np.where(blk.max(axis=1) >= 65, dom.map(persona_names),
                   np.where(d["Total_Risk_Index"] < 40, "Stable Partner", "Average / Watch")))

    if use_ml:
        try:
            from sklearn.ensemble import IsolationForest
            from sklearn.linear_model import LinearRegression
            feats = SUB_SCORES + [CHG, DEL, CONF]
            X = d[feats].values
            iso = IsolationForest(n_estimators=300, contamination=0.01, random_state=42).fit(X)
            d["anomaly_score"] = (-iso.score_samples(X)).round(4)
            d["is_anomaly"] = iso.predict(X) == -1
            # Delivery rating "surprise": actual vs expected from risk scores
            lr = LinearRegression().fit(d[SUB_SCORES], d[DEL])
            d["delivery_expected"] = lr.predict(d[SUB_SCORES]).clip(0, 100).round(2)
            d["delivery_residual"] = (d[DEL] - d["delivery_expected"]).round(2)
        except ImportError:
            pass
    return d


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--out", default=None, help="write enriched CSV here")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--no-ml", action="store_true")
    a = ap.parse_args()

    df = pd.read_csv(a.csv)
    v = validate(df)
    d = add_features(df, use_ml=not a.no_ml)

    if not a.quiet:
        pd.set_option("display.width", 220)
        pd.set_option("display.max_columns", 30)
        print("== validation ==")
        for k, val in v.items():
            if k == "level_mismatches":
                print(f"  level_mismatches (total): {sum(val.values())}")
            else:
                print(f"  {k}: {val}")
        print("\n== flags ==")
        for f in ["hidden_risk", "hidden_risk_strong", "esg_concern", "priority_quadrant", "is_anomaly"]:
            if f in d:
                print(f"  {f}: {int(d[f].sum())}")
        print("\n== persona counts ==")
        print(d["persona"].value_counts().to_string())
        cols = ["supplierID", "Supplier Name", VOL, "Total_Risk_Index", "Sourcing Risk Level",
                "Supply Chain Complexity", "exposure_eur", "worst_factor", "max_sub_score"]
        print("\n== top 10 priority quadrant by exposure ==")
        print(d[d.priority_quadrant].nlargest(10, "exposure_eur")[cols].to_string(index=False))
        print("\n== top 10 by criticality ==")
        print(d.nlargest(10, "criticality")[cols + ["criticality"]].to_string(index=False))

    if a.out:
        d.to_csv(a.out, index=False)
        if not a.quiet:
            print(f"\nwrote {a.out} ({d.shape[0]} rows, {d.shape[1]} cols)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
