// Vehicle meshes (owned by vehicle agent)
const CAR_COL=[0x55613d,0x2e5d73,0xa8562f,0xc9b98f,0x6b6e70],BIKE_COL=[0xb02a2a,0x222222,0xd0a020,0x2a5fb0,0x3a7a3a];
function buildVehicle(kind,ci){
  const g=new THREE.Group(),dark=mc(0x1d1f21),wheels=[],steer=[];
  const wheelG=kind==='car'?new THREE.CylinderGeometry(0.42,0.42,0.32,12):new THREE.CylinderGeometry(0.36,0.36,0.14,12);wheelG.rotateZ(Math.PI/2);
  const addWheel=(x,y,z,front)=>{const p=new THREE.Group();p.position.set(x,y,z);const s=new THREE.Group();p.add(s);const w=new THREE.Mesh(wheelG,dark);w.castShadow=true;s.add(w);g.add(p);wheels.push(s);if(front)steer.push(p);};
  if(kind==='car'){
    const main=mc(CAR_COL[ci%5]);
    for(const[x,z]of[[-0.92,-1.35],[0.92,-1.35],[-0.92,1.35],[0.92,1.35]])addWheel(x,0.42,z,z<0);
    g.add(part(main,1.92,0.55,4.15,0,0.8,0));
    g.add(part(main,1.8,0.18,1.5,0,1.15,-1.25));
    g.add(part(dark,2.0,0.22,0.22,0,0.62,-2.15));g.add(part(dark,2.0,0.22,0.2,0,0.62,2.12));
    g.add(part(main,1.86,0.12,2.15,0,1.95,0.45));
    for(const[x,z]of[[-0.86,-0.55],[0.86,-0.55],[-0.86,1.45],[0.86,1.45]])g.add(part(main,0.09,0.82,0.09,x,1.5,z));
    const glass=new THREE.Mesh(BOXG,new THREE.MeshLambertMaterial({color:0x9fc2cc,transparent:true,opacity:0.32}));glass.scale.set(1.7,0.72,0.04);glass.position.set(0,1.5,-0.57);g.add(glass);
    g.add(part(mc(0xe9e0b0),0.3,0.14,0.05,-0.62,0.9,-2.08));g.add(part(mc(0xe9e0b0),0.3,0.14,0.05,0.62,0.9,-2.08));
    const sp=new THREE.Mesh(wheelG,dark);sp.rotation.y=Math.PI/2;sp.position.set(0,1.15,2.3);g.add(sp);
    g.add(part(mc(0x3a3a3a),0.5,0.35,0.5,-0.45,0.95,0.15));g.add(part(mc(0x3a3a3a),0.5,0.35,0.5,0.45,0.95,0.15));
    g.add(part(mc(0x3a3a3a),1.4,0.35,0.5,0,0.95,1.1));
  }else{
    const main=mc(BIKE_COL[ci%5]);
    addWheel(0,0.36,-0.68,true);addWheel(0,0.36,0.68,false);
    g.add(part(dark,0.12,0.26,1.15,0,0.58,0));
    g.add(part(main,0.32,0.24,0.5,0,0.82,-0.28));
    g.add(part(dark,0.28,0.1,0.75,0,0.84,0.28));
    g.add(part(main,0.24,0.08,0.5,0,0.62,0.78));
    const fork=part(mc(0x888888),0.06,0.7,0.06,0,0.68,-0.62);fork.rotation.x=-0.35;g.add(fork);
    const bar=part(dark,0.72,0.05,0.05,0,1.04,-0.55);g.add(bar);
    g.add(part(mc(0x777777),0.12,0.1,0.55,0.16,0.42,0.35));
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={wheels,steer};
  return g;
}
