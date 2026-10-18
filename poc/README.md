# SwitchPoint POC: agentic supplier risk for rail

Streamlit app. A **Supervisor agent** (NVIDIA Nemotron via Nebius Token Factory) decides which sources a question
needs and delegates to specialist agents:

- **Data Agent:** exact risk maths over `supplier_risk_dataset.csv` (ranking, breakdown, what-if, alternatives)
- **Document Agent:** searches files from a shared folder. Text is read directly; images and scanned PDFs are OCR'd by an NVIDIA vision model.
- **Web Agent:** live search via Tavily

UI features:
- personas with profiles (add your own)
- folder picker plus extraction
- model selector (Nemotron models listed from your account)
- free-text notes appended to the system prompt
- live agent trace
- data guide tab

## Run

```bash
cd poc
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # add NEBIUS_API_KEY, TAVILY_API_KEY (NVIDIA_API_KEY optional)
.venv/bin/streamlit run app.py
```

`sample_docs/` contains SYNTHETIC demo documents. Category and alternatives logic is a SIMULATED proxy (the dataset
has no category column).
