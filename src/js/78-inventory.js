// ================= inventory screen =================
let invDirty=true,invTab='inv',invSig='',drag=null,invMsgT=0;
function invMsg(t){$('invmsg').textContent=t;clearTimeout(invMsgT);invMsgT=setTimeout(()=>$('invmsg').textContent='',2600);}
function openInv(tab){
  if(!G.running||!me)return;
  G.invOpen=true;invTab=tab||(me.dead?'stats':'inv');invDirty=true;G.ads=false;mouseL=mouseR=false;
  $('pause').hidden=true;$('inv').hidden=false;
  if(document.pointerLockElement)document.exitPointerLock();
  cache.iT=0;renderInv();
}
function closeInv(){
  G.invOpen=false;$('inv').hidden=true;drag=null;
  if(G.running&&$('end').hidden){if(G.freeCursor){G.locked=true;}else{G.retried=false;lockPointer();}}
}
const ICON={w:'GUN',b:'BND',m:'MED',p:'BAG',v:'VST',h:'HLM'},SLOT_IC={sight:'SGT',muzzle:'MZL',grip:'GRP',mag:'MAG',stock:'STK'};
const icon=it=>it.k==='a'?it.t:it.k==='x'?SLOT_IC[ATT[it.t].type]:ICON[it.k]+(it.lv?it.lv:'');
function invNear(){if(me.dead||me.mode!=='ground')return[];return[...items.values()].filter(it=>Math.hypot(it.x-me.pos.x,it.z-me.pos.z)<3.2&&Math.abs(it.y-me.pos.y)<2).sort((a,b)=>Math.hypot(a.x-me.pos.x,a.z-me.pos.z)-Math.hypot(b.x-me.pos.x,b.z-me.pos.z));}
function renderInv(force){
  const head=document.querySelectorAll('[data-itab]');head.forEach(b=>b.classList.toggle('on',b.dataset.itab===invTab));
  $('invbody').hidden=invTab!=='inv';$('invstats').hidden=invTab!=='stats';
  if(invTab==='stats'){if(force||invDirty){$('invtable').innerHTML=statsTable();invDirty=false;}return;}
  if(drag)return;
  const near=invNear();
  const sig=JSON.stringify([me.inv,me.vest,me.helm,me.bag,Math.round(me.vd),Math.round(me.hd),near.map(i=>i.id),me.dead]);
  if(!invDirty&&!force&&sig===invSig)return;invSig=sig;invDirty=false;
  // nearby
  let h='';
  for(const it of near){const why=pickBlock(me,it);
    h+=`<div class="it" data-a="pick" data-id="${it.id}" draggable="true" title="${esc(it.k==='x'?ATT[it.t].info:'')}"><span class="ic">${esc(icon(it))}</span><span>${esc(itemLabel(it))}${why?`<small>${why}</small>`:it.k==='x'?`<small>${esc(ATT[it.t].info)}</small>`:''}</span><span class="n">${it.n&&it.k!=='w'?it.n:''}</span></div>`;}
  $('nearList').innerHTML=h||'<div class="empty">Nothing on the ground near you.</div>';
  // backpack
  const used=capUsed(me),cap=BAG_CAP[me.bag];
  $('capTxt').textContent=`${Math.round(used)} / ${cap}`;$('capFill').style.width=Math.min(100,100*used/cap)+'%';
  h='';
  for(const a of AMMO)if(me.inv.ammo[a]>0)h+=`<div class="it" data-a="ammo" data-t="${a}"><span class="ic">${a}</span><span>${a} ammo<small>${(me.inv.ammo[a]*AMMO_W[a]).toFixed(0)} weight · right-click drops, shift halves</small></span><span class="n">${me.inv.ammo[a]}</span></div>`;
  if(me.inv.band)h+=`<div class="it" data-a="band"><span class="ic">BND</span><span>Bandage<small>Click to use · heals to 75</small></span><span class="n">${me.inv.band}</span></div>`;
  if(me.inv.med)h+=`<div class="it" data-a="med"><span class="ic">MED</span><span>Med kit<small>Click to use · heals to 100</small></span><span class="n">${me.inv.med}</span></div>`;
  me.inv.att.forEach((a,i)=>{h+=`<div class="it" data-a="batt" data-i="${i}" draggable="true" title="${esc(ATT[a].info)}"><span class="ic">${SLOT_IC[ATT[a].type]}</span><span>${esc(ATT[a].name)}<small>${esc(ATT[a].info)}</small></span><span class="n"></span></div>`;});
  $('bagList').innerHTML=h||'<div class="empty">Your backpack is empty.</div>';
  // gear
  const gb=(g,label,lv,dur,max)=>`<div class="gbox" data-a="gear" data-g="${g}" title="Right-click to drop"><small>${label}</small><span>${lv?'Level '+lv:'—'}</span>${max?`<div class="dur"><i style="width:${Math.round(100*clamp(dur/max,0,1))}%"></i></div>`:''}</div>`;
  $('gearRow').innerHTML=gb('h','Helmet',me.helm,me.hd,HELM_DUR[me.helm])+gb('v','Vest',me.vest,me.vd,VEST_DUR[me.vest])+gb('p','Backpack',me.bag,0,0);
  // guns
  h='';
  for(let i=0;i<2;i++){
    const w=me.inv.w[i];
    if(!w){h+=`<div class="gun none" data-a="gunslot" data-w="${i}">${i+1} · Empty slot</div>`;continue;}
    const d=WEAPONS[w.k],ws=wStats(w);
    const rec=Math.round((1-(ws.vrec+ws.hrec)/2)*100);
    h+=`<div class="gun ${me.inv.cur===i?'on':''}" data-a="gun" data-w="${i}" draggable="true"><div class="top"><span>${i+1} · ${esc(d.name)}</span><span class="am">${w.mag}/${magCap(w)} · ${me.inv.ammo[d.ammo]} ${d.ammo}${d.auto?` <button data-a="mode" data-w="${i}">${w.single?'SINGLE':'AUTO'}</button>`:''}</span></div><div class="slots">`;
    for(const sl of SLOTS){
      const allow=d.fits[sl];
      if(!allow){h+=`<div class="slotx na"><small>${SLOT_NAME[sl]}</small><span>—</span></div>`;continue;}
      const a=w.att[sl];
      h+=`<div class="slotx ${a?'fill':''}" data-a="slot" data-w="${i}" data-s="${sl}" ${a?'draggable="true"':''} title="${a?esc(ATT[a].info)+' · click to remove':'Fits: '+allow.map(x=>ATT[x].short).join(', ')}"><small>${SLOT_NAME[sl]}</small><span>${a?esc(ATT[a].short):'Empty'}</span></div>`;
    }
    h+=`</div><div class="st">Recoil ${rec>0?'−'+rec+'%':'base'} · Reload ${(d.reload*ws.reload).toFixed(1)}s${ws.quiet?' · suppressed':''}${w.att.sight?' · '+ATT[w.att.sight].zoom+'× sight':''}</div></div>`;
  }
  $('gunCards').innerHTML=h;
}
function invAttachBag(i,wi){
  const a=me.inv.att[i];if(!a)return false;
  if(wi==null){wi=-1;for(const j of(me.inv.cur>=0?[me.inv.cur,1-me.inv.cur]:[0,1])){const w=me.inv.w[j];if(w&&fits(w.k,a)&&!w.att[ATT[a].type]){wi=j;break;}}
    if(wi<0)for(const j of[0,1]){const w=me.inv.w[j];if(w&&fits(w.k,a)){wi=j;break;}}}
  const w=me.inv.w[wi];if(!w||!fits(w.k,a)){invMsg(`${ATT[a].name} doesn't fit ${w?WEAPONS[w.k].name:'any weapon'}`);return false;}
  me.inv.att.splice(i,1);const old=attachTo(me,wi,a);if(old)me.inv.att.push(old);
  sfx.attach();invDirty=true;return true;
}
function invDetach(wi,sl,toGround){
  const w=me.inv.w[wi];if(!w||!w.att[sl])return;const a=w.att[sl];delete w.att[sl];clampMag(me,w);
  if(!toGround&&capRoom(me,ATT_W)>=1)me.inv.att.push(a);else{requestDrop(me,[{k:'x',t:a}]);if(!toGround)invMsg('Backpack full · dropped it');}
  sfx.attach();invDirty=true;
}
function invDropWeapon(wi){
  const w=me.inv.w[wi];if(!w)return;me.inv.w[wi]=null;
  if(me.inv.cur===wi)me.inv.cur=me.inv.w[1-wi]?1-wi:-1;
  me.reloadT=0;requestDrop(me,[{k:'w',t:w.k,n:w.mag,att:{...w.att}}]);invDirty=true;
}
function invDropGear(g){
  if(g==='v'&&me.vest){requestDrop(me,[{k:'v',lv:me.vest,dur:Math.round(me.vd)}]);me.vest=0;me.vd=0;}
  else if(g==='h'&&me.helm){requestDrop(me,[{k:'h',lv:me.helm,dur:Math.round(me.hd)}]);me.helm=0;me.hd=0;}
  else if(g==='p'&&me.bag){if(capUsed(me)>BAG_CAP[0]){invMsg('Too much inside · empty the backpack first');return;}requestDrop(me,[{k:'p',lv:me.bag}]);me.bag=0;}
  invDirty=true;
}
function invDropStack(kind,t,half){
  if(kind==='ammo'){const n=me.inv.ammo[t],d=half?Math.ceil(n/2):n;if(!d)return;me.inv.ammo[t]-=d;requestDrop(me,[{k:'a',t,n:d}]);}
  else if(kind==='band'){const n=me.inv.band,d=half?Math.ceil(n/2):n;if(!d)return;me.inv.band-=d;requestDrop(me,[{k:'b',n:d}]);}
  else if(kind==='med'){const n=me.inv.med,d=half?Math.ceil(n/2):n;if(!d)return;me.inv.med-=d;requestDrop(me,[{k:'m',n:d}]);}
  invDirty=true;
}
function invPick(id,attTo){
  const it=items.get(id);if(!it)return;const why=pickBlock(me,it);if(why){invMsg(why);return;}
  if(attTo!=null&&it.k==='x')me.pendingAtt={id,w:attTo};
  requestPick(me,it);
}
const inv=$('inv');
inv.addEventListener('click',e=>{
  const tab=e.target.closest('[data-itab]');if(tab){invTab=tab.dataset.itab;invDirty=true;renderInv(true);return;}
  const el=e.target.closest('[data-a]');if(!el||me.dead)return;
  const a=el.dataset.a,wi=el.dataset.w!=null?+el.dataset.w:null;
  if(a==='mode'){e.stopPropagation();const w=me.inv.w[wi];if(w){w.single=!w.single;invDirty=true;}}
  else if(a==='pick')invPick(el.dataset.id);
  else if(a==='batt')invAttachBag(+el.dataset.i);
  else if(a==='slot'){if(me.inv.w[wi].att[el.dataset.s])invDetach(wi,el.dataset.s,false);}
  else if(a==='gun'){me.inv.cur=wi;me.reloadT=0;invDirty=true;}
  else if(a==='band'){startHeal(me,'b');if(me.healT<=0)invMsg('Bandages only heal up to 75');}
  else if(a==='med'){startHeal(me,'m');}
  renderInv(true);
});
inv.addEventListener('contextmenu',e=>{
  e.preventDefault();const el=e.target.closest('[data-a]');if(!el||me.dead)return;
  const a=el.dataset.a,wi=el.dataset.w!=null?+el.dataset.w:null;
  if(a==='ammo')invDropStack('ammo',el.dataset.t,e.shiftKey);
  else if(a==='band'||a==='med')invDropStack(a,null,e.shiftKey);
  else if(a==='batt'){const x=me.inv.att.splice(+el.dataset.i,1)[0];if(x)requestDrop(me,[{k:'x',t:x}]);invDirty=true;}
  else if(a==='slot')invDetach(wi,el.dataset.s,true);
  else if(a==='gun')invDropWeapon(wi);
  else if(a==='gear')invDropGear(el.dataset.g);
  renderInv(true);
});
inv.addEventListener('dragstart',e=>{
  const el=e.target.closest('[draggable=true]');if(!el)return;
  const a=el.dataset.a;
  if(a==='batt')drag={src:'bag',att:me.inv.att[+el.dataset.i],i:+el.dataset.i};
  else if(a==='slot')drag={src:'slot',w:+el.dataset.w,s:el.dataset.s,att:me.inv.w[+el.dataset.w].att[el.dataset.s]};
  else if(a==='pick'){const it=items.get(el.dataset.id);drag={src:'near',id:el.dataset.id,att:it&&it.k==='x'?it.t:null};}
  else if(a==='gun')drag={src:'gun',w:+el.dataset.w};
  e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain','x');}catch(err){}
  if(drag&&drag.att)document.querySelectorAll('.slotx[data-s]').forEach(sx=>{const w=me.inv.w[+sx.dataset.w];if(w&&fits(w.k,drag.att))sx.classList.add('ok');});
});
const dropTarget=e=>e.target.closest('.slotx[data-s],.list[data-drop],.gun[data-w],.gun.none');
inv.addEventListener('dragover',e=>{if(!drag)return;const t=dropTarget(e);if(!t)return;e.preventDefault();document.querySelectorAll('#inv .hot').forEach(x=>x.classList.remove('hot'));t.classList.add('hot');});
inv.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('#inv .hot,#inv .ok').forEach(x=>x.classList.remove('hot','ok'));invDirty=true;renderInv(true);});
inv.addEventListener('drop',e=>{
  e.preventDefault();const t=dropTarget(e),d=drag;drag=null;if(!t||!d||me.dead){renderInv(true);return;}
  if(t.classList.contains('slotx')){
    const wi=+t.dataset.w,sl=t.dataset.s,w=me.inv.w[wi];
    if(!d.att||!w||ATT[d.att].type!==sl||!fits(w.k,d.att)){invMsg(d.att?`${ATT[d.att].name} doesn't fit there`:'Only attachments go in that slot');}
    else if(d.src==='bag')invAttachBag(d.i,wi);
    else if(d.src==='slot'&&(d.w!==wi)){const src=me.inv.w[d.w];delete src.att[d.s];clampMag(me,src);const old=attachTo(me,wi,d.att);if(old){if(fits(src.k,old))src.att[ATT[old].type]=old;else stashAtt(me,old,[]);}sfx.attach();}
    else if(d.src==='near')invPick(d.id,wi);
  }else if(t.dataset.drop==='bag'){
    if(d.src==='slot')invDetach(d.w,d.s,false);else if(d.src==='near')invPick(d.id);
  }else if(t.dataset.drop==='near'){
    if(d.src==='bag'){const x=me.inv.att.splice(d.i,1)[0];if(x)requestDrop(me,[{k:'x',t:x}]);}
    else if(d.src==='slot')invDetach(d.w,d.s,true);
    else if(d.src==='gun')invDropWeapon(d.w);
  }else if(t.classList.contains('gun')||t.classList.contains('none')){
    const wi=+t.dataset.w;
    if(d.src==='gun'&&d.w!==wi){const a=me.inv.w;[a[0],a[1]]=[a[1],a[0]];if(me.inv.cur>=0)me.inv.cur=1-me.inv.cur;}
    else if(d.src==='bag')invAttachBag(d.i,wi);
    else if(d.src==='slot'&&d.w!==wi&&me.inv.w[wi]&&fits(me.inv.w[wi].k,d.att)){const src=me.inv.w[d.w];delete src.att[d.s];clampMag(me,src);const old=attachTo(me,wi,d.att);if(old)stashAtt(me,old,[]);sfx.attach();}
    else if(d.src==='near')invPick(d.id,wi);
  }
  document.querySelectorAll('#inv .hot,#inv .ok').forEach(x=>x.classList.remove('hot','ok'));
  invDirty=true;renderInv(true);
});

