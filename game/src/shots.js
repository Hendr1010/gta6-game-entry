// VICE BAY — shots.js
// One clear job: staged scenes for screenshots. ?shot=chase|drive|mission|start
// drives the REAL game forward from a seeded world, so every screenshot is a
// genuine render — never a mock. The autopilot poses the player, the cars,
// the police and the mission, then the normal loop takes over.

import { makeCar, spawnPoliceCar } from './vehicles.js';
import { CAR_MODELS } from './config.js';
import { startMission } from './missions.js';

export function parseShotParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') || '',
    seed: Number(params.get('seed') || '1'),
  };
}

function putPlayerInCar(S, modelName, x, y, angle, speed) {
  const model = CAR_MODELS.find((m) => m.name === modelName) || CAR_MODELS[0];
  const car = makeCar(x, y, angle, model, 'player');
  car.speed = speed || 0;
  S.cars.push(car);
  S.player.car = car;
  S.player.onFoot = false;
  S.player.x = x;
  S.player.y = y;
  return car;
}

function addTrafficNear(S, x, y, count) {
  // Traffic that reads as alive without blocking the player's lane: two cars
  // ahead in the same direction (one far, one near), one behind, one passing
  // in the oncoming lane. Never a head-on car right in front of the player.
  const spots = [
    { dx: -320, dy: -22, dir: 0 },
    { dx: -560, dy: -22, dir: 0 },
    { dx: 700, dy: -22, dir: 0 },
    // Oncoming car on the next street south — visible, never in the way.
    { dx: -200, dy: 400 + 22, dir: Math.PI },
  ];
  for (let i = 0; i < Math.min(count, spots.length); i += 1) {
    const s = spots[i];
    const model = CAR_MODELS[i % CAR_MODELS.length];
    const car = makeCar(x + s.dx, y + s.dy, s.dir, model, 'traffic');
    car.speed = 120;
    car.roadAxis = 'h';
    car.roadLine = y + (s.dy > 100 ? 400 : 0);
    car.roadDir = s.dir === 0 ? 1 : -1;
    S.cars.push(car);
  }
}

function addPedsNear(S, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    S.peds.push({
      x: x - 120 + i * 60,
      y: y + 90 + (i % 2) * 40,
      angle: 0,
      speed: 50,
      hp: 30,
      flee: false,
      color: ['#e86a6a', '#6aa8e8', '#e8c86a', '#8ae86a'][i % 4],
      wanderTimer: 2,
    });
  }
}

export function stageShot(S, name) {
  const w = S.world;
  S.mode = 'play';
  S.hideOverlays();
  if (name === 'start') {
    S.mode = 'title';
    S.showTitle();
    return;
  }
  if (name === 'drive') {
    // Cruising Palm Row in a yellow Palm GT, traffic and pedestrians around.
    // Autopilot holds W so the real game drives forward for the screenshot.
    S.input.keys['w'] = true;
    putPlayerInCar(S, 'Palm GT', 700, 700, 0, 260);
    addTrafficNear(S, 700, 700, 4);
    addPedsNear(S, 700, 700, 5);
    startMission(S, 0);
    S.mission.step = 1;
    S.message = 'Deliver the car to Mara\'s Garage.';
    S.messageTimer = 10;
    return;
  }
  if (name === 'chase') {
    // The cover: 3-star chase, two interceptors on the tail, mission live.
    // Autopilot holds W so the real game drives forward for the screenshot.
    S.input.keys['w'] = true;
    putPlayerInCar(S, 'Palm GT', 1100, 1100, 0, 380);
    addTrafficNear(S, 1100, 1100, 3);
    addPedsNear(S, 1100, 1100, 4);
    S.wanted = 3;
    const cop1 = spawnPoliceCar(S, 900, 1100);
    cop1.angle = 0;
    cop1.speed = 420;
    const cop2 = spawnPoliceCar(S, 820, 1122);
    cop2.angle = 0;
    cop2.speed = 400;
    startMission(S, 2);
    S.mission.step = 1;
    S.mission.target = { x: w.safehouse.x, y: w.safehouse.y };
    S.mission.targetLabel = 'Lose the heat — reach the safehouse';
    S.message = 'WANTED — 3 stars! Lose the cops.';
    S.messageTimer = 10;
    return;
  }
  if (name === 'mission') {
    // On foot at the beach kiosk, objective marker overhead, mission HUD live.
    S.player.x = w.kiosk.x - 60;
    S.player.y = w.kiosk.y - 40;
    S.player.onFoot = true;
    S.player.angle = Math.PI / 4;
    addPedsNear(S, w.kiosk.x, w.kiosk.y, 4);
    startMission(S, 3);
    S.message = 'Rob the beach kiosk — hold E at the till.';
    S.messageTimer = 10;
    return;
  }
  // Unknown shot: just play.
  S.mode = 'play';
}
