// ================= end / death =================
function pickSpectate(after){
  let alive=[...ents.values()].filter(e=>!e.dead&&!e.left);if(!alive.length)return null;
  if(me&&G.teamSize>1){const mates=alive.filter(e=>e.team===me.team);alive=mates.concat(alive.filter(e=>e.team!==me.team));}
  if(!after||!alive.includes(after))return alive[0];const i=alive.indexOf(after);return alive[(i+1)%alive.length];
}
function onMyDeath(killer){
  G.spec=pickSpectate()||killer;
  if(G.teamSize<=1&&killer&&!killer.dead)G.spec=killer;
  if(G.spec){look.yaw=G.spec.yaw;}
  setTimeout(()=>{if(!G.running||G.endShown&&!$('end').hidden)return;showEnd(false);},1600);
}
function checkEnd(){
  if(!G.running||!me)return;
  if(teamsAlive()<=1&&!G.over){
    G.over=true;
    const w=[...ents.values()].find(e=>!e.dead&&!e.left);
    if(w){for(const e of ents.values())if(e.team===w.team)e.place=1;}
    if(w&&w.team===me.team){setTimeout(()=>showEnd(true),900);sfx.tone(440,0.4,0.3,'triangle',880);}
    else if(G.endShown)showEnd(false);
    broadcastStats();
  }
}
function showEnd(win){
  G.endShown=true;if(G.invOpen){G.invOpen=false;$('inv').hidden=true;}
  if(document.pointerLockElement)document.exitPointerLock();
  $('pause').hidden=true;
  const sq=G.teamSize>1,total=sq?new Set([...ents.values()].map(e=>e.team)).size:G.total;
  const myTeamAlive=[...ents.values()].some(e=>e.team===me.team&&!e.dead&&!e.left);
  const place=win?1:(me.place||(myTeamAlive?'—':'?'));
  $('eplace').innerHTML=`#${place}<small>/${total}</small>`;
  const winner=[...ents.values()].find(e=>!e.dead&&!e.left);
  const v=$('everdict');v.className='verdict'+(win?' win':'');
  v.textContent=win?(sq?'Your squad won':'Last one standing'):(G.over&&winner?`${sq?winner.name+"'s squad":winner.name} won the match`:(sq&&myTeamAlive?'You are out · your squad fights on':'You were eliminated'));
  const dealt=[...ents.values()].reduce((a,e)=>a+(e.st.dmgBy[me.id]||0),0);
  $('esub').textContent=`${me.kills} kill${me.kills===1?'':'s'} · ${Math.round(dealt)} damage · survived ${fmtT(me.dead?me.deathT:G.t)}`;
  $('etable').innerHTML=statsTable();
  $('btnSpec').hidden=G.over||!me.dead||!G.spec;
  $('end').hidden=false;
}
$('btnSpec').onclick=()=>{$('end').hidden=true;lockPointer();};
$('btnMenu').onclick=()=>leaveMatch();
$('btnResume').onclick=()=>{G.retried=false;lockPointer();};
$('btnQuit').onclick=()=>leaveMatch();

