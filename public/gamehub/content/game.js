const screens = {
  intro: document.getElementById('screen-intro'),
  howto: document.getElementById('screen-howto'),
  game: document.getElementById('screen-game'),
  complete: document.getElementById('screen-complete'),
};
const missionTitle = document.getElementById('missionTitle');
const missionText = document.getElementById('missionText');
const focusFill = document.getElementById('focusFill');
const focusLabel = document.getElementById('focusLabel');
const timeLabel = document.getElementById('timeLabel');
const quietLabel = document.getElementById('quietLabel');
const bugLabel = document.getElementById('bugLabel');
const pieceLabel = document.getElementById('pieceLabel');
const topBanner = document.getElementById('topBanner');
const summaryText = document.getElementById('summaryText');
const toast = document.getElementById('toast');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const dialogue = document.getElementById('dialogue');
const dialoguePortrait = document.getElementById('dialoguePortrait');
const dialogueName = document.getElementById('dialogueName');
const dialogueSubtitle = document.getElementById('dialogueSubtitle');
const dialogueText = document.getElementById('dialogueText');
const dialogueChoices = document.getElementById('dialogueChoices');

function qs(id){ return document.getElementById(id); }
function setScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove('active'));
  screens[name].classList.add('active');
}

qs('startBtn').onclick = () => startGame();
qs('howBtn').onclick = () => setScreen('howto');
qs('backBtn').onclick = () => setScreen('intro');
qs('playFromHowToBtn').onclick = () => startGame();
qs('restartBtn').onclick = () => startGame();
qs('replayBtn').onclick = () => startGame();
qs('quietBtn').onclick = () => triggerQuietListen();

const ASSET_PATHS = {
  tiles: {
    grass:'./assets/tiles/grass.png', signalGrass:'./assets/tiles/signal_grass.png', path:'./assets/tiles/path.png', signalPath:'./assets/tiles/signal_path.png'
  },
  props: {
    tree:'./assets/props/tree.png', stallBlue:'./assets/props/stall_blue.png', stallPurple:'./assets/props/stall_purple.png', gate:'./assets/props/gate.png', parcel:'./assets/props/parcel.png', bridge:'./assets/props/bridge.png', pathStone:'./assets/props/path_stone.png'
  },
  chars: {
    front:'./assets/chars/orin_front.png', back:'./assets/chars/orin_back.png', left:'./assets/chars/orin_left.png', right:'./assets/chars/orin_right.png', focus:'./assets/chars/orin_focus.png', worried:'./assets/chars/orin_worried.png'
  },
  npcs: {
    mother:'./assets/npcs/mother.png', jori:'./assets/npcs/jori.png', red:'./assets/npcs/red_hat_kid.png', lou:'./assets/npcs/long_story_lou.png', mara:'./assets/npcs/mara.png', keeper:'./assets/npcs/keeper.png'
  },
  fx: {
    gold:'./assets/fx/scatterbug_gold_big.png', green:'./assets/fx/scatterbug_green.png', blue:'./assets/fx/scatterbug_blue.png', purple:'./assets/fx/scatterbug_purple.png'
  }
};

function loadImages(paths){
  const images = {};
  const jobs = [];
  function add(group, key, src){
    const img = new Image();
    img.src = src;
    images[`${group}.${key}`]=img;
    jobs.push(new Promise(res=>{ img.onload = ()=>res(); img.onerror = ()=>res(); }));
  }
  Object.entries(paths).forEach(([group, items])=>Object.entries(items).forEach(([key, src])=>add(group,key,src)));
  return Promise.all(jobs).then(()=>images);
}
let IMAGES = null;

