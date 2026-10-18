# 02 — Hackathon identification, partners, judging criteria, winning patterns

Research date: 2026-10-18 (event day). Sources at the bottom of each section.

Confidence legend: **HIGH** = verified on official event page today; **MED** = verified on a sibling {Tech: Europe}/Nebius event in 2026 or strongly implied; **LOW** = inferred / not found online.

---

## 1. Which hackathon is this?

### Best match (HIGH): "Nebius Build Week Hackathon in partnership with NVIDIA"

| Field | Value |
|---|---|
| Date | **Sunday 18 Oct 2026**, 09:00/09:30 – 21:00 CEST (one day, ~6–7 h hacking) |
| Venue | **The Delta Campus + CODE University, Donaustraße 44, 12043 Berlin** (Neukölln) |
| Hosts | **{Tech: Europe}** x The Delta x CODE University, for **Nebius** (Nebius Developer Community), in partnership with **NVIDIA**; part of "Nebius Build Week" right before **NVIDIA GTC Berlin** |
| Size | ~250 builders targeted; 465 registered on Luma |
| Platform | Event is live on the {Tech: Europe} hackathon platform `hackathons.techeurope.io` ("Running now") |
| Tracks | 1) **Cloud & Serverless** (Nebius infra, inference endpoints, eval pipelines) 2) **Apps & Agentic AI** (agents with open models + Nebius Token Factory + **Tavily**) 3) **Vertical AI** (healthcare/life sciences, physical AI & robotics, media/entertainment, retail) + **NVIDIA Challenge** (build with **Nemotron via Nebius Token Factory**) |
| Extra challenges | "More technology and application partners will be joining soon, bringing additional challenges, tools and prizes." The railway supplier-risk case is almost certainly one of these on-site "application partner" challenges (not published online). |
| Prize pool (platform) | 18,000 $ Nebius Token Factory credits + 18,000 $ Nebius Cloud credits + 2x 30,000 Tavily credits + 500 $ Toloka credits + 10,000 $ Reflection AI credits **per team** (listed twice) + 1,500 BFL (Black Forest Labs) credits + "10 items" (likely hardware, e.g. NVIDIA Jetson / swag) |

Agenda — two slightly different versions are published; **trust what organizers say at the opening**:

| Source | Submission / opt-in deadline | Judging | Demos | Awards |
|---|---|---|---|---|
| {Tech: Europe} platform (most recent) | **18:30 "Competition Opt-In Deadline & Dinner"** | — | **20:00 Live Demos** | 21:00 Award ceremony |
| Luma page | 18:30 Submission deadline | — | 20:00 Finalist demos & awards | 21:00 reception |
| nebius.com / germanhackathons.com | **17:30 submission** | 17:30–18:45 | 18:45–19:30 finalist demos | — |

Talks at 19:00 (Di Jin, SVP Nebius — "Make an open model yours") and 19:10 (Patrick Fernandes, Reflection AI — "Open models for agentic & reasoning tasks") -> judges from Nebius, NVIDIA, Reflection AI are likely; open-model angle is valued.

### Railway challenge sponsor — NOT found online (LOW)
No public page names the railway company. Candidates ranked by plausibility for a Berlin event: **Deutsche Bahn / DB Systel / DB mindbox** (Berlin HQ, runs hackathons) > Siemens Mobility > Alstom/Stadler/Knorr-Bremse (InnoTrans "AI on Track" sponsors in Sept 2026 were Alstom, Siemens Mobility, Wabtec). **Ask the challenge owner at the briefing** what they reward (they usually also judge their own track).

### Other October {Tech: Europe} events (ruled out)
- Agentic AI Hack Stockholm (3 Oct), Zurich (10 Oct) — finished, DeepMind/Gradium partners.
- Jamie AI Agentic AI Hack, Berlin, 24 Oct (Jamie, Reson8, Anthropic).
- Agentic AI Hack Karlsruhe, 14 Nov (codesphere, Google DeepMind).

