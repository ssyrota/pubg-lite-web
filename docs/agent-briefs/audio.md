# Brief: AUDIO
User wants realistic sound: weapons (+ suppressor), bullet impacts on bodies/surfaces, footsteps, physics sounds, vehicles; "get sounds from the internet".
LICENSING: only CC0/public-domain audio with the license verified at the source; list every file + source + license at the top of the data file.
Available CC0 clips: assets/audio-cc0 (Kenney starter kits — footsteps, jump/land, weapon change, engine, skid, impact, ambience). Best CC0 firearm source (not reachable from the old sandbox): The Free Firearm Sound Library on opengameart.org.
Build (Web Audio):
- Gunshots per class (pistol, SMG, shotgun, rifle, DMR, bolt sniper) from recordings if available, else layered synthesis pre-rendered with OfflineAudioContext (transient crack, action click, body, low punch, generated convolution reverb tail), 3–4 variations each; distance model (brightness, delayed crack/boom ~343 m/s), HRTF/equal-power panning with camera as listener; suppressed variants; supersonic crack + whiz near the listener.
- Reload, swap, empty click, attachment click, pickup, door; impacts: flesh, helmet/armor ping, metal, dirt, concrete, wood, water; hit-marker tick; headshot.
- Footsteps per surface (grass, sand, floor, water, rock) from the Kenney walking clip sliced + filtering; jump/land; knocked crawl.
- Vehicles: RPM engine (jeep vs bike), gear shifts, skid, crash, explosion, splash. Ambience: wind, waves, plane drone.
- Master compressor/limiter; volume slider saved in localStorage.
API to keep: sfx.init, tone, gun(k,dist,quiet,pos), boom, crash, hit, kill, pick, reload, door, attach, engine(on,spd,kind,throttle,rpm), wind, step(surface,pos,mine), jump, land(pos,hard,mine), impact(kind,pos,head), whiz(pos), swap, emptyClick, setVolume, update(dt) (listener from camera; call it in simulate()).
Owns: 70-audio.js, new 7x-*.js (embedded audio ≤ ~1.5 MB). Test by rendering offline buffers to WAV and checking attack/decay/spectrum; smoke match with no errors.
