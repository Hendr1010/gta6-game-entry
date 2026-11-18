// VICE BAY — render.js
// One clear job: everything the player sees — the city, cars, people, effects,
// the HUD (health, money, wanted stars, mission, speed, ammo, clock) and the
// minimap with its blips.

import { COLORS } from './config.js';

export function drawGame(ctx, S) {
  const cam = S.camera;
  ctx.clearRect(0, 0, S.view.w, S.view.h);
  drawGround(ctx, S, cam);
  drawRoads(ctx, S, cam);
  drawPark(ctx, S, cam);
  drawBeach(ctx, S, cam);
  drawBuildings(ctx, S, cam);
  drawSkids(ctx, S, cam);
  drawPickups(ctx, S, cam);
  drawObjective(ctx, S, cam);
  drawCars(ctx, S, cam);
  drawPedestrians(ctx, S, cam);
  drawCops(ctx, S, cam);
  drawPlayer(ctx, S, cam);
  drawBullets(ctx, S, cam);
  drawParticles(ctx, S, cam);
  drawMuzzle(ctx, S, cam);
  if (S.mode === 'play' || S.mode === 'pause') {
    drawHud(ctx, S);
    drawMinimap(ctx, S);
  }
}

function inView(cam, view, x, y, margin) {
  return x > cam.x - margin && x < cam.x + view.w + margin && y > cam.y - margin && y < cam.y + view.h + margin;
}

function drawGround(ctx, S, cam) {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, S.view.w, S.view.h);
  // Mow stripes so the grass reads as a city, not a flat field.
  ctx.fillStyle = COLORS.grassDark;
  const stripe = 120;
  const startX = Math.floor(cam.x / stripe) * stripe;
  for (let x = startX; x < cam.x + S.view.w; x += stripe * 2) {
    ctx.fillRect(x - cam.x, 0, stripe, S.view.h);
  }
}

function drawRoads(ctx, S, cam) {
  const half = 48;
  ctx.fillStyle = COLORS.road;
  for (const p of S.world.lines) {
    if (p.x > cam.x - half && p.x < cam.x + S.view.w + half) {
      ctx.fillRect(p.x - half - cam.x, -cam.y, half * 2, S.world.size);
    }
    if (p.y > cam.y - half && p.y < cam.y + S.view.h + half) {
      ctx.fillRect(-cam.x, p.y - half - cam.y, S.world.size, half * 2);
    }
  }
  // Centre dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const p of S.world.lines) {
    for (let d = 60; d < S.world.size; d += 120) {
      if (d > cam.y - 20 && d < cam.y + S.view.h + 20 && p.x > cam.x - 10 && p.x < cam.x + S.view.w + 10) {
        ctx.fillRect(p.x - 2 - cam.x, d - cam.y, 4, 40);
      }
      if (d > cam.x - 20 && d < cam.x + S.view.w + 20 && p.y > cam.y - 10 && p.y < cam.y + S.view.h + 10) {
        ctx.fillRect(d - cam.x, p.y - 2 - cam.y, 40, 4);
      }
    }
  }
  // Sidewalks.
  ctx.fillStyle = COLORS.sidewalk;
  for (const p of S.world.lines) {
    ctx.fillRect(p.x - half - 8 - cam.x, -cam.y, 8, S.world.size);
    ctx.fillRect(p.x + half - cam.x, -cam.y, 8, S.world.size);
    ctx.fillRect(-cam.x, p.y - half - 8 - cam.y, S.world.size, 8);
    ctx.fillRect(-cam.x, p.y + half - cam.y, S.world.size, 8);
  }
}

