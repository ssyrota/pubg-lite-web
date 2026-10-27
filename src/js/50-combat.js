// ================= combat =================
const _o=new THREE.Vector3(),_d=new THREE.Vector3(),_u=new THREE.Vector3(),_w=new THREE.Vector3();
function cone(dir,ang,out){
  if(ang<=0)return out.copy(dir);
  const up=Math.abs(dir.y)<0.95?_u.set(0,1,0):_u.set(1,0,0);
  const a=_w.crossVectors(dir,up).normalize(),b=new THREE.Vector3().crossVectors(dir,a);
  const r=Math.sqrt(Math.random())*Math.tan(ang),th=Math.random()*Math.PI*2;
  return out.copy(dir).addScaledVector(a,Math.cos(th)*r).addScaledVector(b,Math.sin(th)*r).normalize();
}
function lookDir(yaw,pitch,out){return out.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));}
function shoot(e,inp,w,def){
  w.mag--;e.fireCd=60/def.rpm;
  const ws=wStats(w),lo=leanOff(e);
  _o.set(e.pos.x+Math.cos(e.yaw)*lo,eyeY(e),e.pos.z-Math.sin(e.yaw)*lo);
  const dir=inp.aimFn?inp.aimFn():lookDir(e.yaw,e.pitch,new THREE.Vector3());
  const moving=e.speedNow>1.2;
  let sp=(inp.ads?def.aim*ws.ads:inp.aim?(def.aim+def.spread)/2:def.spread*ws.hip)+e.bloom+(moving?def.spread*0.5*ws.move:0)+(!e.onGround&&e.mode==='ground'?4:0)+(e.mode==='veh'?1.5:0);
  if(e.crouch)sp*=0.75;if((w.k==='sniper'||w.k==='dmr')&&!inp.ads)sp+=2;
  const muzzle=new THREE.Vector3(e.pos.x+Math.cos(e.yaw)*0.12-Math.sin(e.yaw)*0.85,eyeY(e)-0.2,e.pos.z-Math.sin(e.yaw)*0.12-Math.cos(e.yaw)*0.85);
  const ends=[];
  e.st.shots++;let hitAny=false;
  for(let p=0;p<(def.pellets||1);p++){
    cone(dir,sp*DEG,_d);
    const h=raycast(_o,_d,def.range*2.4,e);
    const pt=h.point.clone();ends.push([r2(pt.x),r2(pt.y),r2(pt.z)]);
    const fall=h.t<def.range?1:Math.max(0.45,1-(h.t-def.range)/(def.range*2));
    if(h.ent){hitAny=true;if(h.head)e.st.heads++;dealDamage(h.ent,def.dmg*fall*(h.head?(k=>k==='sniper'?2.5:2.1)(w.k):1),h.head,e.id,w.k,e.pos);fx.puff(pt,0x9e1b16);sfx.impact('flesh',pt,h.head);}
    else if(h.veh){hitAny=true;dealVehDamage(h.veh,def.dmg*fall*0.8,e.id);fx.puff(pt,0xdddddd);sfx.impact('metal',pt);if(e===me)hitmarker(false);}
    else if(h.t<def.range*2.4){fx.puff(pt,0xb3a58a);sfx.impact(pt.y<0.05?'water':Math.abs(pt.y-hAt(pt.x,pt.z))<0.3?'dirt':'concrete',pt);}
  }
  if(hitAny)e.st.hits++;
  e.bloom=Math.min(e.bloom+def.recoil*0.45*(ws.vrec+ws.hrec)/2,6);
  if(e===me){look.pitch=clamp(look.pitch+def.recoil*0.009*ws.vrec*(inp.ads?0.6:1)/Math.sqrt(curZoom(e)),-1.45,1.45);look.yaw+=(Math.random()-0.5)*def.recoil*0.007*ws.hrec;G.fpKick=Math.min(0.12,G.fpKick+0.03+def.recoil*0.012);}
  fx.shot(muzzle,ends,ws.noflash);sfx.gun(w.k,camera.position.distanceTo(e.pos),ws.quiet);
  if(NET.on)NET.send.shot({id:e.id,o:[r2(muzzle.x),r2(muzzle.y),r2(muzzle.z)],e:ends,w:w.k,q:ws.quiet?1:0,nf:ws.noflash?1:0});
}
function melee(e){
  e.fireCd=0.55;_o.set(e.pos.x,eyeY(e)-0.25,e.pos.z);lookDir(e.yaw,e.pitch*0.5,_d);
  const h=raycast(_o,_d,1.7,e);if(h.ent){dealDamage(h.ent,16,false,e.id,'fists',e.pos);e.st.hits++;}e.st.shots++;
  if(e===me)sfx.tone(180,0.06,0.25,'square');
}
const sameTeam=(a,b)=>!!(a&&b&&a!==b&&G.teamSize>1&&a.team===b.team);
function dealDamage(t,amt,head,byId,wk,fromPos){
  if(!t||t.dead)return;
  if(sameTeam(ents.get(byId),t))return;
  if(isLocalCtl(t))applyDamage(t,amt,head,byId,wk,fromPos);
  else if(NET.on)NET.send.dmg({t:t.id,a:r2(amt),h:head?1:0,by:byId,w:wk,p:fromPos?[r2(fromPos.x),r2(fromPos.z)]:null},ownerOf(t));
  if(byId===(me&&me.id)&&t!==me)hitmarker(head,false);
}
const NOARMOR={zone:1,crash:1,explosion:1,roadkill:1,bleed:1};
function applyDamage(t,amt,head,byId,wk,fromPos){
  if(t.dead)return;
  if(sameTeam(ents.get(byId),t))return;
  let red=0;
  if(!NOARMOR[wk]){
    if(head&&t.helm){red=ARMOR[t.helm];t.hd-=amt;if(t.hd<=0){t.helm=0;t.hd=0;if(t===me)centerMsg('Helmet destroyed');}}
    else if(!head&&t.vest){red=ARMOR[t.vest];t.vd-=amt*0.7;if(t.vd<=0){t.vest=0;t.vd=0;if(t===me)centerMsg('Vest destroyed');}}
  }
  const dmg=Math.min(t.hp,amt*(1-red));
  t.hp-=dmg;t.st.dmgTaken+=dmg;
  if(byId&&byId!=='zone'&&byId!==t.id&&ents.has(byId)){t.st.dmgBy[byId]=(t.st.dmgBy[byId]||0)+dmg;t.lastHitBy=byId;t.lastHitT=G.t;}
  if(t.healT>0&&wk!=='zone'){t.healT=0;}
  if(t===me&&wk!=='zone'){
    let src=fromPos;if(!src){const a=ents.get(byId);if(a)src=a.pos;}
    if(src)dmgIndicator(src);flashHurt();
  }
  if(t.ai&&byId&&ents.has(byId)){t.ai.aggro=byId;t.ai.aggroT=G.t;}
  if(t.hp<=0.01){
    t.hp=0;
    let killer=(wk==='zone'||wk==='crash')&&t.lastHitBy&&G.t-t.lastHitT<10?t.lastHitBy:byId;
    if(!t.knocked&&G.teamSize>1&&teamStanding(t))knockEnt(t,killer,wk);
    else{if(t.knocked&&(!killer||!ents.has(killer)))killer=t.knockBy;killEnt(t,killer,wk);}
  }
}
function teamStanding(t){for(const e of ents.values())if(e!==t&&e.team===t.team&&!e.dead&&!e.knocked&&!e.left)return true;return false;}
function teamsAlive(){const s=new Set();for(const e of ents.values())if(!e.dead&&!e.left)s.add(e.team);return s.size;}
function markTeamPlace(team){if([...ents.values()].some(e=>e.team===team&&!e.dead&&!e.left))return;const p=teamsAlive()+1;for(const e of ents.values())if(e.team===team&&!e.place)e.place=p;}
function knockEnt(t,by,wk){const pkg={id:t.id,by:by||'zone',w:wk};onKnock(pkg);if(NET.on)NET.send.knock(pkg);}
function onKnock(pkg){
  const t=ents.get(pkg.id);if(!t||t.dead||t.knocked)return;
  t.knocked=true;t.knockBy=pkg.by;t.knockN++;t.hp=100;t.healT=0;t.reloadT=0;t.reviveT=0;t.reviveId=null;t.ads=false;t.crouch=false;
  if(t===me){G.ads=false;G.crouch=false;centerMsg('Knocked down · crawl to cover, a squadmate can revive you');}
  if(t.veh&&isLocalCtl(t))requestSeat(t,t.veh,-1);
  const k=ents.get(pkg.by);if(k&&k!==t)k.st.knocks++;
  feed(k&&k!==t?k.name:'Storm',t.name,'knocked down',k===me||t===me||(me&&t.team===me.team&&G.teamSize>1));
  if(k===me&&t!==me){centerMsg(`Knocked down ${t.name}`,true);sfx.kill();}
  checkTeamWipes();
}
function checkTeamWipes(){for(const e of [...ents.values()])if(e.knocked&&!e.dead&&isLocalCtl(e)&&!teamStanding(e))killEnt(e,e.knockBy,'bleed');}
function knockedMateNear(e,r){for(const o of ents.values())if(o!==e&&o.team===e.team&&G.teamSize>1&&o.knocked&&!o.dead&&o.pos.distanceToSquared(e.pos)<r*r)return o;return null;}
function tryRevive(e,inp,dt){
  if(!inp.revive||e.knocked||e.mode!=='ground'){e.reviveT=0;e.reviveId=null;return false;}
  const tgt=knockedMateNear(e,2.2);
  if(!tgt){e.reviveT=0;e.reviveId=null;return false;}
  if(e.reviveId!==tgt.id){e.reviveId=tgt.id;e.reviveT=0;}
  e.reviveT+=dt;
  if(e.reviveT>=REVIVE_T){e.reviveT=0;e.reviveId=null;e.st.revives++;
    if(isLocalCtl(tgt))unknock(tgt,e.id);else if(NET.on)NET.send.rev({t:tgt.id,by:e.id},ownerOf(tgt));}
  return true;
}
function unknock(t,by){const pkg={id:t.id,by};onUnknock(pkg);if(NET.on)NET.send.unk(pkg);}
function onUnknock(pkg){
  const t=ents.get(pkg.id);if(!t||t.dead||!t.knocked)return;
  t.knocked=false;if(isLocalCtl(t))t.hp=20;
  const r=ents.get(pkg.by);feed(r?r.name:'?',t.name,'revived',!!(me&&t.team===me.team));
  if(t===me)centerMsg('Revived · heal up');
}
function killEnt(t,by,wk){
  const pkg={id:t.id,by:by||'zone',w:wk,p:[r2(t.pos.x),r2(t.pos.y),r2(t.pos.z)],inv:invPack(t),st:packStats(t)};
  onDeath(pkg);if(NET.on)NET.send.die(pkg);
}
function onDeath(pkg){
  const t=ents.get(pkg.id);if(!t||t.dead)return;
  if(t.veh){const v=t.veh;const i=v.seats.indexOf(t.id);if(i>=0)v.seats[i]=null;t.veh=null;if(isAuthority()&&NET.on)NET.send.vocc({v:v.id,s:v.seats});}
  t.dead=true;t.knocked=false;t.mode='dead';t.hp=0;t.deathT=G.t;t.pos.set(pkg.p[0],pkg.p[1],pkg.p[2]);
  if(pkg.st)unpackStats(t,pkg.st);
  markTeamPlace(t.team);
  const k=ents.get(pkg.by);
  if(k&&k!==t){k.kills++;const dist=Math.hypot(k.pos.x-t.pos.x,k.pos.z-t.pos.z);if(dist>k.st.longest)k.st.longest=dist;}
  const how={zone:'storm',crash:'crash',explosion:'explosion',roadkill:'vehicle',fists:'fists',bleed:'bled out'}[pkg.w]||(WEAPONS[pkg.w]?WEAPONS[pkg.w].name:pkg.w);
  feed(k&&k!==t?k.name:(pkg.by==='zone'?'Storm':pkg.by==='crash'?'Crash':t.name),t.name,how,k===me||t===me||(me&&G.teamSize>1&&t.team===me.team));
  if(k===me&&t!==me){centerMsg(`Eliminated ${t.name}`,true);sfx.kill();}
  if(isAuthority())spawnDrops(packToSpecs(pkg.inv),pkg.p);
  if(t===me)onMyDeath(k&&k!==me?k:null);
  if(G.spec===t)G.spec=pickSpectate(t);
  checkTeamWipes();
  checkEnd();
}
function packStats(e){const s=e.st;return{s:s.shots,h:s.hits,hd:s.heads,d:Math.round(s.dist),hl:s.heals,rv:s.revives,db:Object.fromEntries(Object.entries(s.dmgBy).map(([k,v])=>[k,Math.round(v)])),dt:Math.round(s.dmgTaken)};}
function unpackStats(e,p){const s=e.st;s.shots=p.s;s.hits=p.h;s.heads=p.hd;s.dist=p.d;s.heals=p.hl;s.revives=p.rv||0;s.dmgBy=p.db||{};s.dmgTaken=p.dt||0;}
function startHeal(e,kind){
  if(kind==='b'&&(e.inv.band<=0||e.hp>=75))return;
  if(kind==='m'&&(e.inv.med<=0||e.hp>=100))return;
  e.healT=kind==='b'?3.2:6;e.healDur=e.healT;e.healKind=kind;e.reloadT=0;
  if(e===me)sfx.tone(520,0.08,0.15,'sine');
}
function finishHeal(e){
  if(e.healKind==='b'&&e.inv.band>0){e.inv.band--;e.hp=Math.min(75,e.hp+15);}
  else if(e.healKind==='m'&&e.inv.med>0){e.inv.med--;e.hp=100;}
  e.st.heals++;e.healKind=null;if(e===me)sfx.tone(760,0.1,0.15,'sine');
}
function startReload(e,w){e.reloadDur=e.reloadT=WEAPONS[w.k].reload*wStats(w).reload;if(e===me)sfx.reload();}
function finishReload(e){
  const w=curW(e);if(!w)return;const def=WEAPONS[w.k];
  const need=magCap(w)-w.mag,take=Math.min(need,e.inv.ammo[def.ammo]);w.mag+=take;e.inv.ammo[def.ammo]-=take;
}


// network: remote shot visuals (owned by combat)
function onShot(d){d=d||{};
  if(d.id!==(me&&me.id)&&d.o&&d.e&&d.e[0]){const o=new THREE.Vector3(d.o[0],d.o[1],d.o[2]),en=new THREE.Vector3(d.e[0][0],d.e[0][1],d.e[0][2]);const ab=en.clone().sub(o),L=ab.length();if(L>3){ab.multiplyScalar(1/L);const t=clamp(camera.position.clone().sub(o).dot(ab),0,L);const c=o.clone().addScaledVector(ab,t);if(c.distanceTo(camera.position)<3.5&&t>4)sfx.whiz(c);}}
  const e=ents.get(d.id);if(e&&!isLocalCtl(e)){e.yaw=e.tYaw;}
  const m=new THREE.Vector3(d.o[0],d.o[1],d.o[2]);fx.shot(m,d.e,!!d.nf);sfx.gun(d.w,camera.position.distanceTo(m),!!d.q);
  for(const p of d.e)fx.puff(new THREE.Vector3(p[0],p[1],p[2]),0xb3a58a);
}
