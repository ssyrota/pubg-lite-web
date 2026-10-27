# Stormline Royale — agent brief

An original browser battle royale (Three.js r170, single HTML file, no build tools beyond `build.py`).
PUBG PC/Lite and BattleBit Remastered are the *feel and quality* references only. Never copy their
assets, names, logos, models, textures, UI art or audio. Numbers (damage, armor %, durability, speeds)
are game-balance facts and may be matched.

## Layout
```
build.py        concatenates src/ into one HTML and syntax-checks the JS
src/head.html   <title>, font link (add an importmap here only if you are told you own it)
src/style.css
src/body.html   HUD / menu / overlays markup
src/js/NN-*.js  concatenated in filename order into ONE <script type="module">
```
All JS files share one module scope (no imports between them). Top-level `const`/`function` names are
global to every file. You may add NEW files with your own prefix (e.g. `21-grass.js`); order matters only
for top-level code that runs immediately (function declarations are hoisted, `const`/`let` are not).

| file | what |
|---|---|
| 00-core.js | THREE import, utils, constants (HALF, SIZE, HN, CELL, GRID, GN, BORDER, WEAPONS, ATT, VDEF…), noise, hAtRaw/hAt |
| 10-worldgen.js | genWorld(seed,size) → W (deterministic) , rollLoot |
| 20-render.js | renderer, scene, lights, buildWorldMeshes() (terrain, water, boxes, trees, rocks, bushes, storm wall, plane) |
| 25-collision.js | nearBoxes, rayBoxes, rayTerrain, raycast, collideXZ, groundAt, surfaceAt, bldAt |
| 26-mapimage.js | renderMapImage() (minimap / big map picture) |
| 30-meshes.js | buildGun(k,att), buildChar(color,skin), items meshes, buildPlane |
| 35-state-items.js | ents/items/vehs maps, G state, makeEnt, items + pickup + capacity |
| 40-vehicles.js | vehicles runtime + physics stepVehicle(v,drv,inp,dt) + seats + damage + net (onVst, vehNetSend) |
| 41-vehicle-mesh.js | buildVehicle(kind,colorIndex) |
| 50-combat.js | shoot, melee, dealDamage/applyDamage, knock/revive, death, onShot (remote shot visuals) |
| 55-sim.js | stepEnt (player movement, plane/fall/chute/ground/veh), weaponActions, zoneState |
| 60-bots.js | bot AI |
| 65-input-camera.js | keyboard/mouse, playerInput, pointer lock, updateCamera, first-person rig, updateEntMesh/updateVehMesh |
| 68-fx.js | tracers, puffs, explosions (`fx` object) |
| 70-audio.js | `sfx` object (Web Audio) |
| 75-hud.js, 78-inventory.js, 80-end.js, 85-net.js, 90-lifecycle.js, 95-main.js | HUD, Tab inventory, end screen, P2P networking, match start/menu, main loop — owned by the coordinator |

Key runtime facts
- `W` = current world. Heights: `W.H` Float32Array (HN×HN), `hAt(x,z)` exact on terrain triangles.
- Collision boxes `W.boxes[i]={x0,y0,z0,x1,y1,z1,c(color hex),vis(bool render)}` in a uniform grid `W.cells` (GRID m cells, GN×GN).
- Entities `ents` (players+bots): `e.pos,e.vel,e.yaw,e.pitch,e.mode('plane'|'fall'|'chute'|'ground'|'veh'|'dead'),e.hp,e.vest,e.helm,e.bag,e.inv{w[2],cur,ammo,band,med,att[]},e.knocked`.
  `me` = local player. `isLocalCtl(e)` = this browser simulates e (me, and bots on the host).
- Weapons `w={k,mag,att:{sight,muzzle,grip,mag,stock},single}`; `wStats(w)` returns attachment multipliers.
- Main loop `simulate(dt)` (95-main.js) calls playerInput→stepEnt(me), botInput→stepEnt(bots), remote smoothing,
  vehicles mesh update, storm damage, updateEntMesh, updateCamera, netTick, updateHUD. Render is separate.
- Networking is P2P; host runs bots/loot. Anything that changes shared state must go through the existing
  messages (dealDamage, dealVehDamage, requestSeat, requestPick, requestDrop…). Keep message payloads JSON.
- World generation MUST stay deterministic across browsers: decisions may only use + - * / Math.sqrt Math.floor
  and the seeded `rng`; never Math.random / sin / cos / pow in branching logic of genWorld.
- `window.__sl` exposes internals for tests (simulate, render, G, ents, vehs, items, me, W, look, keys, pressed, raycast, dealDamage, dealVehDamage, stepEnt, zoneState, startMatch, NET).

## Your workspace
In Claude Code, run each agent in its own git worktree (Agent tool with `isolation: "worktree"`) or branch.
Edit ONLY the files you own (listed in your brief in docs/agent-briefs/) plus NEW files with your prefix.
If you truly need a change in a file you don't own, keep it tiny and list it in your final report as an exact
`old → new` snippet so the coordinator can merge it.

Build:  `python3 build.py` (src/ → dist/stormline.html + dist/stormline-royale.html; prints BUILD OK or the syntax error).

## Testing (headless Chromium, software WebGL — slow but works)
Harness: `test/run.py` (Playwright). Write a test script and run:
`cd test && HTML=../dist/stormline.html python3 run.py smoke.py`
Inside a test script you get `b` (browser) and `page(b,w,h)` → `(p, logs)`; `logs` collects console errors.
Pattern (see test/smoke.py):
```python
p,logs=page(b,1100,640)
p.wait_for_selector('#menu:not([hidden])',timeout=90000)
p.click('#btnSolo')
p.evaluate("()=>{window.requestAnimationFrame=()=>0;const s=window.__sl;s.G.locked=true;document.getElementById('pause').hidden=true;s.renderer.setPixelRatio(1);}")
# run the game deterministically, fast, without rendering:
p.evaluate("()=>{const s=window.__sl;for(let i=0;i<900;i++){s.simulate(1/30);for(const k in s.pressed)delete s.pressed[k];}}")
# press keys: s.pressed.KeyF=true (one frame) / s.keys.KeyW=true (held)
# screenshot: render once then capture
p.evaluate("()=>window.__sl.render()"); p.screenshot(path='test/shots/<you>-x.png',timeout=180000)
```
Then look at screenshots with the Read tool. Rendering one frame takes seconds in software GL; JS sim is fast.
Five agents share one machine (8 GB RAM): run ONE browser at a time, viewport ≤ 1280×720, keep runs short,
and prefix screenshot names with your agent name. If Chromium crashes ("Target crashed"), just rerun.
The real targets are desktop GPUs: aim for 60 fps on a mid-range GPU at 1080p (watch draw calls/triangles:
`s.renderer.info.render.calls/triangles` after a render).

## Finish
Your final message must contain: (1) what you built and verified, with screenshot paths,
(2) the list of files you changed/added in your copy, (3) any exact snippets needed in files you don't own,
(4) known issues. Do not edit src directly.
