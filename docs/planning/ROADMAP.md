# ROADMAP — Agentic Supplier Risk for Rail ("SwitchPoint")

> Built from 4 agent reports in `reports/` (01 data, 02 hackathon & partners, 03 architecture, 04 domain & pitch).
> **Status 12:11, Sun 18 Oct 2026.** The event is TODAY: *Nebius Build Week Hackathon w/ NVIDIA*, Berlin (The Delta / CODE).
> **Hard deadline: assume 17:30 submission** (one official page says 17:30, the other says 18:30 opt-in). Confirm at the briefing.

---

## 0. Reality check (read first)

- The architecture report (03) plans ~27 h of work. **We have ~5 h of build for 1 developer.** This roadmap is the cut-down version. Use 03 as a parts catalogue, not as the plan.
- Official `Challenge_description.md` / `Hackathon_assests.md` are empty locally. **Ask the organisers/railway sponsor for the official challenge text and judging criteria in the next 15 min**, and update §2 if it differs.
- Same project can also be entered into the **Nebius x NVIDIA Global AI Hackathon on Devpost (deadline 30 Oct)**. That one requires a Token Factory runtime + NVIDIA open model + public MIT/Apache repo + YouTube video < 3 min. Do it this week as a second shot.

---

## 1. The solution in one paragraph

**SwitchPoint** is a team of AI agents running on **NVIDIA Nemotron via Nebius Token Factory** that watches 10,000 rail suppliers. A risk manager asks a question in plain language. A **supervisor agent** dispatches specialists:
- **Scoring** (exact, explainable risk maths over the dataset);
- **Intel** (live news via **Tavily**);
- **Mitigation** (ranked alternative suppliers and an action plan).

The UI **assembles itself for the user's role** (risk manager / buyer / CFO). Every number is traceable to a dataset field or a cited web source. Every action needs a human click to approve.

**Wow moment (the demo):** the system surfaces a *hidden risk*, a supplier that looks "Medium" overall but is **Critical** on a sub-score, with millions of € exposed. It explains exactly why (score waterfall), shows live news evidence, proposes alternatives, and on "Approve" writes an audit entry. Then it switches to the CFO view and the same findings re-render as € exposure.

---

## 2. Winning criteria → what we do about each

| Criterion (likely, from past {Tech: Europe} + Devpost rules) | How we score |
|---|---|
| **Creativity / non-obvious angle** | "Hidden risk" detection + role-adaptive generated UI + exact explainable score (we reverse-engineered the index formula, R²=1.0) |
| **Technical complexity (visible agents/tool calls)** | Live **agent trace panel**: supervisor plan → parallel tool calls → verified answer |
| **Partner tech, load-bearing** | Nemotron (all reasoning), Nebius Token Factory (inference), Tavily (live evidence), +Nebius Cloud (deploy). See §4 |
| **Real-world impact** | Real rail disruptions (Valencia floods 2024 → Stadler; Talgo/DB ICE L), LkSG/CSDDD compliance, € exposure numbers from the data |
| **Design / complete product** | One polished golden path rather than 10 half-features. Real/Simulated/Web badges. Approve + audit log |
| **Live demo works** | Cache + replay mode, fixed hero supplier, backup video |

Past winner signal: **OrbitSatellite (London, Sep 2026) won with an agentic supply-chain early-warning system.** Our space wins when the demo is live, sourced and has a clear buyer.

---

## 3. Key data facts (from report 01; use them everywhere)

- 10,000 suppliers, **€20.4 bn** PO volume. Data is clean: no nulls, levels are consistent.
- **Total_Risk_Index = round(Σ wᵢ·scoreᵢ)**, exact on all rows. Weights:
  - 0.10: OpRes, Financial, Quality
  - 0.08: Compliance
  - 0.06: Credit, Safety, SubTier
  - 0.05: Geopolitical, Governance, ESG
  - 0.04: Environmental, Labor, Digital, Political, Benchmark
  - 0.03: Market, Media, ExtIntel
- Bands: Low 0–24, Medium 25–49, High 50–74, Critical 75–100.
- 5,197 suppliers are High or Critical (52%). **53% of spend (€10.8 bn) sits with High/Critical suppliers.**
- **Hidden risk:** 911 suppliers (€1.8 bn) have total < 50 but at least one Critical sub-score.
- **Priority quadrant** (top-25% spend × total ≥ 50 × High sourcing risk): 757 suppliers, €4.88 bn.
- **Hero supplier: SUPP_09733.** €50 M, total 87, 14/18 sub-scores Critical, delivery 7 pts worse than predicted, #1 exposure.
- PO volume is uncorrelated with risk, so **spend × risk is new information**.
- Missing from the data: country, category, history, BOM. **Simulate them, deterministic seed, labelled SIMULATED.** Assign rail categories (brakes, bogies, traction, signalling/ETCS, doors, HVAC…) and countries from the geo score.
- Don't claim: ML predicts the total (it's a formula), "big suppliers are riskier", "discovered clusters".

---

## 4. Partner stack (maximise, but each must be load-bearing)

