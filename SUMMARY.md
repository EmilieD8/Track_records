# SupplyGuard: Hackathon Wrap-up

Hackathon Tech Europe, October 2026. Branch: `dev-iter-v2` (includes `dev-iter-v1`).

## What it is

SupplyGuard is an agentic supplier-risk assistant for railway procurement, built for the project sponsor Siemens Mobility.
A buyer describes what they need to procure. A **supervisor agent** then picks the right agents and tools: supplier data,
shared documents, the email inbox and the web. It returns:

- who to buy from and who to avoid, per item,
- the risk score behind each choice, with sources,
- what changes when a supplier reports a disruption.

Every number comes from a deterministic tool. The LLM (NVIDIA Nemotron) plans the work, reads text and writes the answer,
but it never invents scores.

## Main flow (demo path)

1. **Sign in.** Demo accounts are listed on the login page, for example `lena.weber@railco.eu` (Strategic Buyer). On first
   login, Nemotron generates a per-persona UI layout.
2. **Home.** A chat box to the supervisor is in the centre of the page. The home page also has:
   - an optional project name and **project folder path**, used by the Document Agent,
   - one-click **examples** for the demo (RegioFlex brakes and bogies, ICX-300 doors, HVAC and traction, the email delay
     alert, a weekly risk check).
3. **Request workspace.** The chat intake collects items, constraints (EU only) and the priority (lowest risk, delivery
   reliability, proven volume). The results page shows:
   - the **radial supplier tree** (new) or **bubbles** (previous version). A toggle switches between them for comparison.
   - recommended suppliers per item, picked among the suppliers in that item's branch.
4. **Supplier dashboard.** Shows the score breakdown, 24-month history, fleet impact, the order ledger, buyer notes and news.
5. **Email inbox (connector).** A simulated supplier email reports a 6-week delay on BCU-7 brake control units. The Email
   Agent extracts the event with Nemotron and recomputes the supplier's risk. The supplier drops out of the recommendations
   and the next-best supplier replaces it.
6. **Supervisor chat.** The supervisor delegates in parallel to the Data, Document, Email and Web agents. A live agent trace
   shows each step, and every claim is cited (`[data]`, `[doc: …]`, `[email: …]`, `[web: …]`).

## Architecture

```
React + Vite + Tailwind (web/)          FastAPI (poc/api.py)
  Home · Workspace · Inbox     ──/api──▶  Supervisor agent (agents.py, tool-calling loop)
  Supervisor chat (SSE trace)               ├─ Data Agent      → data_tools.py   (10,000 suppliers, exact maths)
  Supplier dashboard                        ├─ Document Agent  → extract.py      (PDF/DOCX/OCR via Nemotron Parse)
  RadialTree / ZoomPack                     ├─ Email Agent     → email_connector.py (MCP-style tools)
                                            └─ Web Agent       → web.py          (Tavily)
                                          workspace.py: items → supplier tree, ranking, projects, generated UI
```

- **LLM:** NVIDIA Nemotron through the NVIDIA API or Nebius Token Factory (both OpenAI-compatible).
- **OCR:** `nvidia/nemotron-parse` for scanned PDFs and images.
- **Risk index:** `Total_Risk_Index = round(Σ weight × sub-score)` over 18 factors. Levels are Low < 25 ≤ Medium < 50 ≤
  High < 75 ≤ Critical.

### Email connector: how the new risk is computed

| Signal in the email | Score change |
|---|---|
| Delay of *n* weeks | Operational Resilience +5 per week (max +30) |
| Sub-supplier cause | Sub-Tier Visibility +15 |
| Cash flow or prepayment | Financial Health +15 |
| Quality, NCR or rework | Quality Risk +15 |

- The total risk is then recomputed with the same weighted formula.
- Projected delivery = current rating − 2.5 points per week of delay (max −25).
- Line-stop weeks = max(0, delay − safety stock).
- A supplier can be recommended only if risk < 50 and delivery ≥ 90%. Assessed disruptions feed back into the supplier
  tree and the recommendations.

Endpoints:

- `GET /api/email/inbox`
- `POST /api/email/simulate {scenario: brake_delay | door_delay}`
- `POST /api/email/{id}/analyze`
- `GET /api/email/disruptions`

## What changed in this iteration (`dev-iter-v2`)

- **Home hub** after login: a central chat to the supervisor, the project folder path, and demo examples.
- **Siemens branding:** the logo (Wikimedia SVG, `web/public/`) appears in the header, the login page and the home page.
- **Radial supplier tree** (`web/src/components/RadialTree.tsx`), modelled on the Flourish hierarchy chart:
  - coloured item branches, supplier leaves with metric bars (risk, PO volume, exposure),
  - the dot on each leaf shows the supplier's risk,
  - click an item to fan it out, and click a supplier to open its dashboard.
- **Email connector and Email Agent:**
  - a simulated inbox, with a toast notification for each new email,
  - an analysis card showing the risk before and after, delivery, exposure, line-stop weeks, open orders and alternatives,
  - the supervisor can call the email tools.
- **Merged `dev-iter-v1`** (colleague): a request workspace with intake and results phases, recommendations ranked inside
  each bubble, and no portfolio page.

## Run it

```bash
make install        # Python venv (poc/.venv) + npm packages
cp poc/.env.example poc/.env   # NVIDIA_API_KEY / NEBIUS_API_KEY / TAVILY_API_KEY
make dev            # API on :8000 + UI on :5173
# or: cd web && npm run build && cd ../poc && .venv/bin/uvicorn api:app --port 8000   (serves the build)
```

Without API keys, the app still runs. Extraction falls back to regex and keyword parsing, and the UI layout falls back to
a template.

## What is real and what is simulated

| Real | Simulated (clearly labelled in the UI) |
|---|---|
| 10,000-supplier risk dataset, 18 sub-scores, weighted index | Country, part category, IRIS certificates, lead time and safety stock |
| Nemotron agents, tool calling, OCR on the sample documents | Fleet bill of materials, 24-month history, purchase-order ledger |
| Tavily web search | Email inbox and supplier emails |
| | The score uplift rules for the email delay |

## Known limits and next steps

- The inbox and disruptions are in memory and reset when the API restarts. Next step: a real IMAP or Graph connector as an
  MCP server.
- Document extraction state is global. The project folder re-indexes it for every user. Next step: one document index per
  project.
- The delay rules are fixed estimates. Next step: calibrate them on historical delivery and PO data.
- The radial tree is best with up to about 8 items and about 15 suppliers per item. Beyond that, it should group items
  into an "Other" branch.
- No real authentication yet. The demo accounts only identify the persona.
