// ================= entity simulation =================
function blankInput(){return{wx:0,wz:0,yaw:0,pitch:0,sprint:false,crouch:false,jump:false,fire:false,firePressed:false,aim:false,ads:false,revive:false,lean:0,fireMode:false,reload:false,slot:-1,heal:null,deploy:false,throttle:0,steer:0,brake:false,boost:false,aimFn:null};}
const _tp=new THREE.Vector3();
function stepEnt(e,inp,dt){
  if(e.dead)return;
  e.yaw=inp.yaw;e.pitch=inp.pitch;e.aiming=inp.aim;e.ads=!!inp.ads;
  if(e.mode==='plane'){
    planePos(G.t,e.pos);
    if((inp.deploy&&G.t>W.plane.tIn)||G.t>=W.plane.tOut){e.mode='fall';e.vel.set(W.plane.dx*25,0,W.plane.dz*25);e.pos.y-=6;e.fallT=0;if(e===me)sfx.tone(240,0.25,0.2,'sawtooth');}
    return;
  }
  if(e.mode==='fall'||e.mode==='chute'){
    const chute=e.mode==='chute',hs=chute?11:30;
    e.vel.x=lerp(e.vel.x,inp.wx*hs,1-Math.exp(-1.6*dt));e.vel.z=lerp(e.vel.z,inp.wz*hs,1-Math.exp(-1.6*dt));
    const vy=chute?-5.4:(inp.wx||inp.wz?-46:-38);e.vel.y=lerp(e.vel.y,vy,1-Math.exp(-2.5*dt));
    e.pos.addScaledVector(e.vel,dt);e.pos.x=clamp(e.pos.x,-BORDER,BORDER);e.pos.z=clamp(e.pos.z,-BORDER,BORDER);
    e.fallT+=dt;
    const g=groundAt(e.pos.x,e.pos.z,e.pos.y);
    if(!chute&&(e.pos.y-g<90||(inp.deploy&&e.fallT>1.2)))e.mode='chute';
    if(e.pos.y<=g){e.pos.y=g;e.mode='ground';e.vel.set(0,0,0);e.onGround=true;e.lastPos=e.pos.clone();}
    e.speedNow=Math.hypot(e.vel.x,e.vel.z);
    return;
  }
  if(e.mode==='veh'){
    const v=e.veh;if(!v||v.destroyed){e.mode='ground';e.veh=null;return;}
    if(e.seat===0&&!v.destroyed){stepVehicle(v,e,inp,dt);}
    seatWorld(v,e.seat,e.pos);e.speedNow=Math.abs(v.spd);e.onGround=true;e.crouch=false;
    if(e.lastPos){const dd=e.lastPos.distanceTo(e.pos);if(dd<20)e.st.dist+=dd;e.lastPos.copy(e.pos);}else e.lastPos=e.pos.clone();
    if(e.seat!==0)weaponActions(e,inp,dt);
    else{e.fireCd-=dt;if(e.healT>0){e.healT-=dt;if(e.healT<=0)finishHeal(e);}else if(inp.heal)startHeal(e,inp.heal);}
    return;
  }
  // ground
  if(e.knocked){inp.sprint=false;inp.jump=false;inp.aim=false;inp.ads=false;inp.crouch=false;e.ads=false;e.aiming=false;}
  const reviving=!e.knocked&&tryRevive(e,inp,dt);
  e.lean=lerp(e.lean||0,e.knocked||inp.sprint&&inp.wx*inp.wx+inp.wz*inp.wz>0.1?0:(inp.lean||0),Math.min(1,dt*10));
  if(reviving){inp.wx=0;inp.wz=0;inp.jump=false;}
  e.crouch=inp.crouch;
  let spd=e.knocked?1.0:4.7;
  const fwd=-Math.sin(e.yaw)*inp.wx-Math.cos(e.yaw)*inp.wz;
  if(inp.sprint&&!inp.aim&&e.healT<=0&&fwd>0.5&&!e.crouch)spd=6.6;
  if(e.crouch)spd=2.5;if(inp.aim)spd=Math.min(spd,3.2);if(e.healT>0)spd=Math.min(spd,1.8);
  if(e.pos.y<-0.3)spd=Math.min(spd,2.6);
  const ml=Math.hypot(inp.wx,inp.wz),k=ml>1?1/ml:1;
  const acc=e.onGround?14:2.5;
  e.vel.x+=(inp.wx*k*spd-e.vel.x)*Math.min(1,acc*dt);e.vel.z+=(inp.wz*k*spd-e.vel.z)*Math.min(1,acc*dt);
  if(inp.jump&&e.onGround&&!e.crouch&&e.healT<=0){e.vel.y=7.2;e.onGround=false;sfx.jump(e.pos,e===me);}
  e.vel.y-=GRAV*dt;
  const prevY=e.pos.y;
  _tp.set(e.pos.x+e.vel.x*dt,prevY,e.pos.z+e.vel.z*dt);
  collideXZ(_tp,prevY,prevY+(e.crouch?1.2:1.8),null);
  e.pos.x=clamp(_tp.x,-BORDER,BORDER);e.pos.z=clamp(_tp.z,-BORDER,BORDER);
  e.pos.y+=e.vel.y*dt;
  const g=groundAt(e.pos.x,e.pos.z,prevY);
  if(e.pos.y<=g||(e.onGround&&e.vel.y<=0&&e.pos.y-g<0.45)){if(!e.onGround&&e.vel.y<-14&&isLocalCtl(e))applyDamage(e,(-e.vel.y-14)*6,false,'zone','zone');if(!e.onGround&&e.vel.y<-4)sfx.land(e.pos,e.vel.y<-10,e===me);e.pos.y=g;e.vel.y=0;e.onGround=true;}
  else e.onGround=false;
  e.speedNow=Math.hypot(e.vel.x,e.vel.z);
  if(e.lastPos){const dd=Math.hypot(e.pos.x-e.lastPos.x,e.pos.z-e.lastPos.z);if(dd<20)e.st.dist+=dd;e.lastPos.copy(e.pos);}else e.lastPos=e.pos.clone();
  if(!e.knocked&&!reviving)weaponActions(e,inp,dt);else e.fireCd-=dt;
}
function weaponActions(e,inp,dt){
  let w=curW(e);
  if(inp.slot>=0&&inp.slot!==e.inv.cur&&e.inv.w[inp.slot]){e.inv.cur=inp.slot;e.reloadT=0;e.healT=0;e.fireCd=Math.max(e.fireCd,0.45);w=curW(e);if(e===me)sfx.swap();}
  if(inp.slot===-3){e.inv.cur=-1;w=null;}
  if(inp.fireMode&&w&&WEAPONS[w.k].auto){w.single=!w.single;if(e===me){centerMsg(w.single?'Single fire':'Full auto');sfx.tone(700,0.04,0.12,'square');}}
  e.fireCd-=dt;e.bloom=Math.max(0,e.bloom-dt*4.5);
  if(e.reloadT>0){e.reloadT-=dt;if(e.reloadT<=0)finishReload(e);}
  else if(inp.reload&&w&&w.mag<magCap(w)&&e.inv.ammo[WEAPONS[w.k].ammo]>0&&e.healT<=0)startReload(e,w);
  if(e.healT>0){if(inp.fire||inp.jump){e.healT=0;e.healKind=null;}else{e.healT-=dt;if(e.healT<=0)finishHeal(e);}}
  else if(inp.heal)startHeal(e,inp.heal);
  if(inp.fire&&e.fireCd<=0&&e.healT<=0&&e.reloadT<=0){
    if(!w){if(inp.firePressed&&e.mode==='ground')melee(e);}
    else{const def=WEAPONS[w.k];
      if((def.auto&&!w.single)||inp.firePressed){
        if(w.mag>0)shoot(e,inp,w,def);
        else if(e.inv.ammo[def.ammo]>0)startReload(e,w);
        else if(inp.firePressed&&e===me){sfx.emptyClick();e.fireCd=0.25;}
      }}
  }
}
function zoneState(t=G.t){
  const Z=W.zones;let px=Z.x0,pz=Z.z0,pr=Z.r0,T=0;
  for(let i=0;i<Z.ph.length;i++){
    const p=Z.ph[i];
    if(t<T+p.wait)return{x:px,z:pz,r:pr,nx:p.x,nz:p.z,nr:p.r,dps:i?Z.ph[i-1].dps:0.4,shrinking:false,left:T+p.wait-t,phase:i};
    if(t<T+p.wait+p.shrink){const k=(t-T-p.wait)/p.shrink;return{x:lerp(px,p.x,k),z:lerp(pz,p.z,k),r:lerp(pr,p.r,k),nx:p.x,nz:p.z,nr:p.r,dps:p.dps,shrinking:true,left:T+p.wait+p.shrink-t,phase:i};}
    T+=p.wait+p.shrink;px=p.x;pz=p.z;pr=p.r;
  }
  return{x:px,z:pz,r:pr,nx:px,nz:pz,nr:pr,dps:14,shrinking:false,left:0,phase:Z.ph.length};
}
const outZone=(e,z)=>Math.hypot(e.pos.x-z.x,e.pos.z-z.z)>z.r;

