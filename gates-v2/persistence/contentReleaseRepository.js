'use strict';
const { clone } = require('./serialization'); const { fail } = require('./persistenceTypes');
class ContentReleaseRepository {
  constructor(store) { this.store = store; }
  createRelease(input) {
    for (const key of ['release_id','release_version','manifest_hash','manifest_json']) if (!input[key]) fail('INVALID_CONTENT_RELEASE', `Missing ${key}`);
    if (this.store.releases.has(input.release_id) || [...this.store.releases.values()].some(x => x.manifest_hash === input.manifest_hash)) fail('CONTENT_RELEASE_CONFLICT');
    const row = { status:'draft', approval_bundle_json:{}, published_at:null, retired_at:null, safety_withdrawn_at:null, safety_withdrawal_reason:null, ...clone(input) };
    this.store.releases.set(row.release_id, row); return clone(row);
  }
  getById(id) { const row=this.store.releases.get(id); if(!row) fail('CONTENT_RELEASE_NOT_FOUND'); return clone(row); }
  getForNewSession(id) { const row=this.getById(id); if(row.status==='retired') fail('CONTENT_RELEASE_RETIRED'); if(row.status==='safety_withdrawn'||row.safety_withdrawn_at) fail('CONTENT_RELEASE_SAFETY_WITHDRAWN'); if(row.status!=='published') fail('CONTENT_RELEASE_NOT_PUBLISHED'); return row; }
  getPinned(id) { const row=this.getById(id); if(row.status==='safety_withdrawn'||row.safety_withdrawn_at) fail('CONTENT_RELEASE_SAFETY_WITHDRAWN'); return row; }
  setStatus(id,status,at,reason=null) { const row=this.store.releases.get(id); if(!row) fail('CONTENT_RELEASE_NOT_FOUND'); if(row.status==='published' && status==='draft') fail('PUBLISHED_RELEASE_IMMUTABLE'); row.status=status; if(status==='published')row.published_at=at; if(status==='retired')row.retired_at=at; if(status==='safety_withdrawn'){row.safety_withdrawn_at=at;row.safety_withdrawal_reason=reason;} return clone(row); }
  selectOfferedRelease() { const rows=[...this.store.releases.values()].filter(x=>x.status==='published'&&!x.safety_withdrawn_at).sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at))); if(!rows[0])fail('CONTENT_RELEASE_NOT_FOUND'); return clone(rows[0]); }
}
module.exports = ContentReleaseRepository;
