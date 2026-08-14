-- Optional persistence layer for Ekdanta chat logs.
-- Redis handles live session memory; Postgres is for durable history,
-- analytics, and academic evaluation (e.g. query volume by category).

CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id   TEXT PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id               BIGSERIAL PRIMARY KEY,
    session_id       TEXT NOT NULL REFERENCES chat_sessions(session_id),
    user_message     TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    detected_language TEXT,
    retrieved_sources JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