const tileSize = 64;
const cols = 20;
const rows = 12;
const map = Array.from({length: rows}, ()=>Array(cols).fill('grass'));
const pathCoords = new Set();
function addPathLine(x1,y1,x2,y2){
  for(let x=Math.min(x1,x2); x<=Math.max(x1,x2); x++) for(let y=Math.min(y1,y2); y<=Math.max(y1,y2); y++) pathCoords.add(`${x},${y}`);
}
addPathLine(1,3,5,3); addPathLine(5,3,5,1); addPathLine(5,1,13,1); addPathLine(13,1,13,3); addPathLine(13,3,17,3); addPathLine(17,3,17,6); addPathLine(17,6,15,6); addPathLine(15,6,15,9); addPathLine(15,9,18,9);
addPathLine(3,8,10,8); addPathLine(10,8,10,10); addPathLine(10,10,15,10);
pathCoords.forEach(id=>{ const [x,y]=id.split(',').map(Number); map[y][x]='path'; });

const props = [
  {x:2,y:8,w:2,h:2,type:'tree'},
  {x:14,y:8,w:2,h:2,type:'tree'},
  {x:12,y:0,w:2,h:2,type:'tree'},
  {x:6,y:3,w:2,h:2,type:'stallBlue'},
  {x:8,y:7,w:2,h:2,type:'stallPurple'},
  {x:15,y:9,w:2,h:1,type:'bridge'},
  {x:17,y:8,w:2,h:2,type:'gate'},
];

const npcData = [
  {id:'mother', x:1, y:5, img:'npcs.mother', name:'Mother', subtitle:'Guide'},
  {id:'jori', x:6, y:1, img:'npcs.jori', name:'Jori', subtitle:'Helpful Merchant'},
  {id:'red', x:4, y:9, img:'npcs.red', name:'Red Hat Kid', subtitle:'Distraction Test'},
  {id:'lou', x:13, y:4, img:'npcs.lou', name:'Long Story Lou', subtitle:'Distraction Test'},
  {id:'mara', x:18, y:9, img:'npcs.mara', name:'Mara', subtitle:'Near the South Bridge'},
  {id:'keeper', x:17, y:7, img:'npcs.keeper', name:'The Keeper', subtitle:'Guardian of the First Gate'},
];

const bugSpawns = [
  {x:3, y:2, img:'fx.green'},
  {x:9, y:5, img:'fx.blue'},
  {x:15, y:2, img:'fx.purple'},
  {x:12, y:9, img:'fx.gold'},
];

let keys = {};
let game = null;

window.addEventListener('keydown', (e)=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if(e.key.toLowerCase()==='q') triggerQuietListen();
  if((e.key===' ' || e.key==='Enter') && game && !game.dialogueOpen) interact();
});
window.addEventListener('keyup', (e)=>{ keys[e.key.toLowerCase()] = false; });

function startGame(){
  setScreen('game');
  hideDialogue();
  if(!IMAGES){
    loadImages(ASSET_PATHS).then(imgs=>{ IMAGES = imgs; resetState(); requestAnimationFrame(loop); });
  } else {
    resetState();
  }
}

function resetState(){
  game = {
    phase: 1,
    focus: 100,
    timer: 75,
    quietCooldown: 0,
    quietActive: 0,
    delivered: false,
    bugsCaught: 0,
    bugLive: bugSpawns.map((b,i)=>({ ...b, id:i, caught:false })),
    pieces: 0,
    player: { x:1, y:6, px:1*tileSize, py:6*tileSize, dir:'right' },
    dialogueOpen: false,
    lastTime: performance.now(),
    totalSteps: 0,
    distracted: 0,
    recovered: 0,
    nearPathTicks: 0,
  };
  npcData.forEach(n=>n.met=false);
  updateMissionUI();
  emitEvent('lesson_started', { lessonId:'attention_signal_path_v2', gate:'gate_attention' });
  showDialogue('Mother', 'Guide', 'Your first mission is simple. Deliver this parcel to Mara near the South Bridge before time runs out. Stay on mission, Orin.', './assets/npcs/mother.png', [
    { label:'I will stay on mission.', primary:true, action(){ game.dialogueOpen=false; hideDialogue(); toastMsg('Mission started: deliver the parcel.'); } }
  ]);
}

function loop(ts){
  if(!game) return;
  const dt = Math.min(0.033, (ts - game.lastTime) / 1000);
  game.lastTime = ts;
  if(!game.dialogueOpen) update(dt);
  draw(dt, ts/1000);
  requestAnimationFrame(loop);
}