### Linked opportunity (HIGH): Nebius x NVIDIA **Global AI Hackathon** (Devpost)
- Submission window 26 Aug – **30 Oct 2026, 10:00 PT** — you can re-submit the same project there afterwards.
- **City Winner Awards: 20 x $500** for entrants attending a participating IRL city event — **Berlin is listed**.
- **Best Use of Tavily: $3,000** (needs a functional runtime Tavily call).
- Grand $20k / $10k / $6k; track winners get NVIDIA Jetson Orin Nano ("Best Apps and Agents" track = Nemotron on Token Factory).
- Requirements: runtime call to **Nebius Token Factory** (or runs on Nebius AI Cloud) + at least one **NVIDIA open model**; public repo with OSI licence (MIT/Apache-2.0) visible in "About"; README; **YouTube video < 3 min**; working demo URL; feedback section ($100 + swag for 10 best feedback).
- Judging: stage 1 pass/fail on theme + required APIs; stage 2 equally weighted: **Technological Implementation, Design (complete product, not just PoC), Potential Impact, Quality of the Idea** (creative, non-obvious use; genuine understanding of the problem space).

Sources: https://luma.com/big-gtc-hack · https://hackathons.techeurope.io/events/nebius-build-week-hackathon-in-partnership-with-nvidia · https://hackathons.techeurope.io · https://nebius.com/events/nebius-nvidia-ai-builders-hackathon · https://germanhackathons.com/en/events/nebius-build-week-hackathon-in-partnership-with-nvidia · https://techeurope.io/ · https://nebiusglobalaihackathon.devpost.com/rules · https://lucaberton.com/blog/aaif-builders-brews-amsterdam-nebius-nvidia-hackathon-2026/ · https://www.globalrailwayreview.com/innotrans-launches-global-ai-hackathon-with-major-rail-industry-sponsors/2135308.article

---

## 2. Judging criteria and rules

### Today's event (official text says only "demos and judging")
Specific criteria are not published. Expect a blend of:

**A. {Tech: Europe} criteria (MED, from previous editions — Big Berlin Hack Jan & Apr 2026, same venue/co-hosts):**
1. **Creativity** — non-obvious angle on a real problem (not a generic chatbot).
2. **Technical complexity** — real plumbing visible; at least one non-trivial agent/retrieval/tool-calling layer.
3. **Effective use of partner tech** — partner tools **load-bearing**, not decorative.
4. (implicit) **Real-world authority/impact** — jury praise for Jan-2026 winner MedAccura: "great technical depth, realized in a very short time, with really great results" + real hospital impact.

**B. Nebius/NVIDIA criteria (MED, from the linked Devpost hackathon):** Technological implementation (incl. how well Nemotron/Token Factory are used) · Design/complete product · Potential impact · Quality of idea.

**C. Railway challenge owner (LOW, typical for corporate tracks):** business usefulness for procurement/risk teams, explainability/traceability of each risk score, use of their dataset, realistic integration path.

