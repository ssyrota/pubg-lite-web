import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
const TRYSTERO_URL='https://cdn.jsdelivr.net/npm/@trystero-p2p/torrent@0.25.4/+esm';
const APP_ID='stormline-royale-p2p-v1';
const $=id=>document.getElementById(id);

// ================= utils =================
const DEG=Math.PI/180;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const angD=(a,b)=>{let d=(b-a)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;return d;};
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const r2=v=>Math.round(v*100)/100;

// ================= constants =================
const HALF=400,SIZE=800,HN=257,CELL=SIZE/(HN-1),GRID=20,GN=SIZE/GRID,STEP=0.55,RAD=0.38,BORDER=392,GRAV=22;
const AMMO=['9mm','5.56','7.62','12ga'];
const AMMO_PACK={'9mm':30,'5.56':30,'7.62':20,'12ga':10};
const WEAPONS={
  pistol:{name:'P-9 Pistol',ammo:'9mm',dmg:24,rpm:400,auto:false,mag:15,spread:1.7,aim:0.6,recoil:1.1,range:80,reload:1.6,len:0.32,iron:1.15,fits:{sight:['reddot','holo'],muzzle:['supp'],mag:['extmag','quickmag','extquick']},xmag:20,rank:1,snd:2600,sl:0.12,pref:16},
  smg:{name:'Kite SMG',ammo:'9mm',dmg:18,rpm:820,auto:true,mag:30,spread:2.6,aim:1.0,recoil:0.55,range:100,reload:2.1,len:0.6,iron:1.2,fits:{sight:['reddot','holo','x2','x4'],muzzle:['comp','flash','supp'],grip:['vgrip','agrip'],mag:['extmag','quickmag','extquick'],stock:['stock']},xmag:40,rank:2,snd:2100,sl:0.13,pref:18},
  shotgun:{name:'Breacher 12',ammo:'12ga',dmg:14,pellets:8,rpm:70,auto:false,mag:5,spread:5.5,aim:4.2,recoil:3.2,range:40,reload:3,len:0.9,iron:1.1,fits:{sight:['reddot','holo'],stock:['cheek']},rank:2,snd:900,sl:0.3,pref:7},
  rifle:{name:'AR-5 Rifle',ammo:'5.56',dmg:31,rpm:650,auto:true,mag:30,spread:1.9,aim:0.4,recoil:0.85,range:250,reload:2.4,len:0.85,iron:1.25,fits:{sight:['reddot','holo','x2','x4','x8'],muzzle:['comp','flash','supp'],grip:['vgrip','agrip'],mag:['extmag','quickmag','extquick'],stock:['stock']},xmag:40,rank:4,snd:1500,sl:0.2,pref:40},
  dmr:{name:'Vantage DMR',ammo:'7.62',dmg:54,rpm:220,auto:false,mag:10,spread:2.2,aim:0.15,recoil:2,range:450,reload:2.8,len:1.0,iron:1.25,fits:{sight:['reddot','holo','x2','x4','x8'],muzzle:['comp','flash','supp'],grip:['vgrip','agrip'],mag:['extmag','quickmag','extquick'],stock:['cheek']},xmag:20,rank:4,snd:1200,sl:0.32,pref:80},
  sniper:{name:'Longbow Bolt',ammo:'7.62',dmg:98,rpm:45,auto:false,mag:5,spread:3,aim:0.05,recoil:4,range:600,reload:3.4,len:1.15,iron:1.3,fits:{sight:['reddot','holo','x2','x4','x8'],muzzle:['comp','flash','supp'],mag:['extmag','quickmag','extquick'],stock:['cheek']},xmag:7,rank:5,snd:1000,sl:0.42,pref:110},
};
const ATT={
  reddot:{type:'sight',name:'Red dot sight',short:'Red dot',zoom:1.35,rank:1,view:'dot',info:'1× · clean dot'},
  holo:{type:'sight',name:'Holo sight',short:'Holo',zoom:1.35,rank:1,view:'holo',info:'1× · wide ring'},
  x2:{type:'sight',name:'2× scope',short:'2×',zoom:2,rank:2,view:'scope',info:'2× zoom'},
  x4:{type:'sight',name:'4× scope',short:'4×',zoom:4,rank:3,view:'scope',info:'4× zoom'},
  x8:{type:'sight',name:'8× scope',short:'8×',zoom:8,rank:4,view:'scope',info:'8× zoom'},
  comp:{type:'muzzle',name:'Compensator',short:'Comp',rank:2,vrec:0.75,hrec:0.7,info:'−25% vertical, −30% sideways recoil'},
  flash:{type:'muzzle',name:'Flash hider',short:'Flash',rank:1,vrec:0.88,hrec:0.85,noflash:true,info:'Hides muzzle flash, −12% recoil'},
  supp:{type:'muzzle',name:'Suppressor',short:'Supp',rank:3,vrec:0.92,hrec:0.92,quiet:true,noflash:true,info:'Quiet shots, no flash, −8% recoil'},
  vgrip:{type:'grip',name:'Vertical grip',short:'V-grip',rank:1,vrec:0.78,info:'−22% vertical recoil'},
  agrip:{type:'grip',name:'Angled grip',short:'A-grip',rank:1,hrec:0.7,hip:0.82,info:'−30% sideways recoil, tighter hip fire'},
  extmag:{type:'mag',name:'Extended mag',short:'Ext',rank:1,ext:true,info:'Bigger magazine'},
  quickmag:{type:'mag',name:'Quickdraw mag',short:'Quick',rank:1,reload:0.7,info:'30% faster reload'},
  extquick:{type:'mag',name:'Ext. quickdraw mag',short:'Ext+Q',rank:2,ext:true,reload:0.75,info:'Bigger magazine, 25% faster reload'},
  stock:{type:'stock',name:'Tactical stock',short:'Stock',rank:1,vrec:0.85,move:0.75,info:'−15% recoil, steadier on the move'},
  cheek:{type:'stock',name:'Cheek pad',short:'Cheek',rank:1,vrec:0.85,ads:0.8,info:'−15% recoil, tighter aim'},
};
const AK=Object.keys(ATT),SLOTS=['sight','muzzle','grip','mag','stock'];
const SLOT_NAME={sight:'Sight',muzzle:'Muzzle',grip:'Grip',mag:'Magazine',stock:'Stock'};
const ATT_W=3;
const ATT_COL={sight:0x2a3a44,muzzle:0x3a3a3a,grip:0x4a4032,mag:0x30343a,stock:0x4b3d2c};
const fits=(k,a)=>{const f=WEAPONS[k].fits[ATT[a].type];return !!f&&f.includes(a);};
const magCap=w=>{const d=WEAPONS[w.k],m=w.att.mag;return m&&ATT[m].ext?d.xmag||d.mag:d.mag;};
const attStr=att=>SLOTS.map(x=>att[x]||'').join('.');
const attFrom=str=>{const o={};(str||'').split('.').forEach((a,i)=>{if(a&&ATT[a])o[SLOTS[i]]=a;});return o;};
const newW=(k,mag,att)=>({k,mag,att:{...(att||{})},single:false});
function wStats(w){
  const r={vrec:1,hrec:1,hip:1,ads:1,move:1,reload:1,quiet:false,noflash:false};
  for(const x of SLOTS){const a=w.att[x];if(!a)continue;const d=ATT[a];r.vrec*=d.vrec||1;r.hrec*=d.hrec||1;r.hip*=d.hip||1;r.ads*=d.ads||1;r.move*=d.move||1;r.reload*=d.reload||1;if(d.quiet)r.quiet=true;if(d.noflash)r.noflash=true;}
  return r;
}
const AMMO_W={'9mm':0.4,'5.56':0.5,'7.62':0.7,'12ga':1.25},BAND_W=2,MED_W=20,BAG_CAP=[60,150,200,250];
const VEST_DUR=[0,200,220,250],HELM_DUR=[0,80,150,230];
const GEAR_COL=[0,0x8a8157,0x55603f,0x2a2f31],BAG_COL=[0,0x7a6845,0x5a5a3c,0x3c4238];
const TEAM_COL=['#f2c84b','#6fd1a0','#6fb6f2'];
const REVIVE_T=6;
const WK=Object.keys(WEAPONS);
const MODES=['plane','fall','chute','ground','dead','veh'];
const ARMOR=[0,0.3,0.4,0.55];
// Vehicles: jeep (4 seats, tough) and motorcycle (2 seats, fast). Local frame: forward is -z.
const VDEF={
  car:{name:'Rover 4x4',seats:4,hp:900,max:30,acc:8.5,brake:18,rev:7,turn:1.45,len:4.3,wid:2.0,h:1.15,mass:1,
    circ:[[0,-1.15,1.05],[0,1.15,1.05]],seat:[[-0.45,0.72,-0.05],[0.45,0.72,-0.05],[-0.45,0.72,0.95],[0.45,0.72,0.95]],exit:[[-1.7,-0.1],[1.7,-0.1],[-1.7,0.95],[1.7,0.95]],wheelR:0.42},
  bike:{name:'Trail Bike',seats:2,hp:500,max:38,acc:12,brake:20,rev:3.5,turn:2.1,len:2.1,wid:0.75,h:0.9,mass:0.45,
    circ:[[0,-0.55,0.5],[0,0.5,0.5]],seat:[[0,0.7,0.05],[0,0.76,0.55]],exit:[[-1.1,0],[1.1,0.45]],wheelR:0.36},
};
const DIFF={easy:{err:4.6,react:0.95,turn:4},normal:{err:2.5,react:0.55,turn:6},hard:{err:1.3,react:0.32,turn:8}};
const DIR8=[[1,0],[0.7071,0.7071],[0,1],[-0.7071,0.7071],[-1,0],[-0.7071,-0.7071],[0,-1],[0.7071,-0.7071]];
const TOWN_NAMES=['Brackwater','Halden','Mirefield','Tolva','Corrin Docks','Ashby','Northgate','Sunder Hill','Lowmarsh','Kettle Point','Varn','Greyfold'];
const BOT_NAMES=['Rook','Vex','Mako','Juno','Kestrel','Pike','Ash','Nova','Tarn','Wren','Bram','Echo','Flint','Gale','Hask','Ivo','Jett','Kobi','Lark','Moss','Nell','Orrin','Pax','Quill','Rhett','Sable','Tov','Ulla','Voss','Wynn','Yara','Zed','Brin','Cato','Dax','Elko','Fenn','Gus','Hollis','Iska','Jory','Koa','Lumen','Milo','Nash','Odie','Pryor','Rue','Sly','Tamsin','Uri','Vale','Wick','Xan','Yuri','Zola','Arlo','Bex','Cyd','Drey'];
const BOT_SUFFIX=['','','','_TTV','99','x','07','_gg','Prime','420','_77','HD','.exe','Jr'];