function update(dt){
  const speed = 3.8;
  let moved = false;
  let dx = 0, dy = 0;
  if(keys['arrowup']||keys['w']) { dy -= speed*dt; game.player.dir='back'; moved=true; }
  if(keys['arrowdown']||keys['s']) { dy += speed*dt; game.player.dir='front'; moved=true; }
  if(keys['arrowleft']||keys['a']) { dx -= speed*dt; game.player.dir='left'; moved=true; }
  if(keys['arrowright']||keys['d']) { dx += speed*dt; game.player.dir='right'; moved=true; }
  if(moved){
    tryMove(dx, dy);
    game.totalSteps += dt*speed;
  }
  const gx = Math.round(game.player.px / tileSize), gy = Math.round(game.player.py / tileSize);
  if(pathCoords.has(`${gx},${gy}`)) game.nearPathTicks += dt;
  if(game.phase===1){
    game.timer -= dt;
    if(game.timer <= 0){
      game.timer = 0;
      game.focus = Math.max(0, game.focus - 10*dt);
      topBanner.textContent = 'Time is up. You can still practice, but staying on mission earlier earns stronger focus.';
    }
  }
  if(game.quietCooldown>0) game.quietCooldown -= dt;
  if(game.quietActive>0) game.quietActive -= dt;
  if(game.phase===2){
    for(const bug of game.bugLive){
      if(bug.caught) continue;
      const dist = Math.hypot(game.player.px - bug.x*tileSize, game.player.py - bug.y*tileSize);
      if(dist < 32){
        bug.caught = true;
        game.bugsCaught += 1;
        game.focus = Math.min(100, game.focus + 4);
        toastMsg(`Scatterbug caught (${game.bugsCaught}/3)`);
        emitEvent('skill_practiced', { skill:'notice_and_recover_attention', bugId: bug.id });
        if(game.bugsCaught===3){
          game.phase = 3;
          game.pieces = 2;
          updateMissionUI();
          showDialogue('The Keeper', 'Guardian of the First Gate', 'You cleared the scatterbugs. Now use Quiet Listen and follow the glowing signal path to the Gate.', './assets/npcs/keeper.png', [
            { label:'I am ready.', primary:true, action(){ hideDialogue(); } }
          ]);
        }
      }
    }
  }
  if(game.phase===3){
    const gateDist = Math.hypot(game.player.px - 18*tileSize, game.player.py - 8.5*tileSize);
    if(gateDist < 48){
      game.phase = 4;
      game.pieces = 3;
      updateMissionUI();
      completeGame();
    }
  }
  updateUI();
}

function tryMove(dx, dy){
  const newX = clamp(game.player.px + dx*tileSize, 0, (cols-1)*tileSize);
  const newY = clamp(game.player.py + dy*tileSize, 0, (rows-1)*tileSize);
  const tileX = Math.round(newX / tileSize), tileY = Math.round(newY / tileSize);
  if(isBlocked(tileX, tileY)) return;
  game.player.px = newX; game.player.py = newY;
}

function isBlocked(x,y){
  for(const p of props){
    if(['tree','stallBlue','stallPurple'].includes(p.type)){
      if(x>=p.x && x<p.x+p.w && y>=p.y && y<p.y+p.h) return true;
    }
  }
  return false;
}

function interact(){
  const target = nearestNpc();
  if(!target) return;
  handleNpc(target);
}

function nearestNpc(){
  let best = null;
  for(const npc of npcData){
    const dist = Math.hypot(game.player.px - npc.x*tileSize, game.player.py - npc.y*tileSize);
    if(dist < 90 && (!best || dist < best.dist)) best = { npc, dist };
  }
  return best?.npc || null;
}

