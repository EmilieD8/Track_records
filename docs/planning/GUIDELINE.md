# GUIDELINE — keep open all day

**Product:** SwitchPoint. *"See supplier risk early, switch tracks in time."*
**Event:** Nebius Build Week Hackathon w/ NVIDIA, Berlin, Sun 18 Oct 2026.
- Submit by **17:30** (safe). Live demos ~18:45–20:00. Awards 21:00.
- Confirm all times at the briefing.

## 1. Rules of the day
1. **One golden path, polished > many features.** If it is not in the 90-s demo, it waits.
2. **Every partner must be load-bearing and visible on screen:**
   - Nemotron
   - Nebius Token Factory
   - Tavily
   - MCP
   - (Nebius Cloud)
3. **The LLM never computes numbers.** Tools compute, the LLM explains. The Verifier checks IDs and numbers.
4. **Label everything:**
   - `REAL` (dataset)
   - `SIMULATED` (category, country, history, BOM)
   - `WEB` (Tavily, with link)
   - `OCR` (document page)
5. **Human approves every action.** Approve → `audit.jsonl`.
6. **Demo safety:**
   - Cache every Tavily and LLM response of the golden path.
   - `DEMO_MODE=live|cache|replay`.
   - Use a fixed seed.
   - Keep a backup video.
7. **Commit every hour.** Code freeze at 16:30. No new features after.

## 2. Numbers to know by heart
| | |
|---|---|
| Suppliers / spend | 10,000 / **€20.4 bn** |
| High+Critical | 5,197 (52%), holding **€10.8 bn** (53% of spend) |
| Hidden risks (total<50 but a Critical sub-score) | **911**, €1.8 bn |
| Priority quadrant (big spend × high risk × hard to replace) | **757**, €4.88 bn |
| Hero supplier | **SUPP_09733**: €50 M, risk 87, 14/18 Critical |
| Disruption cost (McKinsey) | ~45% of one year's profit per decade |
| Visibility (Deloitte) | only 6% of CPOs have full visibility |

## 3. Risk maths (exact)
- `Total = round(Σ w·score)`. Weights:
  - 0.10: OpRes, Financial, Quality
  - 0.08: Compliance
  - 0.06: Credit, Safety, SubTier
  - 0.05: Geopolitical, Governance, ESG
  - 0.04: Env, Labor, Digital, Political, Benchmark
  - 0.03: Market, Media, ExtIntel
- Bands: Low <25, Medium <50, High <75, Critical ≥75. **0 = no risk, 100 = max risk (also for ESG!).**
- Derived metrics:
  - `exposure = PO_EUR × total/100`
  - `hidden_risk = total<50 & max(sub)≥75`
  - `priority = top25% spend & total≥50 & Sourcing=High`

## 4. Tech cheatsheet
- **LLM:** OpenAI SDK with `base_url=https://api.tokenfactory.us-central1.nebius.com/v1/`.
  - Nemotron Super for supervisor and report, Nano for specialists.
  - **Verify exact model IDs in the Token Factory console.**
- **Tavily:** 100 req/min dev key. Cache to `cache/tavily/*.json` and back off on 429.
  - Suppliers are synthetic, so search by **category + country + commodity**, not by supplier name.
- **Data:** `python reports/data_profile.py supplier_risk_dataset.csv` → enriched CSV (31 derived columns).
- **Stack:** Python, Streamlit, pandas/DuckDB, FastMCP.
- **UI:** the LLM emits a JSON spec, picking only from whitelisted components.
- **Repo:** public, MIT licence. README lists the partners and what is real vs simulated.

## 5. Roles
- **Tech lead:** builds and drives the demo. Answers technical Q&A.
- **Presenter:**
  - owns the official info (criteria, deadline);
  - writes the slides and script;
  - prepares the persona texts;
  - plays the judge for testing;
  - handles the video, submission and timer.

## 6. Pitch skeleton (3 min)
1. **Hook (20 s):** Oct 2024 Valencia floods. Stadler's plant was fine, but ~30 of its suppliers were hit and 150–200k production hours slipped.
2. **Problem (25 s):** 10k suppliers, 18 risk signals, little visibility beyond tier 1. LkSG/CSDDD require due diligence.
3. **Demo (90 s):** the golden path (ROADMAP §7).
4. **Tech (20 s):** a supervisor plus agents running on Nemotron via Nebius Token Factory, with Tavily evidence and MCP. Open models can run on-prem, which suits critical infrastructure.
5. **Impact + ask (25 s):** € exposure found, audit-ready, next steps (pilot with the railway sponsor).

## 7. Q&A one-liners
- **Hallucination?** Numbers come only from tools, a Verifier checks IDs and numbers, and every claim is cited.
- **Why agents, not a dashboard?** Agents investigate, gather evidence and propose actions. Humans approve.
- **Data privacy?** Open NVIDIA models can be self-hosted, so supplier data never leaves the company.
- **vs Resilinc/Prewave?** Built for rail (IRIS certificates, spare parts), explainable down to the formula, adapts to the user's role. Can use those tools as data sources via MCP.
- **What's mocked?** Category, country, history and BOM are simulated and labelled on screen. Scores and spend are the provided data.

## 8. Submission checklist
- [ ] Public GitHub repo + MIT LICENSE + README (partners, setup, architecture image, real vs simulated)
- [ ] Demo video ≤ 2:00 (Devpost: < 3:00, YouTube)
- [ ] Submitted on hackathons.techeurope.io; opted into main track + NVIDIA challenge + railway challenge
- [ ] Golden path cached; replay mode tested offline
- [ ] Laptop charged, HDMI/USB-C adapter, browser zoom 125%, notifications off
- [ ] Later: Devpost Nebius x NVIDIA (by 30 Oct): City Winner Berlin + Best Use of Tavily

## 9. Reference files
- `ROADMAP.md`: plan and timeline
- `reports/01_data_analysis.md`: data facts, top lists, enrichment plan
- `reports/02_hackathon_partners_criteria.md`: event, partners, rules, sources
- `reports/03_architecture.md`: agent schemas, guardrails, diagrams (use as a parts catalogue)
- `reports/04_domain_pitch.md`: domain, regulations, competitors, full script, Q&A
