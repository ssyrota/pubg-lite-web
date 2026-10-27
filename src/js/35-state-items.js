// ================= runtime state =================
const ents=new Map(),items=new Map(),vehs=new Map();
let me=null;
const G={fpBob:0,fpKick:0,invOpen:false,teamSize:1,teamDrop:{},ads:false,running:false,t:0,over:false,spec:null,diff:'normal',total:0,fpp:false,crouch:false,mapOpen:false,tab:false,locked:false,humanIds:[],endShown:false,myDeathShown:false,dropN:0,startWall:0};
const look={yaw:0,pitch:-0.1};
function newStats(){return{shots:0,hits:0,heads:0,dmgBy:{},dist:0,heals:0,longest:0,dmgTaken:0,knocks:0,revives:0};}
function makeEnt(id,name,isBot,color,skin){
  const e={id,name,isBot,color,pos:new THREE.Vector3(),vel:new THREE.Vector3(),yaw:0,pitch:0,mode:'plane',hp:100,vest:0,helm:0,
    inv:{w:[null,null],cur:-1,ammo:{'9mm':0,'5.56':0,'7.62':0,'12ga':0},band:0,med:0,att:[]},
    onGround:false,crouch:false,aiming:false,ads:false,bag:0,vd:0,hd:0,team:0,slot:0,knocked:false,knockBy:null,knockN:0,reviveT:0,reviveId:null,fireCd:0,reloadT:0,healT:0,healKind:null,bloom:0,kills:0,dead:false,left:false,
    anim:0,speedNow:0,fallT:0,lastHitBy:null,lastHitT:-99,deathT:null,place:null,veh:null,seat:-1,
    tPos:new THREE.Vector3(),tYaw:0,tPitch:0,netWk:null,ai:null,st:newStats(),lastPos:null,runOverCd:{}};
  e.skin=skin;e.lean=0;e.tLean=0;e.mesh=buildChar(color,skin);dynGroup.add(e.mesh);
  return e;
}
const curW=e=>e.inv.cur>=0?e.inv.w[e.inv.cur]:null;
const isAuthority=()=>!NET.on||NET.isHost;
const isLocalCtl=e=>e===me||(e.isBot&&isAuthority());
const ownerOf=e=>e.isBot?NET.hostId:e.id;
const aliveCount=()=>{let n=0;for(const e of ents.values())if(!e.dead)n++;return n;};
const eyeY=e=>e.pos.y+(e.mode==='ground'&&e.crouch?1.15:1.58);
const leanOff=e=>e.mode==='ground'&&!e.knocked?(e.lean||0)*0.42:0;

function planePos(t,out){const p=W.plane,s=t*p.speed;out.set(p.sx+p.dx*s,p.alt,p.sz+p.dz*s);return out;}

