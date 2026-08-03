'use strict';
const FOUNDATION_FLAGS=Object.freeze(['gates_definition_registry_v2','gates_development_engine_v2','gates_child_experiences_v2']);
const KNOWN_FLAGS=Object.freeze([...FOUNDATION_FLAGS,'gates_emotion_k1_content_v1','gates_evidence_progress_v2']);
function evaluateFeaturePolicy(config={},specificFlag){const variants={};for(const flag of KNOWN_FLAGS){const value=config?.[flag];variants[flag]=value===true?'enabled':typeof value==='string'?value:'off';}const enabled=FOUNDATION_FLAGS.every(f=>variants[f]!=='off')&&Boolean(specificFlag)&&variants[specificFlag]!=='off';return Object.freeze({enabled,variants:Object.freeze(variants),required:[...FOUNDATION_FLAGS,specificFlag].filter(Boolean)});}
module.exports={FOUNDATION_FLAGS,KNOWN_FLAGS,evaluateFeaturePolicy};
