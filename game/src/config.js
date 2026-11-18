// VICE BAY — config.js
// One clear job: every tunable number, colour, name and mission definition
// for the open-world crime game. Nothing here touches the canvas or the DOM.

export const WORLD_SIZE = 2400;
export const ROAD_WIDTH = 96;
export const ROAD_SPACING = 400;
export const ROAD_OFFSET = 300;

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#6f9c4e',
  sand: '#e8d39a',
  water: '#2fa8b8',
  waterDeep: '#1d7f96',
  road: '#3a3a40',
  roadLine: '#e8d44d',
  sidewalk: '#b8b0a0',
  park: '#5d9b4a',
  buildingRoof: ['#e8a0a0', '#a0c8e8', '#e8d0a0', '#c8a0e8', '#a0e8c8', '#e8b890', '#f0e0c0'],
  buildingWall: '#8a7a68',
  hudBg: 'rgba(10, 14, 20, 0.62)',
  hudText: '#ffffff',
  star: '#ffd94d',
  mission: '#ffe14d',
  police: '#2f6fd0',
};

export const CAR_MODELS = [
  { name: 'Sundown', color: '#d84a4a', topSpeed: 430, accel: 260, handling: 2.6, hp: 100 },
  { name: 'Bayliner', color: '#4a7fd8', topSpeed: 380, accel: 220, handling: 2.9, hp: 120 },
  { name: 'Palm GT', color: '#f0c040', topSpeed: 520, accel: 330, handling: 2.3, hp: 80 },
  { name: 'Tropicana', color: '#4ad88a', topSpeed: 350, accel: 200, handling: 3.1, hp: 140 },
  { name: 'Vice Cruiser', color: '#22242a', topSpeed: 470, accel: 300, handling: 2.5, hp: 110 },
];

export const POLICE_MODEL = { name: 'Interceptor', color: '#2f6fd0', topSpeed: 500, accel: 340, handling: 2.7, hp: 160 };

export const PLAYER = {
  walkSpeed: 190,
  sprintSpeed: 300,
  radius: 14,
  maxHealth: 100,
  punchDamage: 12,
  punchRange: 34,
  punchCooldown: 0.45,
  pistolDamage: 34,
  pistolRange: 520,
  bulletSpeed: 900,
  startMoney: 120,
  startAmmo: 24,
};

export const WANTED = {
  theft: 1,
  shoot: 1,
  runover: 1,
  maxStars: 5,
  decayDelay: 9,
  decayRate: 0.25,
  policeCarSpeed: 500,
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: '1 — First Wheels',
    brief: 'Mara needs wheels. Steal any car, then deliver it to the garage on Palm Row.',
    reward: 250,
    steps: ['steal', 'deliver'],
  },
  {
    id: 'courier-run',
    title: '2 — Courier Run',
    brief: 'Three drops across Vice Bay before the clock runs out. Fast car, no cops.',
    reward: 400,
    timeLimit: 150,
    steps: ['drop1', 'drop2', 'drop3'],
  },
  {
    id: 'getaway-driver',
    title: '3 — Getaway Driver',
    brief: 'Pick up the crew at the diner, then lose the heat and reach the safehouse.',
    reward: 650,
    steps: ['pickup', 'escape'],
  },
  {
    id: 'beach-heist',
    title: '4 — Beach Heist',
    brief: 'Rob the beach kiosk. Hold E at the till, then shake the cops and get clear.',
    reward: 900,
    steps: ['rob', 'escape'],
  },
  {
    id: 'vice-king',
    title: '5 — Vice King',
    brief: 'The whole bay is after you. Survive a 3-star chase for a minute, then reach the pier.',
    reward: 1500,
    steps: ['survive', 'deliver'],
  },
];

export const TAXI_FARE = { min: 60, max: 180 };

export const STORY = {
  title: 'VICE BAY',
  tagline: 'Sun. Sand. Sirens.',
  blurb:
    'You are Ray Vega, fresh off the bus in Vice Bay with $120 and a borrowed name. ' +
    'Mara, the fixer who runs the garage on Palm Row, has work for anyone fast enough ' +
    'to take it. Steal cars, run couriers, dodge the Vice Bay PD, and climb from ' +
    'nobody to Vice King — one mission at a time.',
};

// Deterministic seeded random so staged screenshots render the same city.
export function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s + 1664525) >>> 0;
    s = (s + 1013904223) >>> 0;
    // xorshift-style scramble for a better spread
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
