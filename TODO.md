# TODO — everything the user asked for

Legend: ✅ done and tested · 🟡 partly done · ⬜ not started

## Done
- ✅ Browser 3D battle royale in Three.js, desktop only, original name/art ("Stormline Royale")
- ✅ Bots (easy/normal/hard): drop from plane, loot, storm awareness, fight, squads follow/revive/ride as passengers
- ✅ Online play without a game server: WebRTC P2P via Trystero (BitTorrent trackers), room code lobby, host runs bots/loot, host migration when host leaves (tested with a mock transport in 2 tabs; real trackers untested from the sandbox)
- ✅ Vehicles: 4-seat jeep and 2-seat motorcycle (PUBG Erangel roles: UAZ / motorcycle) with collision, HP, crash damage, run-over, explosions, passengers — **arcade physics, to be replaced**
- ✅ Match stats for all players (kills, knocks, damage, headshots, accuracy, longest kill, travel, heals, revives, survived)
- ✅ Backpacks lv1–3 with capacity, vests/helmets lv1–3 with durability
- ✅ Aiming: tap RMB = sights (ADS), hold RMB = over-the-shoulder; scopes red dot/holo/2×/4×/8×
- ✅ Squads up to 3 (solo/duo/squad of 3): knock-downs, hold F to revive, no friendly fire, squad panel, name tags
- ✅ Resume/pointer-lock fix: retries, then free-cursor fallback (move mouse to look, screen edge keeps turning)
- ✅ Tab opens backpack inventory (nearby / backpack / equipment) — click to use/attach, right-click drop, drag & drop
- ✅ Esc pause menu shows match stats; S inside the inventory switches to stats
- ✅ PUBG keybinds: F pick up/interact/jump, Q/E lean, B fire mode, Tab inventory, M map, V view, X holster, C crouch
- ✅ Full attachment system: sight / muzzle (compensator, flash hider, suppressor) / grip (vertical, angled) / magazine (extended, quickdraw, ext-quickdraw) / stock (tactical, cheek pad); per-weapon compatibility, recoil/reload/mag effects, attachments stored in backpack
- ✅ First-person mode (menu option + V) — **arms need polish**
- ✅ Published as a claude.ai artifact + standalone HTML for online play

## In progress (briefs in docs/agent-briefs/, work NOT started yet — agents were interrupted)
- 🟡 Map size picker (Small 1.2 km / Medium 2 km / Large 3 km, new random island each match): menu + `cfg.mapSize` plumbing done; `genWorld` still builds 800 m → **world brief**
- ⬜ Graphics at least like BattleBit: grass, PBR/procedural textures, sky, water, post-processing, trees, chunked terrain LOD → **graphics brief**
- ⬜ Realistic car physics + PUBG-style motorcycle (lean, wheelie, air pitch with Space/Ctrl, bad-landing crash), big maps to ride on → **vehicles brief**
- ⬜ Realistic sounds: weapons + attachments (suppressor), bullet impacts on bodies/surfaces, footsteps, vehicles. CC0 Kenney clips are in assets/audio-cc0 (not embedded yet); sound hooks (`sfx.step/impact/whiz/jump/land/swap/emptyClick`) are already called by the game but are empty stubs → **audio brief**
- ⬜ Realistic physics & combat: bullet travel/drop, PUBG PC/Lite balance (weapons, hit zones, armor/helmet %, durability, bag sizes, heals), better character models + ragdolls, FPP arms, vaulting, swimming, fall damage → **combat brief**
- ⬜ Integrate all five, test solo/squads/online end to end, polish, republish
