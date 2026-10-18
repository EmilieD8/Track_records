# 04 — Domain & Pitch Strategy: Agentic Supplier Risk for Railways

*{Tech: Europe} AI Hackathon, Oct 2026. Prepared 2026-10-18 for a 2-person team: tech lead plus presenter.*

> **TL;DR.** Rail supply chains combine long lead times (often more than a year), heavy single-sourcing and strict safety certification (IRIS / RAMS). That makes them unusually fragile, and 2023-2025 gave a series of public failures: the Valencia floods hit about 30 Stadler suppliers, the Talgo ICE L ran two years late, Siemens/Bombardier ICE 4 welds were found defective at a subcontractor, and DB withdrew its ETCS retrofit plan for lack of industry capacity. Regulation (LkSG, CSDDD after Omnibus, CSRD, the Forced Labour Regulation, NIS2, CBAM) still requires documented risk-based due diligence. The Omnibus deal even *limits questionnaires to smaller suppliers*, which pushes buyers toward collecting evidence from external and public sources. That is exactly what an agent can do. Incumbents (Prewave, Resilinc, Everstream, Interos, D&B, EcoVadis, IntegrityNext, Sphera/riskmethods) are horizontal, closed SaaS. Resilinc already markets "agentic AI", so **"agents" alone is not our edge**. Our edge is: **rail-specific**, **explainable down to the evidence** (every score traced to a dataset field or a cited web/OCR source), **sovereign / on-prem with open NVIDIA models**, a **generative UI per persona**, and **actions with human approval** (mitigation plan, alternative-supplier shortlist, supplier email, audit trigger, LkSG evidence log).

---

## 0. What the dataset actually is (pitch-relevant facts)

From `supplier_risk_dataset.csv` (10,000 rows, profiled locally):

| Fact | Value | Pitch use |
|---|---|---|
| Suppliers | 10,000 | "a real railway-scale supplier base" |
| Total PO volume | **€20.4 bn** (min €10k, median €795k, max €50M) | financial exposure, ROI denominator |
| Total_Risk_Index_Level | Critical 384 · High 4,813 · Medium 4,485 · Low 318 | "**half the base is High/Critical — humans cannot triage 5,197 suppliers by hand**" |
| Sourcing Risk Level | High 3,502 · Medium 3,024 · Low 3,474 | single/hard-to-replace sources |
| Supply Chain Complexity | Complex 3,711 · Moderate 2,622 · Simple 3,667 | Tier-N risk |
| High sourcing risk AND Critical financial health | **784 suppliers** | the "insolvency x irreplaceable" danger zone |
| **Golden-path demo supplier** | **SUPP_09733 "Advanced Systems 379"**: TRI 87, Financial_Health 100, Sub_Tier_Visibility 96, PO €50M, delivery 74.5 %, Sourcing Risk High, Complex | the hero of the demo |

Each score has a `_Level` twin (Low/Medium/High/Critical). **0 = no risk, 100 = max risk**, including ESG_Performance_Score. That is counter-intuitive, so the UI must label it clearly.

**Gap to exploit:** the dataset has **no country, no commodity/component category, no supplier contacts, no certifications**. The supervisor's enrichment sub-agents (Tavily for web, Nanonets OCR for certificates, invoices and audit PDFs) fill those gaps. This is a natural, honest reason for the agent architecture: *"the numbers tell you THAT a supplier is risky; the agents find out WHY and WHAT TO DO."* For the demo, the tech lead should assign a synthetic `category` (bogie, brake, traction, HVAC, door, rail, sleeper, switch, ETCS, catenary...) and `country` to each supplier with a deterministic hash, so that "n vs n comparison within a category" and "alternative supplier" work.

---

## 1. Railway supply chain domain

### 1.1 Component categories (map these onto synthetic suppliers)

| Domain | Category | Typical tier-1 / notable suppliers | Risk features |
|---|---|---|---|
| Rolling stock | **Bogies & carbody** (welded frames, aluminium extrusions) | OEM in-house (Siemens, Alstom, Stadler, CAF, Talgo), forging/welding subcontractors, extrusion (e.g. Constellium) | welding certification (EN 15085), aluminium energy cost, sub-tier extruders |
| | **Wheelsets / axles / forged wheels** | Bochumer Verein, Lucchini RS, GHH-Bonatrans, CAF MiiRA, Asian forgers | very few qualified forgers, safety-critical, long lead times |
| | **Brakes** | Knorr-Bremse, Wabtec (Faiveley) | duopoly, safety-critical (EN 50126 SIL) |
| | **Traction / power electronics** | OEM in-house, ABB, Mitsubishi, Infineon/Mitsubishi/Hitachi IGBTs | semiconductor shortage, ~50-week IGBT lead times in 2022 |
| | **HVAC** | Liebherr, Faiveley/Wabtec, Merak, Hispacold | F-gas regulation, compressor sub-tier |
| | **Doors / access systems** | Knorr-Bremse (IFE), Wabtec (Faiveley), Bode, Gebr. Bode | high failure frequency in service, so maintenance relevance |
| | **Interiors, seats, PIS, couplers, pantographs** | Voith, Dellner, Schunk, Stemmann, many SMEs | many SMEs = financial fragility |
| Infrastructure | **Rails** | voestalpine, ArcelorMittal, British Steel, Moravia Steel | steel price volatility, CBAM, energy |
| | **Sleepers** (concrete / timber / composite) | Vossloh, Leonhard Moll, regional precasters | cement CBAM, logistics weight |
| | **Switches & crossings** | Vossloh, voestalpine Railway Systems | few qualified vendors |
| | **Signalling / interlocking / ETCS** | Siemens, Alstom, Hitachi Rail (ex-Thales GTS), CAF Signalling | engineering capacity bottleneck, cyber (NIS2), long certification |
| | **Catenary / energy** | Siemens, Furrer+Frey, Pfisterer, copper wire suppliers | copper price, Chinese sub-tier |

