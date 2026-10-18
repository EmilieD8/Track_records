import re
from functools import lru_cache

from openai import OpenAI

from config import DEFAULT_MODELS, PROVIDERS

THINK_RE = re.compile(r"<think>.*?</think>", re.S)


@lru_cache(maxsize=4)
def client(provider: str = "Nebius Token Factory") -> OpenAI:
    base_url, key = PROVIDERS[provider]
    if not key:
        raise RuntimeError(f"No API key set for {provider}. Add it to poc/.env")
    return OpenAI(base_url=base_url, api_key=key, timeout=120)


NON_CHAT = ("parse", "embed", "rerank", "safety", "reward", "guard", "ocr")


def list_models(provider: str = "Nebius Token Factory", keyword: str = "nemotron") -> list[str]:
    try:
        ids = sorted(m.id for m in client(provider).models.list().data)
    except Exception:
        return DEFAULT_MODELS
    hits = [i for i in ids if keyword.lower() in i.lower() and not any(x in i.lower() for x in NON_CHAT)]
    preferred = [m for m in DEFAULT_MODELS if m in hits]
    return preferred + [h for h in hits if h not in preferred] or DEFAULT_MODELS


def chat(model: str, messages: list, tools: list | None = None, provider: str = "Nebius Token Factory",
         temperature: float = 0.2, max_tokens: int = 2048):
    kwargs = dict(model=model, messages=messages, temperature=temperature, max_tokens=max_tokens)
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"
    try:
        msg = client(provider).chat.completions.create(
            **kwargs, extra_body={"chat_template_kwargs": {"enable_thinking": False}}).choices[0].message
    except Exception as e:
        if "chat_template_kwargs" not in str(e) and "enable_thinking" not in str(e):
            raise
        msg = client(provider).chat.completions.create(**kwargs).choices[0].message
    if msg.content:
        msg.content = THINK_RE.sub("", msg.content).strip()
    return msg
