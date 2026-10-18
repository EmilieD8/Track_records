# 01 · Supplier Risk Dataset: Data Analysis

*Dataset:* `supplier_risk_dataset.csv` (10,000 synthetic, anonymized suppliers × 46 columns)
*Reference:* `risk_criteria_description.md` (every score runs from 0 = no risk to 100 = maximum risk)
*Reproduce:* `python reports/data_profile.py supplier_risk_dataset.csv --out enriched.csv` validates the data and adds 31 derived columns (77 in total).

---

## TL;DR

- **The data is perfectly clean.** It has 0 nulls, 0 duplicate rows, 0 duplicate IDs or names, and 0 out-of-range values. All 190,000 level labels are consistent with their scores.
- **The level bands are identical for every score column:** Low 0–24, Medium 25–49, High 50–74, Critical 75–100.
- **`Total_Risk_Index` is reverse-engineered exactly.** It is `round(Σ wᵢ·scoreᵢ)` with clean weights that sum to 1.00 and reproduces 10,000 of 10,000 rows. Operational Resilience, Financial Health and Quality carry 10% each, Compliance 8%, and these four together make up 38% of the index.
- **The generator is a structured latent-factor model:** one global "riskiness" factor (47% of variance) plus 6 risk pillars. The geographic pillar (Environmental, Geopolitical, Political) is mostly independent of the rest.
- **The operations pillar drives the operational fields.** It explains most of the Delivery Rating (r = −0.80) and of the Sourcing Risk Level and Supply Chain Complexity labels. **PO volume is independent of every risk score** (|r| < 0.02) and depends only on complexity.
- **Demo stories:**
  - 757 suppliers sit in the **priority quadrant** (top-25% spend, High/Critical risk, hard to replace). They account for €4.88 bn, or 23.9% of spend and 30.5% of risk-weighted exposure.
  - 911 suppliers carry a **hidden risk**: total below 50 but at least one Critical sub-score (€1.80 bn).
  - Spend is very concentrated (Gini 0.67). The top 10% of suppliers hold 54% of spend.
- **Gaps:** there is no time dimension, location, commodity or category, BOM link, contracts, or text/events. All of these have to be synthesized for an agentic demo; section 7 gives a plan.

---

## 1. Schema & data quality

### 1.1 Columns

| Group | Columns | dtype | Range |
|---|---|---|---|
| ID | `supplierID` (`SUPP_00001` … `SUPP_10000`, contiguous) | str | 10,000 unique |
| Name | `Supplier Name` | str | 10,000 unique |
| Total | `Total_Risk_Index` + `_Level` | int / str | 6 – 93 |
| 18 sub-scores | `*_Score` + `*_Level` | int / str | 0 – 100 (all integers) |
| Spend | `Purchase Order Volume (EUR)` | float | 10,000 – 50,000,000 |
| % metrics | `Order Change Rate`, `Supplier Delivery Rating`, `Order Confirmation Rate` | float | 0–31.67 / 65.48–100 / 61.47–100 |
| Categorical | `Sourcing Risk Level` (Low/Medium/High), `Supply Chain Complexity` (Simple/Moderate/Complex) | str | 3 levels each |

Dtypes are 19 int64 (scores), 4 float64 (operational) and 23 string (ID, name, 19 levels, 2 categoricals).

### 1.2 Quality checks

| Check | Result |
|---|---|
| Nulls | **0** in every column |
| Duplicate rows / IDs / names | **0 / 0 / 0** |
| Scores < 0 or > 100 | **0** |
| % fields outside [0, 100] | **0** |
| Non-integer scores | **0** |
| Level label ≠ band of its score | **0** (out of 190,000 labels) |
| Total index ≠ recomputed weighted sum | **0** |

### 1.3 Odd values and generator artefacts

These are not errors, but they matter for modelling and for the demo.

