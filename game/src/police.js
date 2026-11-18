// VICE BAY — police.js
// One clear job: the wanted level — how crimes raise it, how it decays when
// the player hides, police cars and foot cops that chase, and Busted/Wasted.

import { WANTED, POLICE_MODEL, clamp, angleDiff } from './config.js';
import { spawnPoliceCar, explodeCar } from './vehicles.js';
import { randomRoadPoint } from './world.js';

export function addWanted(S, stars, reason) {
  const before = Math.floor(S.wanted);
  S.wanted = clamp(S.wanted + stars, 0, WANTED.maxStars);
  S.wantedTimer = 0;
  S.lastCrime = reason;
  const after = Math.floor(S.wanted);
  if (after > before) {
    S.message = `WANTED — ${after} star${after > 1 ? 's' : ''}! Lose the cops.`;
    S.messageTimer = 3;
  }
  // Police respond at once when the heat jumps.
  if (after >= 1 && S.policeCars().length < after) {
    spawnPoliceNear(S);
  }
}

export function spawnPoliceNear(S) {
  const pt = randomRoadPoint(S.world, S.rng, S.player, 500);
  const car = spawnPoliceCar(S, pt.x, pt.y);
  return car;
}

export function updateWanted(S, dt) {
  const stars = Math.floor(S.wanted);
  if (stars === 0) return;
  S.wantedTimer += dt;
  // Decay only when no police unit is close enough to see the player.
  const nearestCop = nearestPoliceDistance(S);
  const hidden = nearestCop > 520;
  if (hidden && S.wantedTimer > WANTED.decayDelay) {
    S.wanted -= WANTED.decayRate * dt;
    if (S.wanted <= 0) {
      S.wanted = 0;
      S.message = 'You lost the heat. Stay clean.';
      S.messageTimer = 3;
    }
  }
  // More stars, more cars on the road.
  const wantCars = Math.min(stars, 3);
  const have = S.policeCars().length;
  if (have < wantCars && S.spawnTimer <= 0) {
    spawnPoliceNear(S);
    S.spawnTimer = 4;
  }
  if (S.spawnTimer > 0) S.spawnTimer -= dt;
  // Foot cops join the chase at 2+ stars.
  if (stars >= 2 && S.cops.length < stars - 1 && S.spawnTimer <= 0) {
    const pt = randomRoadPoint(S.world, S.rng, S.player, 350);
    S.cops.push({ x: pt.x, y: pt.y, angle: 0, speed: 210, hp: 40, touchTimer: 0 });
    S.spawnTimer = 5;
  }
}

export function nearestPoliceDistance(S) {
  let best = Infinity;
  for (const car of S.policeCars()) {
    best = Math.min(best, Math.hypot(car.x - S.player.x, car.y - S.player.y));
  }
  for (const cop of S.cops) {
    best = Math.min(best, Math.hypot(cop.x - S.player.x, cop.y - S.player.y));
  }
  return best;
}

export function updatePoliceCars(S, dt) {
  const p = S.player;
  for (const car of S.policeCars()) {
    const targetAngle = Math.atan2(p.y - car.y, p.x - car.x);
    const diff = angleDiff(car.angle, targetAngle);
    car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const d = Math.hypot(p.x - car.x, p.y - car.y);
    const targetSpeed = d > 260 ? WANTED.policeCarSpeed : 340;
    car.speed += (targetSpeed - car.speed) * dt * 1.2;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ramming the player's car damages it; ramming the player hurts him.
    if (p.car && Math.hypot(car.x - p.car.x, car.y - p.car.y) < 46) {
      p.car.hp -= 22 * dt;
      car.hp -= 6 * dt;
      car.speed *= 0.9;
      if (Math.random() < dt * 2) S.spawnCrash(car.x, car.y, 3);
    }
    if (p.onFoot && Math.hypot(car.x - p.x, car.y - p.y) < 30) {
      p.health -= 30 * dt;
    }
    if (car.hp <= 0) {
      explodeCar(S, car);
    }
  }
  // Drop police cars that fell far behind and the heat is gone.
  if (Math.floor(S.wanted) === 0) {
    for (const car of S.policeCars()) {
      if (Math.hypot(car.x - p.x, car.y - p.y) > 1200) car.driver = 'gone';
    }
    S.cars = S.cars.filter((c) => c.driver !== 'gone');
    S.cops = [];
  }
}

export function updateFootCops(S, dt) {
  const p = S.player;
  for (const cop of S.cops) {
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    const targetAngle = Math.atan2(p.y - cop.y, p.x - cop.x);
    cop.angle += angleDiff(cop.angle, targetAngle) * dt * 6;
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    if (d < 30) {
      cop.touchTimer += dt;
      if (p.onFoot) p.health -= 12 * dt;
      if (cop.touchTimer > 1.2 && p.onFoot) {
        S.busted(S, 'The Vice Bay PD caught you on foot.');
      }
    } else {
      cop.touchTimer = 0;
    }
  }
}

export function busted(S, reason) {
  if (S.mode !== 'play') return;
  S.mode = 'busted';
  S.bustedReason = reason;
  const fine = Math.floor(S.player.money * 0.1);
  S.player.money -= fine;
  S.finePaid = fine;
  S.wanted = 0;
  S.cops = [];
  S.cars = S.cars.filter((c) => c.driver !== 'police');
  S.audioFx('busted');
  S.saveGame();
}

export function wasted(S, reason) {
  if (S.mode !== 'play') return;
  S.mode = 'wasted';
  S.wastedReason = reason;
  const lost = Math.floor(S.player.money * 0.15);
  S.player.money -= lost;
  S.finePaid = lost;
  S.wanted = 0;
  S.cops = [];
  S.cars = S.cars.filter((c) => c.driver !== 'police');
  S.audioFx('busted');
  S.saveGame();
}

export function respawnAtHospital(S) {
  const p = S.player;
  p.health = 100;
  p.x = S.world.hospital.x + 40;
  p.y = S.world.hospital.y + 40;
  p.onFoot = true;
  p.car = null;
  p.ammo = Math.max(p.ammo, 12);
  S.mode = 'play';
  S.message = 'Patched up at Bay General. Back to work.';
  S.messageTimer = 4;
}
