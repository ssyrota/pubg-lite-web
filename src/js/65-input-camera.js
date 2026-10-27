// ================= player input =================
const keys={},pressed={};let mouseL=false,mouseR=false,fireEdge=false,wheelSlot=-1,rDownT=0;
addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  if(e.code==='Tab'){e.preventDefault();if(G.running&&!e.repeat&&$('end').hidden){if(G.invOpen)closeInv();else openInv();}return;}
  if(G.invOpen){if(e.code==='KeyS'&&!e.repeat){invTab=invTab==='stats'?'inv':'stats';invDirty=true;renderInv();}if(e.code==='Escape')closeInv();return;}
  if(e.code==='Escape'&&G.freeCursor&&G.running){if(G.mapOpen)G.mapOpen=false;else pauseGame();}
  if(!e.repeat)pressed[e.code]=true;keys[e.code]=true;
  if(G.running&&['Space','KeyF'].includes(e.code))e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouseL=mouseR=false;});
canvas.addEventListener('mousedown',e=>{
  if(!G.running)return;
  if(!G.locked){lockPointer();return;}
  if(e.button===0){mouseL=true;fireEdge=true;if(me&&me.dead&&G.spec)G.spec=pickSpectate(G.spec);}
  if(e.button===2){mouseR=true;rDownT=performance.now();}
});
addEventListener('mouseup',e=>{if(e.button===0)mouseL=false;if(e.button===2){if(mouseR&&G.locked&&performance.now()-rDownT<250)toggleAds();mouseR=false;}});
function toggleAds(){if(!me||me.dead||me.knocked||!curW(me))return;if(me.mode==='ground'||(me.mode==='veh'&&me.seat>0))G.ads=!G.ads;}
addEventListener('contextmenu',e=>{if(G.running)e.preventDefault();});
addEventListener('wheel',e=>{if(G.running&&G.locked&&me&&!me.dead){wheelSlot=me.inv.cur===0?1:0;}},{passive:true});
addEventListener('mousemove',e=>{
  if(!G.locked)return;
  const sc=adsOn()?1/curZoom(me):me&&me.aiming?1/1.3:1;
  look.yaw-=e.movementX*0.0022*sc;look.pitch=clamp(look.pitch-e.movementY*0.0022*sc,-1.45,1.45);
});
let lockTry=0;
function lockPointer(){
  if(!G.running)return;
  if(document.pointerLockElement===canvas){G.locked=true;$('pause').hidden=true;return;}
  const tryN=++lockTry;
  const fail=()=>{if(tryN!==lockTry||document.pointerLockElement===canvas)return;
    if(!G.retried){G.retried=true;setTimeout(()=>{if(tryN===lockTry&&document.pointerLockElement!==canvas)lockPointer();},1100);return;}
    startFreeCursor();};
  try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(fail);else setTimeout(()=>{if(document.pointerLockElement!==canvas)fail();},400);}catch(err){fail();}
}
function startFreeCursor(){
  G.freeCursor=true;G.locked=true;G.retried=false;$('pause').hidden=true;canvas.style.cursor='crosshair';
  centerMsg('Mouse capture is blocked here · move the mouse to look, push to the screen edge to keep turning');
}
let mouseX=innerWidth/2;
addEventListener('mousemove',e=>{mouseX=e.clientX;},{passive:true});
function pauseGame(){if(!G.running||G.endShown&&!$('end').hidden)return;G.locked=false;G.freeCursor=false;canvas.style.cursor='';mouseL=mouseR=false;$('ptitle').textContent='Paused';$('psub').textContent='Click anywhere to resume. The match keeps running.';$('pause').hidden=false;}
$('pause').addEventListener('mousedown',e=>{if(e.target.closest('.pstats,#btnQuit'))return;if(e.target.closest('.card')||e.target===$('pause')){e.preventDefault();lockPointer();}});
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===canvas){G.freeCursor=false;G.retried=false;canvas.style.cursor='';}
  if(G.freeCursor)return;
  G.locked=document.pointerLockElement===canvas;
  if(G.running&&!G.over&&!G.endShown&&!G.invOpen)$('pause').hidden=G.locked;
  if(!G.locked){mouseL=mouseR=false;}
});
const _cd=new THREE.Vector3();
function myAimDir(){
  camera.getWorldDirection(_cd);
  if(G.fpp||adsOn())return _cd.clone();
  const h=raycast(camera.position,_cd,900,me,true);
  const P=h.point.clone(),eye=new THREE.Vector3(me.pos.x,eyeY(me),me.pos.z),d=P.sub(eye);
  if(d.length()<1.5||d.dot(_cd)<0.3)return _cd.clone();
  return d.normalize();
}
function playerInput(){
  const inp=blankInput();inp.yaw=look.yaw;inp.pitch=look.pitch;
  const act=G.locked&&!G.invOpen;
  if(act){
    const f=(keys.KeyW?1:0)-(keys.KeyS?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0);
    const fx=-Math.sin(look.yaw),fz=-Math.cos(look.yaw),rx=Math.cos(look.yaw),rz=-Math.sin(look.yaw);
    inp.wx=fx*f+rx*r;inp.wz=fz*f+rz*r;
    inp.vk={W:!!keys.KeyW,S:!!keys.KeyS,A:!!keys.KeyA,D:!!keys.KeyD,Space:!!keys.Space,Shift:!!(keys.ShiftLeft||keys.ShiftRight),Ctrl:!!(keys.ControlLeft||keys.ControlRight||keys.KeyC)};
    inp.throttle=f;inp.steer=(keys.KeyA?1:0)-(keys.KeyD?1:0);inp.brake=!!keys.Space;inp.boost=!!(keys.ShiftLeft||keys.ShiftRight);
    inp.sprint=!!(keys.ShiftLeft||keys.ShiftRight);
    if(pressed.KeyC||pressed.ControlLeft)G.crouch=!G.crouch;
    if(inp.sprint&&f>0)G.crouch=false;
    inp.crouch=G.crouch;inp.jump=!!pressed.Space&&me.mode!=='veh';
    const hold=mouseR&&performance.now()-rDownT>250;
    if(inp.sprint&&f>0&&me.mode==='ground')G.ads=false;
    if(!curW(me)||me.knocked||!(me.mode==='ground'||(me.mode==='veh'&&me.seat>0)))G.ads=false;
    inp.fire=mouseL;inp.firePressed=fireEdge;inp.ads=G.ads;inp.aim=G.ads||(hold&&me.mode!=='plane');
    inp.revive=!!keys.KeyF;
    inp.reload=!!pressed.KeyR;
    if(pressed.Digit1)inp.slot=0;if(pressed.Digit2)inp.slot=1;if(pressed.Digit3||pressed.KeyX)inp.slot=-3;if(wheelSlot>=0)inp.slot=wheelSlot;
    if(pressed.Digit4)inp.heal='b';if(pressed.Digit5)inp.heal='m';
    inp.deploy=!!pressed.KeyF;
    inp.lean=(keys.KeyE?1:0)-(keys.KeyQ?1:0);inp.fireMode=!!pressed.KeyB;
  }
  fireEdge=false;wheelSlot=-1;
  inp.aimFn=myAimDir;
  return inp;
}
const adsOn=()=>!!(me&&!me.dead&&!me.knocked&&me.ads&&curW(me)&&(me.mode==='ground'||(me.mode==='veh'&&me.seat>0)));
const curZoom=e=>{const w=curW(e);return !w?1:w.att.sight?ATT[w.att.sight].zoom:WEAPONS[w.k].iron;};
const scopeView=()=>{if(!adsOn())return null;const w=curW(me);return w.att.sight?ATT[w.att.sight].view:'iron';};