- **PO volume is log-normal and clipped.** The median is €0.79 M, the mean €2.04 M, P90 €4.69 M, P99 €20.5 M and the maximum €50 M. Exactly **21 suppliers sit at the €50,000,000 cap** and **6 at the €10,000 floor**. log10(volume) has mean 5.89 and sd 0.60. The total is **€20.41 bn**.
- **Delivery Rating is clipped at 100.** Exactly 100.00 appears for **1,547 suppliers (15.5%)**. P5 is 79.3 and the minimum 65.5.
- **Order Confirmation Rate** has median 86.0, minimum 61.5 and 113 suppliers at exactly 100.
- **Order Change Rate** has median 9.15% and maximum 31.67%. One supplier is at 0 and 17 are above 25%.
- **Score distributions** all have mean ≈ 50 and median 50. Fifteen sub-scores have sd ≈ 20. The three geo scores (Environmental, Geopolitical, Political) have **sd ≈ 15.8**, so they produce fewer extremes: about 6% Critical, against about 12% for the others. `Total_Risk_Index` has sd 13.8 and spans 6–93; it never reaches 0 or 100 because it is an average.
- **Supplier names** follow the template `<Prefix> <Suffix> <3-digit number>`. There are 8 prefixes (Dynamic, Global, Strategic, Advanced, Prime, Apex, Elite, Precision) and 8 suffixes (Systems, Solutions, Technologies, Manufacturing, Industries, Group, Partners, Logistics), and the number runs from 100 to 999. That gives 64 "brand stems" with about 150–190 suppliers each. Every full name is unique, but the stems repeat, which is useful for a "supplier family / parent company" fake hierarchy. The names carry **no semantic signal**: the suffix "Logistics" is not correlated with anything.

---

## 2. Level thresholds

| Level | Score range | Applies to |
|---|---|---|
| Low | 0 – 24 | all 19 score columns |
| Medium | 25 – 49 | all 19 |
| High | 50 – 74 | all 19 |
| Critical | 75 – 100 | all 19 (Total observed max = 93) |

- The mapping is **identical across all columns**, with **0 mislabeled rows**. Implement it as `pd.cut(score, [-0.1, 24.5, 49.5, 74.5, 100.1])`.
- **Level counts for the total:** High 4,813, Medium 4,485, Critical 384, Low 318. The total is an average, so it concentrates in the middle bands.
- **Level counts for each sub-score:** about 10.5% Low, 38% Medium, 39.5% High and 12% Critical. The geo trio is about 5.5% Low, 43% Medium, 45.5% High and 6% Critical.

---

## 3. How `Total_Risk_Index` is computed

An OLS fit of the total on the 18 sub-scores gives **R² = 0.99956**, an intercept of −0.017 and a coefficient sum of 1.0002. The residuals lie in [−0.51, +0.53], which is pure rounding noise. Snapping the coefficients to clean values gives:

| Weight | Factor(s) | Block total |
|---|---|---|
| **0.10** | Operational_Resilience, Financial_Health, Quality_Risk | 0.30 |
| **0.08** | Compliance_Risk | 0.08 |
| **0.06** | Credit_Rating, Safety_Incident, Sub_Tier_Visibility | 0.18 |
| **0.05** | Geopolitical_Risk, Governance_Risk, ESG_Performance | 0.15 |
| **0.04** | Environmental_Exposure, Labor_Stability, Digital_Security, Political_Stability, Industry_Benchmark | 0.20 |
| **0.03** | Market_Sentiment, Media_Sentiment, External_Intelligence | 0.09 |
| | **Sum** | **1.00** |

```python
Total_Risk_Index = np.round(sum(w[c] * df[c] for c in w))   # numpy round = banker's rounding (half-to-even)
```

- This formula reproduces **10,000 / 10,000** rows. Half-up rounding matches only 99.57%, because 43 rows land exactly on .5.
- The index is therefore a **true weighted average**, as the documentation says. There is no intercept and no non-linearity.
- **What dominates:** the operational and quality side (Operational Resilience + Quality + Sub-Tier + Digital = 30%) and the financial side (Financial Health + Credit = 16%). Compliance and Governance add 13%. Reputation signals (Media, Market, External Intel, Benchmark) total only 13%. If you aggregate by the 6 pillars found in section 5: operations 30%, financial 16%, ESG/people 15%, legal 13%, geo 13%, reputation 13%.
- **Product implication:** the "explain this score" agent can decompose any supplier's total exactly as Σ wᵢ·scoreᵢ, giving a waterfall chart of contributions. A **what-if simulator** is then trivial and fully faithful: "if Financial Health improves from 100 to 60, the total drops by 4 points."

