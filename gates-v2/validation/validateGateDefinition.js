'use strict';
const registry=require('../domain/gateRegistry');
const {GATE_IDS,LIFECYCLES,result,provenanceErrors,approvalErrors}=require('./common');
const TOP=new Set(['schema_version','content_notice','gate_id','order','slug','definition_version','locale','lifecycle','language','symbolism','identity_statements','reflections','journals','observation_markers','habit_markers','growth_signals','integration_signals','self_correction_signals','family_practice_refs','developmental_tool_refs','ceremony_refs','age_band_variants','media_refs','source_provenance','approvals']);
module.exports=function validateGateDefinition(d,{contentHash,culturalReviewRequired=false}={}){
 const e=[]; if(!d||typeof d!=='object') return result(['Gate definition must be an object']);
 for(const k of Object.keys(d)) if(!TOP.has(k)) e.push(`unknown field: ${k}`);
 for(const k of TOP) if(!(k in d)) e.push(`missing required field: ${k}`);
 if(d.schema_version!=='gate-definition.v1') e.push('unsupported schema_version');
 const gate=registry.getById(d.gate_id); if(!GATE_IDS.has(d.gate_id)) e.push('invalid gate_id');
 if(gate&&(d.order!==gate.order||d.slug!==gate.slug)) e.push('order and slug must match canonical registry');
 if(!LIFECYCLES.has(d.lifecycle)) e.push('invalid lifecycle');
 if(!d.age_band_variants||!['k1','g2_3','g4'].every(x=>d.age_band_variants[x]?.ref_id)||Object.keys(d.age_band_variants||{}).some(x=>!['k1','g2_3','g4'].includes(x))) e.push('malformed age_band_variants');
 e.push(...provenanceErrors(d.source_provenance,d.gate_id),...approvalErrors(d.approvals,contentHash,d.lifecycle==='published',culturalReviewRequired));
 const blockers=d.lifecycle==='draft'?['Draft Gate definition is not eligible for publication']:[];
 return result(e,[],blockers);
};
