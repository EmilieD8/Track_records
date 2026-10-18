import hashlib
import json

from config import CACHE_DIR, TAVILY_API_KEY


def web_search(query: str, topic: str = "general", max_results: int = 5) -> dict:
    if not TAVILY_API_KEY:
        raise RuntimeError("TAVILY_API_KEY missing in poc/.env")
    key = hashlib.sha1(f"{topic}|{max_results}|{query}".encode()).hexdigest()[:16]
    cache = CACHE_DIR / "tavily" / f"{key}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    from tavily import TavilyClient
    res = TavilyClient(api_key=TAVILY_API_KEY).search(
        query=query, topic=topic if topic in ("general", "news") else "general",
        max_results=max(1, min(int(max_results), 10)), include_answer=True)
    out = {"query": query, "answer": res.get("answer"),
           "results": [{"title": r.get("title"), "url": r.get("url"), "content": (r.get("content") or "")[:700],
                        "published_date": r.get("published_date")} for r in res.get("results", [])]}
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(out))
    return out
