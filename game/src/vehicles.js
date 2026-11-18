// VICE BAY — vehicles.js
// One clear job: cars — parked cars, AI traffic on the road loops, the
// player's driving physics, skid marks and car wrecks.

import { CAR_MODELS, POLICE_MODEL, clamp, angleDiff, makeRng } from './config.js';
import { collideBuildings, isOnRoad, randomRoadPoint } from './world.js';

let carId = 0;

export function makeCar(x, y, angle, model, driver) {
  carId += 1;
  return {
    id: carId,
    x, y, angle,
    speed: 0,
    model: model.name,
    color: model.color,
    topSpeed: model.topSpeed,
    accel: model.accel,
    handling: model.handling,
    hp: model.hp,
    maxHp: model.hp,
    driver: driver || 'parked',
    boostTimer: 0,
    lastHit: 0,
    // Traffic AI: which road line it follows and which way.
    roadAxis: null,
    roadLine: 0,
    roadDir: 1,
    stuckTimer: 0,
    brakeLight: false,
  };
}

export function spawnParkedCars(S, count) {
  const rng = S.rng;
  for (let i = 0; i < count; i += 1) {
    const pt = randomRoadPoint(S.world, rng, null, 0);
    const model = CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)];
    const horizontal = rng() < 0.5;
    const car = makeCar(
      pt.x + (horizontal ? 0 : (rng() < 0.5 ? -58 : 58)),
      pt.y + (horizontal ? (rng() < 0.5 ? -58 : 58) : 0),
      horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      model,
      'parked',
    );
    S.cars.push(car);
  }
}

export function spawnTraffic(S, count) {
  const rng = S.rng;
  for (let i = 0; i < count; i += 1) {
    const pt = randomRoadPoint(S.world, rng, null, 0);
    const model = CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)];
    const car = makeCar(pt.x, pt.y, 0, model, 'traffic');
    assignRoad(S, car);
    car.speed = 90 + rng() * 70;
    S.cars.push(car);
  }
}