---

## 4. Categorical and operational fields

### 4.1 Distributions

| Field | Distribution |
|---|---|
| Sourcing Risk Level | High 3,502 · Low 3,474 · Medium 3,024 |
| Supply Chain Complexity | Complex 3,711 · Simple 3,667 · Moderate 2,622 |
| PO volume | median €0.79 M · P90 €4.69 M · P99 €20.5 M · max €50 M (21 at the cap) |
| Delivery Rating | median 92.0 · P5 79.3 · min 65.5 · 15.5% at exactly 100 |
| Confirmation Rate | median 86.0 · P5 76.2 · min 61.5 |
| Change Rate | median 9.15% · P95 18.0% · max 31.7% |

Sourcing level and complexity are strongly associated (counts):

| Sourcing \ Complexity | Simple | Moderate | Complex |
|---|---|---|---|
| Low | **2,375** | 779 | 320 |
| Medium | 991 | 1,053 | 980 |
| High | 301 | 790 | **2,411** |

### 4.2 Relationship to risk

Mean values by Sourcing Risk Level:

| Sourcing | Total risk | Operations-pillar sub-scores (Sub-Tier / Op. Resilience) | Delivery | Confirmation | Change rate |
|---|---|---|---|---|---|
| Low | 39.3 | 32.3 / 33.6 | 96.4 | 88.7 | 8.35 |
| Medium | 49.9 | 50.1 / 49.8 | 91.7 | 86.1 | 8.88 |
| High | **61.2** | **67.9 / 66.6** | **86.1** | **83.2** | **10.78** |

Mean values by total risk level:

| Total level | Delivery | Confirmation | Change rate | Mean PO volume |
|---|---|---|---|---|
| Low | 99.6 | 93.3 | 8.05 | €2.18 M |
| Medium | 95.2 | 88.5 | 8.44 | €1.99 M |
| High | 88.2 | 83.7 | 9.99 | €2.07 M |
| Critical | **79.9** | **78.6** | **13.37** | €2.17 M |

Spearman correlations of the operational fields with the scores:

| | Total | Op. Resilience | Quality | Sub-Tier / Digital | Other core scores | Geo trio |
|---|---|---|---|---|---|---|
| Delivery Rating | **−0.71** | **−0.78** | **−0.78** | −0.64 | ≈ −0.42 | ≈ −0.20 |
| Confirmation Rate | −0.56 | −0.44 | −0.44 | −0.43 | ≈ −0.40 | ≈ −0.21 |
| Change Rate | +0.23 | +0.25 | +0.25 | +0.21 | ≈ +0.14 | ≈ +0.07 |
| PO Volume | **0.00** | −0.01 | −0.01 | −0.01 | ≈ 0.01 | ≈ 0.01 |

**Takeaways**

- **The operations pillar is the hidden driver of the operational fields.**
  - A linear model on the six pillar means gives Delivery ≈ 106.6 − 0.30 × operations (R² 0.64). Every other pillar's coefficient is ≈ 0.
  - Using all scores, delivery is predictable with R² = 0.70 (cross-validated; gradient boosting reaches 0.71).
  - Confirmation rate reaches R² 0.33 and change rate only 0.08–0.10, so change rate is mostly noise.
  - Sourcing Risk Level can be predicted from the scores with 71.7% accuracy (baseline 35%), and complexity with 68.9% (baseline 37%). The logistic coefficients are non-zero **only** for the operations pillar.
