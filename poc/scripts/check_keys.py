"""Verify API keys and model availability.  Run from poc/:  .venv/bin/python scripts/check_keys.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config import OCR_MODELS, TAVILY_API_KEY  # noqa: E402
from llm import client  # noqa: E402

TOOL = [{"type": "function", "function": {"name": "get_supplier", "description": "Get a supplier",
         "parameters": {"type": "object", "properties": {"supplier_id": {"type": "string"}}, "required": ["supplier_id"]}}}]

for provider in ["Nebius Token Factory", "NVIDIA API (build.nvidia.com)"]:
    print(f"\n== {provider}")
    try:
        ids = sorted(m.id for m in client(provider).models.list().data)
    except Exception as e:
        print("  FAILED:", str(e)[:200])
        continue
    nem = [i for i in ids if "nemotron" in i.lower()]
    print(f"  {len(ids)} models visible, {len(nem)} Nemotron:")
    for i in nem:
        print("   -", i)
    if provider.startswith("NVIDIA"):
        for m in OCR_MODELS:
            print(f"  OCR model {m}: {'listed' if m in ids else 'NOT listed (may still work; check build.nvidia.com page)'}")
    from config import DEFAULT_MODELS
    chat_models = [m for m in DEFAULT_MODELS if m in ids]
    if chat_models:
        m = chat_models[0]
        try:
            msg = client(provider).chat.completions.create(
                model=m, max_tokens=300, tools=TOOL, tool_choice="auto",
                messages=[{"role": "user", "content": "Look up supplier SUPP_09733."}]).choices[0].message
            print(f"  tool-calling test on {m}: {'OK' if msg.tool_calls else 'no tool call returned'}")
        except Exception as e:
            print(f"  tool-calling test on {m} FAILED:", str(e)[:200])

print("\n== Tavily")
if not TAVILY_API_KEY:
    print("  missing TAVILY_API_KEY")
else:
    from tavily import TavilyClient
    try:
        r = TavilyClient(api_key=TAVILY_API_KEY).search("rail rolling stock supplier delay 2026", max_results=2)
        print("  OK:", [x["title"][:60] for x in r["results"]])
    except Exception as e:
        print("  FAILED:", str(e)[:200])
