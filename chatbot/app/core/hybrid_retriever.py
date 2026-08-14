"""
Hybrid RAG retrieval: combines dense (FAISS/embedding) search with
sparse (BM25/keyword) search and merges them with a weighted score.

Why hybrid: pure dense retrieval can miss exact proper nouns (mandal
names, street names, timings written as digits) that BM25 catches
easily, while BM25 alone misses paraphrased/multilingual queries.
"""
from rank_bm25 import BM25Okapi
import numpy as np

from app.config import get_settings
from app.core.embeddings import embed_query
from app.core.vector_store import get_vector_store

settings = get_settings()


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


class HybridRetriever:
    def __init__(self):
        self.store = get_vector_store()
        self._bm25_index = None
        self._bm25_corpus_size = -1

    def _build_bm25(self):
        chunks = self.store.all_chunks()
        tokenized = [_tokenize(c["text"]) for c in chunks]
        self._bm25_index = BM25Okapi(tokenized) if tokenized else None
        self._bm25_corpus_size = len(chunks)

    def _get_bm25(self):
        # Rebuild only if the corpus size changed (new docs ingested)
        if self._bm25_index is None or self._bm25_corpus_size != len(self.store.all_chunks()):
            self._build_bm25()
        return self._bm25_index

    def retrieve(self, query: str, top_k: int = None) -> list[dict]:
        top_k = top_k or settings.TOP_K
        chunks = self.store.all_chunks()
        if not chunks:
            return []

        # ---- Dense (semantic) scores ----
        q_vec = embed_query(query)
        dense_hits = self.store.search(q_vec, top_k=min(len(chunks), top_k * 4))

        # ---- Sparse (BM25 keyword) scores ----
        bm25 = self._get_bm25()
        sparse_scores_raw = bm25.get_scores(_tokenize(query)) if bm25 else np.zeros(len(chunks))
        max_sparse = max(sparse_scores_raw) if len(sparse_scores_raw) and max(sparse_scores_raw) > 0 else 1.0

        # ---- Merge ----
        merged = {}
        for h in dense_hits:
            key = h["text"]
            merged[key] = {
                **h,
                "dense_score": h["score"],
                "sparse_score": 0.0,
            }
        for i, chunk in enumerate(chunks):
            key = chunk["text"]
            norm_sparse = sparse_scores_raw[i] / max_sparse
            if key in merged:
                merged[key]["sparse_score"] = norm_sparse
            elif norm_sparse > 0.15:  # only pull in BM25-only hits above a floor
                merged[key] = {**chunk, "dense_score": 0.0, "sparse_score": norm_sparse}

        for v in merged.values():
            v["score"] = (
                settings.DENSE_WEIGHT * v["dense_score"]
                + settings.SPARSE_WEIGHT * v["sparse_score"]
            )

        ranked = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
        return ranked[:top_k]


_retriever: HybridRetriever | None = None


def get_retriever() -> HybridRetriever:
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
    return _retriever