- **PO volume is generated independently of risk.** The only dependency is on complexity: median €944 k for Complex, €794 k for Moderate and €658 k for Simple. As a result, high spend combined with high risk occurs by chance, which makes "exposure" a genuinely new signal rather than a duplicate of risk.
- The internal Sourcing Risk Level tracks the total closely. Among suppliers with total ≤ 30, 92% are rated Low; among those with total > 70, 92% are rated High.
- **The internal sourcing view disagrees with the scores in a minority of cases:**
  - **92 suppliers are rated Low sourcing risk but have total ≥ 60** (€188 M spend). They are "complacency" candidates.
  - 14 suppliers are rated High but have total < 35.

---

## 5. Correlation structure and segments

### 5.1 Latent structure

The correlation matrix is clearly block-structured:

- r ≈ **0.71–0.72** within a block
- r ≈ **0.46–0.48** across blocks (the global factor)
- r ≈ **0.22–0.24** between the geo block and everything else

| Pillar (derived) | Members | Within-block r |
|---|---|---|
| **Operations** | Operational_Resilience, Quality, Sub_Tier_Visibility, Digital_Security | 0.71–0.72 |
| **Financial** | Financial_Health, Credit_Rating | 0.71 |
| **Legal / Governance** | Compliance, Governance | 0.71 |
| **ESG / People** | ESG_Performance, Labor_Stability, Safety_Incident | 0.71–0.72 |
| **Reputation / Intel** | Industry_Benchmark, Media_Sentiment, External_Intelligence, Market_Sentiment | 0.71–0.72 |
| **Geo / Location** | Environmental_Exposure, Geopolitical, Political_Stability | 0.51–0.52 |

Hierarchical clustering on 1−|r| recovers exactly these groups.

- **PCA (standardized):** PC1 = 47.3% of variance, with uniform loadings of about 0.25. This is a single overall "supplier riskiness" factor. PC2 = 9.3% and is the geo block alone (loadings 0.56). PC3 (6.9%) contrasts reputation with operations, and PC4 (6.2%) is ESG/people. Five components explain 74%.
- **Interpretation for the product:**
  - The geo block behaves like **"where the supplier is"**: it is independent of how the supplier is run, and is the natural hook for adding a synthetic country or region.
  - The other five pillars behave like **"how the supplier is run."**
  - Showing six pillar scores in the UI is better than showing 18 raw scores, because it loses almost no information.

### 5.2 Clustering

K-means on the standardized scores shows **no natural clusters**: silhouette is 0.24 at k = 2 and falls to 0.08–0.15 for k ≥ 3. The data is a continuum, so k-means would mostly split the population into "low" and "high." For personas, a **rule-based segmentation on the pillar profile** is more honest and more explainable. It is implemented in `data_profile.py`:

| Persona | Rule | n | Total | Signature | Delivery | Spend |
|---|---|---|---|---|---|---|
| Systemic High Risk | total ≥ 65 | 1,534 | 71.4 | all pillars about 72–75 | 83.3 | €3.34 bn |
| Fragile Operator | operations pillar ≥ 65 | 500 | 57.2 | ops 72.0, replacement difficulty 91 | **84.1** | €0.97 bn |
| Financial Distress | financial pillar ≥ 65 | 678 | 55.5 | fin 73.9 | 91.1 | €1.34 bn |
| Compliance Liability | legal pillar ≥ 65 | 739 | 54.9 | legal 74.0 | 91.1 | €1.48 bn |
| ESG / Labour Hotspot | ESG/people pillar ≥ 65 | 594 | 55.3 | esg 73.5 | 91.1 | €1.38 bn |
| Reputation Watch | reputation pillar ≥ 65 | 596 | 55.2 | rep 73.3 | 90.8 | €1.35 bn |
| Geo-Exposed | geo pillar ≥ 65 | 555 | 50.0 | geo 71.4, others about 47 | 92.7 | €0.99 bn |
| Average / Watch | total 40–64, no pillar ≥ 65 | 2,659 | 46.6 | flat about 46 | 92.6 | €5.30 bn |
| Stable Partner | total < 40, no pillar ≥ 65 | 2,145 | 31.5 | all about 30 | 97.4 | €4.27 bn |

