'use strict';
const crypto = require('node:crypto');
const { GATES } = require('../domain/gateRegistry');
const GATE_IDS = new Set(GATES.map((g) => g.gate_id));
const LIFECYCLES = new Set(['draft','imported','under_review','approved','published','retired']);
const REVIEWS = new Set(['author','philosophy','developmental','cultural','safety','technical']);
const HASH = /^[a-f0-9]{64}$/;
const result = (errors = [], warnings = [], blockers = []) => ({ valid: errors.length === 0, errors, warnings, publicationBlockers: blockers });
const canonicalJson = (value) => JSON.stringify(value, Object.keys(value).sort());
const hashContent = (value) => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalJson(value)).digest('hex');
function provenanceErrors(items = [], gateId) {
  const errors=[];
  for (const [i,p] of items.entries()) {
    const at=`source_provenance[${i}]`;
    if (!p || !/^[a-zA-Z0-9_.:-]+$/.test(p.source_id||'')) errors.push(`${at}: invalid source_id`);
    if (!['canonical_book','orin_chapter','approved_statement','author_note','v1_import','new_child_content','review_record'].includes(p?.source_type)) errors.push(`${at}: invalid source_type`);
    if (typeof p?.source_version !== 'string' || !p.source_version) errors.push(`${at}: invalid source_version`);
    if (!['quotes','adapts','echoes','informed_by','unresolved'].includes(p?.relationship)) errors.push(`${at}: invalid relationship`);
    if (!['canonical','supporting','non_canonical','unknown'].includes(p?.canonicality)) errors.push(`${at}: invalid canonicality`);
    if (!['unverified','verified','disputed'].includes(p?.verification_status)) errors.push(`${at}: invalid verification_status`);
    if (p?.canonicality === 'canonical' && p.verification_status !== 'verified') errors.push(`${at}: canonical claims require verified provenance`);
    if (p?.source_type === 'v1_import' && p.canonicality === 'canonical') errors.push(`${at}: V1 imports cannot automatically become canonical`);
    if (gateId === 'gate_body' && (p.relationship !== 'unresolved' || p.canonicality !== 'unknown' || p.verification_status !== 'unverified')) errors.push(`${at}: unresolved Body provenance must remain unresolved/unknown/unverified`);
  }
  return errors;
}
function approvalErrors(items = [], hash, published=false, culturalRequired=false) {
  const errors=[];
  for (const [i,a] of items.entries()) {
    if (!REVIEWS.has(a?.review_type)) errors.push(`approvals[${i}]: invalid review_type`);
    if (!/^[a-zA-Z0-9_.:@-]{2,}$/.test(a?.reviewer_id||'')) errors.push(`approvals[${i}]: invalid reviewer_id`);
    if (!['approved','changes_requested','rejected'].includes(a?.decision)) errors.push(`approvals[${i}]: invalid decision`);
    if (!HASH.test(a?.reviewed_version_hash||'')) errors.push(`approvals[${i}]: invalid reviewed_version_hash`);
    else if (hash && a.reviewed_version_hash !== hash) errors.push(`approvals[${i}]: approval hash mismatch`);
    if (!a?.decided_at || Number.isNaN(Date.parse(a.decided_at))) errors.push(`approvals[${i}]: invalid decided_at`);
  }
  if (published) {
    const approved=new Set(items.filter(a=>a.decision==='approved' && (!hash || a.reviewed_version_hash===hash)).map(a=>a.review_type));
    for (const group of [['author','philosophy'],['developmental'],['safety'],['technical']]) if (!group.some(x=>approved.has(x))) errors.push(`published content requires ${group.join(' or ')} approval`);
    if (culturalRequired && !approved.has('cultural')) errors.push('published content requires cultural approval under this policy');
  }
  return errors;
}
module.exports={GATE_IDS,LIFECYCLES,HASH,result,hashContent,provenanceErrors,approvalErrors};
