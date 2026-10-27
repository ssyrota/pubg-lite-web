// ================= raycasting & collision =================
let stamp=1;
const _near=[];
function nearBoxes(x,z,r){
  stamp++;_near.length=0;const M=W.mark,B=W.boxes,C=W.cells;
  const gx0=clamp(Math.floor((x-r+HALF)/GRID),0,GN-1),gx1=clamp(Math.floor((x+r+HALF)/GRID),0,GN-1),gz0=clamp(Math.floor((z-r+HALF)/GRID),0,GN-1),gz1=clamp(Math.floor((z+r+HALF)/GRID),0,GN-1);
  for(let gz=gz0;gz<=gz1;gz++)for(let gx=gx0;gx<=gx1;gx++){const cell=C[gz*GN+gx];for(let k=0;k<cell.length;k++){const i=cell[k];if(M[i]===stamp)continue;M[i]=stamp;const b=B[i];if(x+r<b.x0||x-r>b.x1||z+r<b.z0||z-r>b.z1)continue;_near.push(b);}}
  return _near;
}
function slab(o,ix,iy,iz,b){
  let t1=(b.x0-o.x)*ix,t2=(b.x1-o.x)*ix,tmin=Math.min(t1,t2),tmax=Math.max(t1,t2);
  t1=(b.y0-o.y)*iy;t2=(b.y1-o.y)*iy;tmin=Math.max(tmin,Math.min(t1,t2));tmax=Math.min(tmax,Math.max(t1,t2));
  t1=(b.z0-o.z)*iz;t2=(b.z1-o.z)*iz;tmin=Math.max(tmin,Math.min(t1,t2));tmax=Math.min(tmax,Math.max(t1,t2));
  if(tmax<0||tmin>tmax||tmin<0)return Infinity;return tmin;
}
function rayBoxes(o,d,best){
  stamp++;const M=W.mark,B=W.boxes,C=W.cells;
  const ix=Math.abs(d.x)>1e-9?1/d.x:1e12,iy=Math.abs(d.y)>1e-9?1/d.y:1e12,iz=Math.abs(d.z)>1e-9?1/d.z:1e12;
  let gx=Math.floor((o.x+HALF)/GRID),gz=Math.floor((o.z+HALF)/GRID);
  const sx=d.x>0?1:-1,sz=d.z>0?1:-1;
  let tMaxX=Math.abs(d.x)>1e-9?((gx+(sx>0?1:0))*GRID-HALF-o.x)*ix:Infinity;
  let tMaxZ=Math.abs(d.z)>1e-9?((gz+(sz>0?1:0))*GRID-HALF-o.z)*iz:Infinity;
  const tdx=Math.abs(d.x)>1e-9?Math.abs(GRID*ix):Infinity,tdz=Math.abs(d.z)>1e-9?Math.abs(GRID*iz):Infinity;
  let tc=0;
  for(let it=0;it<160&&tc<=best;it++){
    if(gx>=0&&gx<GN&&gz>=0&&gz<GN){const cell=C[gz*GN+gx];for(let k=0;k<cell.length;k++){const bi=cell[k];if(M[bi]===stamp)continue;M[bi]=stamp;const t=slab(o,ix,iy,iz,B[bi]);if(t<best)best=t;}}
    else if((gx<0&&sx<0)||(gx>=GN&&sx>0)||(gz<0&&sz<0)||(gz>=GN&&sz>0))break;
    if(tMaxX<tMaxZ){tc=tMaxX;tMaxX+=tdx;gx+=sx;}else{tc=tMaxZ;tMaxZ+=tdz;gz+=sz;}
  }
  return best;
}
function rayTerrain(o,d,best){
  if(o.y<hAt(o.x,o.z))return best;
  const step=1.5;let tp=0;
  for(let t=step;;t+=step){
    const tt=Math.min(t,best),y=o.y+d.y*tt;
    if(y>80&&d.y>=0)break;
    if(y<hAt(o.x+d.x*tt,o.z+d.z*tt)){let a=tp,b=tt;for(let i=0;i<7;i++){const m=(a+b)/2;if(o.y+d.y*m<hAt(o.x+d.x*m,o.z+d.z*m))b=m;else a=m;}return b;}
    tp=tt;if(tt>=best)break;
  }
  return best;
}
function raySphere(o,d,cx,cy,cz,r){
  const ox=o.x-cx,oy=o.y-cy,oz=o.z-cz,b=ox*d.x+oy*d.y+oz*d.z,c=ox*ox+oy*oy+oz*oz-r*r,h=b*b-c;
  if(h<0)return Infinity;const t=-b-Math.sqrt(h);return t>0?t:Infinity;
}
function rayVeh(o,d,v,best){
  const cs=Math.cos(v.yaw),sn=Math.sin(v.yaw),dx=o.x-v.pos.x,dz=o.z-v.pos.z;
  const lo={x:dx*cs-dz*sn,y:o.y-v.pos.y,z:dx*sn+dz*cs},ld={x:d.x*cs-d.z*sn,y:d.y,z:d.x*sn+d.z*cs};
  const def=v.def,b={x0:-def.wid/2,x1:def.wid/2,y0:0.2,y1:def.h,z0:-def.len/2,z1:def.len/2};
  const t=slab(lo,Math.abs(ld.x)>1e-9?1/ld.x:1e12,Math.abs(ld.y)>1e-9?1/ld.y:1e12,Math.abs(ld.z)>1e-9?1/ld.z:1e12,b);
  return t<best?t:Infinity;
}
const RC={t:0,ent:null,head:false,veh:null,point:new THREE.Vector3()};
function raycast(o,d,maxT,ignore,withEnts=true){
  let best=rayBoxes(o,d,maxT);best=rayTerrain(o,d,best);
  let ent=null,head=false,veh=null;
  const ignV=ignore&&ignore.mode==='veh'?ignore.veh:null;
  for(const v of vehs.values()){if(v===ignV)continue;const t=rayVeh(o,d,v,best);if(t<best){best=t;veh=v;}}
  if(withEnts)for(const e of ents.values()){
    if(e===ignore||e.dead||e.mode==='plane'||e.left)continue;
    const cr=e.crouch&&e.mode==='ground',y=e.pos.y;
    if(e.knocked){const fx=-Math.sin(e.yaw)*0.7,fz=-Math.cos(e.yaw)*0.7;
      let t=raySphere(o,d,e.pos.x+fx,y+0.32,e.pos.z+fz,0.2);if(t<best){best=t;ent=e;head=true;veh=null;}
      t=raySphere(o,d,e.pos.x,y+0.3,e.pos.z,0.45);if(t<best){best=t;ent=e;head=false;veh=null;}continue;}
    const lo=leanOff(e),lx=Math.cos(e.yaw)*lo,lz=-Math.sin(e.yaw)*lo;
    let t=raySphere(o,d,e.pos.x+lx,y+(cr?1.2:1.62)-Math.abs(lo)*0.15,e.pos.z+lz,0.21);if(t<best){best=t;ent=e;head=true;veh=null;}
    t=raySphere(o,d,e.pos.x+lx*0.5,y+(cr?0.8:1.12),e.pos.z+lz*0.5,0.42);if(t<best){best=t;ent=e;head=false;veh=null;}
    if(e.mode!=='veh'){t=raySphere(o,d,e.pos.x,y+0.45,e.pos.z,0.32);if(t<best){best=t;ent=e;head=false;veh=null;}}
  }
  RC.t=best;RC.ent=ent;RC.head=head;RC.veh=veh;RC.point.copy(o).addScaledVector(d,best);
  return RC;
}
const _c={x:0,z:0,r:0};
function vCirc(v,i,out){const c=v.def.circ[i],cs=Math.cos(v.yaw),sn=Math.sin(v.yaw);out.x=v.pos.x+c[0]*cs+c[1]*sn;out.z=v.pos.z-c[0]*sn+c[1]*cs;out.r=c[2];return out;}
function collideXZ(p,feet,head,skipVeh){
  for(let it=0;it<2;it++){
    const list=nearBoxes(p.x,p.z,RAD+0.1);
    for(const b of list){
      if(b.y1<=feet+STEP||b.y0>=head)continue;
      const cx=clamp(p.x,b.x0,b.x1),cz=clamp(p.z,b.z0,b.z1);
      const dx=p.x-cx,dz=p.z-cz,d2=dx*dx+dz*dz;
      if(d2>=RAD*RAD)continue;
      if(d2>1e-8){const d=Math.sqrt(d2),k=(RAD-d)/d;p.x+=dx*k;p.z+=dz*k;}
      else{const l=p.x-b.x0,r=b.x1-p.x,f=p.z-b.z0,bk=b.z1-p.z,m=Math.min(l,r,f,bk);
        if(m===l)p.x=b.x0-RAD;else if(m===r)p.x=b.x1+RAD;else if(m===f)p.z=b.z0-RAD;else p.z=b.z1+RAD;}
    }
    for(const v of vehs.values()){
      if(v===skipVeh||Math.abs(v.pos.x-p.x)>4||Math.abs(v.pos.z-p.z)>4)continue;
      if(feet>v.pos.y+v.def.h+0.6||head<v.pos.y)continue;
      for(let i=0;i<v.def.circ.length;i++){vCirc(v,i,_c);const dx=p.x-_c.x,dz=p.z-_c.z,d2=dx*dx+dz*dz,rr=_c.r+RAD;
        if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2),k=(rr-d)/d;p.x+=dx*k;p.z+=dz*k;}}
    }
  }
}
function groundAt(x,z,feet){
  let g=Math.max(hAt(x,z),-1.15);
  for(const b of nearBoxes(x,z,RAD*0.6)){if(b.y1<=feet+STEP&&b.y1>g)g=b.y1;}
  return g;
}
function surfaceAt(e){if(e.pos.y<-0.25)return 'water';const h=hAt(e.pos.x,e.pos.z);if(e.pos.y-h>0.08)return 'floor';return h<1.5?'sand':'grass';}
function bldAt(p){for(let i=0;i<W.blds.length;i++){const b=W.blds[i];if(p.x>b.x0&&p.x<b.x1&&p.z>b.z0&&p.z<b.z1&&p.y>b.base-1&&p.y<b.base+b.h)return i;}return -1;}

