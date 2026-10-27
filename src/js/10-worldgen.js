// ================= world generation (deterministic: only + - * / sqrt floor) =================
function genWorld(seed,size){
  const R=rng(seed),nA=makeNoise(seed+101),nB=makeNoise(seed+202),nC=makeNoise(seed+303);
  const fbm=(n,x,z,o)=>{let a=1,f=1,s=0,t=0;for(let i=0;i<o;i++){s+=n(x*f,z*f)*a;t+=a;a*=0.5;f*=2.03;}return s/t;};
  const H=new Float32Array(HN*HN);
  for(let j=0;j<HN;j++)for(let i=0;i<HN;i++){
    const x=-HALF+i*CELL,z=-HALF+j*CELL;
    const d=Math.sqrt(x*x+z*z)/HALF;
    const edge=0.83+(fbm(nB,x/150+31,z/150-17,3)-0.5)*0.5;
    const m=1-smooth(edge-0.18,edge+0.03,d);
    const e=fbm(nA,x/230,z/230,5);
    H[j*HN+i]=(2.2+e*e*e*80)*m-(1-m)*9;
  }
  const w={seed,size:size||800,H,towns:[],blds:[],boxes:[],spots:[],trees:[],rocks:[],bushes:[],vspawn:[],loot:[]};
  const hh=(x,z)=>hAtRaw(H,x,z);
  const names=TOWN_NAMES.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  // towns
  for(let tries=0;tries<500&&w.towns.length<8;tries++){
    const x=(R()*2-1)*290,z=(R()*2-1)*290,r=32+R()*20;
    if(hh(x,z)<3)continue;
    let ok=true;for(const[dx,dz]of DIR8){if(hh(x+dx*r*1.2,z+dz*r*1.2)<1.5){ok=false;break;}}
    if(!ok)continue;
    if(w.towns.some(t=>(t.x-x)*(t.x-x)+(t.z-z)*(t.z-z)<(t.r+r+50)*(t.r+r+50)))continue;
    w.towns.push({x,z,r,name:names[w.towns.length]});
  }
  for(const t of w.towns){
    const base=Math.max(hh(t.x,t.z),2.5);t.base=base;
    const R2=t.r*1.45;
    const i0=Math.max(0,Math.floor((t.x-R2+HALF)/CELL)),i1=Math.min(HN-1,Math.ceil((t.x+R2+HALF)/CELL));
    const j0=Math.max(0,Math.floor((t.z-R2+HALF)/CELL)),j1=Math.min(HN-1,Math.ceil((t.z+R2+HALF)/CELL));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const x=-HALF+i*CELL,z=-HALF+j*CELL,d=Math.sqrt((x-t.x)*(x-t.x)+(z-t.z)*(z-t.z));
      const k=1-smooth(t.r*0.95,R2,d);
      H[j*HN+i]+= (base-H[j*HN+i])*k;
    }
  }
  const foot=[];
  const freeFoot=(x0,z0,x1,z1,m)=>!foot.some(f=>x0<f.x1+m&&x1>f.x0-m&&z0<f.z1+m&&z1>f.z0-m);
  const addBox=(x0,y0,z0,x1,y1,z1,c,vis=true)=>{w.boxes.push({x0,y0,z0,x1,y1,z1,c,vis});return w.boxes.length-1;};
  const inTown=(x,z,m)=>w.towns.some(t=>(t.x-x)*(t.x-x)+(t.z-z)*(t.z-z)<(t.r*m)*(t.r*m));
  const WALLC=[0xb9b2a1,0xa86f55,0xd2c38f,0x8e9c97,0xc7c1b4,0x9a8a74,0x7d8a6f];
  const ROOFC=[0x5b4a42,0x4a5257,0x6b5b4a,0x3f4a44];
  function building(cx,cz,type){
    let bw,bd,h;
    if(type===0){bw=8+R()*3.5;bd=7+R()*3;h=3.4;}else if(type===1){bw=15+R()*6;bd=11+R()*4;h=6;}else{bw=5+R()*1.5;bd=5+R()*1.5;h=3.1;}
    bw=Math.round(bw*2)/2;bd=Math.round(bd*2)/2;
    const x0=cx-bw/2,x1=cx+bw/2,z0=cz-bd/2,z1=cz+bd/2;
    if(Math.abs(cx)>BORDER-20||Math.abs(cz)>BORDER-20)return false;
    if(!freeFoot(x0,z0,x1,z1,3.5))return false;
    let base=-1e9,lo=1e9;
    for(const[px,pz]of[[x0,z0],[x1,z0],[x0,z1],[x1,z1],[cx,cz]]){const v=hh(px,pz);if(v>base)base=v;if(v<lo)lo=v;}
    if(lo<0.8||base-lo>3)return false;
    base+=0.12;
    foot.push({x0,z0,x1,z1});
    const wc=WALLC[Math.floor(R()*WALLC.length)],rc=ROOFC[Math.floor(R()*ROOFC.length)];
    const T=0.3,yb=lo-1.5-base; // wall bottom relative to base
    addBox(x0,lo-1.5,z0,x1,base,z1,0x86796a);
    const nd=type===1?2:1;const sides=[0,1,2,3];
    for(let i=3;i>0;i--){const j=Math.floor(R()*(i+1));[sides[i],sides[j]]=[sides[j],sides[i]];}
    const doorSides=sides.slice(0,nd);
    const b={x0,z0,x1,z1,base,h,doors:[],type};
    let px=null,pgap=0;
    if(type===0&&bw>=9.5){px=cx+(R()-0.5)*1.5;pgap=bd*(0.25+R()*0.5);}
    for(let s=0;s<4;s++){
      const along=s<2?bw:bd;const opens=[];
      if(doorSides.includes(s)){
        const c=along*(0.3+R()*0.4),dw=type===1?3:1.5;opens.push({c,w:dw,y0:yb-1,y1:2.4});
        let dx,dz,nx=0,nz=0;
        if(s===0){dx=x0+c;dz=z0;nz=-1;}else if(s===1){dx=x0+c;dz=z1;nz=1;}else if(s===2){dx=x0;dz=z0+c;nx=-1;}else{dx=x1;dz=z0+c;nx=1;}
        b.doors.push({x:dx,z:dz,out:{x:dx+nx*1.7,z:dz+nz*1.7},inn:{x:dx-nx*1.7,z:dz-nz*1.7}});
        if(hh(dx+nx*1.2,dz+nz*1.2)<base-0.45){
          const sx0=nx?Math.min(dx,dx+nx*1.3):dx-1,sx1=nx?Math.max(dx,dx+nx*1.3):dx+1,sz0=nz?Math.min(dz,dz+nz*1.3):dz-1,sz1=nz?Math.max(dz,dz+nz*1.3):dz+1;
          addBox(sx0,lo-1.5,sz0,sx1,base-0.3,sz1,0x7a6f60);
        }
      }
      const nw=Math.floor(along/4.2);
      for(let k=0;k<nw;k++){const c=(k+0.5)*along/nw;if(opens.some(o=>Math.abs(o.c-c)<o.w/2+1))continue;if(px!==null&&s>=2)continue;opens.push({c,w:1.2,y0:1.0,y1:2.0});}
      opens.sort((a,b2)=>a.c-b2.c);
      let cur=0;
      const seg=(u0,u1,y0,y1)=>{if(u1-u0<0.02||y1-y0<0.02)return;
        if(s===0)addBox(x0+u0,base+y0,z0-T/2,x0+u1,base+y1,z0+T/2,wc);
        else if(s===1)addBox(x0+u0,base+y0,z1-T/2,x0+u1,base+y1,z1+T/2,wc);
        else if(s===2)addBox(x0-T/2,base+y0,z0+u0,x0+T/2,base+y1,z0+u1,wc);
        else addBox(x1-T/2,base+y0,z0+u0,x1+T/2,base+y1,z0+u1,wc);};
      for(const o of opens){const a=o.c-o.w/2,e=o.c+o.w/2;seg(cur,a,yb,h);if(o.y0>yb)seg(a,e,yb,o.y0);seg(a,e,o.y1,h);cur=e;}
      seg(cur,along,yb,h);
    }
    if(px!==null){addBox(px-0.12,base,z0,px+0.12,base+h,z0+pgap-0.7,0xd9d2c3);addBox(px-0.12,base,z0+pgap+0.7,px+0.12,base+h,z1,0xd9d2c3);addBox(px-0.12,base+2.3,z0+pgap-0.7,px+0.12,base+h,z0+pgap+0.7,0xd9d2c3);}
    addBox(x0-0.3,base+h,z0-0.3,x1+0.3,base+h+0.3,z1+0.3,rc);
    const crates=[];
    if(type===1){const nc=2+Math.floor(R()*3);for(let k=0;k<nc;k++){const cx2=lerp(x0+2,x1-2,R()),cz2=lerp(z0+2,z1-2,R());crates.push([cx2,cz2]);addBox(cx2-0.6,base,cz2-0.6,cx2+0.6,base+1.0,cz2+0.6,0x8a6a3e);}}
    const ns=type===0?2+Math.floor(R()*3):type===1?4+Math.floor(R()*4):1+Math.floor(R()*2);
    const bi=w.blds.length;
    for(let k=0;k<ns;k++){
      for(let tr=0;tr<8;tr++){
        const sx=lerp(x0+0.9,x1-0.9,R()),sz=lerp(z0+0.9,z1-0.9,R());
        if(px!==null&&Math.abs(sx-px)<0.7)continue;
        if(crates.some(c=>Math.abs(c[0]-sx)<1.1&&Math.abs(c[1]-sz)<1.1))continue;
        w.spots.push({x:sx,y:base,z:sz,bld:bi});break;
      }
    }
    w.blds.push(b);
    return true;
  }
  for(const t of w.towns){
    const want=5+Math.floor(t.r/8);let made=0;
    for(let tries=0;tries<80&&made<want;tries++){
      const bx=t.x+(R()*2-1)*t.r*0.85,bz=t.z+(R()*2-1)*t.r*0.85;
      if((bx-t.x)*(bx-t.x)+(bz-t.z)*(bz-t.z)>t.r*t.r*0.72)continue;
      const r=R();if(building(bx,bz,r<0.2?1:r<0.42?2:0))made++;
    }
  }
  for(let tries=0,made=0;tries<120&&made<16;tries++){
    const x=(R()*2-1)*340,z=(R()*2-1)*340;
    if(inTown(x,z,1.6)||hh(x,z)<2)continue;
    if(building(x,z,R()<0.25?2:0))made++;
  }
  // container yards
  const CONT=[0x9b3d2f,0x2f5f7a,0x5f7a3a,0xb07a2a,0x7a7f86];
  for(let tries=0,made=0;tries<200&&made<12;tries++){
    const x=(R()*2-1)*330,z=(R()*2-1)*330;
    if(inTown(x,z,1.25)||hh(x,z)<1.5)continue;
    if(!freeFoot(x-14,z-14,x+14,z+14,4))continue;
    let lo=1e9,hi=-1e9;for(const[dx,dz]of DIR8){const v=hh(x+dx*12,z+dz*12);lo=Math.min(lo,v);hi=Math.max(hi,v);}
    if(lo<1||hi-lo>2.5)continue;
    foot.push({x0:x-14,z0:z-14,x1:x+14,z1:z+14});made++;
    const n=3+Math.floor(R()*4),alongX=R()<0.5;
    for(let k=0;k<n;k++){
      const ox=(k%3-1)*(alongX?7.2:3.6),oz=(Math.floor(k/3)*2-0.5)*(alongX?4.5:8);
      const cx=x+ox+(R()-0.5),cz=z+oz+(R()-0.5);
      const hx=alongX?3.05:1.22,hz=alongX?1.22:3.05;
      let base=-1e9;for(const[px,pz]of[[cx-hx,cz-hz],[cx+hx,cz-hz],[cx-hx,cz+hz],[cx+hx,cz+hz]])base=Math.max(base,hh(px,pz));
      const col=CONT[Math.floor(R()*CONT.length)];
      addBox(cx-hx,base-1.5,cz-hz,cx+hx,base+2.6,cz+hz,col);
      if(R()<0.3)addBox(cx-hx,base+2.6,cz-hz,cx+hx,base+5.2,cz+hz,CONT[Math.floor(R()*CONT.length)]);
    }
    for(let k=0;k<3;k++){const sx=x+(R()*2-1)*11,sz=z+(R()*2-1)*11;w.spots.push({x:sx,y:null,z:sz,bld:-1});}
  }
  // crates
  for(let tries=0,made=0;tries<400&&made<140;tries++){
    const x=(R()*2-1)*370,z=(R()*2-1)*370,g=hh(x,z);
    if(g<1||!freeFoot(x-0.6,z-0.6,x+0.6,z+0.6,1.5))continue;
    made++;foot.push({x0:x-0.6,z0:z-0.6,x1:x+0.6,z1:z+0.6});
    addBox(x-0.55,g-0.6,z-0.55,x+0.55,g+1.0,z+0.55,0x8a6a3e);
    if(R()<0.3){addBox(x+0.6,g-0.6,z-0.5,x+1.6,g+1.0,z+0.5,0x7c5f38);foot.push({x0:x+0.6,z0:z-0.5,x1:x+1.6,z1:z+0.5});}
    if(R()<0.35)w.spots.push({x:x-1.3,y:null,z:z+(R()-0.5),bld:-1});
  }
  // vehicles
  const vpush=(x,z,kind)=>{const g=hh(x,z);if(g<1)return false;
    let lo=1e9,hi=-1e9;for(const[dx,dz]of DIR8){const v=hh(x+dx*2.5,z+dz*2.5);lo=Math.min(lo,v);hi=Math.max(hi,v);}
    if(hi-lo>1.2||!freeFoot(x-2.5,z-2.5,x+2.5,z+2.5,1))return false;
    foot.push({x0:x-2.5,z0:z-2.5,x1:x+2.5,z1:z+2.5});
    w.vspawn.push({id:'v'+w.vspawn.length,kind,x,z,yaw:R()*6.2832,col:Math.floor(R()*5)});return true;};
  for(const t of w.towns){let n=2+Math.floor(R()*2);for(let tr=0;tr<30&&n>0;tr++){const[dx,dz]=DIR8[Math.floor(R()*8)];const rr=t.r*(1.0+R()*0.25);if(vpush(t.x+dx*rr+(R()-0.5)*6,t.z+dz*rr+(R()-0.5)*6,R()<0.4?'bike':'car'))n--;}}
  for(let tr=0,n=16;tr<200&&n>0;tr++){if(vpush((R()*2-1)*340,(R()*2-1)*340,R()<0.45?'bike':'car'))n--;}
  // outdoor loot
  for(let k=0;k<70;k++)w.spots.push({x:(R()*2-1)*360,y:null,z:(R()*2-1)*360,bld:-1});
  // collision grid
  w.cells=Array.from({length:GN*GN},()=>[]);
  const gridAdd=i=>{const b=w.boxes[i];const gx0=clamp(Math.floor((b.x0+HALF)/GRID),0,GN-1),gx1=clamp(Math.floor((b.x1+HALF)/GRID),0,GN-1),gz0=clamp(Math.floor((b.z0+HALF)/GRID),0,GN-1),gz1=clamp(Math.floor((b.z1+HALF)/GRID),0,GN-1);for(let gz=gz0;gz<=gz1;gz++)for(let gx=gx0;gx<=gx1;gx++)w.cells[gz*GN+gx].push(i);};
  // trees, rocks, bushes
  for(let k=0;k<3000;k++){
    const x=(R()*2-1)*385,z=(R()*2-1)*385,g=hh(x,z);
    const dens=fbm(nC,x/120,z/120,3);
    if(!(dens>0.53||R()<0.07))continue;
    if(g<1.6||g>50||inTown(x,z,1.2)||!freeFoot(x,z,x,z,2.2))continue;
    const kind=R()<0.55?0:1,s=0.8+R()*0.6;
    w.trees.push({x,z,y:g,kind,s,rot:R()*6.2832,tint:R()});
    addBox(x-0.28,g-0.5,z-0.28,x+0.28,g+5.5*s,z+0.28,0,false);
  }
  for(let k=0;k<320;k++){
    const x=(R()*2-1)*380,z=(R()*2-1)*380,g=hh(x,z);
    if(g<0.4||inTown(x,z,1.1)||!freeFoot(x,z,x,z,2))continue;
    const s=0.6+R()*R()*2.6;
    w.rocks.push({x,z,y:g,s,rot:R()*6.2832,sy:0.6+R()*0.4});
    addBox(x-0.72*s,g-0.5*s,z-0.72*s,x+0.72*s,g+0.62*s,z+0.72*s,0,false);
  }
  for(let k=0;k<1000;k++){
    const x=(R()*2-1)*380,z=(R()*2-1)*380,g=hh(x,z);
    if(g<1.2||!freeFoot(x,z,x,z,1))continue;
    w.bushes.push({x,z,y:g,s:0.6+R()*0.8,rot:R()*6.28});
  }
  for(let i=0;i<w.boxes.length;i++)gridAdd(i);
  w.mark=new Uint32Array(w.boxes.length);
  // loot
  let lid=0;
  for(const sp of w.spots){
    if(R()>0.82)continue;
    const specs=rollLoot(R);
    specs.forEach((s,k)=>{
      const x=sp.x+(k?0.55:0),z=sp.z+(k?0.25:0);
      w.loot.push({...s,id:'i'+(lid++),x,z,y:sp.y,bld:sp.bld});
    });
  }
  // plane path
  let dx=0,dz=0;for(let tr=0;tr<20;tr++){dx=R()*2-1;dz=R()*2-1;if(dx*dx+dz*dz>0.25&&dx*dx+dz*dz<1)break;}
  const dl=Math.sqrt(dx*dx+dz*dz);dx/=dl;dz/=dl;
  const pcx=(R()*2-1)*140,pcz=(R()*2-1)*140;
  w.plane={sx:pcx-dx*560,sz:pcz-dz*560,dx,dz,len:1120,alt:260,speed:60};
  let tIn=0,tOut=0;
  for(let t=0;t<1120/60;t+=0.25){const x=w.plane.sx+dx*60*t,z=w.plane.sz+dz*60*t;if(Math.abs(x)<360&&Math.abs(z)<360){if(!tIn)tIn=t;tOut=t;}}
  w.plane.tIn=Math.max(1.5,tIn);w.plane.tOut=tOut;
  // storm phases
  const PH=[[100,60,250,0.8],[60,45,150,1.5],[45,35,85,3],[40,30,45,5],[30,25,20,8],[25,20,4,12]];
  let cx=0,cz=0,cr=600;const ph=[];
  for(const[wt,sh,r,d]of PH){
    let nx=cx,nz=cz;const maxOff=Math.max(0,(cr>400?330:cr)-r)*0.85;
    for(let tr=0;tr<40;tr++){
      const ox=(R()*2-1)*maxOff,oz=(R()*2-1)*maxOff;
      if(ox*ox+oz*oz>maxOff*maxOff)continue;
      const tx=clamp(cx+ox,-300,300),tz=clamp(cz+oz,-300,300);
      nx=tx;nz=tz;if(hh(tx,tz)>1)break;
    }
    ph.push({wait:wt,shrink:sh,x:nx,z:nz,r,dps:d});cx=nx;cz=nz;cr=r;
  }
  w.zones={x0:0,z0:0,r0:600,ph};
  w.botNames=[];
  const bn=BOT_NAMES.slice();for(let i=bn.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[bn[i],bn[j]]=[bn[j],bn[i]];}
  for(let i=0;i<90;i++)w.botNames.push(bn[i%bn.length]+BOT_SUFFIX[Math.floor(R()*BOT_SUFFIX.length)]+(i>=bn.length?(i/bn.length|0):''));
  return w;
}
function rollLoot(R){
  const r=R();
  if(r<0.30){
    const q=R();const wk=q<0.22?'pistol':q<0.44?'smg':q<0.58?'shotgun':q<0.84?'rifle':q<0.94?'dmr':'sniper';
    const a=WEAPONS[wk].ammo;const att=wk==='dmr'&&R()<0.3?{sight:'x4'}:{};
    return[{k:'w',t:wk,n:WEAPONS[wk].mag,att},{k:'a',t:a,n:AMMO_PACK[a]}];
  }
  if(r<0.50){const a=AMMO[Math.floor(R()*4)];return[{k:'a',t:a,n:AMMO_PACK[a]}];}
  if(r<0.62)return[{k:'b',n:5}];
  if(r<0.67)return[{k:'m',n:1}];
  if(r<0.79){const q=R();const a=q<0.11?'reddot':q<0.2?'holo':q<0.29?'x2':q<0.36?'x4':q<0.4?'x8':q<0.49?'comp':q<0.57?'flash':q<0.62?'supp':q<0.7?'vgrip':q<0.77?'agrip':q<0.84?'extmag':q<0.89?'quickmag':q<0.92?'extquick':q<0.97?'stock':'cheek';return[{k:'x',t:a}];}
  const q=R(),lv=q<0.58?1:q<0.9?2:3;
  return[{k:r<0.86?'p':r<0.94?'v':'h',lv}];
}