function handleNpc(npc){
  if(npc.id==='jori'){
    showDialogue('Jori', 'Helpful Merchant', 'Helpful clue: Mara is near the South Bridge. Helpful voices guide you back to the mission.', './assets/npcs/jori.png', [
      { label:'Thanks for the clue.', primary:true, action(){ hideDialogue(); toastMsg('Helpful clue received.'); emitEvent('checkpoint_passed',{checkpoint:'talked_to_helpful_npc'}); } }
    ]);
    return;
  }
  if(npc.id==='red'){
    showDialogue('Red Hat Kid', 'Distraction Test', 'Want a side mission? Find a red hat in the city... actually I am the red hat! Do you want to keep chasing distractions?', './assets/npcs/red_hat_kid.png', [
      { label:'Stay on mission', primary:true, action(){ hideDialogue(); game.focus = Math.min(100, game.focus + 2); game.recovered += 1; toastMsg('Good choice. You returned to the mission.'); } },
      { label:'Get distracted', action(){ hideDialogue(); game.focus = Math.max(0, game.focus - 10); game.distracted += 1; toastMsg('That distraction cost you focus.'); } }
    ]);
    return;
  }
  if(npc.id==='lou'){
    showDialogue('Long Story Lou', 'Distraction Test', 'I have a very long story. It starts with a cart, then a goat, then another cart. Want to hear all of it right now?', './assets/npcs/long_story_lou.png', [
      { label:'Not right now', primary:true, action(){ hideDialogue(); game.focus = Math.min(100, game.focus + 2); game.recovered += 1; toastMsg('You protected your attention.'); } },
      { label:'Tell me everything', action(){ hideDialogue(); game.focus = Math.max(0, game.focus - 12); game.distracted += 1; toastMsg('Too much talking pulled you off mission.'); } }
    ]);
    return;
  }
  if(npc.id==='mara'){
    if(game.phase!==1) {
      showDialogue('Mara', 'Near the South Bridge', 'You already delivered the parcel. Thank you.', './assets/npcs/mara.png', [{ label:'Continue', primary:true, action(){ hideDialogue(); } }]);
      return;
    }
    const inTime = game.timer > 0;
    game.delivered = true;
    game.phase = 2;
    game.pieces = 1;
    updateMissionUI();
    showDialogue('Mara', 'Near the South Bridge', inTime ? 'You found me in time. Strong attention! But scatterbugs are still causing confusion in the city. Catch 3 of them.' : 'You found me. The timer ended, but you still stayed with the mission. Now catch 3 scatterbugs causing confusion in the city.', './assets/npcs/mara.png', [
      { label:'I will catch them.', primary:true, action(){ hideDialogue(); emitEvent('lesson_step_completed',{step:'delivery_complete', completedWithinTime: inTime}); toastMsg('Mission 2 started: catch 3 scatterbugs.'); } }
    ]);
    return;
  }
  if(npc.id==='keeper'){
    if(game.phase<3){
      showDialogue('The Keeper', 'Guardian of the First Gate', 'The Gate opens when your attention steadies. First finish what is in front of you.', './assets/npcs/keeper.png', [{ label:'Understood.', primary:true, action(){ hideDialogue(); } }]);
    } else {
      showDialogue('The Keeper', 'Guardian of the First Gate', 'Use Quiet Listen. The signal path brightens for those who choose attention.', './assets/npcs/keeper.png', [{ label:'I hear the path.', primary:true, action(){ hideDialogue(); } }]);
    }
    return;
  }
  if(npc.id==='mother'){
    showDialogue('Mother', 'Guide', 'You notice more than others. Let that help you. Stay with the mission and do not let every voice lead you.', './assets/npcs/mother.png', [{ label:'I remember.', primary:true, action(){ hideDialogue(); } }]);
  }
}

function triggerQuietListen(){
  if(!game || game.quietCooldown > 0) return;
  game.quietActive = 5;
  game.quietCooldown = 14;
  game.focus = Math.min(100, game.focus + 6);
  toastMsg('Quiet Listen activated. The signal path is clear.');
  emitEvent('skill_practiced', { skill:'quiet_listen', activeFor:5 });
}

