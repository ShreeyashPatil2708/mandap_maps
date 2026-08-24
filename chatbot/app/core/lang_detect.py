"""
Very small language detector: script-based check for Devanagari
(covers both Hindi and Marathi) plus langdetect for the mr/hi split
and English. Good enough for routing/logging; the LLM itself handles
actually answering in the right language via the system prompt.
"""
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0  # deterministic results

DEVANAGARI_RANGE = range(0x0900, 0x097F + 1)


def detect_language(text: str) -> str:
    if any(ord(ch) in DEVANAGARI_RANGE for ch in text):
        try:
            code = detect(text)
            return "mr" if code == "mr" else "hi"
        except Exception:
            return "hi"  # default Devanagari fallback
    try:
        code = detect(text)
        return code if code in ("en", "mr", "hi") else "en"
    except Exception:
        return "en"
