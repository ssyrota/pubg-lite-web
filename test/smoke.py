import os
# Generic smoke test: start solo match, simulate 60s, report errors. Env: HTML=path
p,logs=page(b,1000,620)
p.wait_for_selector('#menu:not([hidden])',timeout=90000)
p.evaluate("()=>{document.getElementById('botsN').value=20;}")
p.click('#btnSolo')
p.evaluate("()=>{window.requestAnimationFrame=()=>0;const s=window.__sl;s.G.locked=true;document.getElementById('pause').hidden=true;s.renderer.setPixelRatio(1);}")
def sim(sec, dt=1/30, js=''):
    return p.evaluate(f"()=>{{const s=window.__sl;for(let i=0;i<Math.round({sec}/{dt});i++){{{js};s.simulate({dt});for(const k in s.pressed)delete s.pressed[k];}}const e=[...s.ents.values()];return {{t:s.G.t|0,alive:e.filter(x=>!x.dead).length,me:s.me.mode,size:s.W.size}}}}")
print(sim(3)); p.evaluate("()=>{window.__sl.pressed.KeyF=true}"); print(sim(57))
p.evaluate("()=>window.__sl.render()"); p.screenshot(path=os.environ.get('SHOT','shots/smoke.png'),timeout=180000)
errs=[l for l in logs if 'ERR_FAILED' not in l]
print('ERRORS:' , errs[:10] if errs else 'none')
