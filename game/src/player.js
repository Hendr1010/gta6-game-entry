// VICE BAY — player.js
// One clear job: Ray Vega on foot — walking, sprinting, entering and
// leaving cars — and the camera that follows him.

import { PLAYER, clamp, dist2 } from './config.js';
import { collideBuildings, inWater } from './world.js';

export function createPlayer(world) {
  return {
    x: world.spawn.x,
    y: world.spawn.y,
    angle: -Math.PI / 2,
    speed: 0,
    health: PLAYER.maxHealth,
    money: PLAYER.startMoney,
    ammo: PLAYER.startAmmo,
    onFoot: true,
    car: null,
    punchCooldown: 0,
    shootCooldown: 0,
    hidden: false,
  };
}

export function updatePlayerOnFoot(S, dt) {
  const p = S.player;
  const input = S.input;
  let mx = 0;
  let my = 0;
  if (input.keys['w'] || input.keys['arrowup']) my -= 1;
  if (input.keys['s'] || input.keys['arrowdown']) my += 1;
  if (input.keys['a'] || input.keys['arrowleft']) mx -= 1;
  if (input.keys['d'] || input.keys['arrowright']) mx += 1;
  const sprint = input.keys['shift'];
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    p.x += (mx / len) * speed * dt;
    p.y += (my / len) * speed * dt;
    p.angle = Math.atan2(my, mx);
    p.speed = speed;
  } else {
    p.speed = 0;
  }
  p.x = clamp(p.x, 30, S.world.size - 30);
  p.y = clamp(p.y, 30, S.world.size - 30);
  collideBuildings(S.world, p, PLAYER.radius);
  if (inWater(S.world, p.x, p.y)) {
    // Waist-deep water pushes you back onto the sand.
    p.y = S.world.waterY - 4;
  }
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  // Aim on foot follows the mouse.
  const wx = S.camera.x + input.mouseX - S.view.w / 2;
  const wy = S.camera.y + input.mouseY - S.view.h / 2;
  if (Math.hypot(wx - p.x, wy - p.y) > 20) {
    p.angle = Math.atan2(wy - p.y, wx - p.x);
  }
}

export function nearestCar(S, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of S.cars) {
    if (car.driver === 'player') continue;
    const d = dist2(S.player.x, S.player.y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(S, car) {
  const p = S.player;
  if (car.driver === 'traffic') {
    // Occupied car: the driver bails and flees on foot.
    const driver = { x: car.x, y: car.y, angle: car.angle, flee: true, speed: 220, hp: 30, color: '#e8c86a', wanderTimer: 2 };
    S.peds.push(driver);
    S.message = `Stole the ${car.model}! The driver ran for it.`;
    S.messageTimer = 3;
    S.addWanted(1, 'theft');
  } else {
    S.message = `Got in the ${car.model}.`;
    S.messageTimer = 2;
    if (car.driver === 'parked') S.addWanted(1, 'theft');
  }
  car.driver = 'player';
  car.speed = 0;
  p.car = car;
  p.onFoot = false;
}

export function exitCar(S) {
  const p = S.player;
  if (!p.car) return;
  const car = p.car;
  car.driver = 'parked';
  car.speed = 0;
  p.car = null;
  p.onFoot = true;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
  p.x = clamp(p.x, 30, S.world.size - 30);
  p.y = clamp(p.y, 30, S.world.size - 30);
}

export function updateCamera(S, dt) {
  const focus = S.player.onFoot
    ? S.player
    : S.player.car || S.player;
  const tx = clamp(focus.x - S.view.w / 2, 0, S.world.size - S.view.w);
  const ty = clamp(focus.y - S.view.h / 2, 0, S.world.size - S.view.h);
  const k = 1 - Math.pow(0.001, dt);
  S.camera.x += (tx - S.camera.x) * k;
  S.camera.y += (ty - S.camera.y) * k;
}
