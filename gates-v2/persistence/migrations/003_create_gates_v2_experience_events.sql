CREATE TABLE IF NOT EXISTS gates_v2_experience_events (
  event_id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES gates_v2_experience_sessions(session_id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence > 0), event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL, event_json JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL,
  UNIQUE(session_id,sequence), UNIQUE(session_id,idempotency_key)
);
CREATE OR REPLACE FUNCTION gates_v2_reject_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Gates V2 events are append-only'; END $$;
DROP TRIGGER IF EXISTS gates_v2_events_append_only ON gates_v2_experience_events;
CREATE TRIGGER gates_v2_events_append_only BEFORE UPDATE OR DELETE ON gates_v2_experience_events
FOR EACH ROW EXECUTE FUNCTION gates_v2_reject_event_mutation();
