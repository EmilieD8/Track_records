import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")

DATASET_PATH = Path(os.getenv("DATASET_PATH", ROOT / "data" / "supplier_risk_dataset.csv"))
EXPLAINER_PATH = ROOT.parent / "data_explainer.html"
# Vercel functions only have a writable /tmp (ephemeral); everything the app saves goes under STATE_DIR.
STATE_DIR = Path("/tmp/supplyguard") if os.getenv("VERCEL") else ROOT
CACHE_DIR = STATE_DIR / ".cache"
PERSONAS_PATH = STATE_DIR / "personas.json"

# Nebius Token Factory (OpenAI-compatible). Verify the URL in the Token Factory console.
NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1/")
NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY") or os.getenv("NEBIUS_TOKEN_FACTORY_API_KEY", "")

# NVIDIA API catalog (build.nvidia.com), also OpenAI-compatible; optional OCR/VLM provider.
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

DEFAULT_MODELS = [m.strip() for m in os.getenv(
    "DEFAULT_MODELS",
    "nvidia/nemotron-3-super-120b-a12b,nvidia/nemotron-3.5-lightning-30b-a3b,"
    "nvidia/Llama-3_3-Nemotron-Super-49B-v1_5,nvidia/NVIDIA-Nemotron-Nano-9B-v2",
).split(",") if m.strip()]
OCR_MODELS = [m.strip() for m in os.getenv(
    "OCR_MODELS", "nvidia/nemotron-parse,nvidia/nemotron-parse-2.0,nvidia/nemotron-3.5-super-vl-120b-a12b").split(",") if m.strip()]
ENRICH_DIR = ROOT / "data" / "enrichment"

PROVIDERS = {
    "Nebius Token Factory": (NEBIUS_BASE_URL, NEBIUS_API_KEY),
    "NVIDIA API (build.nvidia.com)": (NVIDIA_BASE_URL, NVIDIA_API_KEY),
}
