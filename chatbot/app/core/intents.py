"""
Cheap, deterministic (non-LLM) intent flags layered on top of entity
resolution. These decide which *extra* structured pieces the pipeline
attaches to an answer — a Darshan Planner run, an idol photo, or a
map/location card — without ever asking the LLM to decide, so the
decision is fast, free, and never hallucinated.
"""
import re

_PLANNER_MARKERS = [
    "plan my darshan", "plan a darshan", "plan my route", "plan a route",
    "darshan plan", "darshan route", "route plan", "plan darshan",
    "help me plan", "itinerary", "which order should i visit",
    "in what order should i visit",
]

_PHOTO_MARKERS = [
    "photo", "picture", "pic of", "image of", "what does the idol look",
    "show me the idol", "idol look like", "फोटो",
]

_LOCATION_MARKERS = [
    "show me", "where is", "location of", "map of", "directions to",
    "how do i get to", "navigate to", "take me to",
]

_CROWD_MARKERS = [
    "how busy", "how crowded", "is it crowded", "crowd at", "wait time",
    "queue at", "line at", "gर्दी", "गर्दी",
]

def wants_crowd_info(text: str) -> bool:
    if not text:
        return False
    return _any_marker(text.lower(), _CROWD_MARKERS)

def _any_marker(text_lower: str, markers: list[str]) -> bool:
    return any(m in text_lower for m in markers)


def is_planner_query(text: str) -> bool:
    if not text:
        return False
    return _any_marker(text.lower(), _PLANNER_MARKERS)


def wants_photo(text: str) -> bool:
    if not text:
        return False
    return _any_marker(text.lower(), _PHOTO_MARKERS)


def wants_location_card(text: str) -> bool:
    """True for queries that are fundamentally 'show me / navigate to X'
    rather than a factual question about X — these get a map/directions
    card attached in addition to the normal grounded answer."""
    if not text:
        return False
    return _any_marker(text.lower(), _LOCATION_MARKERS)


# ---- Darshan Planner slot extraction ----
_DURATION_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(hour|hr|hrs|hours|min|mins|minute|minutes)\b", re.IGNORECASE
)
_START_RE = re.compile(
    r"(?:start(?:ing)?\s+(?:from|at)|from)\s+([A-Za-z0-9,.\-'\s]+?)(?:[.,]|$| and | with | i want| for )",
    re.IGNORECASE,
)
_ALL_MANACHE_RE = re.compile(r"\ball\s+5\b|\ball\s+five\b|\bmanache\s+ganpati", re.IGNORECASE)


def extract_duration_minutes(text: str) -> float | None:
    """Returns the first duration mentioned in the query, normalized to
    minutes. Returns None if no duration is mentioned."""
    match = _DURATION_RE.search(text or "")
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    return value * 60 if unit.startswith(("hour", "hr")) else value


def extract_start_location(text: str) -> str | None:
    match = _START_RE.search(text or "")
    if not match:
        return None
    start = match.group(1).strip(" .,")
    return start or None


def wants_all_manache(text: str) -> bool:
    return bool(_ALL_MANACHE_RE.search(text or ""))