export function assignRoad(S, car) {
  const rng = S.rng;
  const lines = S.world.lines;
  const horizontal = rng() < 0.5;
  const line = lines[Math.floor(rng() * lines.length)];
  car.roadAxis = horizontal ? 'h' : 'v';
  car.roadLine = horizontal ? line.y : line.x;
  car.roadDir = rng() < 0.5 ? 1 : -1;
  if (horizontal) {
    car.y = car.roadLine + (car.roadDir > 0 ? -22 : 22);
    car.angle = car.roadDir > 0 ? 0 : Math.PI;
  } else {
    car.x = car.roadLine + (car.roadDir > 0 ? 22 : -22);
    car.angle = car.roadDir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

// Snap a shoved car onto the nearest road on its current heading so it can
// join traffic instead of sitting as an immovable wall.
export function adoptNearestRoad(S, car) {
  const horizontal = Math.abs(Math.cos(car.angle)) > Math.abs(Math.sin(car.angle));
  let best = S.world.lines[0];
  let bestD = Infinity;
  for (const p of S.world.lines) {
    const v = horizontal ? p.y : p.x;
    const d = Math.abs((horizontal ? car.y : car.x) - v);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (horizontal) {
    car.roadAxis = 'h';
    car.roadLine = best.y;
    car.roadDir = Math.cos(car.angle) >= 0 ? 1 : -1;
    car.y = car.roadLine + (car.roadDir > 0 ? -22 : 22);
    car.angle = car.roadDir > 0 ? 0 : Math.PI;
  } else {
    car.roadAxis = 'v';
    car.roadLine = best.x;
    car.roadDir = Math.sin(car.angle) >= 0 ? 1 : -1;
    car.x = car.roadLine + (car.roadDir > 0 ? 22 : -22);
    car.angle = car.roadDir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

export function updatePlayerCar(S, dt) {
  const car = S.player.car;
  if (!car) return;
  const input = S.input;
  const forward = input.keys['w'] || input.keys['arrowup'];
  const back = input.keys['s'] || input.keys['arrowdown'];
  const left = input.keys['a'] || input.keys['arrowleft'];
  const right = input.keys['d'] || input.keys['arrowright'];
  const handbrake = input.keys[' '];
  if (forward) car.speed += car.accel * dt;
  if (back) car.speed -= car.accel * 0.8 * dt;
  if (!forward && !back) {
    car.speed -= Math.sign(car.speed) * 120 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  if (handbrake) {
    car.speed -= Math.sign(car.speed) * 520 * dt;
    if (Math.abs(car.speed) < 20) car.speed = 0;
  }
  car.speed = clamp(car.speed, -140, car.topSpeed);
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const grip = handbrake ? 1.7 : 1;
  if (Math.abs(car.speed) > 5) {
    car.angle += steer * car.handling * grip * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 160);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 30, S.world.size - 30);
  car.y = clamp(car.y, 30, S.world.size - 30);
  const hitWall = collideBuildings(S.world, car, 20);
  if (hitWall && Math.abs(car.speed) > 150) {
    car.speed *= -0.25;
    S.spawnCrash(car.x, car.y, 6);
    S.audioFx('crash');
    car.hp -= 8;
  } else if (hitWall) {
    car.speed *= 0.4;
  }
  // Skid marks while handbraking at speed or steering hard.
  if ((handbrake && Math.abs(car.speed) > 120) || (Math.abs(steer) > 0 && Math.abs(car.speed) > 340)) {
    S.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 4 });
    if (S.skids.length > 220) S.skids.shift();
  }
  if (car.hp <= 0) explodeCar(S, car);
}

export function explodeCar(S, car) {
  S.spawnExplosion(car.x, car.y);
  S.audioFx('crash');
  car.hp = car.maxHp;
  car.speed = 0;
  if (car.driver === 'player') {
    S.player.health -= 25;
    S.player.onFoot = true;
    S.player.car = null;
    S.player.x = car.x + 40;
    S.player.y = car.y + 40;
    car.driver = 'parked';
    S.message = 'Your car blew up! Get clear.';
    S.messageTimer = 3;
  } else if (car.driver === 'police') {
    car.driver = 'wreck';
    S.message = 'Police car destroyed!';
    S.messageTimer = 2;
  } else {
    car.driver = 'wreck';
  }
}

export function updateTraffic(S, dt) {
  const player = S.player;
  for (const car of S.cars) {
    if (car.driver !== 'traffic') continue;
    // Keep traffic near the action: respawn far-away cars closer to the player.
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d > 1600) {
      const pt = randomRoadPoint(S.world, S.rng, player, 900);
      car.x = pt.x;
      car.y = pt.y;
      assignRoad(S, car);
      car.speed = 100;
      continue;
    }
    // Drive along the road; at an intersection, sometimes turn.
    if (car.boostTimer > 0) car.boostTimer -= dt;
    const targetSpeed = car.boostTimer > 0 ? 320 : 130;
    car.speed += (targetSpeed - car.speed) * dt * 0.8;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const atCrossing = S.world.lines.some((p) =>
      Math.abs(nx - p.x) < 60 && Math.abs(ny - p.y) < 60);
    if (atCrossing && S.rng() < dt * 1.2) {
      assignRoad(S, car);
      car.x = car.roadAxis === 'h' ? car.x : car.roadLine + (car.roadDir > 0 ? 22 : -22);
      car.y = car.roadAxis === 'h' ? car.roadLine + (car.roadDir > 0 ? -22 : 22) : car.y;
      continue;
    }
    car.x = nx;
    car.y = ny;
    // Gentle steering back onto the lane.
    if (car.roadAxis === 'h') {
      const laneY = car.roadLine + (car.roadDir > 0 ? -22 : 22);
      car.y += (laneY - car.y) * dt * 2;
      car.angle += angleDiff(car.angle, car.roadDir > 0 ? 0 : Math.PI) * dt * 2;
    } else {
      const laneX = car.roadLine + (car.roadDir > 0 ? 22 : -22);
      car.x += (laneX - car.x) * dt * 2;
      car.angle += angleDiff(car.angle, car.roadDir > 0 ? Math.PI / 2 : -Math.PI / 2) * dt * 2;
    }
    collideBuildings(S.world, car, 20);
  }
}

// Car-vs-car bumps: push apart, then — at most once per 0.35 s per car —
// exchange the velocity along the collision normal (equal-mass elastic
// bump), so a rear-ended car launches forward instead of both cars grinding
// to a halt while they overlap.
export function resolveCarCollisions(S) {
  const cars = S.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 44 * 44 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const push = (44 - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const vax = Math.cos(a.angle) * a.speed;
        const vay = Math.sin(a.angle) * a.speed;
        const vbx = Math.cos(b.angle) * b.speed;
        const vby = Math.sin(b.angle) * b.speed;
        const closing = (vax - vbx) * nx + (vay - vby) * ny;
        if (closing <= 60) continue;
        if (S.time - (a.lastHit || 0) < 0.35) continue;
        if (S.time - (b.lastHit || 0) < 0.35) continue;
        a.lastHit = S.time;
        b.lastHit = S.time;
        const speedA = a.speed;
        const speedB = b.speed;
        const vax2 = vax - closing * nx;
        const vay2 = vay - closing * ny;
        const vbx2 = vbx + closing * nx;
        const vby2 = vby + closing * ny;
        a.speed = clamp(
          vax2 * Math.cos(a.angle) + vay2 * Math.sin(a.angle),
          -140,
          a.topSpeed,
        );
        b.speed = clamp(
          vbx2 * Math.cos(b.angle) + vby2 * Math.sin(b.angle),
          -140,
          b.topSpeed,
        );
        if (closing > 180) {
          a.hp -= 4;
          b.hp -= 4;
          S.spawnCrash((a.x + b.x) / 2, (a.y + b.y) / 2, 4);
          if (a.driver === 'player' || b.driver === 'player') S.audioFx('crash');
        }
        // A rear-ended traffic car floors it and clears out of the way.
        if (a.driver === 'player' && b.driver === 'traffic') b.boostTimer = 2;
        if (b.driver === 'player' && a.driver === 'traffic') a.boostTimer = 2;
        // A parked car rammed hard gets shoved and joins traffic instead of
        // acting as an immovable wall the player can never push past.
        if (closing > 150 && a.driver === 'parked' && Math.abs(speedB) > 100) {
          a.driver = 'traffic';
          a.speed = speedB * 0.7;
          a.boostTimer = 2;
          adoptNearestRoad(S, a);
        }
        if (closing > 150 && b.driver === 'parked' && Math.abs(speedA) > 100) {
          b.driver = 'traffic';
          b.speed = speedA * 0.7;
          b.boostTimer = 2;
          adoptNearestRoad(S, b);
        }
      }
    }
  }
}

export function spawnPoliceCar(S, x, y) {
  const car = makeCar(x, y, 0, POLICE_MODEL, 'police');
  car.speed = 200;
  S.cars.push(car);
  return car;
}
