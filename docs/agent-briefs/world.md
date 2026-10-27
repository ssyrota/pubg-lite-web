# Brief: WORLD & MAP SIZE
Menu already passes cfg.mapSize = 1200 | 2000 | 3000 m to genWorld(seed,size).
1. Make HALF, SIZE, HN, CELL, GN, BORDER `let` globals set by setWorldDims(size) (keep names; HUD/minimap use them). ~4–5 m terrain cells. Store W.size/half/hn/cell. Grep for hardcoded 800/400/392/560/600/1024 in all files and fix (report snippets for files you don't own).
2. Terrain scaled to size: mountains, valleys, plains, beaches, optional shallow/bridged rivers, lakes, small islets. Deterministic (see CLAUDE.md).
3. Roads connecting towns + side roads, flattened into the heightmap, gentle grades, stored as W.roads=[{pts,w}].
4. Towns scaled with area (≈5–7 / 10–14 / 18–25), named; villages, a city block with 2–3 storey enterable buildings (stairs as ≤0.5 m steps), warehouses, a military compound, farms, container yards, bridges. Material tag `m` on boxes. Loot on every floor. Doors data (out/inn points) for bot routing.
5. Scale loot, vehicles (near roads/towns, jeep+bike mix), vegetation density (perf), storm (first radius ≈0.7×half-diagonal, longer phases on big maps), plane path/speed (25–45 s flight), BORDER.
6. renderMapImage: readable big map with roads/towns/water and grid letters.
Owns: 00-core.js (dims only), 10-worldgen.js, 25-collision.js, 26-mapimage.js, new 1x-*.js.
Test each size: genWorld time (<~2.5 s at 3 km), determinism (hash W.H and boxes twice), bots play, storm shrinks, vehicles on roads; big-map screenshots + city street view.
