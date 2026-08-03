'use strict';
// Documentation-only contract. This module deliberately exports no Express router.
const PRIVATE_GATES_V2_CONTRACT=Object.freeze([
 {method:'GET',path:'/api/gates/v2/children/:childId/experiences',operation:'listAvailableExperiences'},
 {method:'POST',path:'/api/gates/v2/children/:childId/sessions',operation:'startExperienceSession',mutation:true},
 {method:'GET',path:'/api/gates/v2/children/:childId/sessions/:sessionId',operation:'getExperienceSession'},
 {method:'POST',path:'/api/gates/v2/children/:childId/sessions/:sessionId/actions',operation:'applyExperienceAction',mutation:true},
 {method:'POST',path:'/api/gates/v2/children/:childId/sessions/:sessionId/pause',operation:'pauseExperienceSession',mutation:true},
 {method:'POST',path:'/api/gates/v2/children/:childId/sessions/:sessionId/abandon',operation:'abandonExperienceSession',mutation:true},
 {method:'POST',path:'/api/gates/v2/children/:childId/sessions/:sessionId/replay',operation:'replayExperienceSession',mutation:true},
]);
module.exports={PRIVATE_GATES_V2_CONTRACT};