### 1.2 Structural characteristics (why rail is especially fragile)
- **Long lead times and long asset life.** Trains run 30-40 years. Contracts include spares obligations, so a supplier exit 15 years later is still a risk. 2022 IGBT lead times reached ~50 weeks ([Fusion Worldwide](https://info.fusionww.com/blog/the-perfect-storm-top-igbt-manufacturers-stop-taking-orders-during-global-surge-in-demand)).
- **Single/dual sourcing by design.** Safety homologation (EN 50126/8/9, EN 15085 welding, IRIS) makes switching suppliers slow and expensive. Maps to `Sourcing Risk Level`.
- **Concentrated OEM market.** Siemens, Alstom (post-Bombardier), Stadler, CAF, Hitachi, Talgo, Skoda. If one tier-1 fails, a fleet programme slips by years.
- **Deep, invisible sub-tiers** (castings, extrusions, electronics, cables). Maps to `Sub_Tier_Visibility_Score` and `Supply Chain Complexity`.

### 1.3 Recent real disruptions (use these in the hook)

| # | Event | What happened | Dataset fields it maps to |
|---|---|---|---|
| 1 | **Valencia DANA floods, Oct 2024**, plus storms | Stadler's own Valencia plant was spared, but **~30 suppliers had halls/warehouses destroyed or filled with mud**; **150-200k production hours pushed into 2025**; aluminium profile supplier **Constellium's Valais plant flooded June 2024**, backlog to Aug 2025; Stadler cut guidance ([Railway Gazette](https://railwaygazette.com/business/devastating-floods-hit-stadler-supply-chain/67815.article), [Railway News](https://railway-news.com/stadler-announces-production-disruption-due-to-flooding/)) | Environmental_Exposure, Sub_Tier_Visibility, Operational_Resilience |
| 2 | **DB ICE L (Talgo) delays** | Ordered for service Dec 2023. Authorised in Germany only in Aug 2025, NL cross-border postponed, Talgo locomotives not before 2026. DB moved to cut the order from 79 to 60 trains ([Railmarket](https://railmarket.com/news/rolling-stock/33961-db-may-cut-talgo-230-order-to-60-trains-due-to-delays-might-pull-these-trains-by-vectrons), [Railcolor News](https://railcolornews.com/2024/05/19/passenger-another-delay-db-ice-l-trains-to-enter-service-in-2025)) | Supplier Delivery Rating, Order Confirmation Rate, Quality_Risk |
| 3 | **Talgo financial distress and takeover** | Renfe claimed **€166M** for a two-year Avril delay. DB penalties loomed. Sale to steelmaker **Sidenor**, backed by Spanish state fund SEPI ([RailTarget](https://www.railtarget.eu/business/talgo-sale-sidenor-pesa-indian-bidders-2025-10040.html), [Merca2](https://www.merca2.es/2025/06/18/el-retraso-en-el-acuerdo-con-sidenor-pone-a-talgo-en-riesgo-otra-sancion-ahora-de-alemania-2204276/)) | Financial_Health, Credit_Rating, Governance, Market_Sentiment |
| 4 | **ICE 4 weld defects at a subcontractor** | Bombardier, as subcontractor, had defective carbody welds. Siemens halted deliveries and DB suspended acceptance ([Railway Journal](https://www.railjournal.com/fleet/db-halts-ice4-deliveries-due-to-weld-quality-issues/), [Railway Technology](https://railway-technology.com/news/deutsche-bahn-calls-on-siemens-and-bombardier-over-train-defects)) | Quality_Risk, Sub_Tier_Visibility |
| 5 | **SBB Flirt award litigation** | Alstom's appeal against SBB's CHF 2bn award to Stadler (286 EMUs) delayed entry into service from Dec 2025 to 2026. Separately, Alstom compensated SBB for late double-decker trains ([Railway News](https://railway-news.com/swiss-court-upholds-sbb-contract-with-stadler/), [Railway News](https://railway-news.com/alstom-to-compensate-sbb-for-delayed-delivery-of-long-distance-trains)) | Compliance_Risk (legal disputes), Supplier Delivery Rating |
| 6 | **DB ETCS retrofit plan withdrawn (summer 2025)** | DB cited the industry's inability to retrofit trains within the planned timeframe, plus funding uncertainty ([SwissInfo/Bloomberg](https://www.swissinfo.ch/eng/century-old-signals-hold-back-advance-of-ai-trains-in-germany/92195376)) | Operational_Resilience, Sourcing Risk Level (capacity) |
| 7 | **Semiconductor shortage 2021-23** | IGBT makers stopped taking orders. Lead times ~50 weeks ([Fusion Worldwide](https://info.fusionww.com/blog/the-perfect-storm-top-igbt-manufacturers-stop-taking-orders-during-global-surge-in-demand)). Rail and transit manufacturers lobbied for chip priority ([Rep. Kelly letter](https://kelly.house.gov/media/press-releases/kelly-reschenthaler-urge-secretary-buttigieg-prioritize-freight-rail)) | Sub_Tier_Visibility, Geopolitical |
| 8 | **Ukraine war, 2022** | Russia and Ukraine supplied ~20 % of European steel consumption. Steel prices rose >60 % m/m by end of March 2022 ([RailTarget](https://www.railtarget.eu/technologies-and-infrastructure/the-pricing-syndrome-is-heading-to-the-rail-sector-how-will-it-affect-iron-and-steel-prices-2465.html)) | Geopolitical, Political_Stability, Financial_Health |
| 9 | **GDL strikes 2023-24** | Longest strike in DB history. Estimates of up to €100M/day for the economy, ~€1bn total ([Times of Oman/dpa](https://timesofoman.com/article/141151-german-train-strike-could-cost-1-billion), [Malay Mail/AFP](https://www.malaymail.com/news/money/2024/01/24/fears-over-economy-grow-as-german-rail-begins-longest-strike/114252)) | Labor_Stability |

*Best hook:* **#1 Valencia**. The OEM was fine, but its **sub-tier was not**, and nobody watching tier-1 dashboards saw it coming. It is recent, visual, and maps directly onto `Environmental_Exposure` and `Sub_Tier_Visibility`. Backup hook: **#2/#3 Talgo** (delivery, then finance, then takeover: a cascading risk story).

> Caution: some aggregator sites claim specific Alstom IGBT force-majeure penalties for 2024-25. We could not verify these, so **do not quote them**.

---

## 2. Regulations & standards that make supplier risk mandatory

| Regulation / standard | Status (Oct 2026) | Supplier-risk obligation | How our product helps |
|---|---|---|---|
| **German LkSG** (Supply Chain Due Diligence Act) | In force since 2023 (≥1,000 employees in DE). An amendment (first Bundestag reading 16 Jan 2026) **abolishes BAFA reporting retroactively** and **limits fines to severe breaches**. Due-diligence and **internal documentation duties remain** ([Jones Day](https://www.jonesday.com/en/insights/2025/09/german-government-follows-up-on-promise-to-change-german-supply-chain-act), [Taylor Wessing](https://www.taylorwessing.com/en/insights-and-events/insights/2026/01/lksg), [NWB](https://www.nwb-experten-blog.de/update-aenderung-des-lieferkettengesetzes-im-bundestag/)) | Annual and ad-hoc risk analysis, prevention and remediation measures, grievance mechanism, documentation | Continuous risk analysis across all 10k suppliers. The **audit log of each agent run** serves as LkSG documentation. "Trigger remediation / audit" actions count as preventive measures (the remaining fineable duties) |
| **EU CSDDD**, amended by **Omnibus I** (Directive (EU) 2026/470) | Published in the OJ on 26 Feb 2026, in force 18 Mar 2026. Scope is now **>5,000 employees and >€1.5bn turnover**. Transposition by 26 Jul 2028, **application 26 Jul 2029**. Penalty cap **3 % of worldwide turnover**. EU-wide civil liability deleted. Transition-plan duty dropped. **Information requests to partners with <5,000 employees only if the data "cannot reasonably be obtained by other means"** ([Linklaters](https://sustainablefutures.linklaters.com/post/102mkjf/eu-omnibus-i-directive-published-in-the-official-journal-of-the-eu), [Cooley](https://www.cooley.com/news/insight/2025/2025-12-10-eu-reaches-agreement-on-omnibus-i-impacting-csrd-and-csddd-compliance-for-us-companies), [ESG Today](https://www.esgtoday.com/eu-states-give-final-approval-to-omnibus-package-to-cut-sustainability-reporting-and-due-diligence-requirements/)) | Risk-based scoping, then in-depth assessment of high-risk areas, prevention, monitoring | **Killer argument:** the law now *steers buyers away from questionnaire spam* toward "other means", which means external and public evidence. Our Tavily + OCR agents produce exactly that, with citations. National rail incumbents (DB, SNCF, FS, SBB-scale) are above the threshold |
| **CSRD / ESRS** | Omnibus: **>1,000 employees AND >€450M turnover**. EU companies report from FY2027 (waves already reporting continue). ESRS simplified ([Cooley](https://www.cooley.com/news/insight/2025/2025-12-10-eu-reaches-agreement-on-omnibus-i-impacting-csrd-and-csddd-compliance-for-us-companies)) | ESRS S2 (workers in the value chain), G1 (supplier relationships, payment practices), E1 Scope 3 | Export of ESG_Performance, Labor_Stability and Safety aggregates per category plus evidence links for ESRS S2/G1 datapoints |
| **EU Forced Labour Regulation** (EU) 2024/3015 | In force 13 Dec 2024, **applies 14 Dec 2027**. Commission guidelines due Jun 2026. Covers all companies and all products, imported or EU-made ([Finnish Gov](https://valtioneuvosto.fi/en/-/1410877/eu-to-ban-products-made-with-forced-labour-regulation-now-in-force), [Clifford Chance](https://cliffordchance.com/insights/resources/blogs/business-and-human-rights-insights/2025/02/eu-ban-on-products-made-with-forced-labour-makes-its-way-into-law.html)) | Products made with forced labour are banned, withdrawn and disposed of. A buyer cannot accept such goods (e.g. polysilicon, aluminium, steel inputs) | Agent flags suppliers with high Geopolitical + Labor + Sub_Tier_Visibility risk and searches news and enforcement databases for forced-labour links. This prevents **stranded inventory** |
| **NIS2** (Directive 2022/2555) | Rail is an essential "transport" sector. Germany's **NIS2UmsuCG in force 6 Dec 2025** (~29k entities) ([Taylor Wessing](https://www.taylorwessing.com/en/insights-and-events/insights/2025/07/the-nis-2-implementation-act), [KPMG](https://kpmg.com/de/en/insights/corporate-governance-and-compliance/it-compliance-management-and-cyber-security/new-start-for-the-nis2-law.html)) | Art. 21(2)(d) **supply chain security**: assess suppliers' cybersecurity and development practices. Fines up to €10M / 2 % of turnover | `Digital_Security_Score` drives a cyber sub-agent (breach news, CVEs for signalling vendors). Mapping to IEC 62443 / CLC/TS 50701 (rail cyber) |
| **EU CBAM** | **Definitive period since 1 Jan 2026**. Iron/steel, aluminium, cement and others need certificates. A 50 t/year de-minimis exempts ~90 % of importers but keeps ~99 % of emissions ([Umweltbundesamt](https://www.umweltbundesamt.de/print/120532), [Reed Smith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102lr9t/what-you-need-to-know-as-cbam-simplification-comes-into-effect/)) | Rails, sleepers (cement), extrusions and steel castings imported from outside the EU carry a carbon cost and need emissions data | Agent estimates CBAM cost exposure per non-EU steel/cement supplier (PO volume x CBAM share) and requests embedded-emissions data |
| **ISO/TS 22163 (IRIS)** | Rail quality management standard (ISO 9001 plus rail add-ons: project management, FAI, RAMS, LCC). ~3,000 certified companies. Operators increasingly *require* IRIS ([DEKRA](https://www.dekra.com/en/iris-certification-iso-ts-22163/), [Quality Austria](https://qualityaustria.com/en/product-groups/transport/railway-industry-iris-international-railway-industry-standard-iso-ts-22163)) | Supplier qualification and monitoring is part of IRIS (purchasing clauses) | Nanonets OCR reads the IRIS/ISO certificates. The agent checks validity and expiry and cross-checks `Quality_Risk_Score` |
| **ISO 28000:2022** | Security and resilience management for the supply chain | Risk assessment of supply-chain security threats | Our risk register plus mitigation plans serve as ISO 28000 evidence |
| **EN 50126 (RAMS)** | Rail reliability, availability, maintainability and safety lifecycle (with EN 50128/50129 for software/signalling) | Hazard log, supplier contribution to safety cases, obsolescence management | Maintenance-engineer view: links supplier Quality/Safety risk to component RAMS criticality and obsolescence alerts |

**One-liner for judges:** *"Omnibus made the reporting lighter, not the risk. LkSG documentation, CSDDD in 2029, the forced-labour ban in 2027 and NIS2 supply-chain security all still require evidence-based supplier due diligence, and Omnibus explicitly tells you to get it 'by other means' than questionnaires. That is what our agents do."*

---

## 3. Personas & jobs-to-be-done (drives the generative per-persona UI)

| Persona | Job-to-be-done | What's on screen (generated) | Dataset fields |
|---|---|---|---|
| **Strategic buyer / category manager** | "Which suppliers in my category should I dual-source, renegotiate or replace before the next tender?" | Category heatmap, **n-vs-n supplier comparison** (radar + table), alternative-supplier shortlist, "draft RFQ" button | Sourcing Risk Level, Purchase Order Volume, Supplier Delivery Rating, Order Confirmation Rate, Order Change Rate, Industry_Benchmark, Quality_Risk, Total_Risk_Index |
| **Supply-chain risk manager** | "What changed since yesterday, and what will hurt us?" | Alert feed (news via Tavily), risk-change deltas, exposure matrix (risk x PO volume), **mitigation plan drafts** awaiting approval, scenario ("flood in region X") | Total_Risk_Index, Media_Sentiment, External_Intelligence, Environmental_Exposure, Geopolitical, Political_Stability, Operational_Resilience, Sub_Tier_Visibility, Supply Chain Complexity |
| **Compliance / ESG officer** | "Prove to auditors / BAFA / CSDDD that we did risk-based due diligence." | LkSG/CSDDD risk register, prioritised high-risk list with **evidence citations**, forced-labour flags, audit tracker, one-click **due-diligence report (PDF)** | ESG_Performance (E/S/G), Labor_Stability, Compliance_Risk, Governance_Risk, Safety_Incident, Geopolitical, Sub_Tier_Visibility |
| **CFO** | "How much money is at risk, and is the mitigation worth it?" | **€ value-at-risk** = PO volume x risk-weighted disruption probability, top-10 exposures, supplier insolvency watchlist, CBAM cost estimate, ROI of mitigations | Purchase Order Volume, Financial_Health, Credit_Rating, Market_Sentiment, Total_Risk_Index |
| **Maintenance / fleet engineer** | "Will I get my spare brake pads and door drives on time? Do I need to stock up?" | Parts availability outlook, **stock forecasting** (safety-stock recommendation from delivery reliability), quality incidents, obsolescence alerts | Supplier Delivery Rating, Order Confirmation Rate, Order Change Rate, Quality_Risk, Safety_Incident, Operational_Resilience |

**Stock forecasting logic to explain simply:** safety stock rises when delivery rating falls, confirmation rate falls, order change rate rises and the risk index is high. *"For SUPP_09733, raise the brake-component buffer from 4 to 9 weeks: €X working capital vs €Y downtime avoided."*

---

## 4. Competitive landscape

| Vendor | What they do | Funding / ownership notes | Weakness / gap we exploit |
|---|---|---|---|
| **Prewave** (Vienna) | AI news/social monitoring in 50+ languages, **140 risk types**, LkSG/CSDDD compliance modules. Customers include Lufthansa and Toyota | €63M Series B 2025, led by Hedosophia ([Vestbee](https://vestbee.com/blog/articles/prewave-secures-63-m), [SupplyChain247](https://www.supplychain247.com/article/prewave-raises-67-million-ai-supply-chain-intelligence)) | Alert-centric. Mitigation still mostly human. Closed SaaS, not rail-specific |
| **Resilinc** (US) | Multi-tier mapping, event monitoring. **Launched an "Agentic AI" platform on 1 May 2025** (disruption and compliance agents), extended Mar 2026 ([GlobeNewswire](https://www.globenewswire.com/news-release/2025/05/01/3072232/0/en/Resilinc-Launches-Agentic-AI-Platform-for-Supply-Chain-Risk-and-Compliance.html)) | Private | **Direct conceptual competitor.** US-centric (UFLPA), proprietary models in a US cloud, not EU-sovereign, not rail-specific |
| **Everstream Analytics** | Predictive disruption and risk analytics, logistics and weather | ~$50M raised 2023 ([CB Insights](https://www.cbinsights.com/company/everstream-analytics/financials)) | Logistics/event focus, no regulatory evidence trail |
| **Interos** | Multi-tier "relationship graph", cyber/financial/ESG risk | Raised $20M Jan 2026 per CB Insights ([CB Insights](https://www.cbinsights.com/company/interos/financials)) | US public-sector/defense heritage. Dashboards |
| **Sphera (riskmethods)** | Supplier risk monitoring (riskmethods acquired by Sphera in 2022), part of an EHS/ESG suite | PE-owned (Blackstone) | Suite add-on, slow to innovate |
| **EcoVadis** | ESG **ratings/scorecards** from supplier questionnaires and documents | Unicorn | Questionnaire-based and periodic. **Omnibus limits questionnaires to SMEs.** Not real-time |
| **IntegrityNext** (Munich) | Self-assessment questionnaires plus monitoring for LkSG/CSRD | Private | Same questionnaire dependency. German compliance focus |
| **Dun & Bradstreet** | Financial/credit data (DUNS), supplier risk scores | **Taken private by Clearlake, $7.7bn, completed 26 Aug 2025** ([Clearlake](https://clearlake.com/news/clearlake-completes-acquisition-of-dun-bradstreet/)) | Data provider, not a workflow. Financial lens only |

### The gap: from dashboards to agents that act, explain and stay sovereign

1. **Action, not alerts.** The supervisor delegates to sub-agents that *draft a mitigation plan*, *rank alternative suppliers in the same category*, *draft the supplier email / RFQ*, *open an audit request*, and *recompute safety stock*. Every action has **human-in-the-loop approval**.
2. **Explainable by construction.** Every claim links to (a) a dataset field and value, (b) a Tavily URL, or (c) an OCR'd document page. No source means no claim, so the output is audit-ready for LkSG/CSDDD.
3. **Sovereign / on-prem.** Open NVIDIA models (Nemotron / NIM containers) can run inside DB's or SBB's data centre. Supplier contracts and POs never leave. This is critical for critical-infrastructure operators under NIS2 and for GDPR.
4. **Rail-native.** Component taxonomy, IRIS certificate checks, RAMS/obsolescence and maintenance-engineer stock forecasting. Horizontal tools have none of this.
5. **Generative per-persona UI.** The same data yields a different screen for the CFO, the buyer and the ESG officer. No 40-tab dashboard.
6. **Open integration via MCP.** Plugs into SAP Ariba / S/4 and existing Prewave/D&B feeds as tools. We are the **agentic layer on top of existing data, not another data silo**. This also answers "why not just buy Prewave?": *we can consume Prewave as an MCP tool.*

---

## 5. Business case numbers

### 5.1 Citable stats
- **Supply chain disruptions cost ~45 % of one year's profits per decade** on average. A disruption of a month or longer happens **every 3.7 years**. A single prolonged production shock wipes **30-50 % of one year's EBITDA** (McKinsey Global Institute, Aug 2020, 325 companies) ([Fortune](https://www.fortune.com/2020/11/16/supply-chain-shock-risk-resilience-covid-mckinsey), [Consulting.us](https://www.consulting.us/news/4743/billions-in-profits-evaporate-due-to-supply-chain-disruptions)).
- **Only 6 % of CPOs have full supply chain visibility. 65 % have limited or no visibility beyond tier 1** (Deloitte CPO survey) ([SharedServicesLink](https://sharedserviceslink.com/news/deloitte-survey-reveals-only-6-of-cpos-have-full-supply-chain-visibility-), [Supply Chain Digital](https://supplychaindigital.com/procurement/visibility-beyond-tier-one-suppliers-hampering-cpos-study-reveals)).
- **Procurement leaders spend ~6 working days per month collecting and preparing data** (SAP/Oxford Economics) ([SAP News](https://news.sap.com/africa/2021/02/where-does-the-money-go-sap-and-oxford-economics-research-reveals-issues-with-managing-spend-across-the-enterprise/)). **72 % of procurement teams spend a large share of time on manual data work** (Suplari survey via [Procurement Tactics](https://procurementtactics.com/ai-in-procurement-statistics/)). Only **32 % rate their supplier risk management as highly effective** (same source).
- Rail-specific costs: Renfe's **€166M** claim against Talgo for a two-year delay. Strike days at up to **€100M/day** for the German economy. Stadler shifted **150-200k production hours** after the Valencia floods (sources in §1.3).
- Regulatory exposure: CSDDD fines up to **3 % of worldwide turnover**. NIS2 up to **€10M / 2 %**. Forced-labour goods are **banned and must be withdrawn**.

### 5.2 ROI structure for the pitch (keep it as a formula, then one example)

```
Annual value = (A) avoided disruption losses + (B) analyst time freed + (C) compliance cost & fine avoidance + (D) working-capital optimisation
(A) = Σ_suppliers  PO_volume × P(disruption | risk scores) × impact_multiplier × detection_uplift
(B) = FTEs_on_risk_monitoring × share_of_time_automated × loaded_cost
(C) = external audit/questionnaire spend avoided + expected fine reduction
(D) = safety-stock right-sizing (less overstock on low-risk, less downtime on high-risk)
```

**Illustrative example (state assumptions explicitly on stage):**
- Spend in scope: **€20.4bn** (dataset).
- Assume 1 % of spend sits with suppliers that cause a material disruption each year (€204M exposed), with an impact multiplier of 2x (downtime, penalties, expediting), giving ~€400M/yr of expected disruption cost. If earlier detection and pre-approved mitigation avoid 10 % of that, **(A) ≈ €40M/yr**.
- (B): 20 risk/compliance FTEs x 40 % automatable x €100k ≈ **€0.8M/yr**.
- (C): questionnaire/rating subscriptions and audit prep ≈ **€0.5-1M/yr**.
- Cost: on-prem GPU node + licence ≈ €0.5-1M/yr, so **ROI well above 10x, driven almost entirely by (A)**.
Say it as: *"If we prevent one Valencia-style surprise every few years, the system pays for itself for a decade."*

---

## 6. Pitch package

### 6.1 Product name shortlist (5)
1. **SwitchPoint** *(recommended)*. In rail, a switch point redirects a train onto a new track. We redirect your supply chain before the crash. Easy to say, rail-native, action-oriented.
2. **Interlock**. Rail interlocking prevents conflicting routes. "Your supply chain, interlocked." It sounds safety-grade, but is more technical.
3. **RailSentinel**. Clear and descriptive, but generic.
4. **TierN**. Speaks to sub-tier visibility. Short, but abstract.
5. **Aiguille** (French for switch / needle). Elegant and European, but harder to pronounce for judges.

*(Do a quick trademark/domain sanity check before going on stage. "Interlock" in particular is a common term.)*

**Tagline:** *"SwitchPoint: see supplier risk early, switch tracks in time."*
Alternatives: *"From red flag to action plan, in one conversation."* / *"Agents that don't just warn you. They reroute you."*

### 6.2 3-minute pitch script outline (presenter)

| Time | Beat | Script cues |
|---|---|---|
| 0:00-0:25 | **Hook** | "October 2024. Floods hit Valencia. Stadler's factory was fine. But **30 of its suppliers** were under mud, and 200,000 production hours slipped a year. Every tier-1 dashboard was green. The risk sat one tier deeper." (Photo of the flood plus a train shell.) |
| 0:25-0:55 | **Problem** | "A railway buys from ~10,000 suppliers. In our dataset, **€20 billion** of spend and **over 5,000 suppliers rated High or Critical**. Lead times exceed a year, half the parts are single-sourced, and compliance law (LkSG, CSDDD, the 2027 forced-labour ban, NIS2) requires documented due diligence on all of them. Today that means spreadsheets, questionnaires and 6 days a month of data wrangling per procurement lead." |
| 0:55-1:10 | **Solution** | "SwitchPoint is a team of AI agents. A supervisor reads your risk scores, sends sub-agents to the web and your documents to find out **why**, and then proposes **what to do**, with every claim cited." |
| 1:10-2:10 | **Demo** (live or video) | Golden path, see §6.3 (compressed). |
| 2:10-2:30 | **Tech & partners** | "Open NVIDIA models running on-prem: sovereign for critical infrastructure. Tavily for live web evidence. Nanonets OCR for certificates and contracts. MCP to plug into SAP and existing risk feeds." |
| 2:30-2:50 | **Impact** | "McKinsey: disruptions cost 45 % of a year's profit per decade. Preventing one Valencia-sized surprise pays for SwitchPoint for years. Plus audit-ready LkSG/CSDDD evidence by default." |
| 2:50-3:00 | **Ask / close** | "We want a pilot with one rolling-stock category at a European operator. SwitchPoint: see supplier risk early, switch tracks in time." |

### 6.3 2-minute demo video storyboard (golden path)

| # | Time | Screen | Voice-over |
|---|---|---|---|
| 1 | 0:00-0:10 | Title card. Flood news headline morphs into the app | "Monday, 8 a.m. Risk manager Lena opens SwitchPoint." |
| 2 | 0:10-0:25 | **Risk manager view** (generated): exposure matrix, risk x € PO, with 784 suppliers glowing in the "Critical finance x High sourcing risk" quadrant | "784 suppliers are both financially fragile and hard to replace." |
| 3 | 0:25-0:45 | Lena types: *"Why is Advanced Systems 379 critical, and what should we do?"* Agent trace panel shows the supervisor spawning Data, Web (Tavily), Docs (OCR) and Mitigation agents | "The supervisor delegates: data, web, documents." |
| 4 | 0:45-1:05 | **Explainable risk card for SUPP_09733**: TRI 87, Financial Health 100, Sub-tier 96, €50M PO, delivery 74 %. Each bullet has a source chip (dataset field / URL / PDF page). OCR'd IRIS certificate shown expiring | "Every claim is cited. No source, no claim." |
| 5 | 1:05-1:25 | **n-vs-n comparison**: SUPP_09733 vs 3 alternative bogie/brake suppliers (radar + table), recommendation to dual-source with supplier B | "It finds and ranks alternatives in the same category." |
| 6 | 1:25-1:40 | **Action panel**: drafted mitigation plan, drafted supplier email, audit request, safety stock raised from 4 to 9 weeks. "Approve" button, then the email is queued | "Agents act, humans approve." |
| 7 | 1:40-1:52 | **Persona switch**: CFO view (€ value-at-risk, ROI of mitigation) and ESG view (LkSG register, report PDF export) | "Same data, a different screen for each role." |
| 8 | 1:52-2:00 | Partner logos: NVIDIA, Tavily, Nanonets, MCP. Tagline | "SwitchPoint." |

**Recording tips:** pre-warm caches so there are no 20-second waits. Speed up agent thinking 2-4x with an on-screen "x3" badge. Record a backup of the live demo.

### 6.4 Q&A prep (10 likely judge questions)

1. **"How do you prevent hallucinations?"** Three layers. (1) Grounding: the numeric risk comes only from the dataset/SQL tool, so the LLM never invents scores. (2) Citation-required outputs: every claim carries a source ID, and unsupported claims are dropped by a verifier step. (3) Human approval before any external action. We also show the agent trace.
2. **"Why agents instead of a dashboard?"** Dashboards tell you *that* 5,000 suppliers are red. Nobody can investigate 5,000. Agents do the investigation (why) and the legwork (alternatives, emails, audits), and humans decide. Omnibus also limits questionnaires to SMEs, so evidence must be gathered "by other means". That is agent work.
3. **"Data privacy / GDPR?"** Supplier data is mostly company data. Personal data (contact names in emails, OCR'd documents) is minimised and processed on-prem. Web search queries contain only supplier company names. Data processing agreements apply to the SaaS APIs, and they can be swapped for self-hosted equivalents.
4. **"Can it run on-prem for critical infrastructure?"** Yes. NVIDIA open models (Nemotron family via NIM containers) run on a single GPU node in the operator's data centre. MCP tools are local. Only the web-search agent needs an outbound connection, and it can be disabled or proxied. This is NIS2-friendly.
5. **"How does it scale to 10k+ suppliers?"** Tiered: cheap deterministic scoring and triage over all 10k (SQL/pandas, milliseconds), then agents run only on the top-N or changed suppliers, plus scheduled batch enrichment and caching of web evidence. Cost is proportional to *risk events*, not supplier count.
6. **"How is this different from Prewave or Resilinc (which also says 'agentic')?"** Rail-native taxonomy and standards (IRIS, RAMS, stock forecasting for maintenance). Sovereign open models on-prem, versus US SaaS. Evidence-level explainability for LkSG/CSDDD. And we can consume Prewave/D&B as MCP tools, so we orchestrate rather than replace.
7. **"Where does the risk score come from? Isn't it a black box?"** Total_Risk_Index is a weighted average of transparent sub-scores. We show the weights and the top contributing sub-scores and let users re-weight per persona (e.g. the compliance officer up-weights ESG/Labor).
8. **"What about wrong or malicious web content?"** Source reputation ranking, cross-source corroboration (≥2 sources for a red flag), recency filters, and every flag labelled "unverified" until a human confirms it.
9. **"Business model / who buys?"** Annual licence per supplier band, on-prem or private cloud. Buyer: CPO / Head of Supply Chain Risk at rail operators (DB, SBB, ÖBB, SNCF) and OEMs (Siemens Mobility, Alstom, Stadler). Expand to other regulated asset-heavy sectors (energy grids, aerospace, defence).
10. **"What's real vs mocked in the demo?"** Be honest. Dataset and scoring: real. Tavily search and OCR: live. Category/country assignment: synthetic, because the dataset lacks them. Emails: drafted, not sent. Honesty here earns trust.

*Bonus answers:* **"Why NVIDIA open models vs GPT?"** Sovereignty, cost control, fine-tuning on rail vocabulary, no vendor lock-in. **"Accuracy of stock forecasting?"** It is a transparent safety-stock formula driven by delivery reliability, not a black-box forecast. It can be calibrated on ERP history in a pilot.

---

## 7. Presenter's division of labour during the hackathon

| Block | Presenter (she) | Tech lead (he) | Sync point |
|---|---|---|---|
| **H0-H1** | Lock the name, tagline and golden path with the tech lead. Confirm judging criteria and pitch length/format with organisers. Collect partner logos and usage rules (NVIDIA, Tavily, Nanonets) | Repo, data loading, scoring, supervisor skeleton | 15-min kickoff: agree the **golden-path supplier SUPP_09733** and the 3 alternatives |
| **H1-H4** | Write the **pitch script v1** (§6.2), the slide deck skeleton (6-8 slides) and the hook visual (Valencia flood photo with licence/attribution). Draft **persona copy**: screen titles and microcopy for the buyer, risk manager, ESG, CFO and maintenance views | Sub-agents: Tavily, OCR, comparison | Hand her the agent output JSON so slide numbers match |
| **H4-H6** | Create **demo assets**: 2-3 realistic sample PDFs for OCR (IRIS certificate, supplier self-declaration, delivery note), each **clearly marked synthetic**. Write the supplier email template and mitigation-plan template. Build the category taxonomy list (§1.1) for the tech lead | Generative UI, persona switch, actions | Test the OCR PDFs end-to-end |
| **H6-H8** | **QA as a judge would**: click through the golden path 5x, log bugs, time each step. Write Q&A cards (§6.4) and rehearse the answers aloud | Bug fixing, caching, demo hardening | Freeze features (no new features after this) |
| **H8-H10** | **Record the 2-min demo video** (OBS / screen recorder) following §6.3. Voice-over, captions, speed-ups. Export the backup video | Stand by for fixes during recording | Final deck numbers match the live app |
| **H10-end** | Rehearse the 3-min pitch ≥3 times with a timer (the tech lead plays a hostile judge). Prepare the submission text (Devpost-style): problem, solution, tech, partners, team. Upload the video and repo link | README, architecture diagram, submission | Submit **≥30 min before deadline** |

**Presenter checklist:** offline copy of the video and slides on USB; screenshots fallback for every demo step; one sentence per tech partner explaining *what it does in our product*; know the 5 headline numbers by heart: **10k suppliers, €20.4bn spend, 5,197 High/Critical, 784 danger-zone, 45 % of annual profit per decade**.

---

## Sources (consolidated)
- Railway Gazette, Stadler flood impact: https://railwaygazette.com/business/devastating-floods-hit-stadler-supply-chain/67815.article
- Railway News, Stadler production disruption: https://railway-news.com/stadler-announces-production-disruption-due-to-flooding/
- Railmarket, DB ICE L order cut: https://railmarket.com/news/rolling-stock/33961-db-may-cut-talgo-230-order-to-60-trains-due-to-delays-might-pull-these-trains-by-vectrons
- Railcolor News, ICE L delay: https://railcolornews.com/2024/05/19/passenger-another-delay-db-ice-l-trains-to-enter-service-in-2025
- RailTarget, Talgo sale / Sidenor: https://www.railtarget.eu/business/talgo-sale-sidenor-pesa-indian-bidders-2025-10040.html
- Merca2, Talgo / DB sanction risk: https://www.merca2.es/2025/06/18/el-retraso-en-el-acuerdo-con-sidenor-pone-a-talgo-en-riesgo-otra-sancion-ahora-de-alemania-2204276/
- Railway Journal, ICE4 weld issues: https://www.railjournal.com/fleet/db-halts-ice4-deliveries-due-to-weld-quality-issues/
- Railway Technology, DB vs Siemens/Bombardier: https://railway-technology.com/news/deutsche-bahn-calls-on-siemens-and-bombardier-over-train-defects
- Railway News, SBB/Stadler court; Alstom compensation: https://railway-news.com/swiss-court-upholds-sbb-contract-with-stadler/ , https://railway-news.com/alstom-to-compensate-sbb-for-delayed-delivery-of-long-distance-trains
- SwissInfo, DB ETCS plan withdrawn: https://www.swissinfo.ch/eng/century-old-signals-hold-back-advance-of-ai-trains-in-germany/92195376
- Fusion Worldwide, IGBT shortage: https://info.fusionww.com/blog/the-perfect-storm-top-igbt-manufacturers-stop-taking-orders-during-global-surge-in-demand
- RailTarget, steel price after Ukraine invasion: https://www.railtarget.eu/technologies-and-infrastructure/the-pricing-syndrome-is-heading-to-the-rail-sector-how-will-it-affect-iron-and-steel-prices-2465.html
- GDL strike cost: https://timesofoman.com/article/141151-german-train-strike-could-cost-1-billion ; https://www.malaymail.com/news/money/2024/01/24/fears-over-economy-grow-as-german-rail-begins-longest-strike/114252
- LkSG amendment: https://www.jonesday.com/en/insights/2025/09/german-government-follows-up-on-promise-to-change-german-supply-chain-act ; https://www.taylorwessing.com/en/insights-and-events/insights/2026/01/lksg ; https://www.nwb-experten-blog.de/update-aenderung-des-lieferkettengesetzes-im-bundestag/
- Omnibus I: https://sustainablefutures.linklaters.com/post/102mkjf/eu-omnibus-i-directive-published-in-the-official-journal-of-the-eu ; https://www.cooley.com/news/insight/2025/2025-12-10-eu-reaches-agreement-on-omnibus-i-impacting-csrd-and-csddd-compliance-for-us-companies ; https://www.esgtoday.com/eu-states-give-final-approval-to-omnibus-package-to-cut-sustainability-reporting-and-due-diligence-requirements/
- Forced Labour Regulation: https://valtioneuvosto.fi/en/-/1410877/eu-to-ban-products-made-with-forced-labour-regulation-now-in-force ; https://cliffordchance.com/insights/resources/blogs/business-and-human-rights-insights/2025/02/eu-ban-on-products-made-with-forced-labour-makes-its-way-into-law.html
- NIS2 Germany: https://www.taylorwessing.com/en/insights-and-events/insights/2025/07/the-nis-2-implementation-act ; https://kpmg.com/de/en/insights/corporate-governance-and-compliance/it-compliance-management-and-cyber-security/new-start-for-the-nis2-law.html
- CBAM: https://www.umweltbundesamt.de/print/120532 ; https://www.reedsmith.com/our-insights/blogs/viewpoints/102lr9t/what-you-need-to-know-as-cbam-simplification-comes-into-effect/
- IRIS / ISO 22163: https://www.dekra.com/en/iris-certification-iso-ts-22163/ ; https://qualityaustria.com/en/product-groups/transport/railway-industry-iris-international-railway-industry-standard-iso-ts-22163
- Competitors: https://vestbee.com/blog/articles/prewave-secures-63-m ; https://www.supplychain247.com/article/prewave-raises-67-million-ai-supply-chain-intelligence ; https://www.globenewswire.com/news-release/2025/05/01/3072232/0/en/Resilinc-Launches-Agentic-AI-Platform-for-Supply-Chain-Risk-and-Compliance.html ; https://www.cbinsights.com/company/everstream-analytics/financials ; https://www.cbinsights.com/company/interos/financials ; https://clearlake.com/news/clearlake-completes-acquisition-of-dun-bradstreet/
- Business case: https://www.fortune.com/2020/11/16/supply-chain-shock-risk-resilience-covid-mckinsey ; https://www.consulting.us/news/4743/billions-in-profits-evaporate-due-to-supply-chain-disruptions ; https://sharedserviceslink.com/news/deloitte-survey-reveals-only-6-of-cpos-have-full-supply-chain-visibility- ; https://news.sap.com/africa/2021/02/where-does-the-money-go-sap-and-oxford-economics-research-reveals-issues-with-managing-spend-across-the-enterprise/ ; https://procurementtactics.com/ai-in-procurement-statistics/

*Not independently verified, from background knowledge: Sphera's 2022 acquisition of riskmethods and Blackstone ownership, the supplier names in §1.1, and NIS2 fine levels (from the directive text). Check them before quoting on stage.*