The pillar personas take the supplier's highest pillar, among those with total below 65.

Fragile Operators are the persona whose **delivery suffers** (84 vs about 91 for other single-pillar personas), consistent with section 4. Geo-Exposed suppliers have average totals but would be hit by regional shocks, which makes them ideal targets for a "what if a flood or strike hits region X" scenario.

---

## 6. Story findings for the demo

### 6.1 Spend concentration

| Metric | Value |
|---|---|
| Total PO volume | **€20.41 bn** |
| Gini coefficient of spend | **0.67** |
| Top 1% (100 suppliers) share | 16.6% |
| Top 10% (1,000) share | **54.1%** |
| Top 20% (2,000) share | 70.8% |
| Suppliers at the €50 M cap | 21 |

Spend by total risk level: Low €0.69 bn (3.4%), Medium €8.91 bn (43.7%), High €9.98 bn (48.9%), Critical €0.83 bn (4.1%). **53% of spend (€10.8 bn) sits with High or Critical risk suppliers.**

Risk-weighted exposure (spend × total / 100) sums to €10.29 bn. The top 100 suppliers by exposure hold 17.6% of it, and the top 1,000 hold 55.3%.

### 6.2 Priority quadrant

The quadrant is defined as **top-25% spend (≥ €1.95 M) + Total ≥ 50 (High/Critical) + Sourcing Risk Level = High.**

| Variant | Count | Spend | Spend share |
|---|---|---|---|
| **Priority quadrant (default)** | **757** | **€4.88 bn** | **23.9%** (30.5% of exposure) |
| Strict: top-10% spend, total ≥ 60, High sourcing, Complex | 174 | €2.11 bn | 10.3% |
| Top-10% spend and Critical total | 44 | €0.47 bn | 2.3% |

Within the default quadrant, 617 of 757 suppliers are Complex. The main personas are Systemic High Risk (338) and Fragile Operator (109).

**Top 10 of the priority quadrant by exposure:**

| # | supplierID | Name | PO volume | Total | Complexity | Exposure | Worst factor (score) |
|---|---|---|---|---|---|---|---|
| 1 | **SUPP_09733** | Advanced Systems 379 | €50.0 M | **87** | Complex | €43.5 M | Financial_Health (100) |
| 2 | SUPP_06901 | Prime Technologies 620 | €50.0 M | 71 | Complex | €35.5 M | Operational_Resilience (97) |
| 3 | SUPP_01319 | Prime Solutions 709 | €50.0 M | 70 | Complex | €35.0 M | Industry_Benchmark (91) |
| 4 | SUPP_05160 | Apex Solutions 669 | €50.0 M | 67 | Complex | €33.5 M | Digital_Security (93) |
| 5 | SUPP_03803 | Prime Partners 408 | €46.7 M | 70 | Complex | €32.7 M | Operational_Resilience (91) |
| 6 | SUPP_03766 | Prime Logistics 524 | €47.7 M | 63 | Complex | €30.0 M | Environmental_Exposure (75) |
| 7 | SUPP_02483 | Dynamic Logistics 539 | €50.0 M | 60 | Complex | €30.0 M | Market_Sentiment (98) |
| 8 | SUPP_08466 | Elite Group 781 | €42.0 M | 68 | Complex | €28.5 M | Industry_Benchmark (91) |
| 9 | SUPP_00917 | Apex Technologies 875 | €46.9 M | 59 | Complex | €27.7 M | Operational_Resilience (95) |
| 10 | SUPP_04106 | Global Manufacturing 581 | €37.5 M | 73 | Complex | €27.4 M | Media_Sentiment (100) |

All 10 are rated High sourcing risk.

**Hero supplier for the demo: SUPP_09733 "Advanced Systems 379".**

- €50 M spend (the cap; 0.24% of all spend), total **87 (Critical)**, High sourcing risk, Complex supply chain.
- **14 of 18 sub-scores are Critical**: Financial Health 100, Credit 100, Digital Security 100, ESG 99, Labor 99, Sub-Tier 96, Operational Resilience 91, and others.
- Delivery 74.5 against 81.7 expected, so it underperforms even its own risk profile.
- It is #1 on exposure and is also flagged by IsolationForest. It is a ready-made "agent catches a disaster in waiting" story.

