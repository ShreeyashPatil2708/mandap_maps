-- ─────────────────────────────────────────────────────────────
-- Migration 001: app filter tags, "Did You Know" fact, verified flag
-- ─────────────────────────────────────────────────────────────
-- Idempotent. Also folded into db/schema.sql so a fresh `npm run migrate`
-- (which applies schema.sql) picks these up without a separate step. Kept here
-- as the standalone migration of record for an already-provisioned RDS instance.

ALTER TABLE ganpatis ADD COLUMN IF NOT EXISTS tags          TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE ganpatis ADD COLUMN IF NOT EXISTS did_you_know  TEXT;
ALTER TABLE ganpatis ADD COLUMN IF NOT EXISTS data_verified BOOLEAN NOT NULL DEFAULT FALSE;
