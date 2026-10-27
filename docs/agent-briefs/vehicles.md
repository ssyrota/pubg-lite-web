# Brief: VEHICLES (car + PUBG-style motorcycle)
User: vehicles feel "plastic"; must feel real like PUBG PC/Lite and BattleBit; motorcycle controlled like PUBG.
Inputs available: inp.throttle, inp.steer (+1 left), inp.brake (Space), inp.boost (Shift), raw keys inp.vk={W,S,A,D,Space,Shift,Ctrl(also C)}.
- Rigid body: position, velocity, quaternion, angular velocity; substeps.
- Per-wheel raycast suspension (spring+damper, travel limits) on terrain and box tops; slip-based tyre model (longitudinal + lateral, friction circle); engine torque curve, gears/RPM; brakes; handbrake drifts; weight transfer; drag/rolling resistance; slopes; rollovers possible (slow self-recovery after >3 s upside down near standstill, or exit).
- Jeep: heavy, stable, ~105–115 km/h, good off-road.
- Motorcycle: ~130–150 km/h, leans into turns, wheelies; IN AIR: hold Space = pitch back, Ctrl = pitch forward, A/D roll; landing > ~35–40° off or nose-first at speed = crash (damage, rider may be thrown); stays upright when stopped.
- Collisions with boxes/trees/rocks/vehicles (momentum exchange), impact-energy damage (60 km/h wall hurts, 100+ very dangerous; bikes fragile), occupant damage, water stalls/sinks, run-over damage ('roadkill'), explosions at 0 hp.
- Networking: driver's browser simulates; vehNetSend/onVst sync pos, orientation, velocity, steering; smooth remote interpolation; small payloads; seatWorld uses full orientation.
- Chase camera helper vehicleCamera(v,yaw,pitch,out) (wire into updateCamera).
- Better original jeep and dirt-bike models (wheel arches, visible suspension, steering, headlights, rider posture), wheels spin/steer, bike leans.
- Audio calls: sfx.engine(on,speed,kind,throttle,rpm), sfx.crash(i), sfx.skid&&sfx.skid(x).
Owns: 40-vehicles.js, 41-vehicle-mesh.js, VDEF in 00-core.js, new 4x-*.js.
Test & report numbers: 0–100 km/h, top speed, braking from 80, turning radius at 30/60, drift, bike jump with pitch control, bad landing crash, rollover, wall hits at 60/120, water, passengers, 2-tab sync (MOCK=1).
