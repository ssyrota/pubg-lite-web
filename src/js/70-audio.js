// ================= audio =================
const sfx=(()=>{
  let AC=null,master=null,noise=null,engine=null,wind=null;
  const init=()=>{if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=0.45;master.connect(AC.destination);
    noise=AC.createBuffer(1,AC.sampleRate*1,AC.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}catch(e){AC=null;}};
  const burst=(freq,len,vol,type='lowpass')=>{if(!AC)return;const t=AC.currentTime,s=AC.createBufferSource();s.buffer=noise;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+len+0.05);};
  const tone=(fq,len,vol,type='sine',end)=>{if(!AC)return;const t=AC.currentTime,o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(fq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+len);const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);o.connect(g).connect(master);o.start(t);o.stop(t+len+0.05);};
  return{init,tone,
    gun(k,dist,quiet){if(!AC)return;const d=WEAPONS[k];const v=Math.pow(Math.max(0,1-dist/(quiet?140:480)),2)*(quiet?0.35:1);if(v<0.005)return;burst(d.snd*(quiet?0.5:1)*(0.35+0.65*v),d.sl*(quiet?0.6:1)*(1+dist/250),v*0.9);if(quiet)return;if(dist<60)tone(150,0.12,v*0.5,'sine',40);},
    boom(dist){const v=Math.pow(Math.max(0,1-dist/500),2);burst(600,1.4,v*1.2);tone(90,0.9,v*0.9,'sine',25);},
    crash(i){burst(900,0.35,Math.min(1,i/20));tone(120,0.2,0.4,'square',50);},
    hit(head){tone(head?1700:1150,0.05,0.18,'square');},
    kill(){tone(500,0.1,0.25,'triangle',900);},
    pick(){tone(640,0.05,0.12,'triangle');},
    reload(){burst(3000,0.06,0.25,'highpass');setTimeout(()=>burst(2500,0.05,0.25,'highpass'),350);},
    door(){burst(400,0.15,0.35);},
    // hooks — positions are world THREE.Vector3; listener is the camera
    step(surface,pos,mine){},            // surface: 'grass'|'sand'|'floor'|'water'|'rock'
    jump(pos,mine){},land(pos,hard,mine){},
    impact(kind,pos,head){},             // kind: 'flesh'|'metal'|'dirt'|'concrete'|'wood'|'water'
    whiz(pos){},                         // bullet passed close to the listener
    swap(){},emptyClick(){},
    attach(){burst(2600,0.05,0.3,'highpass');setTimeout(()=>tone(1400,0.03,0.12,'square'),60);},
    engine(on,spd,kind){if(!AC)return;
      if(on&&!engine){const o=AC.createOscillator();o.type='sawtooth';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=500;const g=AC.createGain();g.gain.value=0;o.connect(f).connect(g).connect(master);o.start();engine={o,g,f};}
      if(engine){const t=AC.currentTime;engine.g.gain.setTargetAtTime(on?0.12:0,t,0.1);engine.o.frequency.setTargetAtTime((kind==='bike'?55:38)+Math.abs(spd)*(kind==='bike'?4.2:2.6),t,0.08);}},
    wind(on,amt){if(!AC)return;
      if(on&&!wind){const s=AC.createBufferSource();s.buffer=noise;s.loop=true;const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=700;const g=AC.createGain();g.gain.value=0;s.connect(f).connect(g).connect(master);s.start();wind={s,g};}
      if(wind)wind.g.gain.setTargetAtTime(on?amt:0,AC.currentTime,0.2);},
  };
})();
addEventListener('pointerdown',()=>sfx.init());addEventListener('keydown',()=>sfx.init());

