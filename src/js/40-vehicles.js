// ================= vehicles =================
function makeVeh(sp){
  const def=VDEF[sp.kind];
  const v={id:sp.id,kind:sp.kind,def,pos:new THREE.Vector3(sp.x,0,sp.z),yaw:sp.yaw,pitch:0,roll:0,spd:0,vy:0,steer:0,hp:def.hp,seats:new Array(def.seats).fill(null),
    destroyed:false,lastBy:null,tPos:new THREE.Vector3(),tYaw:sp.yaw,tPitch:0,tRoll:0,tSpd:0,air:false,burnT:0,hitCd:0,wheelRot:0,lastSent:0};
  v.pos.y=hAt(sp.x,sp.z);v.tPos.copy(v.pos);
  v.mesh=buildVehicle(sp.kind,sp.col);dynGroup.add(v.mesh);
  return v;
}
const driverOf=v=>v.seats[0]?ents.get(v.seats[0]):null;
function seatWorld(v,i,out){
  const s=v.def.seat[i],cs=Math.cos(v.yaw),sn=Math.sin(v.yaw);
  out.set(v.pos.x+s[0]*cs+s[2]*sn,v.pos.y+s[1]-0.88,v.pos.z-s[0]*sn+s[2]*cs);return out;
}
function nearestVeh(e,maxD){
  let best=null,bd=maxD*maxD;
  for(const v of vehs.values()){if(v.destroyed)continue;const dx=v.pos.x-e.pos.x,dz=v.pos.z-e.pos.z,d2=dx*dx+dz*dz;if(d2<bd&&Math.abs(v.pos.y-e.pos.y)<2.5){bd=d2;best=v;}}
  return best;
}
function requestSeat(e,v,seat){
  if(isAuthority())grantSeat(e.id,v.id,seat);
  else NET.send.vseat({e:e.id,v:v.id,s:seat},NET.hostId);
}
function grantSeat(eid,vid,seat){ // seat: -1 exit, -2 any (driver first)
  const v=vehs.get(vid),e=ents.get(eid);if(!v||!e)return;
  if(seat===-1){const i=v.seats.indexOf(eid);if(i<0)return;v.seats[i]=null;}
  else{
    if(v.destroyed||e.dead||e.mode!=='ground')return;
    if(v.seats.includes(eid))return;
    let s=seat>=0?seat:v.seats.indexOf(null);if(s<0||v.seats[s])return;
    v.seats[s]=eid;
  }
  if(NET.on)NET.send.vocc({v:vid,s:v.seats});
  applyOcc(v,v.seats.slice());
}
function applyOcc(v,seats){
  const before=v.seats.slice?v.seats.slice():[];
  v.seats=seats.slice();
  for(let i=0;i<seats.length;i++){const e=ents.get(seats[i]);if(!e||e.dead)continue;
    if(e.mode!=='veh'||e.veh!==v){if(e.veh&&e.veh!==v){const j=e.veh.seats.indexOf(e.id);if(j>=0)e.veh.seats[j]=null;}e.mode='veh';e.veh=v;e.seat=i;e.reloadT=0;e.healT=0;if(e===me){sfx.door();}}
    else e.seat=i;}
  for(const e of ents.values()){if(e.veh===v&&!seats.includes(e.id))exitVeh(e,v);}
  if(!seats[0]){v.spd=0;}
}
function exitVeh(e,v){
  const idx=e.seat>=0?e.seat:0,ex=v.def.exit[Math.min(idx,v.def.exit.length-1)],cs=Math.cos(v.yaw),sn=Math.sin(v.yaw);
  const p=new THREE.Vector3(v.pos.x+ex[0]*cs+ex[1]*sn,v.pos.y+1,v.pos.z-ex[0]*sn+ex[1]*cs);
  collideXZ(p,p.y,p.y+1.8,v);
  e.veh=null;e.seat=-1;e.mode=e.dead?'dead':'ground';
  if(isLocalCtl(e)){e.pos.copy(p);e.pos.y=groundAt(p.x,p.z,p.y+0.5);e.vel.set(0,0,0);}
  if(e===me)sfx.door();
}
function dealVehDamage(v,amt,by){
  if(v.destroyed||amt<=0)return;
  if(isAuthority())applyVehDamage(v,amt,by);else NET.send.vdmg({v:v.id,a:r2(amt),by},NET.hostId);
}
function applyVehDamage(v,amt,by){
  if(v.destroyed)return;
  v.hp-=amt;v.lastBy=by||v.lastBy;
  if(v.hp<=0){v.hp=0;const msg={v:v.id,by:v.lastBy};onVehBoom(msg);if(NET.on)NET.send.vboom(msg);}
  else if(NET.on)NET.send.vhp({v:v.id,hp:Math.round(v.hp)});
}
function onVehBoom(d){
  const v=vehs.get(d.v);if(!v||v.destroyed)return;
  v.destroyed=true;v.hp=0;v.spd=0;
  v.mesh.traverse(o=>{if(o.isMesh)o.material=mc(0x2a2624);});
  fx.explosion(v.pos);sfx.boom(camera.position.distanceTo(v.pos));
  for(const e of ents.values()){
    if(e.dead||!isLocalCtl(e))continue;
    if(e.veh===v){applyDamage(e,250,false,d.by||'veh','explosion');}
    else{const dd=e.pos.distanceTo(v.pos);if(dd<7)applyDamage(e,(1-dd/7)*90,false,d.by||'veh','explosion');}
  }
  for(const e of ents.values())if(e.veh===v)exitVeh(e,v);
  v.seats.fill(null);
}
const _tv=new THREE.Vector3();
function stepVehicle(v,drv,inp,dt){
  const d=v.def;
  const fx=-Math.sin(v.yaw),fz=-Math.cos(v.yaw),rx=Math.cos(v.yaw),rz=-Math.sin(v.yaw);
  const hl=d.len*0.45,hw=d.wid*0.45;
  const hF=hAt(v.pos.x+fx*hl,v.pos.z+fz*hl),hB=hAt(v.pos.x-fx*hl,v.pos.z-fz*hl),hL=hAt(v.pos.x-rx*hw,v.pos.z-rz*hw),hR=hAt(v.pos.x+rx*hw,v.pos.z+rz*hw);
  let g=Math.max((hF+hB)/2,-1.6);
  for(const b of nearBoxes(v.pos.x,v.pos.z,0.8))if(b.y1<=v.pos.y+0.6&&b.y1>g)g=b.y1;
  const onG=v.pos.y<=g+0.08;
  const thr=inp.throttle||0,st=inp.steer||0,boost=inp.boost;
  if(onG){
    const top=d.max*(boost?1.1:1);
    if(thr>0)v.spd+=(v.spd<0?d.brake:d.acc*(boost?1.3:1)*(1-0.55*Math.max(0,v.spd)/top))*dt;
    else if(thr<0)v.spd-=(v.spd>0?d.brake:d.acc*0.7)*dt;
    else v.spd-=Math.sign(v.spd)*Math.min(Math.abs(v.spd),2.5*dt);
    if(inp.brake)v.spd-=Math.sign(v.spd)*Math.min(Math.abs(v.spd),15*dt);
    v.spd-=((hF-hB)/(d.len*0.9))*9.8*dt*0.9;
    v.spd=clamp(v.spd,-d.rev,top);
    if(g<-0.6){v.spd*=1-2.2*dt;if(g<-1.0)dealVehDamage(v,40*dt,v.lastBy);}
  }
  v.steer=lerp(v.steer,st,1-Math.exp(-8*dt));
  const turnK=clamp(v.spd/7,-1,1)*(1-0.35*clamp(Math.abs(v.spd)/d.max,0,1));
  if(onG)v.yaw+=v.steer*d.turn*dt*turnK*(inp.brake?1.4:1);
  const nx=v.pos.x+(-Math.sin(v.yaw))*v.spd*dt,nz=v.pos.z+(-Math.cos(v.yaw))*v.spd*dt;
  const ox=v.pos.x,oz=v.pos.z;v.pos.x=nx;v.pos.z=nz;
  // collisions: boxes, vehicles, pedestrians
  let impact=0;
  v.hitCd-=dt;
  for(let ci=0;ci<d.circ.length;ci++){
    vCirc(v,ci,_c);
    for(const b of nearBoxes(_c.x,_c.z,_c.r)){
      if(b.y1<=v.pos.y+0.65||b.y0>=v.pos.y+d.h+0.6)continue;
      const cx=clamp(_c.x,b.x0,b.x1),cz=clamp(_c.z,b.z0,b.z1);let dx=_c.x-cx,dz=_c.z-cz;const d2=dx*dx+dz*dz;
      if(d2>=_c.r*_c.r)continue;
      let dist=Math.sqrt(d2);if(dist<1e-4){dx=-(-Math.sin(v.yaw));dz=-(-Math.cos(v.yaw));dist=1e-4;const l=Math.hypot(dx,dz);dx/=l;dz/=l;}else{dx/=dist;dz/=dist;}
      const pen=_c.r-dist;v.pos.x+=dx*pen;v.pos.z+=dz*pen;
      const vn=-((-Math.sin(v.yaw))*dx+(-Math.cos(v.yaw))*dz)*v.spd;
      if(vn>0)impact=Math.max(impact,vn);
    }
    for(const o of vehs.values()){
      if(o===v||Math.abs(o.pos.x-v.pos.x)>6||Math.abs(o.pos.z-v.pos.z)>6||Math.abs(o.pos.y-v.pos.y)>2)continue;
      for(let cj=0;cj<o.def.circ.length;cj++){
        const oc=vCirc(o,cj,{x:0,z:0,r:0});vCirc(v,ci,_c);
        let dx=_c.x-oc.x,dz=_c.z-oc.z;const rr=_c.r+oc.r,d2=dx*dx+dz*dz;
        if(d2>=rr*rr||d2<1e-6)continue;const dist=Math.sqrt(d2);dx/=dist;dz/=dist;
        v.pos.x+=dx*(rr-dist);v.pos.z+=dz*(rr-dist);
        const vn=-((-Math.sin(v.yaw))*dx+(-Math.cos(v.yaw))*dz)*v.spd;
        if(vn>0){impact=Math.max(impact,vn);if(v.hitCd<=0&&vn>5)dealVehDamage(o,(vn-5)*22*d.mass,drv.id);}
      }
    }
  }
  if(impact>2.5){
    if(v.hitCd<=0&&impact>6){
      dealVehDamage(v,(impact-6)*26/d.mass,v.lastBy||drv.id);
      const hurt=(impact-9)*(v.kind==='bike'?3.2:1.4);
      if(hurt>0)for(const id of v.seats){const e=ents.get(id);if(e&&isLocalCtl(e))applyDamage(e,hurt,false,v.lastBy&&v.lastBy!==id?v.lastBy:'crash','crash');}
      v.hitCd=0.6;if(drv===me||v.seats.includes(me&&me.id))sfx.crash(impact);
    }
    v.spd*=impact>Math.abs(v.spd)*0.6?-0.25:0.8;
  }
  // run over
  const sp=Math.abs(v.spd);
  if(sp>3.5)for(const e of ents.values()){
    if(e.dead||e.mode!=='ground'||e.veh)continue;
    if(Math.abs(e.pos.x-v.pos.x)>4||Math.abs(e.pos.z-v.pos.z)>4||Math.abs(e.pos.y-v.pos.y)>1.6)continue;
    for(let ci=0;ci<d.circ.length;ci++){vCirc(v,ci,_c);const dx=e.pos.x-_c.x,dz=e.pos.z-_c.z;
      if(dx*dx+dz*dz<(_c.r+0.45)*(_c.r+0.45)){const cd=v.runOverCd||(v.runOverCd={});if((cd[e.id]||0)<G.t){cd[e.id]=G.t+0.7;dealDamage(e,sp*(v.kind==='car'?5:3.4),false,drv.id,'roadkill',v.pos);v.spd*=0.8;}break;}}
  }
  v.pos.x=clamp(v.pos.x,-BORDER,BORDER);v.pos.z=clamp(v.pos.z,-BORDER,BORDER);
  // vertical
  const g2=Math.max(hAt(v.pos.x,v.pos.z),-1.6);
  let gg=g2;for(const b of nearBoxes(v.pos.x,v.pos.z,0.8))if(b.y1<=v.pos.y+0.6&&b.y1>gg)gg=b.y1;
  if(!v.air){
    const vy=(gg-v.pos.y)/Math.max(dt,1e-3);
    if(gg<v.pos.y-0.35&&v.vy>-1){v.air=true;}else{v.vy=clamp(vy,-12,12);v.pos.y=gg;}
  }
  if(v.air){v.vy-=GRAV*dt;v.pos.y+=v.vy*dt;if(v.pos.y<=gg){if(v.vy<-11){dealVehDamage(v,(-v.vy-11)*15/d.mass,v.lastBy||drv.id);}v.pos.y=gg;v.vy=0;v.air=false;}}
  const tp=Math.atan2(hF-hB,d.len*0.9),tr=Math.atan2(hL-hR,d.wid*0.9);
  if(!v.air){v.pitch=lerp(v.pitch,tp,1-Math.exp(-10*dt));v.roll=lerp(v.roll,v.kind==='bike'?-v.steer*clamp(sp/20,0,1)*0.45:tr,1-Math.exp(-8*dt));}
}


// network: vehicle state (owned by vehicles)
function onVst(d){const v=vehs.get(d[0]);if(!v)return;const drv=driverOf(v);if(drv&&isLocalCtl(drv))return;
  v.tPos.set(d[1],d[2],d[3]);v.tYaw=d[4];v.tPitch=d[5];v.tRoll=d[6];v.tSpd=d[7];v.steer=d[8];if(!v.netSeen){v.pos.copy(v.tPos);v.yaw=v.tYaw;v.netSeen=true;}v.netT=G.t;}
function vehNetSend(){
for(const v of vehs.values()){const drv=driverOf(v);if(drv&&isLocalCtl(drv)&&!v.destroyed)NET.send.vst([v.id,r2(v.pos.x),r2(v.pos.y),r2(v.pos.z),r2(v.yaw),r2(v.pitch),r2(v.roll),r2(v.spd),r2(v.steer)]);}
}
