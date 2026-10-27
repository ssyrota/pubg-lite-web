// ================= renderer & scene =================
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const SKY=new THREE.Color(0xaec4cc);
scene.background=SKY;scene.fog=new THREE.Fog(SKY,170,640);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.08,1700);scene.add(camera);
scene.add(new THREE.HemisphereLight(0xe2edf2,0x56603f,1.55));
const sun=new THREE.DirectionalLight(0xfff0d8,2.5);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:10,far:420});
sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.05;
scene.add(sun);scene.add(sun.target);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

const lam=(c,o={})=>new THREE.MeshLambertMaterial({color:c,...o});
const BOXG=new THREE.BoxGeometry(1,1,1);
let worldGroup=null,dynGroup=null,mapImg=null;

function buildWorldMeshes(){
  if(worldGroup){scene.remove(worldGroup);worldGroup.traverse(o=>{if(o.geometry&&o.geometry!==BOXG)o.geometry.dispose();});}
  worldGroup=new THREE.Group();scene.add(worldGroup);
  // terrain
  let geo=new THREE.PlaneGeometry(SIZE,SIZE,HN-1,HN-1);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  for(let k=0;k<pos.count;k++){const i=k%HN,j=(k/HN)|0;pos.setY(k,W.H[j*HN+i]);}
  geo=geo.toNonIndexed();geo.computeVertexNormals();
  const P=geo.attributes.position.array,N=geo.attributes.normal.array,C=new Float32Array(P.length);
  const nz=makeNoise(W.seed+404),col=new THREE.Color(),tmpc=new THREE.Color();
  const cs={wet:0xa1956e,sand:0xd4c491,rock:0x837d70,hi:0x8d8c72,g1:0x6f8d48,g2:0x587839,dirt:0x9a8d70};
  for(let t=0;t<P.length;t+=9){
    const h=(P[t+1]+P[t+4]+P[t+7])/3,ny=N[t+1],x=(P[t]+P[t+3]+P[t+6])/3,z=(P[t+2]+P[t+5]+P[t+8])/3;
    if(h<-0.4)col.setHex(cs.wet);else if(h<1.5)col.setHex(cs.sand);
    else if(ny<0.8)col.setHex(cs.rock);else if(h>30)col.setHex(cs.hi);
    else{col.setHex(cs.g1);tmpc.setHex(cs.g2);col.lerp(tmpc,nz(x/28,z/28));}
    for(const tw of W.towns){const d2=(x-tw.x)*(x-tw.x)+(z-tw.z)*(z-tw.z);if(d2<tw.r*tw.r*1.05){tmpc.setHex(cs.dirt);col.lerp(tmpc,0.75);}}
    const j=0.95+Math.random()*0.08;
    for(let v=0;v<3;v++){C[t+v*3]=col.r*j;C[t+v*3+1]=col.g*j;C[t+v*3+2]=col.b*j;}
  }
  geo.setAttribute('color',new THREE.BufferAttribute(C,3));
  const terr=new THREE.Mesh(geo,lam(0xffffff,{vertexColors:true}));terr.receiveShadow=true;worldGroup.add(terr);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000).rotateX(-Math.PI/2),new THREE.MeshPhongMaterial({color:0x3b7d90,transparent:true,opacity:0.84,shininess:90,specular:0x6a8a99}));
  water.position.y=0;worldGroup.add(water);
  // merged boxes
  const vis=W.boxes.filter(b=>b.vis);
  const base=BOXG.toNonIndexed(),bp=base.attributes.position.array,bn=base.attributes.normal.array,nv=bp.length/3;
  const BP=new Float32Array(vis.length*nv*3),BN=new Float32Array(vis.length*nv*3),BC=new Float32Array(vis.length*nv*3);
  let o=0;
  for(const b of vis){
    const sx=b.x1-b.x0,sy=b.y1-b.y0,sz=b.z1-b.z0,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,cz=(b.z0+b.z1)/2;
    col.setHex(b.c);
    for(let v=0;v<nv;v++){
      BP[o]=bp[v*3]*sx+cx;BP[o+1]=bp[v*3+1]*sy+cy;BP[o+2]=bp[v*3+2]*sz+cz;
      BN[o]=bn[v*3];BN[o+1]=bn[v*3+1];BN[o+2]=bn[v*3+2];
      const sh=bn[v*3+1]>0.5?1.06:bn[v*3+1]<-0.5?0.7:(bn[v*3]!==0?0.93:1);
      BC[o]=col.r*sh;BC[o+1]=col.g*sh;BC[o+2]=col.b*sh;o+=3;
    }
  }
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(BP,3));bg.setAttribute('normal',new THREE.BufferAttribute(BN,3));bg.setAttribute('color',new THREE.BufferAttribute(BC,3));
  const bm=new THREE.Mesh(bg,lam(0xffffff,{vertexColors:true}));bm.castShadow=true;bm.receiveShadow=true;worldGroup.add(bm);
  // trees
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s3=new THREE.Vector3(),p3=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const trunkG=new THREE.CylinderGeometry(0.16,0.26,1,6);trunkG.translate(0,0.5,0);
  const pineG=new THREE.ConeGeometry(1,1,7);pineG.translate(0,0.5,0);
  const leafG=new THREE.IcosahedronGeometry(1,0);
  const nT=W.trees.length,pines=W.trees.filter(t=>t.kind===0),leafs=W.trees.filter(t=>t.kind===1);
  const trunks=new THREE.InstancedMesh(trunkG,lam(0x5a4632,{flatShading:true}),nT);
  const pineM=new THREE.InstancedMesh(pineG,lam(0xffffff,{flatShading:true}),pines.length);
  const leafM=new THREE.InstancedMesh(leafG,lam(0xffffff,{flatShading:true}),leafs.length);
  W.trees.forEach((t,i)=>{const th=t.kind===0?2.2*t.s:3.4*t.s;q.setFromAxisAngle(up,t.rot);m4.compose(p3.set(t.x,t.y-0.2,t.z),q,s3.set(t.s,th,t.s));trunks.setMatrixAt(i,m4);});
  pines.forEach((t,i)=>{q.setFromAxisAngle(up,t.rot);m4.compose(p3.set(t.x,t.y+1.3*t.s,t.z),q,s3.set(2.1*t.s,6.2*t.s,2.1*t.s));pineM.setMatrixAt(i,m4);pineM.setColorAt(i,col.setHSL(0.3+t.tint*0.05,0.38,0.22+t.tint*0.08));});
  leafs.forEach((t,i)=>{q.setFromAxisAngle(up,t.rot);m4.compose(p3.set(t.x,t.y+4.2*t.s,t.z),q,s3.set(2.5*t.s,2.2*t.s,2.5*t.s));leafM.setMatrixAt(i,m4);leafM.setColorAt(i,col.setHSL(0.2+t.tint*0.08,0.42,0.3+t.tint*0.08));});
  for(const m of[trunks,pineM,leafM]){m.castShadow=true;worldGroup.add(m);}
  const rockM=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),lam(0x8b877d,{flatShading:true}),W.rocks.length);
  W.rocks.forEach((r,i)=>{q.setFromAxisAngle(up,r.rot);m4.compose(p3.set(r.x,r.y,r.z),q,s3.set(r.s,r.s*r.sy,r.s*0.9));rockM.setMatrixAt(i,m4);});
  rockM.castShadow=true;rockM.receiveShadow=true;worldGroup.add(rockM);
  const bushM=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),lam(0x5b7a38,{flatShading:true}),W.bushes.length);
  W.bushes.forEach((b,i)=>{q.setFromAxisAngle(up,b.rot);m4.compose(p3.set(b.x,b.y+0.3*b.s,b.z),q,s3.set(b.s,b.s*0.7,b.s));bushM.setMatrixAt(i,m4);bushM.setColorAt(i,col.setHSL(0.24,0.4,0.26+(i%7)*0.015));});
  worldGroup.add(bushM);
  // storm wall
  zoneMesh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,128,1,true),new THREE.MeshBasicMaterial({color:0x4a8fd0,transparent:true,opacity:0.22,side:THREE.DoubleSide,depthWrite:false,fog:false}));
  zoneMesh.scale.set(600,500,600);zoneMesh.position.y=200;worldGroup.add(zoneMesh);
  zoneRing=new THREE.Mesh(new THREE.RingGeometry(0.995,1,160).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5,depthWrite:false,fog:false}));
  zoneRing.position.y=1;worldGroup.add(zoneRing);
  planeMesh=buildPlane();worldGroup.add(planeMesh);
  dynGroup=new THREE.Group();worldGroup.add(dynGroup);
  mapImg=renderMapImage();
}
let zoneMesh=null,zoneRing=null,planeMesh=null;

