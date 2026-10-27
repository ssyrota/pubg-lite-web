ctx=b.new_context(viewport={'width':800,'height':500})
pages=[]
def mk():
    p=ctx.new_page(); p.route('**/*',route); logs=[]
    p.on('console',lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in('error','warning') else None)
    p.on('pageerror',lambda e: logs.append(f'[pageerror] {e}'))
    idx=len(pages); p.on('crash',lambda: print('CRASH page', idx))
    pages.append(p)
    p.goto('http://game.local/'); p.wait_for_selector('#menu:not([hidden])',timeout=60000); return p,logs
A,la=mk(); B,lb=mk()
A.fill('#nm','HostAnn'); B.fill('#nm','JoinBo')
A.click('.tabs button[data-tab=host]'); A.click('[data-seg=team] button[data-v="2"] >> nth=1'); A.evaluate("()=>{document.getElementById('hostN').value=16}")
A.click('#btnHost'); time.sleep(1)
code=A.inner_text('#lcode'); print('code',code)
B.click('.tabs button[data-tab=join]'); B.fill('#joinCode',code); B.click('#btnJoin'); time.sleep(2)
print('A lobby', A.inner_text('#lplayers').replace('\n',' | '), '/ B lobby', B.inner_text('#lplayers').replace('\n',' | '))
A.click('#btnStart'); time.sleep(1.5)
for p in (A,B): p.evaluate("()=>{window.requestAnimationFrame=()=>0;const s=window.__sl;s.G.locked=true;document.getElementById('pause').hidden=true;}")
def sim(p,sec,dt=1/30,js=''):
    return p.evaluate(f"()=>{{const s=window.__sl;for(let i=0;i<Math.round({sec}/{dt});i++){{{js};s.simulate({dt});for(const k in s.pressed)delete s.pressed[k];}}return [s.me.mode,s.G.t|0,s.me.hp|0]}}")
def ev(p,js): return p.evaluate("()=>{const s=window.__sl;"+js+"}")
def both(sec,chunk=0.5,ja='',jb=''):
    n=int(sec/chunk)
    for i in range(n): sim(A,chunk,js=ja); time.sleep(0.08); sim(B,chunk,js=jb); time.sleep(0.08)
print('seeds', ev(A,"return [s.W.seed,s.ents.size,s.items.size,s.vehs.size,s.G.teamSize,s.me.team]"), ev(B,"return [s.W.seed,s.ents.size,s.items.size,s.vehs.size,s.G.teamSize,s.me.team,s.NET.isHost]"))
for i in range(6):
    print('A',sim(A,0.5)); time.sleep(0.1); print('B',sim(B,0.5)); time.sleep(0.1)
print('B logs',lb[-5:])
ev(A,"s.pressed.KeyF=true"); ev(B,"s.pressed.KeyF=true")
both(40)
print('A me',ev(A,"return [s.me.mode,s.me.pos.x|0,s.me.pos.z|0]"),'B sees A at',ev(B,"const a=[...s.ents.values()].find(e=>!e.isBot&&e!==s.me);return [a.name,a.mode,a.pos.x|0,a.pos.z|0]"))
print('bots A vs B', ev(A,"const b=s.ents.get('b3');return [b.mode,b.pos.x|0,b.pos.z|0,b.hp|0]"), ev(B,"const b=s.ents.get('b3');return [b.mode,b.pos.x|0,b.pos.z|0,b.hp|0]"))
# B picks an item: teleport B next to an item
it=ev(B,"const it=[...s.items.values()].find(i=>i.k==='w');s.me.pos.set(it.x,it.y,it.z);return it.id")
both(0.5)
ev(B,"s.pressed.KeyE=true"); both(1)
print('pick', it, 'A has item?', ev(A,f"return s.items.has('{it}')"), 'B inv', ev(B,"return s.me.inv.w"))
# B damages bot b5 -> A applies
print('b5 hp before', ev(A,"return s.ents.get('b5').hp|0"))
ev(B,"s.dealDamage(s.ents.get('b5'),30,false,s.me.id,'rifle')"); both(0.5)
print('b5 hp after on A', ev(A,"return s.ents.get('b5').hp|0"), 'B stats dmgBy', ev(A,"return s.ents.get('b5').st.dmgBy"))
# A damages B (teammate? check team)
print('teams', ev(A,"return [s.me.team,[...s.ents.values()].find(e=>!e.isBot&&e!==s.me).team]"))
# vehicle sync: B enters a car and drives
ev(B,"const v=[...s.vehs.values()].find(v=>v.kind==='car'&&!v.destroyed);window.__v=v.id;s.me.pos.set(v.pos.x+2.5,v.pos.y+0.3,v.pos.z)")
both(0.5); ev(B,"s.pressed.KeyF=true"); both(1)
print('B mode', ev(B,"return [s.me.mode,s.me.seat]"), 'A sees veh seats', ev(A,"const v=s.vehs.get(window.__v||'');return v?v.seats:null") if False else ev(A,"return [...s.vehs.values()].filter(v=>v.seats.some(Boolean)).map(v=>[v.id,v.seats])"))
both(3,jb="s.keys.KeyW=true")
print('veh pos B', ev(B,"const v=s.me.veh;return v?[v.id,v.pos.x|0,v.pos.z|0,Math.abs(v.spd*3.6)|0]:null"),'on A', ev(A,"return [...s.vehs.values()].filter(v=>v.seats.some(Boolean)).map(v=>[v.id,v.pos.x|0,v.pos.z|0])"))
both(1)
print('A sees veh', ev(A,"return [...s.vehs.values()].filter(v=>v.seats.some(Boolean)).map(v=>[v.id,v.seats.length,v.pos.x|0,v.pos.z|0])"), 'B veh', ev(B,"const v=s.me.veh;return v?[v.id,v.pos.x|0,v.pos.z|0]:null"))
ev(B,"s.keys.KeyW=false;s.pressed.KeyF=true"); both(1)
print('B exited', ev(B,"return s.me.mode"), ev(A,"return [...s.vehs.values()].filter(v=>v.seats.some(Boolean)).length"))
# host leaves -> B becomes host
A.evaluate("()=>window.__sl.NET.room.leave()"); time.sleep(0.5)
for i in range(4): sim(B,0.5); time.sleep(0.1)
print('B host now?', ev(B,"return [s.NET.isHost,s.NET.hostId===s.NET.self]"), 'bots moving', ev(B,"const b=[...s.ents.values()].filter(e=>e.isBot&&!e.dead);const p=b.map(e=>e.pos.clone());for(let i=0;i<60;i++)s.simulate(1/30);return b.filter((e,i)=>e.pos.distanceTo(p[i])>0.5).length+'/'+b.length"))
print('A logs', la[-5:]); print('B logs', lb[-5:])
