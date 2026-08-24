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

    def retrieve(
        self, query: str, top_k: int = None, entity_doc_ids: list[str] | None = None
    ) -> list[dict]:
        """
        entity_doc_ids: when given (from entity_resolver — a mandal named
        explicitly in the query, or carried forward from conversation
        context), retrieval is restricted to chunks from those mandals
        ONLY. This is the fix for cross-entity contamination: previously
        a query about Kasba Ganpati could surface a semantically-similar
        chunk from Tambat Ali Ganpati and the LLM would answer from it.
        With entity_doc_ids set, chunks from other mandals are excluded
        before scoring, not just down-weighted, so they can't leak in.
        """
        top_k = top_k or settings.TOP_K
        all_chunks = self.store.all_chunks()
        if not all_chunks:
            return []

        allowed = set(entity_doc_ids) if entity_doc_ids else None

        # ---- Dense (semantic) scores ----
        q_vec = embed_query(query)
        dense_hits = self.store.search(
            q_vec, top_k=min(len(all_chunks), top_k * 4), allowed_doc_ids=allowed
        )

        # ---- Relevance gate ----
        # The blended score is a poor on-topic signal (BM25 is max-normalized, so
        # even a junk query gets a 1.0 sparse hit on a common word). The dense
        # cosine is far more discriminative, so gate on the best semantic match:
        # if nothing is close, treat the query as off-topic and return no context.
        best_dense = max((h["score"] for h in dense_hits), default=0.0)
        if best_dense < settings.MIN_RELEVANCE_SCORE:
            return []

        # ---- Sparse (BM25 keyword) scores ----
        # Scored against the cached full-corpus index (rebuilding per-request
        # for a filtered subset isn't worth it at this corpus size), then
        # zeroed out for any chunk outside the entity filter below.
        bm25 = self._get_bm25()
        sparse_scores_raw = bm25.get_scores(_tokenize(query)) if bm25 else np.zeros(len(all_chunks))
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
        for i, chunk in enumerate(all_chunks):
            if allowed is not None and chunk["doc_id"] not in allowed:
                continue
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
