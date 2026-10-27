// ================= bots =================
function pickDropPoint(R){
  if(R()<0.72&&W.towns.length){const t=W.towns[Math.floor(R()*W.towns.length)];return{x:t.x+(R()*2-1)*t.r*0.6,z:t.z+(R()*2-1)*t.r*0.6};}
  for(let i=0;i<30;i++){const x=(R()*2-1)*330,z=(R()*2-1)*330;if(hAt(x,z)>1.5)return{x,z};}
  return{x:0,z:0};
}
function teamDrop(e){
  if(G.teamSize<=1)return pickDropPoint(Math.random);
  if(!G.teamDrop[e.team])G.teamDrop[e.team]=pickDropPoint(Math.random);
  const d=G.teamDrop[e.team];return{x:d.x+e.slot*5,z:d.z+e.slot*3};
}
function initAI(e){
  e.ai={drop:teamDrop(e),scanT:Math.random()*0.3,target:null,visible:false,lastSeen:-99,react:0,seeT:0,errX:0,errY:0,strafe:1,strafeT:0,burstT:0,pauseT:0,
    goal:null,goalItem:null,wps:[],stuckT:0,chk:new THREE.Vector3(),detourT:0,detourDir:1,wanderT:0,aggro:null,aggroT:-99,lootT:0,zoneGoal:null};
}
function hasUsable(e){return e.inv.w.some(w=>w&&(w.mag>0||e.inv.ammo[WEAPONS[w.k].ammo]>0));}
function wantItem(e,it){
  switch(it.k){
    case'w':{if(e.inv.w.some(w=>w&&w.k===it.t))return 0;if(!e.inv.w[0]||!e.inv.w[1])return 3+WEAPONS[it.t].rank*0.2;return 0;}
    case'a':return e.inv.w.some(w=>w&&WEAPONS[w.k].ammo===it.t)&&e.inv.ammo[it.t]<150&&capRoom(e,AMMO_W[it.t])>=5?2:0;
    case'v':return it.lv>e.vest?2:0;case'h':return it.lv>e.helm?2:0;
    case'b':return e.inv.band<6&&capRoom(e,BAND_W)>0?1:0;case'm':return e.inv.med<2&&capRoom(e,MED_W)>0?1.2:0;
    case'p':return it.lv>e.bag?2.5:0;
    case'x':return attTarget(e,it.t)>=0?1.4:0;
  }return 0;
}
function canSee(e,t){
  _o.set(e.pos.x,eyeY(e),e.pos.z);
  _d.set(t.pos.x-_o.x,t.pos.y+1.15-_o.y,t.pos.z-_o.z);const dist=_d.length();_d.multiplyScalar(1/dist);
  const h=raycast(_o,_d,dist+1,e);return h.ent===t;
}
function scanTargets(e){
  const ai=e.ai,w=curW(e),range=w?Math.min(WEAPONS[w.k].range*1.5,260):40;
  const cands=[];
  for(const o of ents.values()){
    if(o===e||o.dead||o.mode==='plane'||o.left||(G.teamSize>1&&o.team===e.team))continue;
    const dx=o.pos.x-e.pos.x,dz=o.pos.z-e.pos.z,d2=dx*dx+dz*dz;
    if(d2<range*range)cands.push([d2+(o.knocked?2500:0),o]);
  }
  cands.sort((a,b)=>a[0]-b[0]);
  let found=null;
  for(let i=0;i<Math.min(4,cands.length);i++){
    const o=cands[i][1],dx=o.pos.x-e.pos.x,dz=o.pos.z-e.pos.z;
    const fov=Math.abs(angD(e.yaw,Math.atan2(-dx,-dz)));
    if(fov>1.9&&cands[i][0]>144)continue;
    if(canSee(e,o)){found=o;break;}
  }
  if(found){if(ai.target!==found){ai.react=G.t+DIFF[G.diff].react*(0.7+Math.random()*0.7);ai.seeT=0;}ai.target=found;ai.visible=true;ai.lastSeen=G.t;}
  else{ai.visible=false;
    const ag=ai.aggro&&ents.get(ai.aggro);
    if(ag&&!ag.dead&&G.t-ai.aggroT<6){if(ai.target!==ag){ai.react=G.t+DIFF[G.diff].react;ai.seeT=0;}ai.target=ag;}
    else if(ai.target&&G.t-ai.lastSeen>5)ai.target=null;}
}
function route(e,gx,gz,gy,gbld){
  const ai=e.ai;ai.wps=[];
  const inB=bldAt(e.pos);
  const near=(b,x,z)=>{let best=b.doors[0],bd=1e9;for(const d of b.doors){const dd=(d.x-x)*(d.x-x)+(d.z-z)*(d.z-z);if(dd<bd){bd=dd;best=d;}}return best;};
  if(inB>=0&&inB!==gbld){const d=near(W.blds[inB],gx,gz);ai.wps.push(d.inn,d.out);}
  if(gbld>=0&&gbld!==inB){const d=near(W.blds[gbld],e.pos.x,e.pos.z);ai.wps.push(d.out,d.inn);}
  ai.wps.push({x:gx,z:gz});ai.goal={x:gx,z:gz};ai.stuckT=0;ai.chk.copy(e.pos);
}
function teamLeader(e){
  if(G.teamSize<=1)return null;
  let best=null;
  for(const o of ents.values()){if(o.team!==e.team||o.dead||o.left||o.knocked)continue;if(!o.isBot)return o===e?null:o;if(!best||o.slot<best.slot)best=o;}
  return best===e?null:best;
}
function botAim(e,t,inp,dt){
  const ai=e.ai,w=curW(e),def=WEAPONS[w.k],diff=DIFF[G.diff];
  const ty=t.pos.y+(t.knocked?0.3:t.crouch&&t.mode==='ground'?0.85:1.15);
  const dx=t.pos.x-e.pos.x,dz=t.pos.z-e.pos.z,dxz=Math.hypot(dx,dz),dy=ty-eyeY(e);
  const want=Math.atan2(-dx,-dz),wantP=Math.atan2(dy,dxz);
  if(ai.visible)ai.seeT+=dt;else ai.seeT=Math.max(0,ai.seeT-dt*2);
  const zoom=w.att.sight?ATT[w.att.sight].zoom:1;
  const err=diff.err*(1+2.2*Math.max(0,1-ai.seeT/1.6))*(1+dxz/(zoom>=4?320:150))*(t.speedNow>3?1.4:1)*(e.mode==='veh'?1.5:1);
  ai.errX=lerp(ai.errX,(Math.random()*2-1)*err,Math.min(1,dt*3));ai.errY=lerp(ai.errY,(Math.random()*2-1)*err*0.6,Math.min(1,dt*3));
  const aligned=Math.abs(angD(e.yaw,want))<0.15+(def.pellets?0.1:0);
  if(ai.visible&&G.t>ai.react&&aligned&&dxz<def.range*1.6){
    inp.aim=inp.ads=dxz>22;
    if(def.auto){if(ai.burstT>0){inp.fire=true;ai.burstT-=dt;}else{ai.pauseT-=dt;if(ai.pauseT<=0){ai.burstT=0.2+Math.random()*0.45;ai.pauseT=0.15+Math.random()*0.35+dxz/180;}}}
    else if(e.fireCd<=0&&Math.random()<dt*(def.rpm>200?4:2.2)){inp.fire=true;inp.firePressed=true;}
  }
  if(w.mag===0)inp.reload=true;
  return{want,dxz,def,lookYaw:want+ai.errX*DEG,lookPitch:wantP+ai.errY*DEG};
}
function botInput(e,dt){
  const ai=e.ai,inp=blankInput();inp.yaw=e.yaw;inp.pitch=e.pitch;
  const diff=DIFF[G.diff],lead=teamLeader(e);
  if(e.mode==='plane'){
    let go;
    if(lead&&!lead.isBot)go=lead.mode!=='plane';
    else{const dx=ai.drop.x-e.pos.x,dz=ai.drop.z-e.pos.z;go=dx*dx+dz*dz<80*80;}
    if((go||G.t>W.plane.tOut-0.5)&&G.t>W.plane.tIn)inp.deploy=true;return inp;
  }
  if(e.mode==='fall'||e.mode==='chute'){
    let tx=ai.drop.x,tz=ai.drop.z;
    if(lead&&!lead.isBot&&lead.mode!=='plane'){tx=lead.pos.x+(e.slot-lead.slot)*4;tz=lead.pos.z+(e.slot-lead.slot)*2;}
    const dx=tx-e.pos.x,dz=tz-e.pos.z,d=Math.hypot(dx,dz);if(d>3){inp.wx=dx/d;inp.wz=dz/d;inp.yaw=Math.atan2(-dx,-dz);}return inp;
  }
  ai.scanT-=dt;if(ai.scanT<=0){ai.scanT=0.22+Math.random()*0.12;scanTargets(e);}
  let w=curW(e);
  if(!e.knocked&&(!w||(w.mag===0&&e.inv.ammo[WEAPONS[w.k].ammo]===0))){
    let best=-1,br=-1;e.inv.w.forEach((x,i)=>{if(x&&(x.mag>0||e.inv.ammo[WEAPONS[x.k].ammo]>0)&&WEAPONS[x.k].rank>br){br=WEAPONS[x.k].rank;best=i;}});
    if(best>=0&&best!==e.inv.cur)inp.slot=best;
  }
  const t=ai.target&&!ai.target.dead?ai.target:null;if(!t)ai.target=null;
  let lookYaw=e.yaw,lookPitch=0,mvx=0,mvz=0,sprint=true;
  const turnTo=()=>{const turn=(t?diff.turn:9)*dt;e.yaw+=clamp(angD(e.yaw,lookYaw),-turn,turn);e.pitch=lerp(e.pitch,lookPitch,Math.min(1,dt*8));inp.yaw=e.yaw;inp.pitch=e.pitch;};
  // riding as a passenger
  if(e.mode==='veh'){
    const v=e.veh;
    if(!v||!lead||lead.veh!==v||!driverOf(v)||driverOf(v)===e){if(v)requestSeat(e,v,-1);return inp;}
    if(t&&ai.visible&&w&&e.seat>0){const c=botAim(e,t,inp,dt);lookYaw=c.lookYaw;lookPitch=c.lookPitch;}else lookYaw=v.yaw;
    turnTo();return inp;
  }
  const zs=zoneState();
  const go=(x,z)=>{const dx=x-e.pos.x,dz=z-e.pos.z,d=Math.hypot(dx,dz);if(d>0.4){mvx=dx/d;mvz=dz/d;}return d;};
  const mate=G.teamSize>1&&!e.knocked?knockedMateNear(e,70):null;
  if(e.knocked){
    if(t){const dx=e.pos.x-t.pos.x,dz=e.pos.z-t.pos.z,d=Math.hypot(dx,dz)||1;mvx=dx/d;mvz=dz/d;}
    else if(lead)go(lead.pos.x,lead.pos.z);
    if(mvx||mvz)lookYaw=Math.atan2(-mvx,-mvz);
  }else if(t&&hasUsable(e)&&w&&(ai.visible||!mate)){
    const c=botAim(e,t,inp,dt),def=c.def,dxz=c.dxz,want=c.want;
    lookYaw=c.lookYaw;lookPitch=c.lookPitch;
    ai.strafeT-=dt;if(ai.strafeT<=0){ai.strafe=Math.random()<0.5?-1:1;ai.strafeT=0.5+Math.random()*1.1;if(Math.random()<0.12)inp.jump=true;}
    const fx=-Math.sin(want),fz=-Math.cos(want),rx=Math.cos(want),rz=-Math.sin(want);
    let mf=dxz>def.pref*1.3?1:dxz<def.pref*0.45?-0.6:0;if(!ai.visible)mf=1;
    mvx=fx*mf+rx*ai.strafe*(ai.visible?0.9:0.25);mvz=fz*mf+rz*ai.strafe*(ai.visible?0.9:0.25);
    sprint=!ai.visible;
    inp.crouch=ai.visible&&!!w.att.sight&&ATT[w.att.sight].zoom>=4&&dxz>70;
    ai.goal=null;ai.wps=[];ai.goalItem=null;
  }else{
    if(t&&!hasUsable(e)){const dx=e.pos.x-t.pos.x,dz=e.pos.z-t.pos.z,d=Math.hypot(dx,dz)||1;if(d<30&&!ai.goalItem){mvx=dx/d;mvz=dz/d;}}
    if(e.hp<70&&G.t-ai.lastSeen>3&&e.healT<=0&&!mate){if(e.inv.med>0&&e.hp<45)inp.heal='m';else if(e.inv.band>0&&e.hp<75)inp.heal='b';else if(e.inv.med>0)inp.heal='m';}
    if(w&&w.mag<WEAPONS[w.k].mag*0.6&&e.inv.ammo[WEAPONS[w.k].ammo]>0&&e.reloadT<=0)inp.reload=true;
    const dc=Math.hypot(e.pos.x-zs.x,e.pos.z-zs.z),dn=Math.hypot(e.pos.x-zs.nx,e.pos.z-zs.nz);
    const needZone=dc>zs.r-8||(dn>zs.nr*0.85&&(zs.shrinking||zs.left<40));
    const leadDist=lead?Math.hypot(lead.pos.x-e.pos.x,lead.pos.z-e.pos.z):0;
    let direct=false;
    if(mate&&G.t-ai.lastSeen>2){
      direct=true;ai.goal=null;ai.wps=[];ai.goalItem=null;
      if(go(mate.pos.x,mate.pos.z)<1.5){mvx=mvz=0;inp.revive=true;lookYaw=Math.atan2(-(mate.pos.x-e.pos.x),-(mate.pos.z-e.pos.z));}
    }else if(lead&&lead.mode==='veh'&&lead.veh&&lead.seat===0&&!lead.veh.destroyed&&lead.veh.seats.includes(null)&&leadDist<35){
      direct=true;ai.goal=null;ai.wps=[];ai.goalItem=null;
      if(go(lead.veh.pos.x,lead.veh.pos.z)<3.4)requestSeat(e,lead.veh,-2);
    }else if(lead&&lead.mode==='veh'&&leadDist>=35){
      direct=true;go(lead.pos.x,lead.pos.z);
    }else if(needZone&&!(lead&&leadDist<40)){
      if(!ai.zoneGoal||ai.zonePhase!==zs.phase){const a=Math.random()*6.28,r=zs.nr*0.45*Math.random();ai.zoneGoal={x:zs.nx+Math.cos(a)*r,z:zs.nz+Math.sin(a)*r};ai.zonePhase=zs.phase;}
      if(!ai.goal||ai.goalKind!=='zone'){route(e,ai.zoneGoal.x,ai.zoneGoal.z,0,-1);ai.goalKind='zone';ai.goalItem=null;}
    }else if(lead&&leadDist>32){
      if(!ai.goal||ai.goalKind!=='follow'||G.t-(ai.followT||0)>2){ai.followT=G.t;route(e,lead.pos.x+(e.slot-1)*3,lead.pos.z,0,bldAt(lead.pos));ai.goalKind='follow';ai.goalItem=null;}
    }else{
      if(ai.goalKind==='follow'||ai.goalKind==='zone'){ai.goal=null;ai.wps=[];ai.goalKind=null;}
      ai.lootT-=dt;
      if(ai.goalItem&&!items.has(ai.goalItem.id)){ai.goalItem=null;ai.goal=null;ai.wps=[];}
      if(!ai.goalItem&&ai.lootT<=0){
        ai.lootT=0.8+Math.random()*0.6;
        let best=null,bs=0;const cx=lead?lead.pos.x:e.pos.x,cz=lead?lead.pos.z:e.pos.z,rr=lead?30:60;
        for(const it of items.values()){const dx=it.x-cx,dz=it.z-cz;if(dx*dx+dz*dz>rr*rr)continue;
          if(Math.hypot(it.x-zs.nx,it.z-zs.nz)>zs.nr&&zs.left<50)continue;
          const wv=wantItem(e,it);if(!wv)continue;const d=Math.hypot(it.x-e.pos.x,it.z-e.pos.z);const sc=wv/(d+8);if(sc>bs){bs=sc;best=it;}}
        if(best){ai.goalItem=best;route(e,best.x,best.z,best.y,best.bld!=null?best.bld:-1);ai.goalKind='item';}
      }
      if(ai.goalItem){const it=ai.goalItem;if(Math.hypot(it.x-e.pos.x,it.z-e.pos.z)<1.5&&Math.abs(it.y-e.pos.y)<1.6){if(!pickBlock(e,it))grantPick(it.id,e.id);ai.goalItem=null;ai.goal=null;ai.wps=[];}}
      else if(!ai.goal||ai.goalKind!=='wander'){
        ai.wanderT-=dt;
        if(ai.wanderT<=0||!ai.goal){ai.wanderT=10+Math.random()*10;
          const cx=lead?lead.pos.x:e.pos.x,cz=lead?lead.pos.z:e.pos.z;
          for(let i=0;i<10;i++){const a=Math.random()*6.28,r=lead?5+Math.random()*15:20+Math.random()*70,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
            if(hAt(x,z)>0.6&&Math.hypot(x-zs.nx,z-zs.nz)<zs.nr*0.9){route(e,x,z,0,-1);ai.goalKind='wander';break;}}}
      }
    }
    if(!direct&&ai.wps.length){
      const wp=ai.wps[0],dx=wp.x-e.pos.x,dz=wp.z-e.pos.z,d=Math.hypot(dx,dz);
      if(d<(ai.wps.length>1?0.9:0.6)){ai.wps.shift();if(!ai.wps.length&&ai.goalKind!=='item'){ai.goal=null;}}
      else{mvx=dx/d;mvz=dz/d;}
    }
    if((mvx||mvz)&&!inp.revive)lookYaw=Math.atan2(-mvx,-mvz);
    if(e.healT>0){mvx*=0.2;mvz*=0.2;}
  }
  if(mvx||mvz){
    ai.stuckT+=dt;
    if(ai.stuckT>1.1){const moved=Math.hypot(e.pos.x-ai.chk.x,e.pos.z-ai.chk.z);ai.chk.copy(e.pos);ai.stuckT=0;
      if(moved<0.6){ai.detourT=0.9+Math.random()*0.6;ai.detourDir=Math.random()<0.5?-1:1;inp.jump=true;ai.stuckN=(ai.stuckN||0)+1;if(ai.stuckN>4){ai.goal=null;ai.goalItem=null;ai.wps=[];ai.stuckN=0;}}else ai.stuckN=0;}
  }
  if(ai.detourT>0){ai.detourT-=dt;const a=ai.detourDir*1.4,c=Math.cos(a),s2=Math.sin(a);const x=mvx*c-mvz*s2,z=mvx*s2+mvz*c;mvx=x;mvz=z;}
  turnTo();
  inp.wx=mvx;inp.wz=mvz;inp.sprint=sprint;
  return inp;
}

