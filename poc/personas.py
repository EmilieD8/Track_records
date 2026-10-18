import json

from config import PERSONAS_PATH

DEFAULT_PERSONAS = [
    {
        "id": "risk_manager",
        "name": "Jonas Richter",
        "role": "Supply Chain Risk Manager",
        "department": "Procurement Risk & Resilience",
        "focus": "Hidden risks, € exposure, priority suppliers, mitigation plans",
        "style": "Concise, ranked lists, always state the driver of each risk",
        "notes": "",
        "questions": [
            "Which suppliers should I worry about this week?",
            "Show me hidden risks with more than €5M spend.",
            "Explain why SUPP_09733 is Critical and what we should do.",
        ],
    },
    {
        "id": "buyer",
        "ui_config": {"per_item": 8, "panels": ["bubbles", "recommendations", "copilot"]},
        "ui_spec": {"title": "Rolling Stock Sourcing", "greeting": "Hello Lena, ready to source your next rolling stock items?",
                    "summary": "Request-driven sourcing: items first, then the suppliers that can deliver them and their risk.",
                    "kpis": [], "panels": ["bubbles", "recommendations", "copilot"], "highlight_categories": [],
                    "recommendation_focus": "lowest risk with proven delivery", "generated_by": "nvidia/nemotron-3-super-120b-a12b"},
        "name": "Lena Weber",
        "role": "Strategic Buyer",
        "department": "Rolling Stock Procurement (bogies, brakes, doors)",
        "focus": "Delivery performance, order confirmation, alternatives for hard-to-replace suppliers",
        "style": "Practical, action-oriented, compare options in a table",
        "notes": "",
        "questions": [
            "Which high-spend suppliers have the worst delivery rating?",
            "Find alternatives for SUPP_06901.",
            "Compare SUPP_09733, SUPP_06901 and SUPP_01319.",
        ],
    },
    {
        "id": "esg",
        "name": "Sara Okafor",
        "role": "ESG & Compliance Officer",
        "department": "Corporate Responsibility",
        "focus": "ESG, labor, safety, compliance and governance scores; LkSG / CSDDD due diligence",
        "style": "Audit-ready, cite evidence for every claim",
        "notes": "",
        "questions": [
            "Which suppliers need an LkSG due-diligence review?",
            "Top 10 ESG concerns by spend.",
        ],
    },
    {
        "id": "cfo",
        "name": "Martin Klein",
        "role": "CFO",
        "department": "Finance",
        "focus": "€ exposure, financial health and credit risk, concentration of spend",
        "style": "Executive summary first, numbers in €",
        "notes": "",
        "questions": [
            "How much of our spend is at risk?",
            "Which suppliers are financially fragile and hard to replace?",
        ],
    },
    {
        "id": "engineer",
        "name": "Aylin Demir",
        "role": "Maintenance Engineer",
        "department": "Fleet Maintenance",
        "focus": "Quality risk, operational resilience, delivery reliability of spare parts",
        "style": "Technical, focus on quality and reliability",
        "notes": "",
        "questions": [
            "Which suppliers have Critical quality risk?",
            "Which suppliers deliver worse than their risk profile predicts?",
        ],
    },
]


def email_of(p: dict) -> str:
    return p.get("email") or p["name"].lower().replace(" ", ".") + "@railco.eu"


DEFAULT_UI_CONFIG = {"per_item": 8, "panels": ["bubbles", "recommendations", "copilot"]}


def _default_spec(p: dict) -> dict:
    return {"title": f"{p['role']} workspace", "greeting": f"Hello {p['name'].split()[0]}, what are we sourcing today?",
            "summary": "Request-driven sourcing: items first, then the suppliers that can deliver them and their risk.",
            "kpis": [], "panels": DEFAULT_UI_CONFIG["panels"], "highlight_categories": [],
            "recommendation_focus": "lowest risk with proven delivery", "generated_by": "nvidia/nemotron-3-super-120b-a12b"}


def load_personas() -> list[dict]:
    ps = json.loads(PERSONAS_PATH.read_text()) if PERSONAS_PATH.exists() else [dict(p) for p in DEFAULT_PERSONAS]
    for p in ps:
        p["email"] = email_of(p)
        p.setdefault("ui_config", dict(DEFAULT_UI_CONFIG))
        p.setdefault("ui_spec", _default_spec(p))
    return ps


def save_personas(personas: list[dict]) -> None:
    PERSONAS_PATH.write_text(json.dumps(personas, indent=2, ensure_ascii=False))