// ================= camera =================
const _cp=new THREE.Vector3(),_cf=new THREE.Vector3(),_pv=new THREE.Vector3();
let fpRig=null,fpKey=undefined;
function buildFpRig(w){
  const g=new THREE.Group();
  const sl=mc(me?me.color:0x445566),sk=mc(me?me.skin:0xc99a74),glove=mc(0x2a2c2e);
  if(w){
    const L=WEAPONS[w.k].len;g.add(buildGun(w.k,w.att));
    const ra=part(sl,0.09,0.09,0.42,0.12,-0.2,0.16);ra.rotation.set(0.45,0.38,0);g.add(ra);
    g.add(part(glove,0.08,0.1,0.1,0.03,-0.12,-L*0.12+0.03));
    const la=part(sl,0.09,0.09,0.5,-0.13,-0.21,-L*0.3);la.rotation.set(0.35,-0.5,0);g.add(la);
    g.add(part(glove,0.08,0.08,0.11,-0.02,-0.07,-L*0.58));
  }else{
    for(const x of[-0.14,0.14]){const a=part(sl,0.09,0.09,0.42,x,-0.18,-0.12);a.rotation.x=0.35;g.add(a);g.add(part(sk,0.1,0.1,0.11,x*0.9,-0.1,-0.34));}
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});
  g.position.set(0.16,-0.16,-0.3);
  return g;
}
function updateCamera(dt){
  const tgt=me.dead&&G.spec?G.spec:me;
  const yaw=look.yaw,pitch=look.pitch;
  lookDir(yaw,pitch,_cf);
  let fov=75;
  const w=curW(me);
  const view=tgt===me?scopeView():null;
  const fpp=tgt===me&&!me.dead&&!me.knocked&&(!!view||(G.fpp&&(me.mode==='ground'||me.mode==='veh')));
  if(fpp){
    const lo=leanOff(me);
    _cp.set(me.pos.x+Math.cos(me.yaw)*lo,eyeY(me)+(me.mode==='veh'?0.05:0)-Math.abs(lo)*0.12,me.pos.z-Math.sin(me.yaw)*lo).addScaledVector(_cf,view?0.05:0.12);
    if(view)fov=75/curZoom(me);
    camera.position.copy(_cp);
  }else{
    let dist=3.4,side=0.6,hgt=1.62;
    if(tgt.mode==='plane'){dist=46;side=0;hgt=12;}
    else if(tgt.mode==='fall'||tgt.mode==='chute'){dist=tgt.mode==='chute'?10:7;side=0;hgt=tgt.mode==='chute'?3:1.2;}
    else if(tgt.mode==='veh'&&tgt.veh){dist=tgt.veh.kind==='car'?7.5:5;side=0;hgt=2.4;}
    else if(tgt.mode==='dead'){dist=5;side=0;hgt=1.2;}
    else{if(tgt.crouch)hgt=1.2;if(tgt.knocked){hgt=0.9;dist=3;}if(tgt===me&&me.aiming&&w&&!me.knocked){dist=1.7;side=0.65;fov=75/1.3;}}
    const lo=leanOff(tgt);
    const center=tgt.mode==='veh'&&tgt.veh?_pv.set(tgt.veh.pos.x,tgt.veh.pos.y+hgt,tgt.veh.pos.z):_pv.set(tgt.pos.x,tgt.pos.y+hgt,tgt.pos.z);
    const rx=Math.cos(yaw),rz=-Math.sin(yaw);
    center.x+=Math.cos(tgt.yaw)*lo;center.z-=Math.sin(tgt.yaw)*lo;
    _cp.copy(center).addScaledVector(_cf,-dist);_cp.x+=rx*side;_cp.z+=rz*side;
    _o.copy(center);_d.copy(_cp).sub(center);const L=_d.length();_d.multiplyScalar(1/L);
    let t=rayBoxes(_o,_d,L);t=rayTerrain(_o,_d,t);
    if(t<L)_cp.copy(center).addScaledVector(_d,Math.max(0.2,t-0.25));
    const gy=hAt(_cp.x,_cp.z)+0.3;if(_cp.y<gy)_cp.y=gy;
    camera.position.copy(_cp);
  }
  camera.lookAt(_cp.x+_cf.x,_cp.y+_cf.y,_cp.z+_cf.z);
  if(tgt===me&&me.lean)camera.rotateZ(-me.lean*(fpp?0.14:0.06));
  if(Math.abs(camera.fov-fov)>0.01){camera.fov=view?fov:lerp(camera.fov,fov,Math.min(1,dt*14));camera.updateProjectionMatrix();}
  const showFp=fpp&&view!=='scope'&&!me.knocked&&(me.mode==='ground'||(me.mode==='veh'&&me.seat>0));
  const k=w?w.k+':'+attStr(w.att):'none';
  if(fpKey!==k){if(fpRig)camera.remove(fpRig);fpRig=buildFpRig(w);camera.add(fpRig);fpKey=k;}
  fpRig.visible=showFp;
  if(showFp){
    const spd=me.mode==='ground'?me.speedNow:0;G.fpBob+=dt*spd*1.7;
    G.fpKick*=Math.exp(-12*dt);
    const ads=!!view,amp=ads?0.0015:0.011*Math.min(1,spd/4);
    const sprint=!ads&&spd>5.5;
    let tx=ads?0:0.16,ty=ads?-0.098:-0.16,tz=ads?-0.42:-0.3,rx=0,ry=0;
    if(sprint){tx=0.1;ty=-0.22;ry=0.6;rx=-0.15;}
    if(me.reloadT>0&&me.reloadDur){const p=Math.sin((1-me.reloadT/me.reloadDur)*Math.PI);rx-=0.55*p;ty-=0.08*p;}
    if(me.healT>0){ty-=0.4;}
    if(me.reviveT>0){ty-=0.4;}
    tx+=Math.cos(G.fpBob)*amp;ty+=Math.abs(Math.sin(G.fpBob))*amp;
    tz+=G.fpKick;rx+=G.fpKick*1.4;
    const kk=Math.min(1,dt*16);
    fpRig.position.x=lerp(fpRig.position.x,tx,kk);fpRig.position.y=lerp(fpRig.position.y,ty,kk);fpRig.position.z=lerp(fpRig.position.z,tz,Math.min(1,dt*30));
    fpRig.rotation.x=lerp(fpRig.rotation.x,rx,kk);fpRig.rotation.y=lerp(fpRig.rotation.y,ry,kk);
    fpRig.scale.setScalar(lerp(fpRig.scale.x,ads?0.78:1,kk));
  }
  $('scope').hidden=view!=='scope';
  const rc=$('reticle'),rcls=view&&view!=='scope'?view:'';if(rc.className!==rcls)rc.className=rcls;
}

