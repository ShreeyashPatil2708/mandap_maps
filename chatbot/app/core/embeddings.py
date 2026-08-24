"""
Wraps a multilingual sentence-transformer so the same embedding space
covers English, Marathi and Hindi queries/documents.
"""
from sentence_transformers import SentenceTransformer
from functools import lru_cache
import numpy as np

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_embedder() -> SentenceTransformer:
    # Loaded once per process; safe to reuse across requests.
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_embedder()
    vectors = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,   # cosine similarity via inner product
        show_progress_bar=False,
    )
    return vectors.astype("float32")


def embed_query(text: str) -> np.ndarray:
    return embed_texts([text])[0]
