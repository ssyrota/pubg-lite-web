export const selfId=Math.random().toString(36).slice(2,10);
export function joinRoom(cfg,roomId){
  const bc=new BroadcastChannel(cfg.appId+'|'+roomId);
  const actions={},peers=new Set(),room={onPeerJoin:null,onPeerLeave:null};
  bc.onmessage=({data})=>{
    if(data.to&&data.to!==selfId)return;
    if(data.t==='__hi'){if(!peers.has(data.from)){peers.add(data.from);bc.postMessage({t:'__hi',from:selfId,to:data.from});room.onPeerJoin&&room.onPeerJoin(data.from);}return;}
    if(data.t==='__bye'){peers.delete(data.from);room.onPeerLeave&&room.onPeerLeave(data.from);return;}
    const a=actions[data.t];if(a&&a.onMessage)a.onMessage(data.d,{peerId:data.from});
  };
  setTimeout(()=>bc.postMessage({t:'__hi',from:selfId}),30);
  room.makeAction=name=>{if(name.length>12)throw new Error('action name too long '+name);const a={onMessage:null,send:(d,o)=>{const tg=o&&o.target;if(Array.isArray(tg))tg.forEach(x=>bc.postMessage({t:name,from:selfId,to:x,d}));else bc.postMessage({t:name,from:selfId,to:tg||null,d:JSON.parse(JSON.stringify(d))});return Promise.resolve();}};actions[name]=a;return a;};
  room.leave=()=>{bc.postMessage({t:'__bye',from:selfId});bc.close();return Promise.resolve();};
  return room;
}
