// Map image used by minimap and big map (owned by world agent)
function renderMapImage(){
  const S=1024,cv=document.createElement('canvas');cv.width=cv.height=S;const ctx=cv.getContext('2d');
  const img=ctx.createImageData(S,S),d=img.data;
  for(let v=0;v<S;v++)for(let u=0;u<S;u++){
    const x=-HALF+(u+0.5)/S*SIZE,z=-HALF+(v+0.5)/S*SIZE,h=hAt(x,z);
    let r,g,b;
    if(h<0){const k=clamp(-h/9,0,1);r=58-18*k;g=118-30*k;b=136-20*k;}
    else if(h<1.5){r=212;g=196;b=145;}
    else{const t=clamp(h/40,0,1);r=104+60*t;g=140+20*t;b=74+40*t;}
    const sh=clamp(1+(hAt(x-1,z-1)-hAt(x+1,z+1))*0.12,0.7,1.25);
    const k=(v*S+u)*4;d[k]=r*sh;d[k+1]=g*sh;d[k+2]=b*sh;d[k+3]=255;
  }
  ctx.putImageData(img,0,0);
  const sc=S/SIZE;
  for(const t of W.towns){ctx.fillStyle='rgba(150,135,105,.55)';ctx.beginPath();ctx.arc((t.x+HALF)*sc,(t.z+HALF)*sc,t.r*sc,0,7);ctx.fill();}
  ctx.fillStyle='rgba(40,70,30,.35)';for(const t of W.trees){ctx.fillRect((t.x+HALF)*sc-1,(t.z+HALF)*sc-1,2.4,2.4);}
  for(const b of W.boxes){if(!b.vis||b.y1-b.y0<2.4)continue;ctx.fillStyle='#4a4743';ctx.fillRect((b.x0+HALF)*sc,(b.z0+HALF)*sc,Math.max(1,(b.x1-b.x0)*sc),Math.max(1,(b.z1-b.z0)*sc));}
  return cv;
}