**Top by composite criticality** (0.4 × risk + 0.3 × spend percentile + 0.2 × replacement difficulty + 0.1 × delivery risk): SUPP_04383 (total 91), SUPP_08192 (90), SUPP_09733 (87), SUPP_02320 (85), SUPP_02690 (84), SUPP_00511, SUPP_01344, SUPP_07320, SUPP_01902, SUPP_03764.

### 6.3 Hidden risks

The total is a weighted average, so it masks single-factor disasters.

- **54% of all suppliers (5,403) have at least one Critical sub-score.** The distribution of Critical counts is 0: 4,597 · 1: 1,706 · 2: 990 · 3: 684 · … · 16: 11 · 17: 1.
- **Hidden risk** (total < 50, i.e. Low/Medium, but at least one Critical sub-score): **911 suppliers, €1.80 bn spend.** Their most common worst factors are the geo trio (Environmental 98, Geopolitical 95, Political 91), followed by Compliance 59, Market 57 and Labor 55.
- **Strong hidden risk** (total < 50 and either a sub-score ≥ 90 or a Critical core factor: Financial, Quality, Operational or Compliance): **224 suppliers, €377 M.**
- **Showcase examples:**
  - **SUPP_08780**: total **21 (Low)** but Geopolitical = **100**.
  - **SUPP_01759**: total 33, Environmental = 100, €5.6 M spend, Low sourcing risk.
  - **SUPP_05879**: total 40, Quality = 100.
  - **SUPP_01095**: total 47, Financial_Health = 100, €3.55 M.
  - **SUPP_06781**: total 47, Safety = 100, with 3 Critical sub-scores.
- **Largest-spend strong hidden risks:**
  - SUPP_02210: total 46, Financial 75, €15.8 M.
  - **SUPP_04684**: total 31, Financial 78, €15.0 M, Low sourcing.
  - SUPP_02792: total 46, Financial 86, €14.6 M.
  - SUPP_01310: total 49, Credit 92, €13.7 M.
  - **SUPP_02351**: total 39, ESG 95, €11.3 M.

### 6.4 ESG concerns

- ESG_Performance ≥ 75: **1,203** suppliers (≥ 90: 305).
- Labor and Safety both ≥ 75: 620. All three of ESG, Labor and Safety ≥ 75: 438.
- **ESG-concern flag** (ESG ≥ 75, or Labor and Safety both ≥ 75): **1,385 suppliers, €2.93 bn (14.4% of spend).**
- Highest-spend ESG concerns:
  - SUPP_01319 (€50 M; ESG 76, Safety 81)
  - SUPP_09733 (€50 M; ESG 99, Labor 99)
  - SUPP_04106 (€37.5 M; Safety 90)
  - **SUPP_04226** (€27.9 M; ESG 92, Labor 98, Safety 100)

These can be used for a CSRD / supply-chain-due-diligence (LkSG / CSDDD) angle.

### 6.5 Anomalies and inconsistencies

- **IsolationForest** (1% contamination, on the scores plus the operational percentages) flags 100 suppliers. It mostly picks the **extreme tails**: half have total ≥ 84 with sub-scores at 100, and the rest are ultra-clean suppliers with total 6–13 and delivery at 100. In synthetic Gaussian data, "anomaly" mostly means "extreme". Present it as an "outlier radar", not as fraud detection.
- **Delivery surprise is more useful.** It compares the actual delivery rating with the rating expected from the scores (linear model, residual sd 3.6). Examples:
  - **SUPP_04288**: total 43, expected 91.5, actual **75.7** (−15.8). This supplier is performing worse than its risk profile suggests, an early warning before the scores catch up.
  - **SUPP_07070**: total 73, expected 81.9, actual 95.0 (+13.1). The scores may be overstating risk, or the supplier is improving.
