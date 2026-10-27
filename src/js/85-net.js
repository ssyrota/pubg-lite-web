// ================= networking =================
const NET={on:false,room:null,self:null,isHost:false,hostId:null,send:{},code:null,lobby:new Map(),started:false,lastSt:0,lastBs:0,lastStats:0,mod:null};
function netStatus(t,err){const el=$('netstat');el.textContent=t;el.classList.toggle('err',!!err);}
async function netConnect(code,asHost){
  netStatus('Loading the peer-to-peer module…');
  if(typeof RTCPeerConnection==='undefined'){netStatus('This browser view has WebRTC turned off. Open the game file in a normal browser tab to play online.',true);return false;}
  let mod;
  try{mod=NET.mod||await import(TRYSTERO_URL);NET.mod=mod;}catch(err){netStatus('Could not load the peer-to-peer module. Online play needs an internet connection in a normal browser tab (it is blocked inside some embedded previews).',true);return false;}
  netStatus(asHost?'Room open. Waiting for players…':'Looking for the host through public trackers…');
  let room;
  try{room=mod.joinRoom({appId:APP_ID},'room-'+code);}catch(err){netStatus('Could not open the room: '+err.message,true);return false;}
  NET.room=room;NET.on=true;NET.self=mod.selfId;NET.isHost=asHost;NET.hostId=asHost?NET.self:null;NET.code=code;NET.lobby.clear();
  const mk=(name,fn)=>{const a=room.makeAction(name);
    if(Array.isArray(a)){a[1]((d,p)=>{try{fn(d,p);}catch(e){console.error(e);}});return(d,t)=>a[0](d,t);}
    a.onMessage=(d,ctx)=>{try{fn(d,typeof ctx==='string'?ctx:ctx&&ctx.peerId);}catch(e){console.error(e);}};
    return(d,t)=>a.send(d,t?{target:t}:undefined).catch?.(()=>{});};
  NET.send.hello=mk('hello',onHello);NET.send.lobby=mk('lobby',onLobby);NET.send.start=mk('start',onStart);
  NET.send.st=mk('st',onSt);NET.send.bs=mk('bs',onBs);NET.send.shot=mk('shot',onShot);NET.send.dmg=mk('dmg',onDmg);NET.send.die=mk('die',d=>onDeath(d));
  NET.send.pick=mk('pick',(d,p)=>{if(isAuthority())grantPick(d.i,p);});
  NET.send.take=mk('take',d=>{if(isAuthority()&&!NET.isHost)return;removeItem(d.i);if(me&&d.by===me.id)applyPickup(me,{...d.s,id:d.i});});
  NET.send.drop=mk('drop',d=>{for(const it of d.items)addItem(it);});
  NET.send.dreq=mk('dreq',d=>{if(isAuthority())spawnDrops(d.items,d.p);});
  NET.send.vseat=mk('vseat',d=>{if(isAuthority())grantSeat(d.e,d.v,d.s);});
  NET.send.vocc=mk('vocc',d=>{const v=vehs.get(d.v);if(v)applyOcc(v,d.s);});
  NET.send.vst=mk('vst',onVst);
  NET.send.vdmg=mk('vdmg',d=>{const v=vehs.get(d.v);if(v&&isAuthority())applyVehDamage(v,d.a,d.by);});
  NET.send.vhp=mk('vhp',d=>{const v=vehs.get(d.v);if(v)v.hp=d.hp;});
  NET.send.vboom=mk('vboom',d=>onVehBoom(d));
  NET.send.stats=mk('stats',onStats);
  NET.send.knock=mk('knock',d=>onKnock(d));NET.send.unk=mk('unk',d=>onUnknock(d));
  NET.send.rev=mk('rev',d=>{const t=ents.get(d.t);if(t&&isLocalCtl(t))unknock(t,d.by);});
  const setCb=(k,fn)=>{if(typeof room[k]==='function')room[k](fn);else room[k]=fn;};
  setCb('onPeerJoin',p=>{NET.send.hello({name:myName()},p);});
  setCb('onPeerLeave',onPeerLeave);
  if(asHost){NET.lobby.set(NET.self,myName());renderLobby();}
  else setTimeout(()=>{if(NET.on&&!NET.hostId&&!G.running)netStatus('No host found yet. Check the code; keep this open — trackers can take up to a minute.',true);},25000);
  return true;
}
function netLeave(){
  if(NET.room){try{NET.room.leave();}catch(e){}}
  NET.room=null;NET.on=false;NET.isHost=false;NET.hostId=null;NET.lobby.clear();NET.started=false;
}
function onHello(d,p){
  if(!NET.isHost)return;
  if(G.running){NET.send.lobby({started:true,host:NET.self,players:[]},p);return;}
  NET.lobby.set(p,String(d.name||'Player').slice(0,14));broadcastLobby();
}
function broadcastLobby(){renderLobby();NET.send.lobby({host:NET.self,players:[...NET.lobby].map(([id,name])=>({id,name})),code:NET.code});}
function onLobby(d,p){
  if(NET.isHost)return;
  NET.hostId=p;
  if(d.started&&!G.running){netStatus('That match has already started. Wait for the next one.',true);return;}
  NET.lobby.clear();for(const pl of d.players)NET.lobby.set(pl.id,pl.name);
  netStatus('Connected to host. Waiting for the host to start…');renderLobby();
}
function renderLobby(){
  const box=$('lobby');box.hidden=!NET.on;
  $('lcode').textContent=NET.code||'-----';
  $('lplayers').innerHTML=[...NET.lobby].map(([id,name])=>`<li>${esc(name)}${id===NET.hostId||(NET.isHost&&id===NET.self)?'<small>HOST</small>':''}${id===NET.self?'<small>YOU</small>':''}</li>`).join('')||'<li class="note">Waiting for the host…</li>';
  $('btnStart').hidden=!NET.isHost;
}
function onPeerLeave(p){
  if(!G.running){
    if(NET.isHost&&NET.lobby.has(p)){NET.lobby.delete(p);broadcastLobby();}
    if(p===NET.hostId){netStatus('The host left the room.',true);NET.hostId=null;NET.lobby.clear();renderLobby();}
    return;
  }
  const e=ents.get(p);
  if(e&&!e.dead){
    if(e.veh){const v=e.veh,i=v.seats.indexOf(e.id);if(i>=0)v.seats[i]=null;e.veh=null;}
    e.dead=true;e.left=true;e.knocked=false;e.mode='dead';e.deathT=G.t;e.mesh.visible=false;markTeamPlace(e.team);feed(e.name,'','left the match',false);
  }
  if(p===NET.hostId){
    const humans=G.humanIds.filter(id=>id!==p&&!(ents.get(id)||{}).left).sort();
    NET.hostId=humans[0];
    if(NET.hostId===NET.self){
      NET.isHost=true;
      for(const b of ents.values()){if(!b.isBot||b.dead)continue;b.pos.copy(b.tPos);b.yaw=b.tYaw;initAI(b);
        const k=(b.netWk||'rifle').split(':')[0];b.inv.w[0]=newW(k,WEAPONS[k].mag,{});b.inv.cur=0;b.inv.ammo[WEAPONS[k].ammo]=90;b.inv.band=2;
        if(b.mode==='veh'){b.mode='ground';b.veh=null;}}
      for(const v of vehs.values())for(let i=0;i<v.seats.length;i++){const e2=ents.get(v.seats[i]);if(!e2||e2.dead||e2.left)v.seats[i]=null;}
      for(const b of ents.values())if(b.isBot&&!b.dead&&b.knocked)b.hp=Math.max(b.hp,30);
      centerMsg('Host left · you now run the bots');
    }else centerMsg('Host left · bots handed to another player');
  }
  checkTeamWipes();checkEnd();
}
function packEnt(e){return[r2(e.pos.x),r2(e.pos.y),r2(e.pos.z),r2(e.yaw),r2(e.pitch),MODES.indexOf(e.mode),curW(e)?WK.indexOf(curW(e).k):-1,Math.round(e.hp),(e.crouch?1:0)|(e.aiming?2:0)|(e.healT>0?4:0)|(e.knocked?8:0)|(e.ads?16:0),e.vest,e.helm,curW(e)?attStr(curW(e).att):'',e.bag,r2(e.lean||0)];}
function unpackEnt(e,a){
  if(e.dead)return;
  e.tPos.set(a[0],a[1],a[2]);e.tYaw=a[3];e.tPitch=a[4];
  const mode=MODES[a[5]];if(mode!=='dead'&&mode!=='veh'&&e.mode!=='veh')e.mode=mode;
  e.netWk=a[6]>=0?WK[a[6]]+':'+(a[11]||''):null;e.tLean=a[13]||0;e.hp=a[7];e.crouch=!!(a[8]&1);e.aiming=!!(a[8]&2);e.ads=!!(a[8]&16);e.knocked=!!(a[8]&8);e.vest=a[9];e.helm=a[10];e.bag=a[12]||0;
  if(!e.gotState){e.pos.copy(e.tPos);e.yaw=e.tYaw;e.gotState=true;}
}
function onSt(d,p){const e=ents.get(p);if(e&&!isLocalCtl(e))unpackEnt(e,d);}
function onBs(d,p){if(NET.isHost)return;for(const a of d){const e=ents.get(a[0]);if(e)unpackEnt(e,a.slice(1));}}
function onDmg(d){const t=ents.get(d.t);if(t&&isLocalCtl(t))applyDamage(t,d.a,!!d.h,d.by,d.w,d.p?{x:d.p[0],z:d.p[1]}:null);}
function onStats(d){for(const[id,p]of d){const e=ents.get(id);if(e&&!isLocalCtl(e))unpackStats(e,p);}}
function broadcastStats(){if(!NET.on)return;const list=[];for(const e of ents.values())if(isLocalCtl(e))list.push([e.id,packStats(e)]);NET.send.stats(list);}
function netTick(){
  if(!NET.on||!G.running)return;
  const now=performance.now();
  if(now-NET.lastSt>66){NET.lastSt=now;if(!me.dead)NET.send.st(packEnt(me));
    vehNetSend();}
  if(NET.isHost&&now-NET.lastBs>100){NET.lastBs=now;const arr=[];for(const e of ents.values())if(e.isBot&&!e.dead)arr.push([e.id,...packEnt(e)]);if(arr.length)NET.send.bs(arr);}
  if(now-NET.lastStats>4000){NET.lastStats=now;broadcastStats();}
}

