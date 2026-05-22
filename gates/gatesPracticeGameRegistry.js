"use strict";
const GATES_PRACTICE_GAME_DISCLAIMER = "These games are optional developmental practices. They are not tests, grades, or diagnoses.";
const mk=(title,game_key,source_file,supported_gates,developmental_capacities,recommended_duration)=>({game_key,title,source_file,public_route:`/gates/practice-games/${game_key}`,child_route_template:`/gates/child/:childId/practice-games/${game_key}`,launch_mode:"static_html_iframe",supported_gates,developmental_capacities,suggested_age_range:"6-14 years",recommended_duration,safety_notes:[GATES_PRACTICE_GAME_DISCLAIMER],observation_signals:["Notices mistakes and retries calmly."],parent_reflection_prompts:["Notice effort, calm return, and self-correction more than score."]});
const GATES_PRACTICE_GAME_REGISTRY=[
 mk("Rhythm Race","brain-game-suite","/gates/practice-games/brain-game-suite.html",["attention","body","discipline"],["sustained attention","timing control"],"6-10 minutes"),
 mk("Visual Memory","brain-game-suite","/gates/practice-games/brain-game-suite.html",["attention","truth","creation"],["working memory","visual recall"],"8-12 minutes"),
 mk("Picture Puzzle","brain-game-suite","/gates/practice-games/brain-game-suite.html",["choice","discipline","creation"],["problem solving","planning"],"10-15 minutes"),
 mk("Brick Burst","brick-burst","/gates/practice-games/brick-burst.html",["attention","emotion","discipline"],["response inhibition","focus switching"],"8-12 minutes"),
 mk("Freeze Runner","neurospark-kids-lab","/gates/practice-games/neurospark-kids-lab.html",["attention","body","discipline"],["inhibitory control","start-stop control"],"5-8 minutes"),
 mk("Distraction Defender","neurospark-kids-lab","/gates/practice-games/neurospark-kids-lab.html",["attention","truth","discipline"],["selective attention","distractor filtering"],"7-10 minutes"),
 mk("Plasma Hold","neurospark-kids-lab","/gates/practice-games/neurospark-kids-lab.html",["body","discipline","legacy"],["steady control","impulse management"],"6-9 minutes"),
 mk("Calm Reactor","neurospark-kids-lab","/gates/practice-games/neurospark-kids-lab.html",["emotion","choice","repair"],["emotional regulation","pause-and-choose"],"6-10 minutes"),
 mk("Switch Matrix","neurospark-kids-lab","/gates/practice-games/neurospark-kids-lab.html",["choice","truth","creation"],["cognitive flexibility","rule switching"],"8-12 minutes")
];
function getPracticeGamesByGate(gateKey){const n=String(gateKey||"").trim().toLowerCase();if(!n)return[];return GATES_PRACTICE_GAME_REGISTRY.filter((g)=>g.supported_gates.includes(n));}
module.exports={GATES_PRACTICE_GAME_DISCLAIMER,GATES_PRACTICE_GAME_REGISTRY,getPracticeGamesByGate};
