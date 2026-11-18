// VICE BAY — world.js
// One clear job: generate the city of Vice Bay from a seed — roads, blocks,
// buildings, beach, water, park and every named location — plus collision help.

import { WORLD_SIZE, ROAD_WIDTH, ROAD_SPACING, ROAD_OFFSET, COLORS, makeRng } from './config.js';

export function roadLines() {
  const lines = [];
  for (let i = 0; i < 5; i += 1) {
    const p = ROAD_OFFSET + i * ROAD_SPACING;
    lines.push({ x: p, y: p });
  }
  return lines;
}

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const size = WORLD_SIZE;
  const lines = roadLines();
  const buildings = [];
  const trees = [];
  const palms = [];

  // City blocks sit between the road lines. Each block gets 1-4 buildings.
  for (let bx = 0; bx < 5; bx += 1) {
    for (let by = 0; by < 5; by += 1) {
      const x0 = ROAD_OFFSET + bx * ROAD_SPACING + ROAD_WIDTH / 2 + 14;
      const y0 = ROAD_OFFSET + by * ROAD_SPACING + ROAD_WIDTH / 2 + 14;
      const x1 = x0 + ROAD_SPACING - ROAD_WIDTH - 28;
      const y1 = y0 + ROAD_SPACING - ROAD_WIDTH - 28;
      // Park block: the middle of the city is Coral Park.
      if (bx === 2 && by === 2) {
        for (let t = 0; t < 26; t += 1) {
          trees.push({ x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0), r: 10 + rng() * 8 });
        }
        continue;
      }
      // Beach strip: no buildings south of the last road.
      if (by === 4) continue;
      const count = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i += 1) {
        const w = 90 + rng() * 120;
        const h = 80 + rng() * 110;
        const x = x0 + rng() * Math.max(1, x1 - x0 - w);
        const y = y0 + rng() * Math.max(1, y1 - y0 - h);
        buildings.push({
          x, y, w, h,
          color: COLORS.buildingRoof[Math.floor(rng() * COLORS.buildingRoof.length)],
          height: 1 + Math.floor(rng() * 3),
        });
      }
    }
  }

  // Palm trees line the beach road and the park edges.
  for (let x = 120; x < size - 100; x += 90) {
    palms.push({ x: x + (rng() - 0.5) * 30, y: 2080 + rng() * 40, r: 8 });
    if (rng() < 0.6) palms.push({ x: x + (rng() - 0.5) * 30, y: 1960 + rng() * 30, r: 8 });
  }

  const world = {
    seed,
    size,
    lines,
    buildings,
    trees,
    palms,
    // Named places, all on or beside roads so the player can always reach them.
    garage: { x: 700, y: 348, label: 'Mara\'s Garage' },
    safehouse: { x: 1500, y: 1852, label: 'Safehouse' },
    hospital: { x: 348, y: 1100, label: 'Bay General Hospital' },
    kiosk: { x: 1100, y: 2148, label: 'Beach Kiosk' },
    pier: { x: 1900, y: 2248, label: 'Sunset Pier' },
    diner: { x: 1100, y: 748, label: 'Diner — crew pickup' },
    spawn: { x: 700, y: 1100 },
    beachY: 2050,
    waterY: 2240,
  };
  return world;
}

export function isOnRoad(world, x, y) {
  const half = ROAD_WIDTH / 2;
  for (const p of world.lines) {
    if (Math.abs(x - p.x) < half || Math.abs(y - p.y) < half) return true;
  }
  return false;
}

export function nearestRoadPoint(world, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of world.lines) {
    const cand = [
      { x: p.x, y },
      { x, y: p.y },
    ];
    for (const c of cand) {
      const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
  }
  return best;
}

// Circle vs building AABBs: push the circle out and report whether it hit.
export function collideBuildings(world, ent, radius) {
  let hit = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(ent.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ent.y, b.y + b.h));
    const dx = ent.x - cx;
    const dy = ent.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        ent.x = cx + (dx / d) * radius;
        ent.y = cy + (dy / d) * radius;
      } else {
        ent.y = b.y - radius;
      }
    }
  }
  return hit;
}

export function inWater(world, x, y) {
  return y > world.waterY;
}

export function onBeach(world, x, y) {
  return y > world.beachY && y <= world.waterY;
}

// Pick a random point on a road, optionally near a target.
export function randomRoadPoint(world, rng, near, maxDist) {
  for (let tries = 0; tries < 40; tries += 1) {
    const p = world.lines[Math.floor(rng() * world.lines.length)];
    const horizontal = rng() < 0.5;
    const x = horizontal ? 120 + rng() * (world.size - 240) : p.x;
    const y = horizontal ? p.y : 120 + rng() * (world.size - 240);
    if (near && maxDist) {
      const d = Math.hypot(x - near.x, y - near.y);
      if (d > maxDist) continue;
    }
    if (y > world.beachY) continue;
    return { x, y };
  }
  return { x: 700, y: 700 };
}