function updateMissionUI(){
  if(game.phase===1){
    missionTitle.textContent = 'Mission 1 — Deliver the Parcel';
    missionText.textContent = 'Bring the parcel to Mara near the South Bridge before the timer ends.';
    topBanner.textContent = 'Stay on mission. Helpful voices guide; distracting voices scatter.';
  } else if(game.phase===2){
    missionTitle.textContent = 'Mission 2 — Catch the Scatterbugs';
    missionText.textContent = 'Catch 3 scatterbugs causing confusion in the city.';
    topBanner.textContent = 'Every time you notice a distraction, you become stronger at returning.';
  } else if(game.phase===3){
    missionTitle.textContent = 'Mission 3 — Follow the Signal Path';
    missionText.textContent = 'Use Quiet Listen and reach the First Gate.';
    topBanner.textContent = 'The path brightens when attention steadies.';
  }
  pieceLabel.textContent = `${game.pieces} / 3`;
}

function updateUI(){
  focusFill.style.width = `${game.focus}%`;
  focusLabel.textContent = `${Math.round(game.focus)}%`;
  timeLabel.textContent = game.phase===1 ? `${Math.ceil(game.timer)}` : '—';
  quietLabel.textContent = game.quietCooldown > 0 ? `${Math.ceil(game.quietCooldown)}s` : 'READY';
  bugLabel.textContent = `${game.bugsCaught} / 3`;
  pieceLabel.textContent = `${game.pieces} / 3`;
}

function draw(dt, t){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // world background
  for(let y=0; y<rows; y++){
    for(let x=0; x<cols; x++){
      drawTile(map[y][x]==='path' ? 'tiles.path' : 'tiles.grass', x, y);
      const onSignal = (game.phase===3 && pathCoords.has(`${x},${y}`));
      if(onSignal){
        const a = game.quietActive>0 ? 0.92 : 0.22 + Math.sin(t*4 + x+y)*0.06;
        drawTile('tiles.signalPath', x, y, a);
      }
    }
  }
  // subtle signal grass glows
  for(let y=0; y<rows; y++) for(let x=0; x<cols; x++) if((x+y)%7===0 && map[y][x]!=='path') drawTile('tiles.signalGrass', x, y, 0.18);

  // props
  props.forEach(p=> drawProp(p.type, p.x, p.y, p.w, p.h));

  // floating bugs
  if(game.phase>=2){
    for(const bug of game.bugLive){
      if(bug.caught) continue;
      const img = IMAGES[bug.img];
      const bx = bug.x*tileSize + Math.sin(t*2 + bug.id)*6;
      const by = bug.y*tileSize - 10 + Math.sin(t*3 + bug.id)*8;
      if(img) ctx.drawImage(img, bx-28, by-28, 56, 56);
      else drawCircle(bx,by,16,'#f3c567');
    }
  }

  // NPCs
  npcData.forEach(n=>{
    if(n.id==='keeper' && game.phase<3) return;
    const img = IMAGES[n.img];
    const x = n.x*tileSize - 12, y = n.y*tileSize - 26;
    if(img) ctx.drawImage(img, x, y, 82, 96); else drawCircle(x+32,y+40,22,'#fff');
    drawLabel(n.name, n.x*tileSize+32, n.y*tileSize-10);
  });

  // player glow when focusing
  if(game.quietActive>0) {
    ctx.save();
    ctx.globalAlpha = .38 + Math.sin(t*8)*0.14;
    drawCircle(game.player.px+32, game.player.py+32, 42, '#f3c567');
    ctx.restore();
  }
  // player
  const charKey = game.player.dir==='front' ? 'chars.front' : game.player.dir==='back' ? 'chars.back' : game.player.dir==='left' ? 'chars.left' : 'chars.right';
  const pimg = IMAGES[charKey];
  if(pimg) ctx.drawImage(pimg, game.player.px-14, game.player.py-26, 88, 100);
  else drawCircle(game.player.px+32, game.player.py+32, 24, '#6ff0ea');

  // HUD marker over Mara during delivery
  if(game.phase===1){
    pulseMarker(18*tileSize+30, 9*tileSize-28, '#f3c567', t);
  }
  if(game.phase===3){
    pulseMarker(18*tileSize+24, 8*tileSize-18, '#6ff0ea', t);
  }
}

