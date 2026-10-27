// ================= match lifecycle =================
let menuSeed=(Math.random()*1e9)|0;
function myName(){return($('nm').value.trim()||'Player').slice(0,14);}
// map sizes (km). genWorld(seed,size) builds a world of size×size metres.
const MAP_SIZES={small:1200,medium:2000,large:3000};
function ensureWorld(seed,size){size=size||800;if(W&&W.seed===seed&&W.size===size)return;W=genWorld(seed,size);buildWorldMeshes();}
function clearMatch(){
  for(const e of ents.values())dynGroup.remove(e.mesh);ents.clear();
  for(const it of items.values())dynGroup.remove(it.mesh);items.clear();
  for(const v of vehs.values())dynGroup.remove(v.mesh);vehs.clear();
  me=null;sfx.engine(false,0);sfx.wind(false,0);
}
const COLORS=[0x3f6fa8,0xa8483f,0x4f8a4a,0xc49a3a,0x7a4fa0,0x3a9a9a,0xb06a2a,0x6a7a8a,0x9a3a6a,0x5a6a2a,0x2a5a7a,0x8a5a3a];
function startMatch(cfg){
  ensureWorld(cfg.seed,cfg.mapSize);clearMatch();
  G.diff=cfg.diff||'normal';
  for(const l of W.loot)addItem({...l});
  for(const s of W.vspawn)vehs.set(s.id,makeVeh(s));
  const R=rng(cfg.seed+999);
  G.humanIds=cfg.humans.map(h=>h.id);
  G.teamSize=clamp(cfg.team|0||1,1,3);G.teamDrop={};G.ads=false;
  let idx=0;const place=e=>{e.team=Math.floor(idx/G.teamSize);e.slot=idx%G.teamSize;idx++;};
  cfg.humans.forEach((h,i)=>{const e=makeEnt(h.id,h.name,false,COLORS[i%COLORS.length],SKIN[i%SKIN.length]);place(e);ents.set(h.id,e);});
  for(let i=0;i<cfg.bots;i++){const id='b'+i,e=makeEnt(id,W.botNames[i],true,COLORS[Math.floor(R()*COLORS.length)],SKIN[Math.floor(R()*SKIN.length)]);place(e);ents.set(id,e);if(isAuthority())initAI(e);}
  me=ents.get(cfg.self);
  for(const e of ents.values()){planePos(0,e.pos);e.tPos.copy(e.pos);}
  G.fpp=menuView==='fpp';G.invOpen=false;G.fpKick=0;
  G.total=ents.size;G.t=0;G.running=true;G.over=false;G.spec=null;G.endShown=false;G.crouch=false;G.mapOpen=false;G.dropN=0;
  look.yaw=Math.atan2(-W.plane.dx,-W.plane.dz)+Math.PI/2;look.pitch=-0.15;
  $('menu').hidden=true;$('hud').hidden=false;$('end').hidden=true;
  $('feed').innerHTML='';
  if(!G.locked){$('ptitle').textContent='Match starting';$('psub').textContent='Click anywhere to take control. You are in the plane.';$('pause').hidden=false;}
}
function leaveMatch(){
  G.running=false;G.over=true;G.freeCursor=false;canvas.style.cursor='';
  if(document.pointerLockElement)document.exitPointerLock();
  if(NET.on)netLeave();
  clearMatch();
  $('hud').hidden=true;$('end').hidden=true;$('pause').hidden=true;$('bigmap').hidden=true;$('inv').hidden=true;G.invOpen=false;
  $('lobby').hidden=true;netStatus('');
  $('menu').hidden=false;
}

