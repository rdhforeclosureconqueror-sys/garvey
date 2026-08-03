CREATE TABLE IF NOT EXISTS gates_v2_content_releases (
  release_id TEXT PRIMARY KEY, release_version TEXT NOT NULL, status TEXT NOT NULL
    CHECK (status IN ('draft','published','retired','safety_withdrawn')),
  manifest_json JSONB NOT NULL, manifest_hash TEXT NOT NULL UNIQUE,
  approval_bundle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL, published_at TIMESTAMPTZ, retired_at TIMESTAMPTZ,
  safety_withdrawn_at TIMESTAMPTZ, safety_withdrawal_reason TEXT
);
CREATE OR REPLACE FUNCTION gates_v2_protect_published_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF OLD.status IN ('published','retired','safety_withdrawn') AND
  (NEW.release_id,NEW.release_version,NEW.manifest_json,NEW.manifest_hash,NEW.approval_bundle_json)
  IS DISTINCT FROM (OLD.release_id,OLD.release_version,OLD.manifest_json,OLD.manifest_hash,OLD.approval_bundle_json)
  THEN RAISE EXCEPTION 'published Gates V2 content is immutable'; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS gates_v2_content_release_immutable ON gates_v2_content_releases;
CREATE TRIGGER gates_v2_content_release_immutable BEFORE UPDATE ON gates_v2_content_releases
FOR EACH ROW EXECUTE FUNCTION gates_v2_protect_published_release();