function drawTile(key, x, y, alpha=1){
  const img = IMAGES[key];
  ctx.save(); ctx.globalAlpha = alpha;
  if(img) ctx.drawImage(img, x*tileSize, y*tileSize, tileSize, tileSize);
  else {
    ctx.fillStyle = key.includes('path') ? '#a17a46' : '#234f39';
    ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
  }
  ctx.restore();
}
function drawProp(type,x,y,w,h){
  const mapType = { tree:'props.tree', stallBlue:'props.stallBlue', stallPurple:'props.stallPurple', gate:'props.gate', bridge:'props.bridge' };
  const img = IMAGES[mapType[type]];
  const px = x*tileSize, py = y*tileSize;
  if(img) {
    const drawH = h*tileSize + (type==='tree'?60: type==='gate'?70:20);
    const drawY = py - (type==='tree'?60: type==='gate'?70:10);
    ctx.drawImage(img, px, drawY, w*tileSize, drawH);
  } else {
    ctx.fillStyle = type==='bridge' ? '#8a5b32' : '#466';
    ctx.fillRect(px,py,w*tileSize,h*tileSize);
  }
}
function drawLabel(text,x,y){
  ctx.font = 'bold 13px Inter, sans-serif';
  const pad = 8; const w = ctx.measureText(text).width + pad*2;
  ctx.fillStyle = 'rgba(8,14,22,.8)'; ctx.beginPath(); roundRect(ctx, x-w/2, y-14, w, 22, 10); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.fillText(text, x, y+1);
  ctx.textAlign='start';
}
function pulseMarker(x,y,color,t){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.4 + Math.sin(t*5)*0.3;
  ctx.beginPath(); ctx.arc(x,y,18+Math.sin(t*5)*2,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y-24); ctx.lineTo(x,y-42); ctx.stroke();
  ctx.restore();
}
function drawCircle(x,y,r,c){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
function roundRect(ctx, x, y, w, h, r){ ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function showDialogue(name, subtitle, text, portrait, choices){
  game.dialogueOpen = true;
  dialogue.classList.remove('hidden');
  dialogueName.textContent = name;
  dialogueSubtitle.textContent = subtitle;
  dialogueText.textContent = text;
  dialoguePortrait.src = portrait;
  dialogueChoices.innerHTML='';
  choices.forEach(choice=>{
    const btn = document.createElement('button');
    btn.className = `btn ${choice.primary ? 'primary' : ''}`;
    btn.textContent = choice.label;
    btn.onclick = choice.action;
    dialogueChoices.appendChild(btn);
  });
}
function hideDialogue(){
  dialogue.classList.add('hidden');
  if(game) game.dialogueOpen = false;
}
function toastMsg(msg){
  toast.textContent = msg; toast.classList.add('show');
  clearTimeout(toast._timer); toast._timer = setTimeout(()=>toast.classList.remove('show'), 2200);
}

function completeGame(){
  emitEvent('lesson_completed', {
    delivered: game.delivered,
    completedWithinTime: game.timer > 0,
    bugsCaught: game.bugsCaught,
    distracted: game.distracted,
    recovered: game.recovered,
    focusEnd: Math.round(game.focus),
    stayedNearPathSeconds: Math.round(game.nearPathTicks),
    reward: 'path_stone'
  });
  summaryText.textContent = `You completed all 3 missions, caught ${game.bugsCaught} scatterbugs, and practiced returning to the path ${game.recovered} time(s).`;
  setTimeout(()=>setScreen('complete'), 900);
}

function emitEvent(eventType, payload){
  const event = {
    source:'rite.lesson.event.v1', contractVersion:'1.0', eventType,
    timestamp: new Date().toISOString(), payload
  };
  try { window.parent?.postMessage(event, '*'); } catch(e){}
  try {
    const queue = JSON.parse(localStorage.getItem('rite_event_queue') || '[]');
    queue.push(event); localStorage.setItem('rite_event_queue', JSON.stringify(queue));
  } catch(e){}
  // Lightweight REST attempt; Codex can wire fully.
  fetch('./rite-events-stub-do-not-use-in-prod', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(event) }).catch(()=>{});
}