// ================= menu =================
const KEYS=[['W A S D','Move · drive'],['Mouse','Look · aim'],['LMB','Fire'],['RMB','Tap: sights · hold: shoulder aim'],['Shift','Sprint · vehicle boost'],['Space','Jump · handbrake'],['C','Crouch'],['Q / E','Lean left / right'],['R','Reload'],['B','Fire mode (auto / single)'],['1 2 / X','Weapons / holster'],['4 / 5','Bandage / med kit'],['F','Pick up · interact · jump from plane'],['Tab','Inventory · S for stats'],['V','First / third person'],['M','Map'],['Esc','Pause · match stats']];
const KEYS_OLD=[['W A S D','Move · drive'],['Mouse','Look · aim'],['LMB / RMB','Fire / aim down sights'],['Shift','Sprint · vehicle boost'],['Space','Jump · handbrake'],['C','Crouch'],['R','Reload'],['1 2 3','Weapons · holster'],['4 / 5','Bandage / med kit'],['E','Pick up'],['F','Jump from plane · enter / exit vehicle'],['V','First / third person'],['M','Map'],['Tab','Match stats'],['Esc','Pause']];
$('mkeys').innerHTML=$('pkeys').innerHTML=KEYS.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
try{$('nm').value=localStorage.getItem('stormline.name')||('Player'+(100+Math.floor(Math.random()*900)));}catch(e){$('nm').value='Player'+(100+Math.floor(Math.random()*900));}
$('nm').addEventListener('change',()=>{try{localStorage.setItem('stormline.name',myName());}catch(e){}});
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
  if(NET.on)return;
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
  for(const t of['solo','host','join'])$('p-'+t).hidden=t!==b.dataset.tab;netStatus('');
});
let menuDiff='normal';
document.querySelectorAll('[data-seg=diff]').forEach(seg=>seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{menuDiff=b.dataset.v;document.querySelectorAll('[data-seg=diff] button').forEach(x=>x.classList.toggle('on',x.dataset.v===menuDiff));}));
let menuTeam=1;
let menuMap='medium';try{menuMap=localStorage.getItem('stormline.map')||'medium';}catch(e){}
const syncMap=()=>document.querySelectorAll('[data-seg=map] button').forEach(x=>x.classList.toggle('on',x.dataset.v===menuMap));syncMap();
document.querySelectorAll('[data-seg=map] button').forEach(b=>b.onclick=()=>{menuMap=b.dataset.v;syncMap();try{localStorage.setItem('stormline.map',menuMap);}catch(e){}});
let menuView='tpp';try{menuView=localStorage.getItem('stormline.view')||'tpp';}catch(e){}
const syncView=()=>document.querySelectorAll('[data-seg=view] button').forEach(x=>x.classList.toggle('on',x.dataset.v===menuView));syncView();
document.querySelectorAll('[data-seg=view] button').forEach(b=>b.onclick=()=>{menuView=b.dataset.v;syncView();try{localStorage.setItem('stormline.view',menuView);}catch(e){}});
document.querySelectorAll('[data-seg=team]').forEach(seg=>seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{menuTeam=+b.dataset.v;document.querySelectorAll('[data-seg=team] button').forEach(x=>x.classList.toggle('on',+x.dataset.v===menuTeam));}));
$('botsN').oninput=()=>$('botsNv').textContent=$('botsN').value;
$('hostN').oninput=()=>$('hostNv').textContent=$('hostN').value;
$('btnSolo').onclick=()=>{
  sfx.init();const n=+$('botsN').value;
  startMatch({seed:(Math.random()*1e9)|0,humans:[{id:'me',name:myName()}],bots:n-1,diff:menuDiff,team:menuTeam,mapSize:MAP_SIZES[menuMap],self:'me'});
  lockPointer();
};
const genCode=()=>{const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<5;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
$('btnHost').onclick=async()=>{if(NET.on)return;$('btnHost').disabled=true;const ok=await netConnect(genCode(),true);$('btnHost').disabled=false;if(ok)renderLobby();};
$('btnJoin').onclick=async()=>{if(NET.on)return;const c=$('joinCode').value.trim().toUpperCase();if(c.length<4){netStatus('Enter the 5-character room code from the host.',true);return;}$('btnJoin').disabled=true;const ok=await netConnect(c,false);$('btnJoin').disabled=false;if(ok)renderLobby();};
$('btnLeaveLobby').onclick=()=>{netLeave();$('lobby').hidden=true;netStatus('');};
$('btnStart').onclick=()=>{
  if(!NET.isHost)return;sfx.init();
  const humans=[...NET.lobby].map(([id,name])=>({id,name}));
  const total=Math.max(+$('hostN').value,humans.length);
  const cfg={seed:(Math.random()*1e9)|0,humans,bots:total-humans.length,diff:menuDiff,team:menuTeam,mapSize:MAP_SIZES[menuMap]};
  NET.send.start(cfg);NET.started=true;
  startMatch({...cfg,self:NET.self});lockPointer();
};
function onStart(d,p){
  if(G.running||NET.isHost)return;
  if(!d.humans.some(h=>h.id===NET.self)){netStatus('The match started without you (you joined late).',true);return;}
  NET.hostId=p;startMatch({...d,self:NET.self});
}