### Rules seen at previous {Tech: Europe} editions ("likely, from previous editions")
| Rule | Status |
|---|---|
| **Use 3+ partner technologies** (load-bearing) | Big Berlin Hack 2026 hard rule (MED). Not stated for today — **verify at opening**. Safe plan: Nebius Token Factory + NVIDIA Nemotron + Tavily (+ MCP/others). |
| **2-minute demo video** (problem -> demo -> partner credits -> what's next) | Big Berlin Hack 2026 (MED). Devpost global = < 3 min YouTube. **Record ≤ 2:00** to satisfy both. |
| **Public GitHub repo**, README crediting each partner tool | All {Tech: Europe} platform projects show "Code" + "Demo" links (HIGH). Add MIT/Apache licence for Devpost. |
| Demo link (deployed URL or video) | Platform "Demo ↗" field (HIGH). |
| **No code before the event** | {Tech: Europe} rule (MED). Research/design/prompt drafts are OK; scaffolding generated today. |
| Competition **opt-in deadline** then finalists do **live demos** (~3–5 min) | One-day {Tech: Europe} format (HIGH): opt-in 18:30–19:45, live demos 20:00–21:00. Big Berlin Hack finalists: 5-min live pitch. |
| Team size | up to 5 typical; you are 2 (fine). |

Sources: https://github.com/ibxibx/berlin-hackathon-prep · https://hackathons.techeurope.io/events/tech-europe-agentic-ai-hack (London) · https://hackathons.techeurope.io/events/tech-europe-x-veed-hackathon-the-summer-lock-in · https://nebiusglobalaihackathon.devpost.com/rules

---

## 3. Partners — main table

| Partner | What it gives | How we use it (supplier-risk agent) | Side prize? | Confidence |
|---|---|---|---|---|
| **Nebius Token Factory** | OpenAI-compatible inference API for open models (`https://api.tokenfactory.us-central1.nebius.com/v1/`), 18k $ credits in pool; Serverless Endpoints/Jobs, DevPods | Single LLM endpoint for all agents (supervisor + sub-agents). Swap model by name. Optionally deploy backend on Nebius Serverless to also score in "Cloud & Serverless". | Main tracks are Nebius' own; + Devpost City Winner $500 | **HIGH** (headline sponsor) |
| **NVIDIA Nemotron** (via Token Factory) | Open models: Nemotron 3 **Nano 30B** (fast), **Super 120B** (multi-agent reasoning), **Ultra 550B** (deep research, long agents), **Nano Omni** (multimodal/omni). Workshops, mentors, judges | Supervisor = Nemotron 3 Super/Ultra; worker agents (news triage, scoring explanation) = Nano; documents/images (supplier certificates, invoices, scanned PDFs) = Nano Omni / NVIDIA VL/Parse models. Say "100% open models, sovereign/on-prem-capable" — big plus for a rail operator. | **Yes — dedicated NVIDIA Challenge**; Devpost track prize Jetson Orin Nano | **HIGH** |
| **Tavily** | Web search/extract/crawl/map/research API; 30,000 credits in pool (x2); free 1,000 credits/month; dev key 100 RPM, prod 1,000 RPM, research 20 RPM, crawl 100 RPM | Live external intelligence per supplier: news (strikes, insolvency, fines, cyber incidents, floods), sanctions/lawsuits -> refresh `Media_Sentiment`, `Labor_Stability`, `Compliance_Risk`, `Environmental_Exposure` with cited sources. Raw-material market news (whiteboard "stock market of resources" add-on). | Named in "Apps & Agentic AI" track; **Devpost "Best Use of Tavily" $3,000** | **HIGH** |
| **Reflection AI** | 10,000 $ credits **per team**; open-weight **Beam** model (MoE 501B/23B active, 1M context, tool use + JSON), weights on HF (Apache-2.0) since 16 Oct 2026; speaker at 19:10 | Long-context model to ingest a supplier's full history + many news articles in one call for the narrative risk report; or as a second-opinion "critic/judge" agent. | Likely partner prize (speaker + per-team credits) — unconfirmed | **MED** (listed in prize pool) |
| **Toloka** | 500 $ credits; human-expert data, agent evaluation/red-teaming | Small human-labelled eval set: "is this news item a real supplier risk?" -> report precision of the agent. Only if time. | Unknown | **MED** (listed in prize pool) |
| **Black Forest Labs (BFL)** | 1,500 FLUX image credits | Low value for this case; at most a generated cover/hero image. Skip. | Unknown | **MED** (listed in prize pool) |
| **MCP (Model Context Protocol)** | Open protocol, not a sponsor | Expose dataset tools (`get_supplier`, `top_risks`, `compare_suppliers`, `tavily_news`) as an MCP server so the supervisor (and Claude/Cursor) can call them; shows "plugs into DB's existing stack". | No | n/a (technique) |
| **Nanonets** (OCR / document AI, also open `Nanonets-OCR` models) | Document extraction API (invoices, POs, contracts) | Parse supplier PDFs/certificates if the dataset includes documents. **Note: the whiteboard says "Nonotron -> OCR", which most likely means NVIDIA *Nemotron* (VL/Parse OCR), not Nanonets.** Prefer the NVIDIA model to stay inside the NVIDIA challenge. | Not a partner of this event | **LOW** (not found in any 2025–26 {Tech: Europe} partner list) |
| **Railway company** (challenge owner, e.g. Deutsche Bahn) | Anonymized supplier-risk dataset + case | Core of the product: scoring, explanations, alerts, "n vs n" supplier comparison, stock forecast. | Probably its own challenge prize | **LOW** (not published) |
| **{Tech: Europe} / The Delta / CODE** | Organisers, platform, Discord | Submit on hackathons.techeurope.io; announcements on Discord. | — | HIGH |

### Partners of other 2025–2026 {Tech: Europe} editions (NOT confirmed today — only use if they show up on site)
Google DeepMind/Gemini (most 2026 Agentic AI Hacks), OpenAI (Berlin, London Summer Lock-In, Barcelona), Anthropic (Jamie hack 24 Oct), Lovable, Runpod, Tower (Berlin AI hack), n8n, Superlinked, Mubit, Aikido, Slng.ai (London Jun 2026), cognee, telli (Berlin Jul 2026), fal, Fastino/Pioneer, H Company (London Aug 2026), Gradium (Zurich, Paris, Big Berlin Hack), Entire (Zurich, Barcelona), Modal, Pydantic (London Sep 2026), Cognition (Paris), Qontext, Peec AI, Buena, ai|coustics (Big Berlin Hack Apr 2026). **Tavily is the most recurrent tech partner across 2026 editions.**

Sources: https://nebius.com/services/token-factory/nemotron · https://nebius.com/blog/posts/nemotron3-super-now-available · https://docs.tavily.com/documentation/rate-limits · https://www.llmreference.com/model-family/beam · https://www.nocode.mba/ai-release-tracker/providers/reflection · https://toloka.ai/blog/ai-agent-evaluation-benchmarks-frameworks/ · https://providers.apievangelist.com/providers/nanonets/ · https://luma.com/londonhack · https://luma.com/london-summer-lock-in · https://luma.com/berlin-summer-lock-in · https://luma.com/jamie-hack · https://luma.com/kar-hack · https://luma.com/berlin-ai-hack

---

## 4. How past winners won

Recent {Tech: Europe} winners (from hackathons.techeurope.io):

| Event (2026) | Winner | Why it fits a pattern |
|---|---|---|
| London Agentic AI Hack, 19 Sep | **OrbitSatellite** — satellite images + 4,000 news items scored in <10 s on 50 Modal containers -> commodity price forecasts; pitched as an **early-warning system for procurement, supply-chain and risk teams** | **Almost exactly our problem space**: scale, real data, fully agentic (not seeded), clear business buyer |
| Zurich, 10 Oct | ∑cribe — real-time voice + handwriting AI tutor | Personal pain, live wow-moment |
| Stockholm, 3 Oct | Aloud — voice/vision agent for blind people | Strong human story + live demo |
| Paris AI Gaming, 26 Sep | Broskis — photo -> 3D physics weapon | Instant visual wow |
| London VEED, 22 Aug | Lantern — 999 call -> 3D house rebuild for firefighters | Multi-partner pipeline, credits each partner explicitly |
| Barcelona Cala, 29 Aug | CalaMari; finalists Bedrock (company/owners/lawsuits/sanctions research with source links) and SignalGraph (sourced knowledge-graph investigation board) | **Every claim linked to a source** valued |
| Big Berlin Hack Jan 2026 | MedAccura | Domain expert on team + technical depth |
| London VEED finalist | Osiris — defence bids where "a supplier can't clear compliance months in" | Supplier compliance is a recognised judge-friendly theme |

Common patterns / judge feedback:
1. **Working end-to-end demo** beats slides: one input in, one useful output out, live.
2. **Real data at scale + visible agent plumbing** (OrbitSatellite: numbers like "4,000 news in 10 s").
3. **Clear buyer & business outcome** (procurement/risk team saves X, catches risk Y weeks earlier).
4. **Traceability** — every score/claim with source links (Bedrock, SignalGraph, RIF).
5. **Partner tech load-bearing and named on screen** (Lantern lists every partner).
6. Domain credibility / first-person pain.

Pitch format (one-day {Tech: Europe} events): opt-in by deadline -> finalists do **live demos on stage (~3–5 min incl. Q&A)**; recorded video ≤ 2 min (Big Berlin Hack rule) / < 3 min (Devpost). Recommended script: 15 s problem (a rail supplier fails -> trains stand still), 75 s live demo (pick supplier -> agent pulls dataset + Tavily news -> Nemotron explains score with citations -> alert + compare + forecast), 20 s architecture with partner logos, 10 s impact/next.

Sources: https://hackathons.techeurope.io/events/tech-europe-agentic-ai-hack · https://hackathons.techeurope.io/events/tech-europe-agentic-ai-hack-2 · https://hackathons.techeurope.io/events/tech-europe-agentic-ai-hack-3 · https://hackathons.techeurope.io/events/tech-europe-ai-gaming-hack · https://hackathons.techeurope.io/events/tech-europe-x-cala-hackathon-the-summer-lock-in · https://hackathons.techeurope.io/events/tech-europe-x-veed-hackathon-the-summer-lock-in · https://github.com/ibxibx/berlin-hackathon-prep

---

## 5. Practical tips (today)

**Credits & keys (do first, before 11:00)**
- Claim Nebius Token Factory credits (code/QR at opening or Discord) -> create API key -> smoke test with OpenAI SDK: `base_url="https://api.tokenfactory.us-central1.nebius.com/v1/"`, list models, confirm exact Nemotron model IDs.
- Tavily: sign up at app.tavily.com (1,000 free credits/month without card) and redeem hackathon credits; dev keys are limited to **100 RPM** (research endpoint 20 RPM) -> cache results per supplier in a local JSON/SQLite, use `search_depth="basic"` for bulk, `advanced` only for the demo supplier.
- Reflection AI: claim the 10k $/team credits (self-serve API keys opened 16 Oct); test JSON/tool-use mode once.
- Toloka/BFL: claim only if used.
- Keep all keys in `.env`, never commit; add `.env.example`.

**Rate-limit & reliability**
- Pre-compute scores for the whole dataset offline; call LLM/Tavily live only for the 1–3 demo suppliers.
- Retry with backoff on 429 (Tavily returns `Retry-After`).
- Use Nemotron Nano for bulk, Super/Ultra for the final report -> fast + credits last.
- Have a **cached "demo mode"** fallback in case venue Wi-Fi or an API dies.

**Before code freeze (opt-in 18:30 / possibly 17:30 — confirm!)**
- Public GitHub repo, MIT licence, README: problem, architecture diagram, how to run, **"Partner tech used" section** (Nebius Token Factory, NVIDIA Nemotron [models], Tavily, MCP, Reflection AI…).
- Deployed demo URL (or local + video).
- ≤ 2-min video uploaded to YouTube (public/unlisted) — record by ~17:00.
- Submit on hackathons.techeurope.io, opt into: main track (Apps & Agentic AI), **NVIDIA challenge**, railway challenge, any Tavily/Reflection side prize.
- After the event: submit to Devpost Global AI Hackathon by **30 Oct 10:00 PT** (City Winner Berlin $500, Best Use of Tavily $3,000, feedback $100).

**Questions to ask organisers at 10:00**
1. Exact submission deadline & form fields (video length? repo required?).
2. Minimum number of partner technologies?
3. Can one project compete in main track + NVIDIA challenge + railway challenge?
4. What does the railway challenge owner value most (accuracy vs. explainability vs. UX)?
5. Demo length on stage.