- **Rating disagreements:**
  - 92 suppliers rated Low sourcing risk have total ≥ 60.
  - 11 suppliers have delivery = 100 and total ≥ 60.
  - No supplier has delivery < 80 with total < 40.
- **Generator artefacts to be aware of:** the volume cap and floor (21 at €50 M, 6 at €10 k) and the delivery clip at 100 (1,547 suppliers).

---

## 7. Gaps and how to enrich them for the demo

| Gap | Why it matters | Realistic synthesis |
|---|---|---|
| **No time dimension** (one snapshot) | No trends, alerts, forecasting or "what changed" | Simulate 24–36 monthly snapshots per supplier. Use a mean-reverting random walk (AR(1), φ ≈ 0.9) around the current score. Add correlated shocks per pillar, reusing the observed block correlations (r ≈ 0.71 within a pillar). Add rare jump events (financial downgrade, strike, recall). Anchor the last month to the real dataset values. Recompute the total each month with the exact weights. |
| **No location** | No geo map and no regional event propagation | Assign country and region by **sampling conditional on the geo pillar**: low geo score → DE/FR/AT/CH/NL/Nordics; mid → PL/CZ/ES/IT/PT/HU/RO; high → TR/IN/CN/MA/RS/UA-adjacent. This keeps the data coherent. Use the brand stem (64 stems) to create parent companies with multiple sites. |
| **No commodity / part category** | A railway buyer thinks in categories | Map suppliers to railway categories, biasing the assignment by complexity and spend: **Bogies & wheelsets**, **brakes**, **traction & propulsion** (converters, motors), **signalling & train control** (ETCS/CBTC), **pantographs & HV equipment**, **couplers & draft gear**, **HVAC**, **doors & access**, **interior & seating**, **passenger information & IT**, **track & infrastructure** (rails, sleepers, switches), **electronics & PCBs**, **castings & forgings**, **fasteners & MRO consumables**, **logistics services**. Complex + High sourcing + high spend should go to safety-critical categories such as bogies, brakes, signalling and traction. Simple + Low should go to MRO consumables, fasteners and interior. Include the Logistics suffix for logistics services as flavor only. |
| **No BOM / product link** | No "which trains or lines are affected" | Build a small fleet BOM: 3–5 train types (e.g. regional EMU, high-speed, freight loco) → ~20 assemblies → part categories → suppliers. Sole-source flags come from Sourcing = High. This enables an impact query such as "Supplier X fails → 42 trainsets lose brake-pad supply in 6 weeks." |
| **No contracts / lead times / inventory** | No time-to-impact estimate | Synthesize lead time per category (castings 20–40 weeks, electronics 12–52, consumables 1–4), safety stock in weeks, and contract end dates. Then time-to-impact = stock − lead-time gap. |
| **No alternative suppliers** | Cannot recommend mitigation | Within the same category and region, rank alternatives by low total, low delivery risk and capacity headroom (synthetic). Sourcing level gives the number of qualified alternatives (High → 0–1, Medium → 2–3, Low → 4+). |
| **No unstructured / event data** | Agents need something to read | Generate synthetic news, audit and incident snippets tied to score jumps (e.g. a Media_Sentiment spike → a strike article; Financial → a profit warning). Use them as RAG sources for the agent and as a live alert feed. |
| **No certifications / regulatory data** | Railway is regulated (IRIS / ISO/TS 22163, EN 15085 welding, CE/TSI) | Add certification flags with expiry dates, correlated with the Quality and Compliance scores. |
| **No financials** | Financial Health is opaque | Add revenue, and our share of supplier revenue (dependency), drawn conditional on Financial Health and Credit. |

Rules for keeping the synthetic data credible:

- Never contradict the base snapshot.
- Condition every synthetic attribute on existing columns (geo pillar → country, complexity and sourcing → category criticality, Financial Health → revenue stability).
- Fix the random seed.

---

## 8. Recommended derived metrics and ML

All of these except the history-based items are implemented in `data_profile.py`.

### 8.1 Derived metrics

