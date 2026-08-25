"""
Entity resolution for mandal names, built to fix several issues seen in
real chatbot transcripts:

  - Cross-entity contamination: retrieval pulling chunks from the wrong
    mandal (e.g. answering a Kasba Ganpati question with Tambat Ali data).
  - Entity substitution: "Kasba Ganpati" being confused with the
    similarly-named but distinct "Kasba Peth Talim Ganpati".
  - Typo / spelling-variant sensitivity: "Kasaba Ganpati", "Kasba Ganapati".
  - Broken coreference: "What is its aarti timing?" not resolving to the
    mandal discussed earlier in the conversation.

Strategy:
  1. Exact substring match against canonical name_english / name_marathi
     first. This is what correctly tells "Kasba Ganpati" apart from
     "Kasba Peth Talim Ganpati": the shorter name is not a substring of a
     query using the longer name, and vice versa, so there's no ambiguity
     as long as the user's phrasing is exact.
  2. Only if no exact match is found, fall back to fuzzy matching
     (rapidfuzz) over sliding token windows sized to each candidate name,
     so a typo like "Kasaba" still resolves without accidentally matching
     on a shared, common word like "Ganpati" alone.
  3. A small heuristic (`is_followup_query`) flags queries that are
     probably referring back to a previously-discussed mandal — either
     because they're short, or because they contain a pronoun/reference
     word in English, Hindi, or Marathi — so the pipeline knows when to
     reuse the last resolved entity from session memory.
"""
from functools import lru_cache

from rapidfuzz import fuzz

from app.data.loader import load_records, slugify

# Signals that a query is deliberately cross-mandal / not about "whatever
# we were just discussing" — e.g. "which mandal has the oldest idol?" or
# "compare X and Y". When one of these is present, the pipeline should NOT
# narrow retrieval to the last-discussed mandal even if none is named.
_BROAD_QUERY_MARKERS = [
    "all mandal", "which mandal", "which ganpati", "list of", "every mandal",
    "top mandal", "best mandal", "nearby mandal", "other mandal",
    "different mandal", "compare", "vs ", " versus ",
]

_FUZZY_THRESHOLD = 82.0


@lru_cache
def _entity_registry() -> list[dict]:
    """Canonical (doc_id, name_en, name_mr) for every mandal in the
    dataset. Cached for the process lifetime — the dataset doesn't
    change without a restart/re-ingest."""
    entities = []
    for rec in load_records():
        name_en = (rec.get("name_english") or "").strip()
        if not name_en:
            continue
        entities.append(
            {
                "doc_id": slugify(name_en),
                "name_en": name_en,
                "name_mr": (rec.get("name_marathi") or "").strip(),
            }
        )
    return entities


def _exact_matches(query_lower: str, registry: list[dict]) -> list[dict]:
    hits = []
    for e in registry:
        name_en_l = e["name_en"].lower()
        if name_en_l and name_en_l in query_lower:
            hits.append({**e, "match_score": 100.0, "match_type": "exact_en"})
            continue
        if e["name_mr"] and e["name_mr"] in query_lower:
            hits.append({**e, "match_score": 100.0, "match_type": "exact_mr"})
    return hits


def _fuzzy_matches(query_lower: str, registry: list[dict]) -> list[dict]:
    tokens = query_lower.split()
    best_by_doc: dict[str, dict] = {}
    for e in registry:
        name_l = e["name_en"].lower()
        n_tokens = len(name_l.split())
        best_score = 0.0
        # Slide a window the same length as the candidate name across the
        # query, so "Kasaba Ganpati timing?" is compared window-by-window
        # ("kasaba ganpati", "ganpati timing?") rather than as one blob —
        # this keeps the match tied to the right words instead of just
        # rewarding any shared vocabulary.
        for i in range(max(1, len(tokens) - n_tokens + 1)):
            window = " ".join(tokens[i:i + n_tokens])
            score = fuzz.ratio(window, name_l)
            best_score = max(best_score, score)
        if best_score >= _FUZZY_THRESHOLD:
            best_by_doc[e["doc_id"]] = {**e, "match_score": best_score, "match_type": "fuzzy"}
    return list(best_by_doc.values())


def resolve_entities(text: str, max_results: int = 3) -> list[dict]:
    """Return canonical mandals mentioned in `text`, best match first.
    Empty list means no mandal was explicitly named."""
    if not text or not text.strip():
        return []

    query_lower = text.lower()
    registry = _entity_registry()

    exact = _exact_matches(query_lower, registry)
    if exact:
        # Prefer the highest-confidence, most specific (longest name) match;
        # de-dupe by doc_id in case both name_en and name_mr matched.
        seen: set[str] = set()
        out = []
        for e in sorted(exact, key=lambda e: (-e["match_score"], -len(e["name_en"]))):
            if e["doc_id"] in seen:
                continue
            seen.add(e["doc_id"])
            out.append(e)
        return out[:max_results]

    fuzzy = _fuzzy_matches(query_lower, registry)
    fuzzy.sort(key=lambda e: -e["match_score"])
    return fuzzy[:max_results]


def resolve_single_entity(text: str) -> dict | None:
    matches = resolve_entities(text, max_results=1)
    return matches[0] if matches else None


def is_broad_query(text: str) -> bool:
    """True when the query is deliberately about multiple/any mandals
    ("which mandal has...", "compare X and Y") rather than continuing a
    conversation about one specific mandal. rag_pipeline uses this: if a
    query names no mandal AND isn't broad, it defaults to carrying
    forward whatever mandal was last discussed in the session — this is
    what correctly resolves "What happened to the idol over the
    centuries?" (no pronoun, but clearly a follow-up in context) to the
    mandal from two turns ago, instead of drifting to an unrelated one."""
    if not text or not text.strip():
        return False
    text_lower = text.lower()
    return any(marker in text_lower for marker in _BROAD_QUERY_MARKERS)
