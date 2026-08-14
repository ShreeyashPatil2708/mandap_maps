"""
Thin wrapper around a FAISS flat inner-product index (cosine similarity,
since embeddings are L2-normalized). Metadata (chunk text, source, doc_id)
is kept in a parallel JSON file, indexed by position.
"""
import json
import os
import faiss
import numpy as np
from threading import Lock

from app.config import get_settings
from app.core.embeddings import embed_texts

settings = get_settings()
_lock = Lock()


class VectorStore:
    def __init__(self):
        os.makedirs(os.path.dirname(settings.FAISS_INDEX_PATH), exist_ok=True)
        self.index_path = settings.FAISS_INDEX_PATH
        self.meta_path = settings.FAISS_METADATA_PATH
        self.dim = settings.EMBEDDING_DIM
        self._load_or_create()

    def _load_or_create(self):
        if os.path.exists(self.index_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.metadata: list[dict] = json.load(f)
        else:
            self.index = faiss.IndexFlatIP(self.dim)
            self.metadata = []

    def _persist(self):
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 220, overlap: int = 40) -> list[str]:
        """Simple word-count based sliding-window chunker."""
        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk = " ".join(words[start:end])
            if chunk.strip():
                chunks.append(chunk)
            start += chunk_size - overlap
        return chunks or [text]

    def add_document(self, doc_id: str, title: str, text: str, category: str) -> int:
        chunks = self.chunk_text(text)
        vectors = embed_texts(chunks)
        with _lock:
            self.index.add(vectors)
            for chunk in chunks:
                self.metadata.append(
                    {
                        "doc_id": doc_id,
                        "title": title,
                        "category": category,
                        "text": chunk,
                    }
                )
            self._persist()
        return len(chunks)

    def search(self, query_vector: np.ndarray, top_k: int) -> list[dict]:
        if self.index.ntotal == 0:
            return []
        scores, indices = self.index.search(query_vector.reshape(1, -1), top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            meta = self.metadata[idx]
            results.append({**meta, "score": float(score)})
        return results

    def all_chunks(self) -> list[dict]:
        return self.metadata


_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store