| Partner | Use | Priority |
|---|---|---|
| **NVIDIA Nemotron** (Super for supervisor/report, Nano for specialists) | All LLM reasoning + tool calling | MUST (NVIDIA challenge) |
| **Nebius Token Factory** (OpenAI-compatible endpoint) | Inference for Nemotron | MUST |
| **Tavily** (search + extract) | Intel agent: news per category/country/commodity + live lookup of a real company typed by a judge | MUST ($3k Devpost prize) |
| **MCP** (FastMCP) | Expose our tools as an MCP server; supervisor calls them through MCP; show it also plugs into Claude Desktop / Cursor | SHOULD (cheap, ~30 min) |
| **Nebius Cloud** (VM / serverless) | Host the app → also qualifies for Cloud & Serverless track | SHOULD if time |
| **Nemotron VLM / OCR** (via Token Factory) | Document agent: read one synthetic IRIS certificate / audit PDF and add the finding as evidence | STRETCH |
| **Reflection AI (Beam, 1M ctx)** | Long-context "full portfolio report" agent | STRETCH, only if keys are easy |
| Toloka / Black Forest Labs | Not a natural fit. Skip (BFL at most for a cover image: gimmick) | SKIP |
| Nanonets | Not a partner at this event (whiteboard "Nonotron" was likely Nemotron). Skip | SKIP |

---

## 5. Architecture (5-hour version)

```
Streamlit UI (role selector · chat · generated dashboard · agent trace · approve/audit)
        │
Supervisor agent (Nemotron Super via Nebius TF, OpenAI SDK tool-calling loop)
        │  tools exposed via MCP server (FastMCP, in-process)
 ┌──────┼────────────────────┬────────────────────┐
Scoring tools            Intel tools            Mitigation tools
(DuckDB/pandas:          (Tavily search,        (alternatives: same simulated
 query, explain_score,    cached JSON)           category, lower risk, ranked;
 hidden_risks, exposure,                          action playbook; approve→audit)
 what_if, compare)
        │
Composer → JSON UI spec {components:[kpi|table|waterfall|radar|matrix|news|alternatives|approve]}
        │  validated against a fixed component whitelist (never raw code)
Verifier (python, no LLM): every number & supplier ID in the text must exist in tool outputs
```

Choices for speed:
- **Streamlit, not Next.js.** One dev, five hours.
- **Plain OpenAI SDK tool-calling loop**, not a heavy framework.
- **pandas/DuckDB** over the enriched CSV from `reports/data_profile.py`.

---

## 6. Timeline (today)

| Time | Tech lead (Ali) | Presenter |
|---|---|---|
| **12:15–12:45** | Claim Nebius TF + Tavily keys. Smoke-test Nemotron tool-calling. Repo + MIT licence. Run `data_profile.py` → `data/enriched.csv` + simulated category/country columns | Ask organisers: official challenge text, judging criteria, deadline, video length. Pick name (SwitchPoint). Start slides |
| **12:45–13:45** | **Scoring tools** (query, explain_score waterfall, hidden_risks, exposure, compare, what_if) + unit check on SUPP_09733 | Write 3-min pitch script (report 04 §6). Hook: Valencia floods → Stadler |
| **13:45–14:45** | **Supervisor + agent loop** with trace events. Intel agent (Tavily, cache to disk). Mitigation agent (alternatives + approve → audit.jsonl) | Persona texts for each role. Design the 3 demo questions. Collect 3 cited news items for the hook |
| **14:45–15:45** | **Streamlit UI**: role selector, chat, rendered JSON spec, trace panel, evidence + badges. **CUT LINE A @15:45: golden path works end-to-end** | Test the app as a judge, report bugs. Slides: problem, demo, architecture, partners, impact |
| **15:45–16:30** | MCP wrapper, Verifier, CFO/buyer view polish, replay cache of golden run. (Stretch: Nemotron OCR on 1 PDF, Nebius deploy) | Partner slide + numbers slide (5 numbers by heart) |
| **16:30–17:00** | **Code freeze.** README (partners credited, setup, real-vs-simulated), push public repo | Record ≤2 min demo video (both together) |
| **17:00–17:30** | Submit on hackathons.techeurope.io (main track + NVIDIA challenge + railway challenge) | Rehearse pitch ×3 with timer |
| **18:45–20:00** | Live finalist demo: Ali drives, presenter talks | |

**Cut order if late:** OCR → Nebius deploy → what-if → MCP → buyer view. **Never cut:** hidden-risk story, score explanation, Tavily evidence, agent trace, approve.

---

## 7. Golden demo path (90 s)

1. Role = **Risk Manager**. Ask: *"Which suppliers should I worry about this week?"* The trace animates: supervisor → Scoring → Intel → Mitigation.
2. The dashboard assembles: KPI tiles (€10.8 bn at High/Critical), priority-quadrant table, **hidden-risk callout**.
3. Click **SUPP_09733**. The score waterfall shows exactly which factors make 87. Tavily news on its (simulated) category/country appears, with links.
4. *"Find alternatives."* Three ranked suppliers in the same category with lower risk and spare capacity. **Approve** → audit log entry.
5. Switch role → **CFO**. The same findings re-render as € exposure and a what-if ("if financial health of X worsens by 20 → …").
6. (Stretch) A judge types a **real company** → Tavily-backed provisional profile.

---

## 8. After today (Devpost, deadline 30 Oct 10:00 PT)

- Make sure the repo is public with an MIT licence and the README credits each partner.
- YouTube video < 3 min.
- Add OCR, Nebius deploy, Next.js UI if desired.
- Submit for City Winner (Berlin), Best Use of Tavily, and the overall prizes.

Details: `reports/03_architecture.md` (schemas, prompts, guardrails), `reports/04_domain_pitch.md` (script, Q&A), `reports/02_hackathon_partners_criteria.md` (sources).
