# Stormline Royale — project guide for Claude Code

An original 3D battle royale that runs in the browser (desktop only). Three.js r170, no framework, no
bundler: `src/` is concatenated by `build.py` into one HTML file. The user's reference games for feel and
balance are PUBG PC / PUBG Lite and BattleBit Remastered — **use them only as references**: never copy their
names, logos, models, textures, UI art or audio. Balance numbers (damage, armor %, durability, speeds) may match.

## Commands
```bash
python3 build.py                      # src/ → dist/stormline.html (embed form) + dist/stormline-royale.html (standalone)
cd test && npm install && npm run bundle-trystero && pip install playwright && python3 -m playwright install chromium
cd test && HTML=../dist/stormline.html python3 run.py smoke.py            # solo match, 60 s simulated, prints errors
cd test && MOCK=1 HTML=../dist/stormline.html python3 run.py multiplayer_mock.py   # 2 tabs, mock P2P transport
cd test && HTML=../dist/stormline.html python3 run.py inventory.py        # Tab inventory + drag-attach + FPP
```
Tests drive the game through `window.__sl` (simulate, render, G, ents, vehs, items, me, W, look, keys,
pressed, raycast, dealDamage, dealVehDamage, stepEnt, zoneState, startMatch, NET). Pattern: stop the rAF
loop, call `__sl.simulate(1/30)` in a loop (fast, no rendering), call `__sl.render()` once before a
screenshot. Headless Chromium uses software WebGL, so a single render can take 10–40 s; use
`--disable-dev-shm-usage` (already in run.py) or tabs crash.

## Architecture (src/js, concatenated in filename order into ONE module scope)
| file | contents |
|---|---|
| 00-core.js | THREE import (jsDelivr), utils, constants: map dims (HALF, SIZE, HN, CELL, GRID, GN, BORDER), WEAPONS, ATT (attachments), VDEF (vehicles), armor/bag tables, noise, `hAt` terrain height |
| 10-worldgen.js | `genWorld(seed,size)` deterministic island: towns, buildings (collision boxes + doors), containers, crates, vehicles spawns, trees/rocks, loot, plane path, storm phases, bot names |
| 20-render.js | renderer, scene, lights, `buildWorldMeshes()` (terrain, water, merged boxes, instanced trees/rocks/bushes, storm wall, plane) |
| 25-collision.js | spatial grid queries, ray vs boxes/terrain/vehicles/characters (`raycast`), `collideXZ`, `groundAt`, `surfaceAt`, `bldAt` |
| 26-mapimage.js | minimap / big map picture |
| 30-meshes.js | guns with attachment visuals, characters, item meshes, plane |
| 35-state-items.js | `ents`, `items`, `vehs`, `G` state, `makeEnt`, loot pickup, backpack capacity, attachments auto-fit |
| 40-vehicles.js / 41-vehicle-mesh.js | vehicle runtime/physics, seats, damage, explosions, vehicle net sync / models |
| 50-combat.js | shooting, damage, armor/durability, knock-down/revive (squads), death, remote shot visuals |
| 55-sim.js | `stepEnt` (plane → freefall → parachute → ground/vehicle), weapons, healing, `zoneState` |
| 60-bots.js | bot AI (looting, storm, squads follow/revive/ride, combat) |
| 65-input-camera.js | PUBG keybinds, pointer lock + free-cursor fallback, TPP/FPP/ADS camera, first-person rig, character/vehicle mesh animation |
| 68-fx.js, 70-audio.js | tracers/puffs/explosions; Web Audio `sfx` (currently synthesized placeholders + hook stubs) |
| 75-hud.js | HUD, compass, minimap, big map, squad panel, name tags, stats table |
| 78-inventory.js | Tab inventory (nearby / backpack / equipment + 5 attachment slots per gun, drag & drop) |
| 80-end.js | spectate, end screen |
| 85-net.js | P2P online: Trystero (WebRTC, BitTorrent-tracker signalling), lobby by room code, host runs bots & loot, host migration |
| 90-lifecycle.js | match start/leave, menu (players, squad size, island size, bot skill, camera) |
| 95-main.js | `simulate(dt)`, render loop, boot, `window.__sl` |

Key rules
- **Determinism**: `genWorld` must produce identical worlds in every browser (online play shares only the seed). In decisions use only `+ - * / Math.sqrt Math.floor` and the seeded `rng`; no `Math.random`/trig/pow in branching.
- **Networking**: the browser that "owns" an entity simulates it (`isLocalCtl(e)`): you, and bots on the host. Shared changes go through existing messages (dealDamage, dealVehDamage, requestSeat, requestPick, requestDrop, knock/revive). Trystero action names must be ≤ 12 bytes. Payloads are JSON.
- **Artifact constraints** (when published on claude.ai): scripts only from cdnjs/jsDelivr/unpkg, no WebRTC inside the embedded viewer (online play needs the standalone file in a normal tab), pointer lock may be blocked (game falls back to free-cursor mode).
- **Performance target**: 60 fps on a mid-range desktop GPU at 1080p with ~60–80 players.

## Status
See `TODO.md` for everything the user asked for and what is done. Parallel work was split by file
ownership — see `docs/AGENTS.md` and the five briefs in `docs/agent-briefs/`.
