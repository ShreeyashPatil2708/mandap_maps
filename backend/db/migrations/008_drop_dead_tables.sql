-- Drop tables that no code reads or writes any more.
--
-- live_locations held an anonymous session id alongside precise coordinates and
-- a timestamp, indexed by (session_id, pinged_at DESC). The feature that wrote
-- it (opted-in location sharing) was removed: the frontend hook, the API routes
-- and the repository are all gone. Nothing has purged the rows it left behind,
-- so they persist indefinitely, and the privacy policy cannot honestly say
-- location is not stored while they are still there.
--
-- crowd_estimates was the aggregator's output for those same location pings.
-- With no pings it is never written and never read.
--
-- Both are dropped rather than truncated: keeping an empty table invites the
-- feature to quietly come back without the privacy question being asked again.
DROP TABLE IF EXISTS live_locations;
DROP TABLE IF EXISTS crowd_estimates;
