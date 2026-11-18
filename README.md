# VICE BAY

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Hendr1010/gta6-game-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Hendr1010/gta6-game-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the [gta6-01 "Make GTA 6" bounty](https://make.fun/bounty/gta6-01).
No Rockstar names, characters, art, music or maps — Vice Bay, Ray Vega, Mara and
the Vice Bay PD are all invented here.

## Play

Serve `game/` with any static server (`node serve.ts`, then
http://localhost:8080) and play in a desktop browser. Keyboard + mouse, no
network, no build step. All art is drawn on canvas; all sound is synthesized
with WebAudio.

- **On foot / driving** — WASD or arrows, Shift sprint, Space handbrake,
  E enters/exits the nearest car.
- **Cars** — 5 models with different speed and handling, parked cars to steal
  (occupied drivers flee), AI traffic driving the road loops.
- **Wanted 0–5 stars** — rises on theft, shooting and running people over,
  decays when you hide. Police cars chase and ram; foot cops chase on foot.
  Busted or Wasted sends you to Bay General Hospital and costs you money.
- **Combat** — F punches, mouse aim + click fires the pistol (ammo pickups
  around the city).
- **Missions** — a 5-mission story chain with Mara the fixer: First Wheels,
  Courier Run, Getaway Driver, Beach Heist, Vice King. Objective marker,
  minimap blip and cash reward each. Taxi fares pay as side work.
- **HUD + minimap** — health, money, wanted stars, mission objective, speed,
  ammo, clock, and a live minimap (roads, player, police, mission, taxi).
- **Save** — autosaves on mission completion and taxi fares; Continue on the
  title screen loads it (localStorage).
- **Sound** — engine hum by speed, two-tone siren, gunshots, pickup chimes,
  mission jingle and a sunny music loop. N mutes.

## Structure

| File | Job |
| --- | --- |
| `game/index.html`, `game/style.css` | Page shell, menus, overlays |
| `game/src/config.js` | Tunables, car models, mission definitions |
| `game/src/world.js` | City generation (roads, blocks, beach, park) + collision |
| `game/src/player.js` | On-foot movement, entering/exiting cars, camera |
| `game/src/vehicles.js` | Parked cars, traffic AI, driving physics, wrecks |
| `game/src/police.js` | Wanted level, police chases, Busted/Wasted |
| `game/src/missions.js` | 5-mission story chain + taxi fares |
| `game/src/combat.js` | Punching, shooting, pedestrians, pickups, particles |
| `game/src/render.js` | Canvas drawing, HUD, minimap |
| `game/src/audio.js` | WebAudio synth: engine, siren, shots, music |
| `game/src/input.js` | Keyboard + mouse state |
| `game/src/shots.js` | Staged scenes (`?shot=chase|drive|mission|start`) |
| `game/src/main.js` | Game state, loop, menus, save/load |

Screenshots in `screenshots/` are real renders of the game itself, staged
with `?shot=` driving the live game from a seeded world.

## License

MIT — see `LICENSE`.
