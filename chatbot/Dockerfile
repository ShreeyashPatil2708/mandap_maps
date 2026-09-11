# Chatbot Dockerfile - Python FastAPI with FAISS RAG
FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 -r appuser && \
    useradd -r -u 1001 -g appuser appuser

# Stage 1: Install Python dependencies
FROM base AS deps

# Install Python deps with CPU-only PyTorch first (smaller, faster)
# Use pip cache for faster rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --retries 10 --timeout 120 \
    torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install
COPY chatbot/requirements.txt ./requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --retries 10 --timeout 120 -r requirements.txt

# Stage 2: Runtime
FROM base AS runner

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application code. The app imports itself as `app.*`, so it must run
# from inside the chatbot directory.
COPY --chown=appuser:appuser chatbot/ /app/chatbot/
WORKDIR /app/chatbot

# Writable dirs for the FAISS index and the HuggingFace model cache (the
# system user has no home directory to cache into).
RUN mkdir -p /app/faiss_index /app/hf-cache && \
    chown -R appuser:appuser /app/faiss_index /app/hf-cache

# Environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/app/hf-cache \
    FAISS_INDEX_PATH=/app/faiss_index/index.bin \
    FAISS_METADATA_PATH=/app/faiss_index/metadata.json

USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the FastAPI app with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]