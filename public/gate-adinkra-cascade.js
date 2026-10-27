/* Garvey Gate of Attention — Adinkra Symbol Cascade. Standalone, no voice interference. */
(()=>{
'use strict';
const host=document.getElementById('stage');
if(!host)return;
/* Name mapping from the earlier color poster is NOT verified for this differently ordered black-and-white sheet. Do not use it for learning labels until audited. */
/* Internal numeric identities only; this artwork is game-only and never teaches names. */
const names=["Sankofa","Adinkrahene","Fihankra","Mate Masie","Mmusuyidee","Nsaa","Dwennimmen","Nyame Dua","Akoben","Akoma","Akoma Ntoso","Besa","Bi Nka Bi","Funtunfunefu","Gye Nyame","Hwe Mu Dua","Kokroko","Mpaebuo","Nea Onnim No Sua A","Nea Ope Se Obedi Hene","Nkonsonkonson","Nti Nktinko","Nyame Nnwu Na Mawu","Nyame Ye Ohene","Ohene Anwa","Okodee Mmowere","Odo Nyera Fie Kwan","Ohene Ye","Owo Foro Adwemma","Sesa Wo Suban","Tabono","Tamfo Bebre","Tantsiyie","Wofa","Aban","Adwuma","Afehyia Pa","Ahenemmowa","Ananse Ntotan","Asase Ye Duru","Denkyem","Eban","Ese Ne Tekrema","Fa Wo Ho Ben","Gnankonwa","Hinka Asem","Kete Pa","Kramo Bone","Kua Fie","Mme Nt uatum","Nesa","Oforo","Sankofa (return)","Sepow","Sikadwa Kofi","Tumi","Wawa Aba","Wosane No Ne","Yie","Nyame Bekyere","Nyame Kye","Boa Me Na Me Mmoa Wo"];
const POSTER='/adinkra-library/newadksymbols.jpg?v=black62-20261027b';
function symbolArt(symbol){const el=document.createElement('span');el.className='cascade-symbol-art';el.style.backgroundPosition=((symbol%8)/7*100)+'% '+(Math.floor(symbol/8)/7*100)+'%';el.setAttribute('aria-hidden','true');return el}
const W=6,H=14,START_ROWS=4,storage='garvey-adinkra-cascade-best-v1';
let resolving=false,epoch=0;let fresh=new Set(),board=Array(W*H).fill(null),selected=-1,seconds=0,score=0,matches=0,level=1,playing=false,over=false,timer=null,best=0,round=0;
try{best=Math.max(0,Number(localStorage.getItem(storage))||0)}catch(_){}
const panel=document.createElement('section');panel.className='cascade';panel.id='symbolCascade';panel.setAttribute('aria-label','Adinkra Symbol Cascade game');
panel.innerHTML='<div class="cascade-head"><div><div class="eyebrow">Play while you listen</div><h3>Adinkra Symbol Cascade</h3></div><div class="cascade-score"><strong id="cascadeScore">0</strong><small>Coins</small></div></div><p class="cascade-help">Four rows are already filled, with ten empty rows above. Watch new symbols tumble into the lowest open spaces like colorful sand. Tap two symbols to swap them. Matching neighbors burst into coins! Swaps stay in place even when they do not match. Keep the tank from filling while you listen to the Keeper.</p><div class="cascade-stats"><span id="cascadeTime">Time 0s</span><span id="cascadeLevel">Level 1 · gentle pace</span><span id="cascadeBest">Best 0s</span></div><div class="cascade-tank-wrap"><div class="cascade-tank" id="cascadeTank" role="group" aria-label="Symbol tank"></div><div id="cascadeBurst" class="cascade-burst" aria-hidden="true"></div></div><div id="cascadeStatus" class="cascade-status" role="status" aria-live="polite">Ready to play?</div><div class="cascade-controls"><button type="button" id="cascadeStart" class="gold">Start game</button><button type="button" id="cascadeReset" class="outline">New game</button></div><p class="cascade-help">The pace increases gradually as you survive. Matches pause briefly so you can recognize each symbol. Your longest survival time is saved in this browser. This practice game does not determine gate advancement.</p>';
host.insertAdjacentElement('afterend',panel);
const el=id=>document.getElementById(id),tank=el('cascadeTank'),status=el('cascadeStatus'),start=el('cascadeStart');
/* Poster is user-uploaded. The 62 tile positions are indexed left-to-right, top-to-bottom. */
const posterCheck=new Image();posterCheck.src=POSTER;posterCheck.onload=()=>{status.textContent='62 Adinkra designs ready. Start when you are ready!'};
posterCheck.onerror=()=>{status.textContent='Adinkra artwork could not load. Please refresh.';start.disabled=true};
function index(x,y){return y*W+x}
function empty(){return board.every(v=>v===null)}
function persistBest(){if(seconds>best){best=seconds;try{localStorage.setItem(storage,String(best))}catch(_){}}el('cascadeBest').textContent='Best '+best+'s'}
function draw(){
 tank.replaceChildren();
 board.forEach((symbol,i)=>{
  const cell=document.createElement('button');cell.type='button';cell.className='cascade-cell';cell.disabled=over||!playing||symbol===null;cell.setAttribute('aria-label',symbol===null?'Empty position':'Adinkra symbol '+(symbol+1)+', row '+(Math.floor(i/W)+1)+', column '+(i%W+1));cell.setAttribute('aria-pressed',String(selected===i));
  if(symbol!==null){if(fresh.has(i)){cell.classList.add('cascade-falling');cell.style.setProperty('--cascade-fall',Math.max(350,(Math.floor(i/W)+1)*64)+'px')}cell.append(symbolArt(symbol))}
  cell.onclick=()=>swap(i);tank.append(cell)
 });
 fresh.clear();
 el('cascadeScore').textContent=score;el('cascadeTime').textContent='Time '+seconds+'s';el('cascadeLevel').textContent='Level '+level+' · one drop every 1.55s';persistBest();
}
function gravity(){
 for(let x=0;x<W;x++){const pieces=[];for(let y=H-1;y>=0;y--){const v=board[index(x,y)];if(v!==null)pieces.push(v)}for(let y=H-1;y>=0;y--)board[index(x,y)]=pieces[H-1-y]??null}
}
function groups(){
 const visited=new Set(),result=[];
 for(let i=0;i<board.length;i++){if(board[i]===null||visited.has(i))continue;const symbol=board[i],queue=[i],group=[];visited.add(i);
  while(queue.length){const at=queue.pop(),x=at%W,y=Math.floor(at/W);group.push(at);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;const next=index(nx,ny);if(!visited.has(next)&&board[next]===symbol){visited.add(next);queue.push(next)}}}
  if(group.length>=2)result.push(group)
 }
 return result
}
function burst(){
 let total=0,chain=0;
 while(chain++<W*H){const matched=groups();if(!matched.length)break;for(const group of matched){for(const i of group){board[i]=null;total++}}gravity()}
 if(total){score+=total*10;matches+=total;status.textContent='✨ '+total+' symbols matched! +'+(total*10)+' coins';const effect=el('cascadeBurst');effect.textContent='✦ 🪙 ✨ +'+(total*10);effect.classList.remove('pop');void effect.offsetWidth;effect.classList.add('pop');}
 return total
}
function swap(i){if(!playing||over||resolving||board[i]===null)return;if(selected<0){selected=i;draw();return}if(selected===i){selected=-1;draw();return}const a=selected;[board[a],board[i]]=[board[i],board[a]];selected=-1;draw();resolveMatches()}
function seedTank(){
 // Four complete bottom rows; avoid automatic neighboring matches on the starting board.
 for(let y=H-START_ROWS;y<H;y++)for(let x=0;x<W;x++){
  const forbidden=new Set();
  if(x>0)forbidden.add(board[index(x-1,y)]);
  if(y>H-START_ROWS)forbidden.add(board[index(x,y-1)]);
  const options=names.map((_,i)=>i).filter(i=>!forbidden.has(i));
  board[index(x,y)]=options[Math.floor(Math.random()*options.length)];
 }
}
function drop(){
 const available=[];
 for(let x=0;x<W;x++)if(board[index(x,0)]===null){
  let height=0;for(let y=0;y<H;y++)if(board[index(x,y)]!==null)height++;
  available.push({x,height});
 }
 if(!available.length){finish();return false}
 // Flow toward lower stacks, while keeping enough variation to look like sand.
 available.sort((a,b)=>a.height-b.height);
 const candidates=available.filter(c=>c.height<=available[0].height+1);
 const x=candidates[Math.floor(Math.random()*candidates.length)].x;
 let y=H-1;while(y>=0&&board[index(x,y)]!==null)y--;
 if(y<0){finish();return false}
 board[index(x,y)]=Math.floor(Math.random()*names.length);
 fresh.add(index(x,y));
 return true
}
function resolveMatches(){
 if(resolving||over)return;
 const matched=groups();if(!matched.length)return;
 resolving=true;const version=epoch;
 const indices=matched.flat();const symbol=board[indices[0]];
 for(const i of indices){const cell=tank.children[i];if(cell)cell.classList.add('cascade-matching')}
 const effect=el('cascadeBurst');effect.replaceChildren();
 const preview=symbolArt(symbol);preview.setAttribute('aria-label',('Adinkra symbol '+(symbol+1)));
 const label=document.createElement('strong');label.textContent=('Adinkra symbol '+(symbol+1))+' · +'+(indices.length*10)+' coins';
 effect.append(preview,label);effect.classList.add('cascade-preview');
 status.textContent='Match found: '+('Adinkra symbol '+(symbol+1))+'! Watch the symbols grow.';
 setTimeout(()=>{
  if(version!==epoch)return;
  for(const i of indices)board[i]=null;
  score+=indices.length*10;matches+=indices.length;gravity();draw();
  effect.classList.remove('cascade-preview');effect.replaceChildren();
  status.textContent='✨ '+('Adinkra symbol '+(symbol+1))+' matched! +'+(indices.length*10)+' coins';
  resolving=false;
  if(groups().length)resolveMatches();
  else if(board.slice(0,W).every(v=>v!==null))finish();
 },1250);
}
function tick(){
 if(!playing||over||resolving||document.hidden)return;
 seconds++;level=Math.min(3,1+Math.floor(seconds/35));
 if(drop()){draw();setTimeout(()=>{if(playing&&!over)resolveMatches()},950)}
 else draw();
}
function finish(){over=true;playing=false;clearInterval(timer);timer=null;persistBest();status.textContent='Tank full! You lasted '+seconds+' seconds and earned '+score+' coins. Try again to beat your record.';start.textContent='Play again'}
function setTimer(){clearInterval(timer);timer=null;if(playing&&!document.hidden&&panel.hidden===false)timer=setInterval(tick,1550)}
function startGame(){if(over){newGame()}playing=!playing;start.textContent=playing?'Pause game':'Resume game';status.textContent=playing?'Keep the tank clear. Swap any two symbols!':'Paused — your board is safe.';setTimer();draw()}
function newGame(){clearInterval(timer);timer=null;epoch++;resolving=false;el('cascadeBurst').classList.remove('cascade-preview');el('cascadeBurst').replaceChildren();board=Array(W*H).fill(null);fresh.clear();selected=-1;seconds=0;score=0;matches=0;level=1;playing=false;over=false;round++;seedTank();start.textContent='Start game';status.textContent='Four rows ready. Start when you are ready!';draw()}
function syncVisibility(){const story=document.getElementById('step')?.textContent.includes('The story')===true;panel.hidden=!story;if(!story){clearInterval(timer);timer=null}else if(playing)setTimer()}
start.addEventListener('click',startGame);el('cascadeReset').addEventListener('click',newGame);document.addEventListener('visibilitychange',setTimer);
const step=document.getElementById('step');if(step)new MutationObserver(syncVisibility).observe(step,{childList:true,characterData:true,subtree:true});
newGame();syncVisibility();
})();
