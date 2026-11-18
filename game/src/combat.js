// VICE BAY — combat.js
// One clear job: fighting — punches, pistol fire, bullets, ammo and health
// pickups, pedestrians, and the particle explosions.

import { PLAYER, clamp } from './config.js';
import { collideBuildings } from './world.js';

export function spawnPedestrians(S, count) {
  const rng = S.rng;
  for (let i = 0; i < count; i += 1) {
    const x = 120 + rng() * (S.world.size - 240);
    const y = 120 + rng() * (S.world.size - 240);
    if (y > S.world.beachY) continue;
    S.peds.push({
      x, y,
      angle: rng() * Math.PI * 2,
      speed: 40 + rng() * 40,
      hp: 30,
      flee: false,
      color: ['#e86a6a', '#6aa8e8', '#e8c86a', '#8ae86a', '#c86ae8'][Math.floor(rng() * 5)],
      wanderTimer: 1 + rng() * 3,
    });
  }
}

export function spawnPickups(S) {
  const rng = S.rng;
  for (let i = 0; i < 6; i += 1) {
    S.pickups.push({
      x: 200 + rng() * (S.world.size - 400),
      y: 200 + rng() * (S.world.beachY - 400),
      kind: i % 2 === 0 ? 'ammo' : 'health',
      bob: rng() * Math.PI * 2,
    });
  }
}

export function updatePedestrians(S, dt) {
  const p = S.player;
  for (const ped of S.peds) {
    ped.wanderTimer -= dt;
    const playerCar = p.car;
    const threatX = playerCar ? playerCar.x : p.x;
    const threatY = playerCar ? playerCar.y : p.y;
    const dThreat = Math.hypot(ped.x - threatX, ped.y - threatY);
    const speeding = playerCar && Math.abs(playerCar.speed) > 150;
    if ((speeding && dThreat < 130) || S.shotsFiredRecently > 0) {
      ped.flee = true;
    }
    if (ped.flee) {
      const away = Math.atan2(ped.y - threatY, ped.x - threatX);
      ped.angle = away;
      ped.x += Math.cos(away) * 200 * dt;
      ped.y += Math.sin(away) * 200 * dt;
      if (dThreat > 320) ped.flee = false;
    } else {
      if (ped.wanderTimer <= 0) {
        ped.angle = S.rng() * Math.PI * 2;
        ped.wanderTimer = 2 + S.rng() * 4;
      }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }
    ped.x = clamp(ped.x, 30, S.world.size - 30);
    ped.y = clamp(ped.y, 30, S.world.size - 30);
    collideBuildings(S.world, ped, 10);
    // Run over by a fast car: the pedestrian goes down, and the law notices.
    if (playerCar && Math.abs(playerCar.speed) > 120) {
      const d = Math.hypot(ped.x - playerCar.x, ped.y - playerCar.y);
      if (d < 26) {
        ped.hp = 0;
        S.spawnCrash(ped.x, ped.y, 5);
        S.addWanted(1, 'runover');
        S.message = 'You ran someone over! Witnesses called it in.';
        S.messageTimer = 3;
      }
    }
  }
  S.peds = S.peds.filter((ped) => ped.hp > 0);
}

export function punch(S) {
  const p = S.player;
  if (!p.onFoot || p.punchCooldown > 0) return;
  p.punchCooldown = PLAYER.punchCooldown;
  S.audioFx('punch');
  S.spawnMuzzle(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24);
  for (const ped of S.peds) {
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < PLAYER.punchRange) ped.hp -= PLAYER.punchDamage;
  }
  for (const cop of S.cops) {
    const d = Math.hypot(cop.x - p.x, cop.y - p.y);
    if (d < PLAYER.punchRange) {
      cop.hp -= PLAYER.punchDamage;
      if (cop.hp <= 0) S.addWanted(1, 'assault');
    }
  }
  S.cops = S.cops.filter((c) => c.hp > 0);
}

export function shoot(S) {
  const p = S.player;
  if (!p.onFoot || p.shootCooldown > 0 || p.ammo <= 0) return;
  p.shootCooldown = 0.22;
  p.ammo -= 1;
  const wx = S.camera.x + S.input.mouseX - S.view.w / 2;
  const wy = S.camera.y + S.input.mouseY - S.view.h / 2;
  const angle = Math.atan2(wy - p.y, wx - p.x);
  p.angle = angle;
  S.bullets.push({
    x: p.x + Math.cos(angle) * 22,
    y: p.y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * PLAYER.bulletSpeed,
    vy: Math.sin(angle) * PLAYER.bulletSpeed,
    life: PLAYER.pistolRange / PLAYER.bulletSpeed,
    damage: PLAYER.pistolDamage,
  });
  S.spawnMuzzle(p.x + Math.cos(angle) * 26, p.y + Math.sin(angle) * 26);
  S.audioFx('gunshot');
  S.shotsFiredRecently = 1.5;
  S.addWanted(1, 'shoot');
}

export function updateBullets(S, dt) {
  for (const b of S.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const ped of S.peds) {
      if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
        ped.hp -= b.damage;
        b.life = 0;
        S.spawnCrash(b.x, b.y, 4);
        break;
      }
    }
    for (const cop of S.cops) {
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < 14) {
        cop.hp -= b.damage;
        b.life = 0;
        S.spawnCrash(b.x, b.y, 4);
        break;
      }
    }
    for (const car of S.cars) {
      if (car.driver === 'player') continue;
      if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
        car.hp -= b.damage;
        b.life = 0;
        S.spawnCrash(b.x, b.y, 3);
        if (car.hp <= 0 && S.explodeCarFn) S.explodeCarFn(S, car);
        break;
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
  S.cops = S.cops.filter((c) => c.hp > 0);
  S.peds = S.peds.filter((ped) => ped.hp > 0);
}

export function updatePickups(S, dt) {
  const p = S.player;
  for (const pk of S.pickups) {
    pk.bob += dt * 3;
    const d = Math.hypot(pk.x - p.x, pk.y - p.y);
    if (d < 30) {
      if (pk.kind === 'ammo') {
        p.ammo += 24;
        S.message = '+24 pistol ammo';
      } else {
        p.health = Math.min(100, p.health + 40);
        S.message = '+40 health';
      }
      S.messageTimer = 2;
      S.audioFx('pickup');
      pk.taken = true;
    }
  }
  S.pickups = S.pickups.filter((pk) => !pk.taken);
}

export function updateParticles(S, dt) {
  for (const pt of S.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.94;
    pt.vy *= 0.94;
    pt.life -= dt;
  }
  S.particles = S.particles.filter((pt) => pt.life > 0);
  for (const sk of S.skids) sk.life -= dt;
  S.skids = S.skids.filter((sk) => sk.life > 0);
  if (S.shotsFiredRecently > 0) S.shotsFiredRecently -= dt;
}