| Metric | Formula | Purpose |
|---|---|---|
| `blk_*` pillar scores (6) | mean of the members of each block in section 5 | Compact UI and radar chart; persona basis |
| `exposure_eur` | PO volume × Total / 100 | Euros at risk; ranks what matters to procurement |
| `exposure_adj_eur` | exposure × (1 + replacement difficulty / 100) | Penalises single or hard sourcing |
| `replacement_difficulty` (0–100) | 60 × sourcing (0, 0.5, 1) + 40 × complexity (0, 0.5, 1) | "Replaceability" axis of the priority quadrant |
| `delivery_risk` (0–100) | 50% late (100 − delivery) + 30% unconfirmed (100 − confirmation) + 20% change rate, each scaled to its observed maximum | Operational KPI; r = 0.77 with Total; Complex 37 vs Simple 22 |
| `hidden_risk` / `hidden_risk_strong` | Total < 50 and at least one Critical (strong: ≥ 90 or a Critical core factor) | Flags what the average masks (911 / 224) |
| `n_critical`, `max_sub_score`, `worst_factor` | — | Explanation and alert triggers |
| `esg_concern` | ESG ≥ 75, or Labor and Safety both ≥ 75 | CSRD / CSDDD due-diligence list (1,385) |
| `priority_quadrant` | top-25% spend, Total ≥ 50, Sourcing = High | Action list (757) |
| `criticality` (0–100) | 0.4 Total + 0.3 spend percentile + 0.2 replacement difficulty + 0.1 delivery risk | Single ranking for an "Top-N to act on today" agent |
| `persona` | rules from section 5.2 | Storytelling and tailored mitigation playbooks |
| `delivery_expected` / `delivery_residual` | linear model of delivery on the 18 scores | "Performing worse than profile" early warning |
| Total contribution waterfall | wᵢ × scoreᵢ (exact) | Explainability, faithful by construction |

### 8.2 ML and analytics that are credible in a hackathon

1. **Exact what-if simulator (no ML needed).** Change any sub-score and the total and level recompute exactly with the known weights. Add a pillar shock, e.g. "region X geo +30" → affected suppliers, Δ exposure. It is the most robust demo element because it is 100% faithful.
2. **Scenario propagation:**
   - A shock to one score can propagate to correlated scores through the empirical block correlation (r ≈ 0.71 within a pillar). For example, a strike raises Labor, which also nudges Safety and ESG. The conditional expectation is Δ_other ≈ 0.71 × Δ × σ_other / σ_source.
   - Delivery then updates through the fitted model (≈ −0.30 points per point of the operations pillar).
3. **Delivery or confirmation prediction** from the risk scores. Delivery reaches R² ≈ 0.70 with linear regression or gradient boosting. Do not oversell confirmation (R² ≈ 0.33) or change rate (R² ≈ 0.08).
4. **Sourcing-level classifier** (72% accuracy against a 35% baseline). Its useful output is the *disagreements*: "the internal assessment says Low, the model says High" (92 strong cases).
5. **Outlier radar** using IsolationForest and the delivery-residual flags. Present it honestly as extremes plus behaviour that is inconsistent with the profile.
6. **Forecasting**, only on the simulated history (section 7). Use per-supplier exponential smoothing or AR models, or a pooled gradient-boosting model on lag features, to predict "probability of crossing into Critical within 3 months." Be transparent in the pitch that the history is simulated.
7. **Agent-facing tools** to expose as functions: `get_supplier(id)`, `explain_score(id)` (waterfall), `what_if(id, changes)`, `top_exposure(n, filters)`, `hidden_risks(filters)`, `find_alternatives(id)` (needs synthetic category and region), and `impact_on_fleet(id)` (needs the synthetic BOM).

### 8.3 Things not to claim

- **The scores are synthetic and roughly Gaussian.** Clusters are not "discovered segments". Present personas as rule-based.
- **PO volume is independent of risk**, so do not present "big suppliers are riskier" as a finding.
- **Total_Risk_Index is fully deterministic.** Predicting it with ML is pointless (R² = 1). Use the formula.