// ================= items =================
function itemLabel(s){
  switch(s.k){case'w':{const n=Object.values(s.att||{}).length;return WEAPONS[s.t].name+(n?` + ${n} attachment${n>1?'s':''}`:'');}case'a':return `${s.t} ammo ×${s.n}`;case'b':return `Bandage ×${s.n}`;case'm':return 'Med kit';case'v':return `Vest · level ${s.lv}`;case'h':return `Helmet · level ${s.lv}`;case'x':return ATT[s.t].name;case'p':return `Backpack · level ${s.lv}`;}
  return '?';
}
function addItem(it){
  if(items.has(it.id))return;
  if(it.y==null)it.y=groundAt(it.x,it.z,200);
  const m=new THREE.Mesh(ITEM_G[it.k],itemMat(it.k));m.position.set(it.x,it.y+0.16,it.z);m.rotation.y=(it.x*7.3+it.z)%6.28;
  if(it.k==='h')m.position.y=it.y+0.02;
  if(it.k==='w'){const gm=buildGun(it.t,it.att);gm.position.y=0.08;gm.rotation.y=Math.PI/2;m.add(gm);m.material=itemMat('w');m.scale.set(0.01,0.01,0.01);gm.scale.set(100,100,100);}
  m.castShadow=false;it.mesh=m;dynGroup.add(m);items.set(it.id,it);
}
function removeItem(id){const it=items.get(id);if(!it)return;dynGroup.remove(it.mesh);items.delete(id);}
const itemSpec=it=>({k:it.k,t:it.t,n:it.n,lv:it.lv,att:it.att||null,dur:it.dur||0});
function nearestItem(e,maxD){
  let best=null,bd=maxD*maxD;
  for(const it of items.values()){const dx=it.x-e.pos.x,dz=it.z-e.pos.z,d2=dx*dx+dz*dz;if(d2<bd&&Math.abs(it.y-e.pos.y)<1.8){bd=d2;best=it;}}
  return best;
}
function requestPick(e,it){
  if(isAuthority())grantPick(it.id,e.id);
  else{if(e.pendingPick===it.id&&G.t-e.pendingT<1)return;e.pendingPick=it.id;e.pendingT=G.t;NET.send.pick({i:it.id},NET.hostId);}
}
function grantPick(id,byId){
  const it=items.get(id),e=ents.get(byId);if(!it||!e||e.dead)return;
  const spec=itemSpec(it);removeItem(id);
  if(NET.on)NET.send.take({i:id,by:byId,s:spec});
  if(isLocalCtl(e))applyPickup(e,{...spec,id});
}
function capUsed(e){let u=e.inv.band*BAND_W+e.inv.med*MED_W+e.inv.att.length*ATT_W;for(const a of AMMO)u+=e.inv.ammo[a]*AMMO_W[a];return u;}
function capRoom(e,w){return Math.max(0,Math.floor((BAG_CAP[e.bag]-capUsed(e)+1e-6)/w));}
function attTarget(e,a,prefer){
  const type=ATT[a].type,order=prefer!=null?[prefer]:(e.inv.cur>=0?[e.inv.cur,1-e.inv.cur]:[0,1]);
  for(const i of order){const w=e.inv.w[i];if(w&&fits(w.k,a)&&!w.att[type])return i;}
  for(const i of order){const w=e.inv.w[i];if(w&&fits(w.k,a)&&ATT[w.att[type]].rank<ATT[a].rank)return i;}
  return -1;
}
function clampMag(e,w){const c=magCap(w);if(w.mag>c){e.inv.ammo[WEAPONS[w.k].ammo]+=w.mag-c;w.mag=c;}}
function attachTo(e,i,a){const w=e.inv.w[i],type=ATT[a].type,old=w.att[type]||null;w.att[type]=a;clampMag(e,w);return old;}
function stashAtt(e,a,drops){if(capRoom(e,ATT_W)>=1)e.inv.att.push(a);else drops.push({k:'x',t:a});}
function autoFit(e,i){ // move fitting attachments from the backpack onto an empty slot of weapon i
  const w=e.inv.w[i];if(!w)return;
  for(let j=e.inv.att.length-1;j>=0;j--){const a=e.inv.att[j];if(fits(w.k,a)&&!w.att[ATT[a].type]){w.att[ATT[a].type]=a;e.inv.att.splice(j,1);}}
}
function pickBlock(e,it){
  if(it.k==='a'&&capRoom(e,AMMO_W[it.t])<1)return 'backpack full';
  if(it.k==='b'&&capRoom(e,BAND_W)<1)return 'backpack full';
  if(it.k==='m'&&capRoom(e,MED_W)<1)return 'backpack full';
  if(it.k==='x'&&attTarget(e,it.t)<0&&capRoom(e,ATT_W)<1)return 'backpack full';
  return '';
}
function applyPickup(e,s){
  const drops=[];
  if(s.k==='w'){
    let slot=e.inv.w[0]==null?0:e.inv.w[1]==null?1:(e.inv.cur>=0?e.inv.cur:0);
    if(e.inv.w[slot]){const old=e.inv.w[slot];drops.push({k:'w',t:old.k,n:old.mag,att:{...old.att}});}
    e.inv.w[slot]=newW(s.t,s.n|0,s.att);autoFit(e,slot);
    if(e.inv.cur<0||drops.length)e.inv.cur=slot;e.reloadT=0;
  }else if(s.k==='a'||s.k==='b'||s.k==='m'){
    const wt=s.k==='a'?AMMO_W[s.t]:s.k==='b'?BAND_W:MED_W,take=Math.min(s.n,capRoom(e,wt));
    if(s.k==='a')e.inv.ammo[s.t]+=take;else if(s.k==='b')e.inv.band+=take;else e.inv.med+=take;
    if(take<s.n)drops.push({k:s.k,t:s.t,n:s.n-take});
  }else if(s.k==='x'){
    const pref=e.pendingAtt&&e.pendingAtt.id===s.id?e.pendingAtt.w:null;e.pendingAtt=null;
    let i=pref!=null&&e.inv.w[pref]&&fits(e.inv.w[pref].k,s.t)?pref:attTarget(e,s.t);
    if(i>=0){const old=attachTo(e,i,s.t);if(old)stashAtt(e,old,drops);}else stashAtt(e,s.t,drops);
  }else if(s.k==='p'){if(e.bag)drops.push({k:'p',lv:e.bag});e.bag=s.lv;}
  else if(s.k==='v'){if(e.vest)drops.push({k:'v',lv:e.vest,dur:Math.round(e.vd)});e.vest=s.lv;e.vd=s.dur||VEST_DUR[s.lv];}
  else if(s.k==='h'){if(e.helm)drops.push({k:'h',lv:e.helm,dur:Math.round(e.hd)});e.helm=s.lv;e.hd=s.dur||HELM_DUR[s.lv];}
  if(e===me){sfx.pick();invDirty=true;}
  if(drops.length)requestDrop(e,drops);
}
function requestDrop(e,specs){
  const p=[r2(e.pos.x),r2(e.pos.y),r2(e.pos.z)];
  if(isAuthority())spawnDrops(specs,p);else NET.send.dreq({items:specs,p},NET.hostId);
}
function spawnDrops(specs,p){
  const list=specs.map((s,i)=>{const a=i*2.399,r=0.5+0.18*i;return{...s,id:'d'+(NET.self||'s').slice(0,4)+'_'+(G.dropN++),x:r2(p[0]+Math.cos(a)*r),z:r2(p[2]+Math.sin(a)*r),y:null};});
  for(const it of list){it.y=groundAt(it.x,it.z,p[1]+1);addItem(it);}
  if(NET.on)NET.send.drop({items:list.map(it=>({k:it.k,t:it.t,n:it.n,lv:it.lv,att:it.att||null,dur:it.dur||0,id:it.id,x:it.x,y:r2(it.y),z:it.z}))});
}
function invPack(e){return{w:e.inv.w.filter(Boolean).map(w=>[w.k,w.mag,attStr(w.att)]),x:e.inv.att.slice(),a:e.inv.ammo,b:e.inv.band,m:e.inv.med,v:e.vest,vd:Math.round(e.vd),h:e.helm,hd:Math.round(e.hd),p:e.bag};}
function packToSpecs(pk){
  const s=[];for(const[k,m,as]of pk.w||[])s.push({k:'w',t:k,n:m,att:attFrom(as)});
  for(const a of pk.x||[])s.push({k:'x',t:a});
  for(const a of AMMO)if(pk.a&&pk.a[a]>0)s.push({k:'a',t:a,n:pk.a[a]});
  if(pk.b)s.push({k:'b',n:pk.b});if(pk.m)s.push({k:'m',n:pk.m});if(pk.v)s.push({k:'v',lv:pk.v,dur:pk.vd});if(pk.h)s.push({k:'h',lv:pk.h,dur:pk.hd});if(pk.p)s.push({k:'p',lv:pk.p});
  return s;
}

