"""
Darshan Planner: turns "plan my darshan route" into a concrete, ordered
itinerary instead of a plain Q&A answer.

Deliberately kept 100% deterministic (no LLM call): stop order, distances
and duration all come from real mandal coordinates + haversine math, so
the plan can never invent a mandal, an order, or a timing the way a free
-text LLM completion could (see the "no fabrication" rule in llm.py's
SYSTEM_PROMPT, the planner holds itself to the same bar, just by
construction instead of by prompting).

Route ordering uses a greedy nearest-neighbour walk from the start point.
That's not a true TSP solve, but for ~5-8 old-Pune stops within a couple
of km of each other it produces a sensible walking loop, is O(n^2), and
is instant, appropriate for a chat response.
"""
from dataclasses import dataclass

from app.core.geo import haversine_km
from app.core.intents import (
    extract_duration_minutes,
    extract_start_location,
    wants_all_manache,
)
from app.data.loader import get_mandals

# Well-known Pune landmarks visitors commonly start a darshan walk from.
# Free-text geocoding is out of scope for a chat backend with no maps API
# key, so this is a small deterministic lookup; anything else falls back
# to Pune Railway Station, the most common starting point for visitors.
_KNOWN_STARTS = {
    "pune railway station": (18.5286, 73.8744),
    "pune station": (18.5286, 73.8744),
    "railway station": (18.5286, 73.8744),
    "swargate": (18.5017, 73.8636),
    "shivajinagar": (18.5308, 73.8475),
    "deccan": (18.5158, 73.8412),
    "deccan gymkhana": (18.5158, 73.8412),
    "pune junction": (18.5286, 73.8744),
}
_DEFAULT_START_NAME = "Pune Railway Station"
_DEFAULT_START = _KNOWN_STARTS["pune railway station"]

# Pace assumptions for old-Pune peth-area walking during the festival,
# short distances but heavy foot traffic, so speed is conservative.
WALK_SPEED_KMPH = 3.0
MINUTES_PER_STOP = 25  # darshan + queue time at each mandal. The frontend's
                       # manual Route planner used to mirror this figure, but it
                       # multiplied it by the stop count and called the result an
                       # estimate, which ignored where the stops actually were.
                       # That card is gone; this is now the only such estimate,
                       # and it is paired with real per-leg haversine distance.
_AVOID_CROWD_MARKERS = ["avoid crowd", "less crowd", "low crowd", "not crowded", "avoid busy"]


@dataclass
class PlanStop:
    order: int
    doc_id: str
    name: str
    lat: float | None
    lng: float | None
    leg_km: float | None       # distance from the previous stop
    leg_minutes: float | None  # walking time for that leg
    crowd_label: str = "No data yet"
    
def _wants_to_avoid_crowds(query: str) -> bool:
    q = query.lower()
    return any(m in q for m in _AVOID_CROWD_MARKERS)


def _resolve_start(query: str, lat: float | None = None, lng: float | None = None) -> tuple[str, float, float]:
    if lat is not None and lng is not None:
        return "Your current location", lat, lng
    raw = extract_start_location(query)
    if not raw:
        return _DEFAULT_START_NAME, *_DEFAULT_START
    key = raw.strip().lower()
    for landmark, coords in _KNOWN_STARTS.items():
        if landmark in key or key in landmark:
            return raw.strip().title(), *coords
    # Also allow starting "from <a mandal name>"
    for m in get_mandals():
        if m["lat"] is not None and (m["name_en"].lower() in key or key in m["name_en"].lower()):
            return m["name_en"], m["lat"], m["lng"]
    return raw.strip().title(), *_DEFAULT_START


def _target_mandals(entity_doc_ids: list[str] | None, query: str) -> list[dict]:
    all_mandals = [m for m in get_mandals() if m["lat"] is not None and m["lng"] is not None]
    if entity_doc_ids:
        by_id = {m["doc_id"]: m for m in all_mandals}
        named = [by_id[d] for d in entity_doc_ids if d in by_id]
        if named:
            return named
    if wants_all_manache(query):
        manache = [m for m in all_mandals if m.get("is_manacha")]
        if manache:
            return sorted(manache, key=lambda m: (m.get("manacha") is None, m.get("manacha")))
    # No mandals named at all: default to the 5 Manache Ganpati, since
    # that's the classic Pune darshan circuit and the example in the
    # product brief this feature was built for.
    manache = [m for m in all_mandals if m.get("is_manacha")]
    return sorted(manache, key=lambda m: (m.get("manacha") is None, m.get("manacha"))) or all_mandals[:5]


