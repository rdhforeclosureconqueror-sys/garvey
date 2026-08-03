'use strict';
module.exports=Object.freeze({
  sessionById:`SELECT * FROM gates_v2_experience_sessions WHERE session_id=$1`,
  lockedSession:`SELECT * FROM gates_v2_experience_sessions WHERE session_id=$1 FOR UPDATE`,
  ownedSessions:`SELECT * FROM gates_v2_experience_sessions WHERE parent_profile_id=$1 AND child_id=$2 ORDER BY updated_at DESC`,
  events:`SELECT * FROM gates_v2_experience_events WHERE session_id=$1 ORDER BY sequence`,
  pinnedRelease:`SELECT * FROM gates_v2_content_releases WHERE release_id=$1`,
  offeredReleases:`SELECT * FROM gates_v2_content_releases WHERE status='published' AND safety_withdrawn_at IS NULL ORDER BY published_at DESC,release_id LIMIT 1`,
  idempotency:`SELECT * FROM gates_v2_idempotency_records WHERE session_id=$1 AND idempotency_key=$2`,
});