function drawPark(ctx, S, cam) {
  const px = 1100;
  const py = 1100;
  ctx.fillStyle = COLORS.park;
  ctx.fillRect(px - cam.x, py - cam.y, 304, 304);
  ctx.fillStyle = '#4a8a3e';
  ctx.beginPath();
  ctx.arc(px + 152 - cam.x, py + 152 - cam.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7ec8e8';
  ctx.beginPath();
  ctx.arc(px + 60 - cam.x, py + 230 - cam.y, 26, 0, Math.PI * 2);
  ctx.fill();
  for (const t of S.world.trees) {
    if (!inView(cam, S.view, t.x, t.y, 40)) continue;
    ctx.fillStyle = '#2f7a2a';
    ctx.beginPath();
    ctx.arc(t.x - cam.x, t.y - cam.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57a84a';
    ctx.beginPath();
    ctx.arc(t.x - cam.x - 3, t.y - cam.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CORAL PARK', px + 152 - cam.x, py + 40 - cam.y);
}

function drawBeach(ctx, S, cam) {
  const w = S.world;
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(-cam.x, w.beachY - cam.y, w.size, w.waterY - w.beachY);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(-cam.x, w.waterY - cam.y, w.size, w.size - w.waterY);
  ctx.fillStyle = COLORS.waterDeep;
  for (let x = 0; x < w.size; x += 160) {
    ctx.beginPath();
    ctx.arc(x + 40 - cam.x, w.waterY + 60 - cam.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let x = 0; x < w.size; x += 130) {
    ctx.fillRect(x - cam.x, w.waterY + 8 - cam.y, 70, 3);
  }
  for (const palm of w.palms) {
    if (!inView(cam, S.view, palm.x, palm.y, 40)) continue;
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(palm.x - cam.x, palm.y - cam.y);
    ctx.lineTo(palm.x - cam.x + 4, palm.y - cam.y - 22);
    ctx.stroke();
    ctx.fillStyle = '#3f9a4a';
    ctx.beginPath();
    ctx.arc(palm.x - cam.x + 4, palm.y - cam.y - 24, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5a4a2a';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VICE BAY BEACH', 80 - cam.x, w.beachY + 40 - cam.y);
}

function drawBuildings(ctx, S, cam) {
  for (const b of S.world.buildings) {
    if (!inView(cam, S.view, b.x + b.w / 2, b.y + b.h / 2, 200)) continue;
    const x = b.x - cam.x;
    const y = b.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 6, y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 6, y + 6, b.w - 12, 10);
    // Windows.
    ctx.fillStyle = 'rgba(30,40,60,0.75)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        ctx.fillRect(x + 12 + c * 34, y + 22 + r * 34, 16, 14);
      }
    }
    if (b.height >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + b.w * 0.2, y + b.h * 0.2, b.w * 0.6, b.h * 0.6);
    }
  }
  // Named places get a sign so the player can read the city.
  drawSign(ctx, S, cam, S.world.garage, 'GARAGE');
  drawSign(ctx, S, cam, S.world.safehouse, 'SAFEHOUSE');
  drawSign(ctx, S, cam, S.world.hospital, 'HOSPITAL');
  drawSign(ctx, S, cam, S.world.kiosk, 'KIOSK');
  drawSign(ctx, S, cam, S.world.pier, 'PIER');
  drawSign(ctx, S, cam, S.world.diner, 'DINER');
}

function drawSign(ctx, S, cam, place, text) {
  if (!inView(cam, S.view, place.x, place.y, 60)) return;
  ctx.fillStyle = 'rgba(10,14,20,0.75)';
  ctx.fillRect(place.x - 46 - cam.x, place.y - 34 - cam.y, 92, 20);
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, place.x - cam.x, place.y - 20 - cam.y);
}

function drawSkids(ctx, S, cam) {
  ctx.strokeStyle = 'rgba(20,20,20,0.5)';
  ctx.lineWidth = 5;
  for (const sk of S.skids) {
    if (!inView(cam, S.view, sk.x, sk.y, 20)) continue;
    ctx.beginPath();
    ctx.moveTo(sk.x - Math.cos(sk.angle) * 12 - cam.x, sk.y - Math.sin(sk.angle) * 12 - cam.y);
    ctx.lineTo(sk.x + Math.cos(sk.angle) * 12 - cam.x, sk.y + Math.sin(sk.angle) * 12 - cam.y);
    ctx.stroke();
  }
}

function drawPickups(ctx, S, cam) {
  for (const pk of S.pickups) {
    if (!inView(cam, S.view, pk.x, pk.y, 30)) continue;
    const bob = Math.sin(pk.bob) * 3;
    ctx.fillStyle = pk.kind === 'ammo' ? '#ffd94d' : '#4ae88a';
    ctx.beginPath();
    ctx.arc(pk.x - cam.x, pk.y + bob - cam.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10203a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'ammo' ? 'A' : '+', pk.x - cam.x, pk.y + bob + 5 - cam.y);
  }
}

function drawObjective(ctx, S, cam) {
  const m = S.mission;
  if (m.active && m.target) {
    const pulse = 1 + Math.sin(S.time * 4) * 0.15;
    ctx.strokeStyle = COLORS.mission;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m.target.x - cam.x, m.target.y - cam.y, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.mission;
    ctx.beginPath();
    ctx.moveTo(m.target.x - cam.x, m.target.y - 44 * pulse - cam.y);
    ctx.lineTo(m.target.x - 10 - cam.x, m.target.y - 24 - cam.y);
    ctx.lineTo(m.target.x + 10 - cam.x, m.target.y - 24 - cam.y);
    ctx.closePath();
    ctx.fill();
    // A guiding line from the player to the objective.
    const p = S.player;
    const fx = p.onFoot ? p.x : p.car.x;
    const fy = p.onFoot ? p.y : p.car.y;
    ctx.strokeStyle = 'rgba(255,225,77,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(fx - cam.x, fy - cam.y);
    ctx.lineTo(m.target.x - cam.x, m.target.y - cam.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (S.taxi) {
    const t = S.taxi;
    const target = t.stage === 'pickup' ? t.pickup : t.dest;
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', target.x - cam.x, target.y - cam.y);
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(target.x - cam.x, target.y - cam.y, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCarShape(ctx, car, cam) {
  const x = car.x - cam.x;
  const y = car.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-20, -10, 44, 24);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-22, -11, 44, 22, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  ctx.fillRect(-4, -9, 14, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(18, -8, 3, 6);
  ctx.fillRect(18, 2, 3, 6);
  if (car.driver === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, -11, 36, 6);
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(-20, -3, 4, 6);
    ctx.fillStyle = '#4040ff';
    ctx.fillRect(-20, 3, 4, 6);
    ctx.fillStyle = '#10203a';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 4);
  }
  ctx.restore();
}

function drawCars(ctx, S, cam) {
  for (const car of S.cars) {
    if (car.driver === 'gone') continue;
    if (!inView(cam, S.view, car.x, car.y, 60)) continue;
    if (car.driver === 'wreck') {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath();
      ctx.arc(car.x - cam.x, car.y - cam.y, 20, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    drawCarShape(ctx, car, cam);
    if (car.driver === 'player') {
      // The player's car always reads at a glance, even in a crowd.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(car.x - cam.x, car.y - cam.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (car.driver !== 'player' && car.hp < car.maxHp * 0.6) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(car.x - 20 - cam.x, car.y - 24 - cam.y, 40, 5);
      ctx.fillStyle = '#ff8040';
      ctx.fillRect(car.x - 20 - cam.x, car.y - 24 - cam.y, 40 * (car.hp / car.maxHp), 5);
    }
  }
}

function drawPedestrians(ctx, S, cam) {
  for (const ped of S.peds) {
    if (!inView(cam, S.view, ped.x, ped.y, 30)) continue;
    ctx.fillStyle = ped.flee ? '#ff4040' : ped.color;
    ctx.beginPath();
    ctx.arc(ped.x - cam.x, ped.y - cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c89a';
    ctx.beginPath();
    ctx.arc(ped.x - cam.x, ped.y - cam.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCops(ctx, S, cam) {
  for (const cop of S.cops) {
    if (!inView(cam, S.view, cop.x, cop.y, 30)) continue;
    ctx.fillStyle = '#2f6fd0';
    ctx.beginPath();
    ctx.arc(cop.x - cam.x, cop.y - cam.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10203a';
    ctx.beginPath();
    ctx.arc(cop.x - cam.x, cop.y - cam.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, S, cam) {
  const p = S.player;
  if (!p.onFoot) return;
  if (!inView(cam, S.view, p.x, p.y, 40)) return;
  const x = p.x - cam.x;
  const y = p.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d84a4a';
  ctx.fillRect(4, -6, 12, 12);
  ctx.fillStyle = '#e8c89a';
  ctx.beginPath();
  ctx.arc(10, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Health ring.
  ctx.strokeStyle = p.health > 40 ? '#4ae88a' : '#ff4040';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + (p.health / 100) * Math.PI * 2);
  ctx.stroke();
}

function drawBullets(ctx, S, cam) {
  ctx.fillStyle = '#ffe14d';
  for (const b of S.bullets) {
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, S, cam) {
  for (const pt of S.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x - cam.x, pt.y - cam.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMuzzle(ctx, S, cam) {
  if (S.muzzleTimer <= 0) return;
  ctx.fillStyle = 'rgba(255,220,80,0.9)';
  ctx.beginPath();
  ctx.arc(S.muzzleX - cam.x, S.muzzleY - cam.y, 10 + Math.random() * 6, 0, Math.PI * 2);
  ctx.fill();
}

// --- HUD -------------------------------------------------------------------

function drawHud(ctx, S) {
  const p = S.player;
  const stars = Math.floor(S.wanted);
  ctx.textAlign = 'left';
  // Top-left: wanted stars + money + health.
  ctx.fillStyle = COLORS.hudBg;
  ctx.beginPath();
  ctx.roundRect(12, 12, 250, 96, 10);
  ctx.fill();
  ctx.font = 'bold 26px sans-serif';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? COLORS.star : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 24 + i * 30, 44);
  }
  ctx.fillStyle = '#4ae88a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, 24, 74);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(p.health)}`, 130, 74);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(130, 80, 110, 8);
  ctx.fillStyle = p.health > 40 ? '#4ae88a' : '#ff4040';
  ctx.fillRect(130, 80, 110 * (p.health / 100), 8);
  // Mission objective bar.
  const missionText = S.mission.active
    ? `${S.mission.text} — ${S.mission.targetLabel}`
    : S.storyDone
      ? 'VICE KING — free roam. Taxi fares pay.'
      : 'VICE BAY — press M for the next mission';
  ctx.fillStyle = COLORS.hudBg;
  const mw = Math.min(560, 24 + ctx.measureText(missionText).width + 40);
  ctx.beginPath();
  ctx.roundRect(12, 116, mw, 34, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.mission;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`◆ ${missionText}`, 24, 138);
  // Bottom-left: speed / ammo / clock.
  ctx.fillStyle = COLORS.hudBg;
  ctx.beginPath();
  ctx.roundRect(12, S.view.h - 64, 300, 52, 10);
  ctx.fill();
  const speed = p.onFoot ? Math.round(p.speed * 2.2) : Math.round(Math.abs(p.car.speed) * 0.55);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`${speed} km/h`, 24, S.view.h - 30);
  ctx.font = '15px sans-serif';
  ctx.fillText(`AMMO ${p.ammo}`, 150, S.view.h - 30);
  ctx.fillText(S.clockLabel, 232, S.view.h - 30);
  // Centre message.
  if (S.messageTimer > 0 && S.message) {
    ctx.font = 'bold 18px sans-serif';
    const w = ctx.measureText(S.message).width + 32;
    ctx.fillStyle = COLORS.hudBg;
    ctx.beginPath();
    ctx.roundRect((S.view.w - w) / 2, S.view.h - 130, w, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(S.message, S.view.w / 2, S.view.h - 106);
    ctx.textAlign = 'left';
  }
  // Controls hint, bottom-right.
  ctx.fillStyle = 'rgba(10,14,20,0.5)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD drive · E car · F punch · Click shoot · M mission · Esc pause · N mute', S.view.w - 14, S.view.h - 12);
  ctx.textAlign = 'left';
}

function drawMinimap(ctx, S) {
  const size = 170;
  const x0 = S.view.w - size - 12;
  const y0 = 12;
  const scale = size / S.world.size;
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.beginPath();
  ctx.roundRect(x0 - 6, y0 - 6, size + 12, size + 12, 10);
  ctx.fill();
  // Water + sand.
  ctx.fillStyle = '#2fa8b8';
  ctx.fillRect(x0, y0 + S.world.waterY * scale, size, size - S.world.waterY * scale);
  ctx.fillStyle = '#e8d39a';
  ctx.fillRect(x0, y0 + S.world.beachY * scale, size, (S.world.waterY - S.world.beachY) * scale);
  ctx.fillStyle = '#5d9b4a';
  ctx.fillRect(x0, y0, size, size);
  // Roads.
  ctx.strokeStyle = '#3a3a40';
  ctx.lineWidth = 5;
  for (const p of S.world.lines) {
    ctx.beginPath();
    ctx.moveTo(x0 + p.x * scale, y0);
    ctx.lineTo(x0 + p.x * scale, y0 + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y0 + p.y * scale);
    ctx.lineTo(x0 + size, y0 + p.y * scale);
    ctx.stroke();
  }
  // Blips: mission yellow, police red, taxi green, player white.
  const blip = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + x * scale, y0 + y * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (S.mission.active && S.mission.target) blip(S.mission.target.x, S.mission.target.y, '#ffe14d', 5);
  if (S.taxi) {
    const t = S.taxi.stage === 'pickup' ? S.taxi.pickup : S.taxi.dest;
    blip(t.x, t.y, '#4ae88a', 4);
  }
  for (const car of S.policeCars()) blip(car.x, car.y, '#ff4040', 4);
  for (const cop of S.cops) blip(cop.x, cop.y, '#ff8080', 3);
  const p = S.player;
  const px = p.onFoot ? p.x : p.car.x;
  const py = p.onFoot ? p.y : p.car.y;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + px * scale, y0 + py * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#10203a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x0 + px * scale, y0 + py * scale, 5, 0, Math.PI * 2);
  ctx.stroke();
  // North + label.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VICE BAY', x0, y0 + size + 20);
}
