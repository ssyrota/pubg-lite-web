// ================= main loop =================
function simulate(dt){
    G.t+=dt;
    if(G.freeCursor&&G.locked){const m=60;if(mouseX<m)look.yaw+=dt*2.4*(1-mouseX/m);else if(mouseX>innerWidth-m)look.yaw-=dt*2.4*(1-(innerWidth-mouseX)/m);}
    if(pressed.KeyM)G.mapOpen=!G.mapOpen;
    if(pressed.KeyV)G.fpp=!G.fpp;
    if(pressed.Escape)G.mapOpen=false;
    // plane
    const pp=planePos(G.t,new THREE.Vector3());planeMesh.position.copy(pp);planeMesh.rotation.y=Math.atan2(-W.plane.dx,-W.plane.dz);planeMesh.visible=G.t<W.plane.tOut+12;
    // local player
    if(!me.dead){
      const inp=playerInput();
      if(G.locked&&!G.invOpen&&pressed.KeyF){
        if(me.mode==='ground'&&!me.knocked&&!knockedMateNear(me,2.2)){
          const it=nearestItem(me,2.2);
          if(it&&!pickBlock(me,it))requestPick(me,it);else{const v=nearestVeh(me,3.4);if(v)requestSeat(me,v,-2);}
          inp.deploy=false;}
        else if(me.mode==='veh'&&me.veh){requestSeat(me,me.veh,-1);}
      }
      stepEnt(me,inp,dt);
    }else playerInput();
    // bots
    if(isAuthority())for(const e of ents.values()){if(e.isBot&&!e.dead){if(!e.ai)initAI(e);stepEnt(e,botInput(e,dt),dt);}}
    // remote smoothing
    const k=1-Math.exp(-14*dt);
    for(const e of ents.values()){
      if(isLocalCtl(e)||e.dead)continue;
      if(e.mode==='veh'&&e.veh){seatWorld(e.veh,e.seat,e.pos);e.speedNow=Math.abs(e.veh.spd);}
      else{const op=e.pos.clone();if(e.pos.distanceToSquared(e.tPos)>400)e.pos.copy(e.tPos);else e.pos.lerp(e.tPos,k);e.speedNow=e.pos.distanceTo(op)/dt;if(e.mode==='plane')planePos(G.t,e.pos);}
      e.yaw+=angD(e.yaw,e.tYaw)*k;e.pitch=lerp(e.pitch,e.tPitch,k);
    }
    for(const v of vehs.values()){
      const drv=driverOf(v);
      if(drv&&!isLocalCtl(drv)&&!v.destroyed){v.pos.lerp(v.tPos,k);v.yaw+=angD(v.yaw,v.tYaw)*k;v.pitch=lerp(v.pitch,v.tPitch,k);v.roll=lerp(v.roll,v.tRoll,k);v.spd=v.tSpd;}
      else if(!drv&&!v.destroyed){const g=Math.max(hAt(v.pos.x,v.pos.z),-1.6);if(v.pos.y>g+0.05){v.vy-=GRAV*dt;v.pos.y=Math.max(g,v.pos.y+v.vy*dt);}else{v.pos.y=g;v.vy=0;}v.spd*=0.9;}
      updateVehMesh(v,dt);
    }
    // storm damage
    const z=zoneState();
    for(const e of [...ents.values()]){if(e.dead||!isLocalCtl(e)||e.mode==='plane')continue;
      if(e.knocked){e.hp-=dt*(100/45)*(1+0.6*(e.knockN-1));if(e.hp<=0){e.hp=0;killEnt(e,e.knockBy,'bleed');continue;}}
      if(outZone(e,z))applyDamage(e,z.dps*dt,false,'zone','zone');}
    zoneMesh.position.set(z.x,200,z.z);zoneMesh.scale.set(Math.max(z.r,0.1),500,Math.max(z.r,0.1));
    zoneRing.position.set(z.nx,(me.pos.y||0)+0.5,z.nz);zoneRing.scale.setScalar(Math.max(z.nr,0.1));zoneRing.visible=z.nr<z.r-1;
    for(const e of ents.values())updateEntMesh(e,dt);
    for(const it of items.values()){const dx=it.x-camera.position.x,dz=it.z-camera.position.z;it.mesh.visible=dx*dx+dz*dz<110*110;if(it.mesh.visible&&it.k!=='w')it.mesh.rotation.y+=dt*0.8;}
    updateCamera(dt);
    netTick();
    updateHUD(dt,z);
    // audio
    const inV=!me.dead&&me.mode==='veh'&&me.veh;sfx.engine(!!inV&&!me.veh.destroyed,inV?me.veh.spd:0,inV?me.veh.kind:'car');
    sfx.wind(!me.dead&&(me.mode==='fall'||me.mode==='plane'),me.mode==='fall'?0.18:0.06);
    const sp=me.dead&&G.spec?G.spec.pos:me.pos;
    sun.position.set(sp.x+90,sp.y+160,sp.z+60);sun.target.position.set(sp.x,sp.y,sp.z);
}
let last=performance.now(),menuT=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(!W){return;}
  if(G.running&&me)simulate(dt);
  else{
    menuT+=dt*0.04;
    camera.position.set(Math.cos(menuT)*330,150,Math.sin(menuT)*330);camera.lookAt(0,10,0);
    if(camera.fov!==60){camera.fov=60;camera.updateProjectionMatrix();}
    sun.position.set(90,260,60);sun.target.position.set(0,0,0);
    if(zoneMesh)zoneMesh.visible=false;if(zoneRing)zoneRing.visible=false;
    if(planeMesh){planeMesh.visible=true;const pp=planePos((menuT*500)%(W.plane.len/W.plane.speed),new THREE.Vector3());planeMesh.position.copy(pp);planeMesh.rotation.y=Math.atan2(-W.plane.dx,-W.plane.dz);}
  }
  if(G.running&&zoneMesh)zoneMesh.visible=true;
  fx.update(dt);
  for(const k in pressed)delete pressed[k];
  renderer.render(scene,camera);
}

// ================= boot =================
if(!matchMedia('(pointer:fine)').matches)$('mobile').hidden=false;
setTimeout(()=>{
  try{ensureWorld(menuSeed);}catch(e){$('loading').textContent='Failed to build the island: '+e.message;console.error(e);return;}
  $('loading').hidden=true;$('menu').hidden=false;
  requestAnimationFrame(frame);
},30);
window.__sl={simulate,render:()=>renderer.render(scene,camera),renderer,scene,camera,G,ents,vehs,items,get me(){return me;},get W(){return W;},look,keys,pressed,zoneState,startMatch,NET,stepEnt,raycast,dealDamage,dealVehDamage};
