# Brief: GRAPHICS
Goal: quality level of BattleBit Remastered (reference only, original art). User: current look is "plastic"; wants grass.
1. Lighting/tone: ACES tone mapping, sRGB, warm sun + sky hemisphere, good soft shadows near the player (tight camera-following shadow frustum with texel snapping or 2 cascades), baked AO look, fog matched to sky, real sky (gradient + sun disc + clouds; three/addons Sky ok).
2. Materials: MeshStandardMaterial with procedural canvas textures (no image files): terrain splat grass/dirt/rock/sand by slope+height+noise with world-space UVs; plaster/brick/wood/concrete/corrugated metal; roofs read as roofs; window hints. Boxes carry colour `c` and (from the world brief) optional material tag `m`: wall|roof|floor|crate|container|step|partition|road.
3. GRASS: dense instanced blades/tufts in chunks within ~60–90 m of the camera, wind sway in the vertex shader, colour variation, distance fade, not on sand/rock/roads/floors/water/steep slopes. 1–3 draw calls.
4. Trees/vegetation/rocks: better conifers and broadleaf (multiple canopy blobs, taper), wind sway, instancing.
5. Water: animated normals, fresnel, specular, shore foam/depth tint.
6. Post: subtle bloom, SMAA/FXAA, grading/vignette. For three/addons add an importmap in src/head.html and change the import in 00-core.js to `import * as THREE from 'three'`. Quality toggle G.gfx high/low saved in localStorage.
7. Terrain must handle maps up to 3000 m: chunked terrain with 2–3 LODs by camera distance; read HALF/SIZE/HN/CELL/W.* (not hardcoded 800). Paint `W.roads=[{pts:[[x,z]...],w}]` when present.
8. Effects (68-fx.js): muzzle flash sprite + short light, glowing tracers, impact dust/sparks, blood, explosion + smoke, vehicle smoke.
Owns: 20-render.js, 68-fx.js, new 2x-*.js, head.html (importmap only). Add `renderFrame()` and `updateGraphics(dt)` and wire them in 95-main.js.
Perf: 60 fps mid GPU 1080p; report renderer.info calls/triangles. Test with screenshots: menu, town, grass field, shore, plane view, gunfight.
