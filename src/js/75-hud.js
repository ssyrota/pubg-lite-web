// ================= HUD =================
const hud={};
['gp','squad','tags','sqstat','squads','alive','kills','feed','msg','center','cross','hitm','dmgind','prompt','hp','hpghost','healbar','healfill','healtxt','gv','gh','gb','gm','s0','s1','zlabel','ztime','zonet','mm','vign','stormtint','compass','bigmap','bm','vehpanel','vspd','vhpbar','vname'].forEach(k=>hud[k]=$(k));
const mmx=hud.mm.getContext('2d'),cpx=hud.compass.getContext('2d'),bmx=hud.bm.getContext('2d');
const cache={};
const setTxt=(el,key,v)=>{if(cache[key]!==v){cache[key]=v;el.textContent=v;}};
const setHtml=(el,key,v)=>{if(cache[key]!==v){cache[key]=v;el.innerHTML=v;}};
let hitT=0,centerT=0,hurtT=0;
function hitmarker(head,kill){hitT=0.16;hud.hitm.classList.toggle('kill',!!kill);hud.hitm.style.opacity=1;sfx.hit(head);}
function centerMsg(txt,kill){hud.center.textContent=txt;hud.center.className=kill?'kill':'';hud.center.hidden=false;centerT=2.5;}
function flashHurt(){hurtT=0.5;}
function dmgIndicator(src){
  const ang=Math.atan2(-(src.x-me.pos.x),-(src.z-me.pos.z));const rel=angD(look.yaw,ang);
  const d=document.createElement('div');d.style.transform=`rotate(${-rel}rad)`;hud.dmgind.appendChild(d);
  setTimeout(()=>d.style.opacity=0,200);setTimeout(()=>d.remove(),1300);
}
function feed(a,b,how,mine){
  const d=document.createElement('div');if(mine)d.className='me';
  d.innerHTML=`${esc(a)}<span class="w">${esc(how)}</span>${esc(b)}`;
  hud.feed.prepend(d);while(hud.feed.children.length>6)hud.feed.lastChild.remove();
  setTimeout(()=>d.style.opacity=0,6000);setTimeout(()=>d.remove(),6700);
}
function drawCompass(){
  const W2=480,H2=34;cpx.clearRect(0,0,W2,H2);
  cpx.fillStyle='rgba(14,20,24,.6)';cpx.fillRect(0,4,W2,24);
  const bearing=((-look.yaw/DEG)%360+360)%360;
  cpx.textAlign='center';cpx.font='600 13px "IBM Plex Mono",monospace';
  const lab={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
  for(let a=-90;a<=90;a+=5){
    const b=Math.round(bearing/5)*5+a,x=W2/2+(b-bearing)*2.6,bb=((b%360)+360)%360;
    if(x<0||x>W2)continue;
    cpx.fillStyle=lab[bb]?(bb===0?'#ff8040':'#ebe6da'):'rgba(235,230,218,.55)';
    if(bb%15===0){cpx.fillText(lab[bb]||String(bb),x,22);}else cpx.fillRect(x,8,1,5);
  }
  cpx.fillStyle='#ebe6da';cpx.fillRect(W2/2-1,0,2,6);
}
function drawZoneCircles(ctx,sx,sy,sc,z){
  ctx.lineWidth=2;
  ctx.strokeStyle='rgba(116,200,222,.95)';ctx.beginPath();ctx.arc(sx(z.x),sy(z.z),z.r*sc,0,7);ctx.stroke();
  if(z.nr<z.r-0.5){ctx.strokeStyle='rgba(255,255,255,.95)';ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(sx(z.nx),sy(z.nz),z.nr*sc,0,7);ctx.stroke();ctx.setLineDash([]);}
}
function arrow(ctx,x,y,yaw,c,s=7){
  ctx.save();ctx.translate(x,y);ctx.rotate(-yaw);ctx.fillStyle=c;ctx.strokeStyle='#10161a';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*0.7,s*0.8);ctx.lineTo(0,s*0.4);ctx.lineTo(-s*0.7,s*0.8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function drawMinimap(z){
  const S=200,R=115,sc=S/(2*R),p=me.dead&&G.spec?G.spec.pos:me.pos,isc=1024/SIZE;
  mmx.fillStyle='#2d6070';mmx.fillRect(0,0,S,S);
  mmx.drawImage(mapImg,(p.x-R+HALF)*isc,(p.z-R+HALF)*isc,2*R*isc,2*R*isc,0,0,S,S);
  const sx=x=>(x-p.x)*sc+S/2,sy=y=>(y-p.z)*sc+S/2;
  mmx.save();mmx.beginPath();mmx.rect(0,0,S,S);mmx.clip();
  drawZoneCircles(mmx,sx,sy,sc,z);
  if(G.t<W.plane.tOut+8){mmx.strokeStyle='rgba(255,255,255,.5)';mmx.lineWidth=1;mmx.beginPath();mmx.moveTo(sx(W.plane.sx),sy(W.plane.sz));mmx.lineTo(sx(W.plane.sx+W.plane.dx*W.plane.len),sy(W.plane.sz+W.plane.dz*W.plane.len));mmx.stroke();}
  for(const v of vehs.values()){if(v.destroyed)continue;const x=sx(v.pos.x),y=sy(v.pos.z);if(x<0||x>S||y<0||y>S)continue;mmx.fillStyle='rgba(255,210,120,.85)';mmx.fillRect(x-2,y-2,4,4);}
  if(G.teamSize>1)for(const m of ents.values()){if(m===me||m.team!==me.team||m.dead)continue;arrow(mmx,sx(m.pos.x),sy(m.pos.z),m.yaw,m.knocked?'#e5473b':TEAM_COL[m.slot%3],5);}
  mmx.restore();
  const t=me.dead&&G.spec?G.spec:me;arrow(mmx,S/2,S/2,t===me?look.yaw:t.yaw,G.teamSize>1?TEAM_COL[t.slot%3]:'#ff8040');
}
function drawBigMap(z){
  const S=900,sc=S/SIZE;
  bmx.drawImage(mapImg,0,0,S,S);
  const sx=x=>(x+HALF)*sc,sy=y=>(y+HALF)*sc;
  bmx.strokeStyle='rgba(16,22,26,.25)';bmx.lineWidth=1;
  for(let i=1;i<8;i++){bmx.beginPath();bmx.moveTo(i*S/8,0);bmx.lineTo(i*S/8,S);bmx.stroke();bmx.beginPath();bmx.moveTo(0,i*S/8);bmx.lineTo(S,i*S/8);bmx.stroke();}
  bmx.font='600 12px "IBM Plex Mono",monospace';bmx.fillStyle='rgba(16,22,26,.6)';
  for(let i=0;i<8;i++){bmx.fillText(String.fromCharCode(65+i),i*S/8+5,14);bmx.fillText(String(i+1),4,i*S/8+28);}
  bmx.font='700 17px "Saira Condensed",sans-serif';bmx.textAlign='center';
  for(const t of W.towns){bmx.fillStyle='rgba(16,22,26,.75)';bmx.fillText(t.name.toUpperCase(),sx(t.x),sy(t.z)+5);}
  bmx.textAlign='left';
  drawZoneCircles(bmx,sx,sy,sc,z);
  if(G.t<W.plane.tOut+8){bmx.strokeStyle='rgba(255,255,255,.8)';bmx.setLineDash([8,6]);bmx.lineWidth=2;bmx.beginPath();bmx.moveTo(sx(W.plane.sx),sy(W.plane.sz));bmx.lineTo(sx(W.plane.sx+W.plane.dx*W.plane.len),sy(W.plane.sz+W.plane.dz*W.plane.len));bmx.stroke();bmx.setLineDash([]);
    const pp=planePos(G.t,new THREE.Vector3());arrow(bmx,sx(pp.x),sy(pp.z),Math.atan2(-W.plane.dx,-W.plane.dz),'#ebe6da',9);}
  for(const v of vehs.values()){if(v.destroyed)continue;bmx.fillStyle='rgba(255,210,120,.9)';bmx.fillRect(sx(v.pos.x)-2.5,sy(v.pos.z)-2.5,5,5);}
  if(G.teamSize>1)for(const m of ents.values()){if(m===me||m.team!==me.team||m.dead)continue;arrow(bmx,sx(m.pos.x),sy(m.pos.z),m.yaw,m.knocked?'#e5473b':TEAM_COL[m.slot%3],8);}
  const t=me.dead&&G.spec?G.spec:me;arrow(bmx,sx(t.pos.x),sy(t.pos.z),t===me?look.yaw:t.yaw,G.teamSize>1?TEAM_COL[t.slot%3]:'#ff8040',10);
}
const tagEls={},_tg=new THREE.Vector3();
function updateTags(){
  const live=new Set();const from=me.dead&&G.spec?G.spec.pos:me.pos;
  if(G.teamSize>1)for(const m of ents.values()){
    if(m===me||m.team!==me.team||m.dead||m.left||m.mode==='plane')continue;
    const p=_tg.set(m.pos.x,m.pos.y+(m.knocked?0.9:2.1),m.pos.z).project(camera);
    if(p.z>1||p.z<-1)continue;
    let el=tagEls[m.id];if(!el){el=document.createElement('div');el.className='tagx';hud.tags.appendChild(el);tagEls[m.id]=el;}
    live.add(m.id);
    el.style.left=((p.x+1)/2*innerWidth)+'px';el.style.top=((1-p.y)/2*innerHeight)+'px';el.style.color=TEAM_COL[m.slot%3];el.classList.toggle('kn',m.knocked);
    const d=Math.round(m.pos.distanceTo(from)),txt=(m.knocked?'▼ ':'')+m.name+'|'+d;
    if(el._t!==txt){el._t=txt;el.innerHTML=`${esc((m.knocked?'▼ ':'')+m.name)}<small>${d} m</small>`;}
  }
  for(const id in tagEls)if(!live.has(id)){tagEls[id].remove();delete tagEls[id];}
}
function weaponSlotHtml(e,i){
  const w=e.inv.w[i];if(!w)return[`${i+1} · Empty`,''];
  const d=WEAPONS[w.k];return[`${i+1} · ${d.name}${w.att.sight?' · '+ATT[w.att.sight].short:''}${d.auto?(w.single?' · single':' · auto'):''}`,`<b>${w.mag}</b> / ${e.inv.ammo[d.ammo]}`];
}
function updateHUD(dt,z){
  const t=me.dead&&G.spec?G.spec:me;
  setTxt(hud.alive,'alive',String(aliveCount()));
  hud.sqstat.hidden=G.teamSize<=1;if(G.teamSize>1)setTxt(hud.squads,'squads',String(teamsAlive()));
  hud.squad.hidden=G.teamSize<=1;
  if(G.teamSize>1){let h='';for(const m of [...ents.values()].filter(x=>x.team===me.team).sort((a,b)=>a.slot-b.slot)){
    h+=`<div class="sq ${m.dead?'dead':m.knocked?'kn':''}"><i style="background:${TEAM_COL[m.slot%3]}"></i><span>${esc(m.name)}${m===me?' · you':m.dead?' · out':m.knocked?' · down':''}</span><div class="bar"><b style="width:${m.dead?0:Math.round(m.hp)}%"></b></div></div>`;}
    setHtml(hud.squad,'sqp',h);}
  updateTags();setTxt(hud.kills,'kills',String(me.kills));
  // health
  const hp=Math.max(0,t.hp);const hpw=hp+'%';
  if(cache.hpw!==hpw){cache.hpw=hpw;hud.hp.style.width=hpw;hud.hpghost.style.width=hpw;hud.hp.classList.toggle('low',hp<30);}
  const durBar=f=>`<span class="dur"><b style="width:${Math.round(clamp(f,0,1)*100)}%"></b></span>`;
  setHtml(hud.gp,'gp',`Bag ${t.bag?'Lv'+t.bag:'—'}${t===me?` <span class="mono" style="font-size:12px">${Math.round(capUsed(me))}/${BAG_CAP[me.bag]}</span>`:''}`);hud.gp.classList.toggle('on',!!t.bag);
  setHtml(hud.gv,'gv',t.vest?`Vest Lv${t.vest}${t===me?durBar(me.vd/VEST_DUR[me.vest]):''}`:'Vest —');hud.gv.classList.toggle('on',!!t.vest);
  setHtml(hud.gh,'gh',t.helm?`Helmet Lv${t.helm}${t===me?durBar(me.hd/HELM_DUR[me.helm]):''}`:'Helmet —');hud.gh.classList.toggle('on',!!t.helm);
  setHtml(hud.gb,'gb',`<span class="k">4</span>Bandage ${t===me?me.inv.band:'·'}`);setHtml(hud.gm,'gm',`<span class="k">5</span>Med kit ${t===me?me.inv.med:'·'}`);
  hud.gb.classList.toggle('on',me.inv.band>0);hud.gm.classList.toggle('on',me.inv.med>0);
  // heal / reload bar
  if(!me.dead&&(me.healT>0||me.reloadT>0||me.knocked||me.reviveT>0)){
    hud.healbar.hidden=false;
    if(me.knocked){hud.healfill.style.width=me.hp+'%';setTxt(hud.healtxt,'ht','Knocked down · bleeding out');}
    else if(me.reviveT>0){hud.healfill.style.width=(100*me.reviveT/REVIVE_T)+'%';setTxt(hud.healtxt,'ht','Reviving squadmate · keep holding F');}
    else if(me.healT>0){hud.healfill.style.width=(100*(1-me.healT/me.healDur))+'%';setTxt(hud.healtxt,'ht',me.healKind==='b'?'Applying bandage':'Using med kit');}
    else{const d=WEAPONS[curW(me).k];hud.healfill.style.width=(100*(1-me.reloadT/d.reload))+'%';setTxt(hud.healtxt,'ht','Reloading');}
  }else hud.healbar.hidden=true;
  // vehicle
  if(!me.dead&&me.mode==='veh'&&me.veh){hud.vehpanel.hidden=false;const v=me.veh;setTxt(hud.vspd,'vspd',String(Math.round(Math.abs(v.spd)*3.6)));hud.vhpbar.style.width=(100*v.hp/v.def.hp)+'%';setTxt(hud.vname,'vname',v.def.name+(me.seat===0?' · driver':' · passenger'));}
  else hud.vehpanel.hidden=true;
  // weapons
  for(let i=0;i<2;i++){const[a,b]=weaponSlotHtml(me,i);setHtml(hud['s'+i],'s'+i,`<span>${esc(a)}</span><span class="am">${b}</span>`);hud['s'+i].classList.toggle('on',me.inv.cur===i);}
  // zone
  const zl=z.phase>=W.zones.ph.length?'Final circle':z.shrinking?'Storm closing':(z.phase===0?'Storm forms in':'Next storm in');
  setTxt(hud.zlabel,'zl',zl);setTxt(hud.ztime,'zt',z.left>0?fmtT(z.left):'—');
  hud.zonet.classList.toggle('hot',z.shrinking);
  const out=!me.dead&&me.mode!=='plane'&&outZone(me,z);
  hud.stormtint.style.opacity=out?1:0;
  // messages
  let msg='';
  if(!me.dead){
    if(me.mode==='plane')msg=G.t<W.plane.tIn?'Plane approaching the island…':'Press F to jump';
    else if(me.mode==='fall')msg='Steer with W A S D · F opens the parachute';
    else if(me.knocked)msg='Knocked down · crawl to cover';
    else if(out)msg='You are in the storm — get to the safe zone';
  }else if(G.spec)msg=`Spectating ${G.spec.name} · click for next player`;
  setTxt(hud.msg,'msg',msg);
  // prompt
  let pr='';
  if(!me.dead&&me.mode==='ground'&&!me.knocked){
    const km=knockedMateNear(me,2.2),it=nearestItem(me,2.2),why=it?pickBlock(me,it):'';
    if(km)pr=`<kbd>F</kbd>Hold to revive ${esc(km.name)}`;
    else if(it&&!why){const swap=(it.k==='w'&&me.inv.w[0]&&me.inv.w[1])||(it.k==='p'&&me.bag)||(it.k==='v'&&me.vest)||(it.k==='h'&&me.helm);pr=`<kbd>F</kbd>${swap?'Swap for ':'Pick up '}${esc(itemLabel(it))}`;}
    else{const v=nearestVeh(me,3.4);if(v){const free=v.seats.indexOf(null);if(free>=0)pr=`<kbd>F</kbd>${free===0?'Drive':'Ride'} ${esc(v.def.name)}`;}
      if(it&&why)pr=(pr?pr+'&nbsp;&nbsp;&nbsp;':'')+`${esc(itemLabel(it))} · ${why}`;}
  }else if(!me.dead&&me.mode==='veh')pr=`<kbd>F</kbd>Get out`;
  if(cache.pr!==pr){cache.pr=pr;hud.prompt.innerHTML=pr;hud.prompt.hidden=!pr;}
  // crosshair
  const showCross=!me.dead&&!me.knocked&&(me.mode==='ground'||(me.mode==='veh'&&me.seat>0))&&!adsOn();
  hud.cross.style.display=showCross?'':'none';
  if(showCross){const w=curW(me),d=w?WEAPONS[w.k]:null;let sp=d?(me.ads?d.aim:me.aiming?(d.aim+d.spread)/2:d.spread)+me.bloom+(me.speedNow>1.2?d.spread*0.5:0):1;if(me.crouch)sp*=0.75;
    const gap=Math.max(3,Math.tan(sp*DEG)/Math.tan(camera.fov*DEG/2)*innerHeight/2);
    const c=hud.cross.children;c[0].style.top=(-gap-8)+'px';c[1].style.top=gap+'px';c[2].style.left=(-gap-8)+'px';c[3].style.left=gap+'px';}
  // timers
  if(hitT>0){hitT-=dt;if(hitT<=0)hud.hitm.style.opacity=0;}
  if(centerT>0){centerT-=dt;if(centerT<=0)hud.center.hidden=true;}
  hurtT=Math.max(0,hurtT-dt);hud.vign.style.opacity=Math.max(hurtT*1.6,me.dead?0:(me.hp<30?0.5:0));
  drawCompass();drawMinimap(z);
  hud.bigmap.hidden=!G.mapOpen;if(G.mapOpen)drawBigMap(z);
  if(!$('pause').hidden&&(!cache.pT||G.t-cache.pT>0.5||G.t<cache.pT)){cache.pT=G.t;$('ptable').innerHTML=statsTable();}
  if(G.invOpen){if(invTab==='stats'){if(!cache.iT||G.t-cache.iT>0.5||G.t<cache.iT){cache.iT=G.t;$('invtable').innerHTML=statsTable();}}else renderInv();}
}

// ================= stats table =================
function statRows(){
  const dealt={};
  for(const e of ents.values())for(const[k,v]of Object.entries(e.st.dmgBy))dealt[k]=(dealt[k]||0)+v;
  const rows=[...ents.values()].map(e=>({e,dmg:dealt[e.id]||0}));
  const tk={},ta={};for(const r of rows){tk[r.e.team]=(tk[r.e.team]||0)+r.e.kills;if(!r.e.dead&&!r.e.left)ta[r.e.team]=1;}
  rows.sort((a,b)=>{const x=a.e.team,y=b.e.team;
    if(x!==y){const ax=!!ta[x],ay=!!ta[y];if(ax!==ay)return ax?-1:1;if(ax)return tk[y]-tk[x]||x-y;return (a.e.place||999)-(b.e.place||999)||x-y;}
    return a.e.slot-b.e.slot;});
  return rows;
}
function statsTable(){
  const rows=statRows(),sq=G.teamSize>1;
  let h=`<table><thead><tr><th>#</th><th>Player</th>${sq?'<th>Squad</th>':''}<th>Kills</th>${sq?'<th>Knocks</th>':''}<th>Damage</th><th>Heads</th><th>Acc.</th><th>Longest</th><th>Travel</th><th>Heals</th>${sq?'<th>Revives</th>':''}<th>Survived</th></tr></thead><tbody>`;
  const teamAlive={};for(const{e}of rows)if(!e.dead&&!e.left)teamAlive[e.team]=1;
  for(const{e,dmg}of rows){
    const s=e.st,acc=s.shots?Math.round(100*s.hits/s.shots)+'%':'—';
    const surv=e.dead?fmtT(e.deathT):fmtT(G.t);
    const place=teamAlive[e.team]&&!G.over?'<span class="alive">alive</span>':(e.place||'—');
    const dist=s.dist>=1000?(s.dist/1000).toFixed(2)+' km':Math.round(s.dist)+' m';
    const sqc=sq?`<td><span style="color:${TEAM_COL[e.slot%3]}">●</span> ${e.team+1}</td>`:'';
    h+=`<tr class="${e===me?'me':''} ${e.dead?'dead':''}"><td>${place}</td><td>${esc(e.name)}${e.isBot?'<span class="tag">BOT</span>':''}${e.left?'<span class="tag">LEFT</span>':''}</td>${sqc}<td>${e.kills}</td>${sq?`<td>${s.knocks}</td>`:''}<td>${Math.round(dmg)}</td><td>${s.heads}</td><td>${acc}</td><td>${s.longest?Math.round(s.longest)+' m':'—'}</td><td>${dist}</td><td>${s.heals}</td>${sq?`<td>${s.revives}</td>`:''}<td>${surv}</td></tr>`;
  }
  return h+'</tbody></table>';
}

