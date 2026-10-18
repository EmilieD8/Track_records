import base64
import hashlib
import json
import re
from pathlib import Path

from config import CACHE_DIR
from llm import client

TEXT_EXT = {".txt", ".md", ".csv", ".json", ".log", ".html", ".xml", ".yaml", ".yml"}
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
DOC_EXT = TEXT_EXT | IMG_EXT | {".pdf", ".docx"}
OCR_PROMPT = ("Extract ALL text from this document image. Keep tables as markdown tables, keep headings, "
              "dates, certificate numbers and names exactly. Output only the extracted content.")
MAX_PDF_OCR_PAGES = 10


def list_files(folder: str) -> list[Path]:
    p = Path(folder).expanduser()
    return sorted(f for f in p.rglob("*") if f.is_file() and f.suffix.lower() in DOC_EXT and ".cache" not in f.parts)


def _collect_text(obj) -> list[str]:
    if isinstance(obj, dict):
        return ([obj["text"]] if isinstance(obj.get("text"), str) else []) + [x for v in obj.values() if not isinstance(v, str) for x in _collect_text(v)]
    if isinstance(obj, list):
        return [x for v in obj for x in _collect_text(v)]
    return []


def _nemotron_parse(b64: str, mime: str, provider: str, model: str) -> str:
    """NVIDIA Nemotron Parse: image in an <img> tag, output returned as a forced tool call."""
    tool = "markdown_no_bbox"
    msg = client(provider).chat.completions.create(
        model=model, max_tokens=8192,
        messages=[{"role": "user", "content": f'<img src="data:{mime};base64,{b64}" />'}],
        tools=[{"type": "function", "function": {"name": tool}}],
        tool_choice={"type": "function", "function": {"name": tool}},
    ).choices[0].message
    if msg.tool_calls:
        raw = msg.tool_calls[0].function.arguments
        try:
            return "\n".join(_collect_text(json.loads(raw))) or raw
        except json.JSONDecodeError:
            return raw
    return msg.content or ""


def _ocr_image(png: bytes, mime: str, provider: str, model: str) -> str:
    b64 = base64.b64encode(png).decode()
    if "parse" in model.lower():
        return _nemotron_parse(b64, mime, provider, model)
    msg = client(provider).chat.completions.create(
        model=model, temperature=0, max_tokens=4096,
        messages=[{"role": "user", "content": [
            {"type": "text", "text": OCR_PROMPT},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}]}],
    ).choices[0].message.content or ""
    return re.sub(r"<think>.*?</think>", "", msg, flags=re.S).strip()


def _extract(f: Path, provider: str, model: str) -> tuple[str, str]:
    ext = f.suffix.lower()
    if ext in TEXT_EXT:
        return f.read_text(errors="ignore"), "text"
    if ext == ".docx":
        import docx
        return "\n".join(p.text for p in docx.Document(f).paragraphs), "docx"
    if ext in IMG_EXT:
        mime = "image/png" if ext == ".png" else "image/jpeg" if ext in {".jpg", ".jpeg"} else f"image/{ext[1:]}"
        return _ocr_image(f.read_bytes(), mime, provider, model), f"OCR · {model}"
    if ext == ".pdf":
        import pymupdf as fitz
        doc = fitz.open(f)
        text = "\n".join(page.get_text() for page in doc)
        if len(text.strip()) > 50 * max(1, len(doc)) / 5:
            return text, "pdf text layer"
        pages = [_ocr_image(page.get_pixmap(dpi=150).tobytes("png"), "image/png", provider, model)
                 for page in list(doc)[:MAX_PDF_OCR_PAGES]]
        return "\n\n".join(f"--- page {i + 1} ---\n{t}" for i, t in enumerate(pages)), f"OCR · {model}"
    return "", "skipped"


def extract_file(f: Path, provider: str, model: str) -> dict:
    h = hashlib.sha1(f.read_bytes()).hexdigest()[:16]
    cache = CACHE_DIR / "extract" / f"{h}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    try:
        text, method = _extract(f, provider, model)
        rec = {"name": f.name, "path": str(f), "method": method, "chars": len(text), "text": text, "error": None}
    except Exception as e:
        return {"name": f.name, "path": str(f), "method": "failed", "chars": 0, "text": "", "error": str(e)}
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(rec))
    return rec


def chunk_docs(docs: list[dict], size: int = 1200, overlap: int = 200) -> list[dict]:
    chunks = []
    for d in docs:
        t = d["text"]
        for i, start in enumerate(range(0, max(1, len(t)), size - overlap)):
            piece = t[start:start + size]
            if piece.strip():
                chunks.append({"doc": d["name"], "chunk": i, "text": piece})
    return chunks


def search_chunks(chunks: list[dict], query: str, k: int = 5) -> list[dict]:
    terms = [w for w in re.findall(r"\w+", query.lower()) if len(w) > 2]
    scored = []
    for c in chunks:
        low = c["text"].lower()
        s = sum(low.count(w) for w in terms) + 3 * sum(w in c["doc"].lower() for w in terms)
        if s:
            scored.append((s, c))
    return [c for _, c in sorted(scored, key=lambda x: -x[0])[:k]]
