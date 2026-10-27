// ================= effects =================
const fx=(()=>{
  const tr=[],pf=[],fl=[];
  const tm=new THREE.LineBasicMaterial({color:0xffe6a6,transparent:true,opacity:0.85});
  for(let i=0;i<64;i++){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));const l=new THREE.Line(g,tm.clone());l.visible=false;l.frustumCulled=false;scene.add(l);tr.push({l,t:0});}
  const pg=new THREE.BoxGeometry(0.16,0.16,0.16);
  for(let i=0;i<80;i++){const m=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));m.visible=false;scene.add(m);pf.push({m,t:0,life:0.35,vy:0,grow:5});}
  const fg=new THREE.SphereGeometry(0.11,6,4),fm=new THREE.MeshBasicMaterial({color:0xffd27a});
  for(let i=0;i<16;i++){const m=new THREE.Mesh(fg,fm);m.visible=false;scene.add(m);fl.push({m,t:0});}
  let ti=0,pi=0,fi=0;
  const puffAt=(p,c,life=0.35,grow=5,vy=0,size=1)=>{const o=pf[pi++%pf.length];o.m.position.copy(p);o.m.material.color.setHex(c);o.m.material.opacity=1;o.m.scale.setScalar(size);o.m.visible=true;o.t=0;o.life=life;o.grow=grow;o.vy=vy;o.size=size;};
  return{
    shot(m,ends,noflash){if(!noflash){const f=fl[fi++%fl.length];f.m.position.copy(m);f.m.visible=true;f.t=0.05;}
      for(const e of ends){const o=tr[ti++%tr.length],a=o.l.geometry.attributes.position.array;a[0]=m.x;a[1]=m.y;a[2]=m.z;a[3]=e[0];a[4]=e[1];a[5]=e[2];o.l.geometry.attributes.position.needsUpdate=true;o.l.visible=true;o.t=0.07;o.l.material.opacity=0.85;}},
    puff(p,c){puffAt(p,c);},
    smoke(p,light){_tv.set(p.x+(Math.random()-0.5),p.y+1.2,p.z+(Math.random()-0.5));puffAt(_tv,light?0x777777:0x222222,1.6,2.2,1.6,2);},
    explosion(p){for(let i=0;i<14;i++){_tv.set(p.x+(Math.random()-0.5)*2.5,p.y+0.6+Math.random()*1.5,p.z+(Math.random()-0.5)*2.5);puffAt(_tv,i%3?0xff8a2a:0xffd060,0.7+Math.random()*0.4,6,2+Math.random()*3,2.5);}},
    update(dt){
      for(const o of tr)if(o.l.visible){o.t-=dt;o.l.material.opacity=Math.max(0,o.t/0.07)*0.85;if(o.t<=0)o.l.visible=false;}
      for(const o of pf)if(o.m.visible){o.t+=dt;const k=o.t/o.life;o.m.scale.setScalar(o.size*(1+k*o.grow));o.m.position.y+=o.vy*dt;o.m.material.opacity=1-k;if(k>=1)o.m.visible=false;}
      for(const f of fl)if(f.m.visible){f.t-=dt;if(f.t<=0)f.m.visible=false;}
    }
  };
})();