// ================= noise & terrain =================
function makeNoise(seed){
  const R=rng(seed),p=new Uint16Array(256),perm=new Uint16Array(512),val=new Float32Array(256);
  for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){const j=Math.floor(R()*(i+1));const t=p[i];p[i]=p[j];p[j]=t;}
  for(let i=0;i<512;i++)perm[i]=p[i&255];
  for(let i=0;i<256;i++)val[i]=R();
  return (x,z)=>{
    const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,ux=fx*fx*(3-2*fx),uz=fz*fz*(3-2*fz);
    const X=ix&255,Z=iz&255,X1=(X+1)&255,Z1=(Z+1)&255;
    const a=val[perm[X+perm[Z]]],b=val[perm[X1+perm[Z]]],c=val[perm[X+perm[Z1]]],d=val[perm[X1+perm[Z1]]];
    return a+(b-a)*ux+(c-a)*uz+(a-b-c+d)*ux*uz;
  };
}
// exact height on the triangulated terrain mesh
function hAtRaw(H,x,z){
  let fx=(x+HALF)/CELL,fz=(z+HALF)/CELL;
  fx=clamp(fx,0,HN-1.0001);fz=clamp(fz,0,HN-1.0001);
  const i=fx|0,j=fz|0,u=fx-i,v=fz-j;
  const a=H[j*HN+i],d=H[j*HN+i+1],b=H[(j+1)*HN+i],c=H[(j+1)*HN+i+1];
  if(u+v<=1)return a+(d-a)*u+(b-a)*v;
  return c+(b-c)*(1-u)+(d-c)*(1-v);
}
let W=null;
const hAt=(x,z)=>hAtRaw(W.H,x,z);

