# Prompt to paste into Claude Code

Copy everything below the line into Claude Code, opened in this folder.

---

You're taking over **Stormline Royale**, an original browser battle royale I've been building with Claude.
It's in the spirit of PUBG Lite, but it has its own name, map, models and art. Read `CLAUDE.md` (architecture,
commands, rules) and `TODO.md` (everything I asked for, and what's done) before changing anything.

**What exists now (working and tested):** a Three.js desktop game built from `src/` into one HTML file with
`python3 build.py`:
- a random island with towns and loot, plus a cargo-plane drop with freefall and parachute
- a shrinking storm, 6 weapons, and bots that loot, fight and use squads
- online play with no server (WebRTC peer-to-peer through Trystero / BitTorrent trackers, a room code lobby,
  the host runs the bots, and another player takes over if the host leaves)
- squads of up to 3 with knock-downs and revives
- a jeep and a motorcycle, but the physics are arcade-style and need replacing
- backpacks, vests and helmets at levels 1–3, and a full attachment system (sight, muzzle, grip,
  magazine, stock)
- a Tab inventory with drag and drop, match stats on Esc (and S in the inventory), PUBG keybinds,
  first-person mode, and a fallback when the browser blocks mouse capture

**What's next:** five work streams, each with a brief in `docs/agent-briefs/`. They were planned to run in
parallel, but they were interrupted before they started.
1. `graphics.md`: reach at least BattleBit Remastered's visual quality, including dense wind-blown grass
   (my main complaint: it currently looks "plastic")
2. `world.md`: selectable island sizes of 1.2 / 2 / 3 km, generated randomly, with roads big enough to ride on.
   The menu option and the `cfg.mapSize` plumbing already exist.
3. `vehicles.md`: realistic car physics, and a motorcycle controlled like PUBG's
   (lean, wheelies, pitch control in the air with Space/Ctrl, crashes on bad landings)
4. `audio.md`: realistic sounds (guns and suppressors, bullet impacts, footsteps, vehicles), using only
   CC0 audio. Kenney's CC0 clips are in `assets/audio-cc0`. The game already calls the sound hooks, but
   they're empty stubs.
5. `combat.md`: bullet travel and drop, PUBG PC/Lite balance (weapons, hit zones, armor, helmets, durability,
   backpacks, healing; check that vests and armor really work), better characters and ragdolls, proper
   first-person arms, vaulting, swimming

**How I want you to work:** use up to 5 subagents in parallel, one per brief, each in its own git worktree.
Each subagent edits only the files it owns (listed in its brief and in `docs/AGENTS.md`) and reports
any changes it needs in other files as exact snippets. You coordinate: merge the results, run
`python3 build.py`, and test everything with the headless harness in `test/` (solo, squads, two-tab online
with `MOCK=1`, the inventory). Look at the screenshots yourself, fix what breaks, and keep iterating until it's
polished. Desktop target: 60 fps on a mid-range GPU at 1080p. Keep world generation deterministic (see
`CLAUDE.md`), because online play shares only the seed. Never copy assets, names or audio from PUBG or BattleBit;
matching balance numbers is fine. When everything is done, build `dist/stormline-royale.html` so I can play it
online with a friend (each of us opens the file in Chrome or Firefox).

Start by running the build and `test/smoke.py` to confirm the baseline works, then launch the agents.
