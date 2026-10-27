// ================= meshes: characters, guns, vehicles, items, plane =================
const SKIN=[0xe0b896,0xc99a74,0x9c6b4a,0x6e4a33,0xf0cfb0];
const matCache=new Map();
const mc=c=>{if(!matCache.has(c))matCache.set(c,lam(c));return matCache.get(c);};
function part(mat,sx,sy,sz,x,y,z){const m=new THREE.Mesh(BOXG,mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=true;return m;}
function buildGun(k,att){
  const g=new THREE.Group();if(!k)return g;att=att||{};const d=WEAPONS[k],dark=mc(0x24282b),wood=mc(0x6b4a2e),mid=mc(0x3d4245),L=d.len;
  const furn=k==='shotgun'||k==='sniper'?wood:mid;
  g.add(part(dark,0.07,0.1,L*0.55,0,0,-L*0.3));
  g.add(part(dark,0.035,0.035,L*0.5,0,0.02,-L*0.75));
  if(k!=='pistol')g.add(part(furn,0.06,0.11,L*0.35,0,-0.02,L*0.08));
  g.add(part(mid,0.05,0.12,0.06,0,-0.1,-L*0.12));
  const magLen=att.mag&&ATT[att.mag].ext?0.24:0.16;
  if(k==='rifle'||k==='smg'||k==='dmr')g.add(part(att.mag==='quickmag'||att.mag==='extquick'?mc(0x4a3a2a):dark,0.05,magLen,0.07,0,-0.06-magLen/2,-L*0.32));
  if(k==='pistol'&&att.mag&&ATT[att.mag].ext)g.add(part(dark,0.04,0.08,0.05,0,-0.18,-L*0.12));
  const sc=att.sight;
  if(sc){const SL={reddot:0.09,holo:0.1,x2:0.18,x4:0.26,x8:0.34}[sc],R={reddot:0.05,holo:0.08,x2:0.05,x4:0.06,x8:0.07}[sc];g.add(part(dark,R,sc==='holo'?0.07:R,SL,0,0.09,-L*0.3));if(sc==='reddot'||sc==='holo')g.add(part(mc(0xc0392b),0.02,0.02,0.01,0,0.1,-L*0.3-SL/2));}
  const mz=att.muzzle;
  if(mz){const ml=mz==='supp'?0.22:0.07,mr=mz==='supp'?0.06:0.05;g.add(part(mc(mz==='supp'?0x1a1c1e:0x2f3336),mr,mr,ml,0,0.02,-L-ml/2));}
  if(att.grip==='vgrip'){const p=part(mid,0.04,0.12,0.04,0,-0.09,-L*0.58);g.add(p);}
  if(att.grip==='agrip'){const p=part(mid,0.04,0.05,0.1,0,-0.06,-L*0.58);p.rotation.x=0.5;g.add(p);}
  if(att.stock==='stock')g.add(part(mid,0.05,0.09,0.2,0,-0.02,L*0.08+0.12));
  if(att.stock==='cheek')g.add(part(mc(0x2c2a28),0.065,0.05,0.14,0,0.06,L*0.1));
  return g;
}
function buildChar(color,skin){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const shirt=mc(color),pants=mc(0x2e3336),sk=mc(skin),boot=mc(0x1c1d1f);
  const mkLeg=x=>{const l=new THREE.Group();l.position.set(x,0.88,0);l.add(part(pants,0.19,0.8,0.21,0,-0.4,0));l.add(part(boot,0.2,0.12,0.28,0,-0.82,-0.04));body.add(l);return l;};
  const legL=mkLeg(-0.12),legR=mkLeg(0.12);
  body.add(part(shirt,0.5,0.6,0.28,0,1.18,0));
  const vest=part(mc(0x5a6440),0.55,0.44,0.34,0,1.2,0);vest.visible=false;body.add(vest);
  const pack=part(mc(0x4b4436),0.34,0.36,0.16,0,1.18,0.22);pack.visible=false;body.add(pack);
  body.add(part(sk,0.25,0.27,0.25,0,1.62,0));
  const helm=part(mc(0x46503a),0.31,0.15,0.31,0,1.77,0);helm.visible=false;body.add(helm);
  const visor=part(mc(0x15181a),0.28,0.08,0.04,0,1.69,-0.15);visor.visible=false;body.add(visor);
  const upper=new THREE.Group();upper.position.set(0,1.4,0);body.add(upper);
  upper.add(part(shirt,0.13,0.13,0.5,0.24,-0.04,-0.2));upper.add(part(shirt,0.13,0.13,0.52,-0.12,-0.07,-0.28));
  upper.add(part(sk,0.11,0.11,0.11,0.2,-0.06,-0.47));upper.add(part(sk,0.11,0.11,0.11,-0.02,-0.05,-0.56));
  const gun=new THREE.Group();gun.position.set(0.1,-0.02,-0.42);upper.add(gun);
  const chute=new THREE.Group();
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(3.4,14,6,0,Math.PI*2,0,Math.PI/2.4),new THREE.MeshLambertMaterial({color:0xd8cfb8,side:THREE.DoubleSide}));
  canopy.scale.y=0.5;canopy.position.y=5.4;chute.add(canopy);
  const stripe=new THREE.Mesh(new THREE.SphereGeometry(3.42,14,2,0,Math.PI*2,Math.PI/3.2,Math.PI/2.4-Math.PI/3.2),new THREE.MeshLambertMaterial({color:color,side:THREE.DoubleSide}));
  stripe.scale.y=0.5;stripe.position.y=5.4;chute.add(stripe);
  for(const[x,z]of[[2.6,1],[-2.6,1],[2.6,-1],[-2.6,-1]]){const l=part(mc(0x333333),0.02,4.3,0.02,x/2,3.5,z/2);l.rotation.z=-x*0.17;chute.add(l);}
  chute.visible=false;g.add(chute);
  g.userData={body,legL,legR,upper,gun,vest,helm,visor,pack,chute,gunKey:null,gearKey:''};
  return g;
}
const ITEM_G={w:new THREE.BoxGeometry(0.95,0.12,0.26),a:new THREE.BoxGeometry(0.34,0.24,0.24),b:new THREE.BoxGeometry(0.3,0.14,0.22),m:new THREE.BoxGeometry(0.46,0.3,0.3),v:new THREE.BoxGeometry(0.5,0.58,0.16),h:new THREE.SphereGeometry(0.2,8,5,0,Math.PI*2,0,Math.PI/2),x:new THREE.BoxGeometry(0.28,0.1,0.14),p:new THREE.BoxGeometry(0.42,0.5,0.24)};
const ITEM_C={w:0x2c3236,a:0xc9a227,b:0xe8e2d0,m:0xc8372f,v:0x5b6b3a,h:0x4f5a3a,x:0x2b3a46,p:0x6b5a3a};
const itemMats={};
function itemMat(k){if(!itemMats[k])itemMats[k]=new THREE.MeshLambertMaterial({color:ITEM_C[k],emissive:0x2a2a22});return itemMats[k];}
function buildPlane(){
  const g=new THREE.Group(),m=mc(0x7e8a8f),d=mc(0x55606a);
  g.add(part(m,4.2,4.2,30,0,0,0));g.add(part(m,38,0.5,5.5,0,0.6,-1));g.add(part(m,12,0.4,3,0,1.4,13));g.add(part(d,0.4,5,3.5,0,4,13.5));
  for(const x of[-12,-6,6,12]){const e=part(d,1.3,1.3,3.4,x,-0.1,-2.6);g.add(e);}
  g.add(part(mc(0x2b3236),3.2,1,1,0,1.2,-15));
  return g;
}