// ================= meshes update =================
function updateEntMesh(e,dt){
  const m=e.mesh,u=m.userData;
  const hideSelf=e===me&&!me.dead&&!me.knocked&&(adsOn()||(G.fpp&&(me.mode==='ground'||me.mode==='veh')));
  m.visible=e.mode!=='plane'&&!e.left&&!hideSelf&&camera.position.distanceToSquared(e.pos)<380*380;
  if(!m.visible)return;
  m.position.copy(e.pos);
  if(e.mode==='veh'&&e.veh){m.rotation.set(e.veh.pitch*0.6,e.veh.yaw+(e.seat>0?angD(e.veh.yaw,e.yaw)*0.6:0),0,'YXZ');}
  else m.rotation.set(0,e.yaw,0);
  if(!isLocalCtl(e))e.lean=lerp(e.lean||0,e.tLean||0,Math.min(1,dt*10));
  u.body.rotation.z=e.mode==='ground'&&!e.dead&&!e.knocked?-(e.lean||0)*0.32:0;
  if(e.dead){u.body.rotation.x=lerp(u.body.rotation.x,-Math.PI/2,Math.min(1,dt*6));u.body.position.y=lerp(u.body.position.y,0.18,Math.min(1,dt*6));u.chute.visible=false;u.upper.rotation.x=0;return;}
  u.body.rotation.x=e.knocked?-1.35:e.mode==='fall'?-1.0:0;u.body.position.y=e.knocked?0.32:0;
  u.chute.visible=e.mode==='chute';
  const sit=e.mode==='veh';
  u.body.scale.y=lerp(u.body.scale.y,e.crouch&&e.mode==='ground'?0.72:1,Math.min(1,dt*12));
  if(sit){const a=e.veh&&e.veh.kind==='bike'?1.05:1.45;u.legL.rotation.x=a;u.legR.rotation.x=a;u.legL.rotation.z=e.veh&&e.veh.kind==='bike'?-0.3:0;u.legR.rotation.z=-u.legL.rotation.z;}
  else{const ph=Math.floor(e.anim/Math.PI);e.anim+=dt*e.speedNow*1.9;if(e.mode==='ground'&&e.onGround!==false&&e.speedNow>0.6&&Math.floor(e.anim/Math.PI)!==ph&&camera.position.distanceToSquared(e.pos)<60*60)sfx.step(surfaceAt(e),e.pos,e===me);const sw=Math.sin(e.anim)*Math.min(1,e.speedNow/4)*0.7;u.legL.rotation.x=e.mode==='fall'?0.3:sw;u.legR.rotation.x=e.mode==='fall'?-0.2:-sw;u.legL.rotation.z=u.legR.rotation.z=0;}
  u.upper.rotation.x=sit&&e.seat===0?-0.25:e.pitch*0.9;
  const gkey=e.vest+'|'+e.helm+'|'+e.bag;
  if(u.gearKey!==gkey){u.gearKey=gkey;
    u.vest.visible=e.vest>0;if(e.vest)u.vest.material=mc(GEAR_COL[e.vest]);
    u.helm.visible=e.helm>0;if(e.helm)u.helm.material=mc(GEAR_COL[e.helm]);u.visor.visible=e.helm===3;
    u.pack.visible=e.bag>0;if(e.bag){u.pack.material=mc(BAG_COL[e.bag]);const sz=[0,[0.34,0.36,0.16],[0.4,0.48,0.2],[0.44,0.62,0.25]][e.bag];u.pack.scale.set(sz[0],sz[1],sz[2]);u.pack.position.set(0,1.16+(e.bag-1)*0.05,0.16+sz[2]/2);}}
  const cw=curW(e);
  const gk=isLocalCtl(e)?(cw?cw.k+':'+attStr(cw.att):null):e.netWk;
  if(u.gunKey!==gk){u.gun.clear();if(gk){const i=gk.indexOf(':');u.gun.add(buildGun(gk.slice(0,i),attFrom(gk.slice(i+1))));}u.gunKey=gk;}
  u.gun.visible=!(sit&&e.seat===0)&&!e.knocked;
}
function updateVehMesh(v,dt){
  const m=v.mesh;m.position.copy(v.pos);m.rotation.set(v.pitch,v.yaw,v.roll,'YXZ');
  const u=m.userData;v.wheelRot+=v.spd*dt/v.def.wheelR;
  for(const w of u.wheels)w.rotation.x=-v.wheelRot;
  for(const s of u.steer)s.rotation.y=v.steer*0.45;
  m.visible=camera.position.distanceToSquared(v.pos)<420*420;
  if(v.destroyed&&Math.random()<dt*6)fx.smoke(v.pos);
  else if(!v.destroyed&&v.hp<v.def.hp*0.3&&Math.random()<dt*4)fx.smoke(v.pos,true);
}