def _order_by_nearest_neighbour(start_lat: float, start_lng: float, mandals: list[dict]) -> list[PlanStop]:
    remaining = list(mandals)
    stops: list[PlanStop] = []
    cur_lat, cur_lng = start_lat, start_lng
    order = 1
    while remaining:
        nxt = min(remaining, key=lambda m: haversine_km(cur_lat, cur_lng, m["lat"], m["lng"]))
        leg_km = haversine_km(cur_lat, cur_lng, nxt["lat"], nxt["lng"])
        leg_minutes = (leg_km / WALK_SPEED_KMPH) * 60
        stops.append(
            PlanStop(
                order=order,
                doc_id=nxt["doc_id"],
                name=nxt["name_en"],
                lat=nxt["lat"],
                lng=nxt["lng"],
                leg_km=round(leg_km, 2),
                leg_minutes=round(leg_minutes, 1),
            )
        )
        cur_lat, cur_lng = nxt["lat"], nxt["lng"]
        remaining.remove(nxt)
        order += 1
    return stops


def _nearest_food_stop(mandals: list[dict]) -> dict | None:
    for m in mandals:
        for f in m.get("food") or []:
            return {**f, "near": m["name_en"]}
    return None


def build_plan(
    query: str, entity_doc_ids: list[str] | None,
    lat: float | None = None, lng: float | None = None,
    crowd_by_name: list[dict] | None = None,
) -> dict:
    """Builds a full Darshan Plan: start point, ordered stops, total
    estimated duration, and a nearby food suggestion. Returns a dict
    that's both directly JSON-serializable (for the frontend map/route
    integration) and used to render the formatted chat text below."""
    start_name, start_lat, start_lng = _resolve_start(query, lat, lng)
    mandals = _target_mandals(entity_doc_ids, query)

    # If the user asked to avoid crowds, drop High-crowd mandals from the
    # candidate list before ordering, but only when that still leaves at
    # least one stop, so we never return an empty plan.
    crowd_lookup = {c["name"]: c for c in (crowd_by_name or [])}
    if _wants_to_avoid_crowds(query):
        filtered = [m for m in mandals if crowd_lookup.get(m["name_en"], {}).get("level") != 3]
        if filtered:
            mandals = filtered

    stops = _order_by_nearest_neighbour(start_lat, start_lng, mandals)
    for s in stops:
        crowd = crowd_lookup.get(s.name)
        s.crowd_label = crowd["label"] if crowd else "No data yet"
        
    travel_minutes = sum(s.leg_minutes for s in stops)
    darshan_minutes = len(stops) * MINUTES_PER_STOP
    total_minutes = travel_minutes + darshan_minutes

    requested_minutes = extract_duration_minutes(query)
    fits_budget = requested_minutes is None or total_minutes <= requested_minutes * 1.15

    food_stop = _nearest_food_stop([m for m in get_mandals() if m["doc_id"] in {s.doc_id for s in stops}])

    return {
        "start": {"name": start_name, "lat": start_lat, "lng": start_lng},
        "stops": [
            {
                "order": s.order,
                "doc_id": s.doc_id,
                "name": s.name,
                "lat": s.lat,
                "lng": s.lng,
                "leg_km": s.leg_km,
                "crowd_label": s.crowd_label,
            }
            for s in stops
        ],
        "estimated_minutes_low": round(total_minutes * 0.9),
        "estimated_minutes_high": round(total_minutes * 1.1),
        "requested_minutes": requested_minutes,
        "fits_budget": fits_budget,
        "food_stop": food_stop,
    }


def format_plan_text(plan: dict) -> str:
    """Renders the plan dict into the structured, emoji-labelled chat
    reply requested for the Darshan Planner feature."""
    lines = ["🛕 DARSHAN PLAN", "━━━━━━━━━━━━━━━━", "🚩 Start", plan["start"]["name"], ""]

    # Each keycap numeral is several codepoints (digit + variation selector +
    # combining enclosing keycap), so this has to be a list of whole emoji,
    # never a string sliced by index, slicing a concatenated string of them
    # tears the codepoints apart and prints garbled glyphs.
    numerals = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
    for i, stop in enumerate(plan["stops"]):
        marker = numerals[i] if i < len(numerals) else f"{i + 1}."
        lines.append(f"{marker} {stop['name']} ({stop['crowd_label']} crowd)")
        if i < len(plan["stops"]) - 1:
            lines.append("   ↓")
    lines.append("")

    lo, hi = plan["estimated_minutes_low"], plan["estimated_minutes_high"]
    lines.append("⏱️ Estimated duration")
    lines.append(f"~{lo // 60}h {lo % 60:.0f}m to {hi // 60}h {hi % 60:.0f}m")

    if plan["requested_minutes"] and not plan["fits_budget"]:
        lines.append("")
        lines.append(
            f"⚠️ This is a bit tight for your {plan['requested_minutes'] / 60:.1f}-hour window. "
            "Consider dropping a stop or starting earlier."
        )

    if plan["food_stop"]:
        f = plan["food_stop"]
        lines.append("")
        lines.append("🍽️ Suggested food stop")
        label = f.get("name", "")
        if f.get("type"):
            label += f" ({f['type']})"
        if f.get("near"):
            label += f", near {f['near']}"
        lines.append(label)

    lines.append("")
    lines.append("Tap \"Get Directions\" below to open this route in Google Maps. 🙏")
    return "\n".join(lines)
