// VICE BAY — main.js
// One clear job: wire every system together — the game state, the loop,
// the menus, saving and loading, and the per-frame update order.

import { WORLD_SIZE, PLAYER, makeRng } from './config.js';
import { buildWorld } from './world.js';
import { createPlayer, updatePlayerOnFoot, nearestCar, enterCar, exitCar, updateCamera } from './player.js';
import { spawnParkedCars, spawnTraffic, updatePlayerCar, updateTraffic, resolveCarCollisions, explodeCar } from './vehicles.js';
import { addWanted, updateWanted, updatePoliceCars, updateFootCops, busted, wasted, respawnAtHospital } from './police.js';
import { spawnPedestrians, spawnPickups, updatePedestrians, punch, shoot, updateBullets, updatePickups, updateParticles } from './combat.js';
import { createMissionState, startMission, updateMissions, maybeOfferTaxi, updateTaxi } from './missions.js';
import { drawGame } from './render.js';
import { createAudio, ensureAudio, setEngineSound, setSirenSound, playGunshot, playPunch, playPickup, playMissionJingle, playBusted, playCrash, startMusic, toggleMute } from './audio.js';
import { createInput, bindInput, isDown, wasPressed } from './input.js';
import { parseShotParams, stageShot } from './shots.js';

const SAVE_KEY = 'vicebay-save-v1';

function createState(seed) {
  const world = buildWorld(seed);
  const S = {
    seed,
    rng: makeRng(seed * 7919 + 13),
    world,
    view: { w: 1280, h: 720 },
    camera: { x: 0, y: 0 },
    time: 0,
    clockMinutes: 10 * 60,
    clockLabel: '10:00',
    mode: 'title',
    player: null,
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    particles: [],
    pickups: [],
    skids: [],
    wanted: 0,
    wantedTimer: 0,
    spawnTimer: 0,
    lastCrime: '',
    mission: createMissionState(),
    taxi: null,
    storyDone: false,
    message: '',
    messageTimer: 0,
    muzzleX: 0,
    muzzleY: 0,
    muzzleTimer: 0,
    shotsFiredRecently: 0,
    bustedReason: '',
    wastedReason: '',
    finePaid: 0,
    input: null,
    audio: null,
  };
  S.player = createPlayer(world);
  S.camera.x = S.player.x - S.view.w / 2;
  S.camera.y = S.player.y - S.view.h / 2;
  return S;
}

// --- Effects ---------------------------------------------------------------

function spawnCrash(S, x, y, n) {
  for (let i = 0; i < n; i += 1) {
    S.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 260,
      vy: (Math.random() - 0.5) * 260,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      size: 2 + Math.random() * 4,
      color: ['#ff8040', '#ffd94d', '#888888'][i % 3],
    });
  }
}

function spawnExplosion(S, x, y) {
  for (let i = 0; i < 42; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 320;
    S.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.9,
      maxLife: 1.4,
      size: 3 + Math.random() * 7,
      color: ['#ff4040', '#ff8040', '#ffd94d', '#555555'][i % 4],
    });
  }
  S.message = 'BOOM!';
  S.messageTimer = 2;
}

// --- Save / load -----------------------------------------------------------

function saveGame(S) {
  try {
    const p = S.player;
    const data = {
      money: p.money,
      health: p.health,
      ammo: p.ammo,
      missionIndex: S.mission.index,
      storyDone: S.storyDone,
      x: p.x,
      y: p.y,
      clockMinutes: S.clockMinutes,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage unavailable (private mode): the game still plays.
  }
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function applySave(S, data) {
  const p = S.player;
  p.money = data.money ?? PLAYER.startMoney;
  p.health = data.health ?? PLAYER.maxHealth;
  p.ammo = data.ammo ?? PLAYER.startAmmo;
  p.x = data.x ?? S.world.spawn.x;
  p.y = data.y ?? S.world.spawn.y;
  S.storyDone = !!data.storyDone;
  S.mission.index = data.missionIndex ?? 0;
  S.clockMinutes = data.clockMinutes ?? 600;
}

// --- DOM overlays ----------------------------------------------------------

function el(id) {
  return document.getElementById(id);
}

function showOverlay(S, name) {
  for (const id of ['title-screen', 'pause-screen', 'busted-screen', 'wasted-screen']) {
    el(id).classList.add('hidden');
  }
  if (name) el(name).classList.remove('hidden');
  S.overlay = name || '';
}

function wireOverlays(S, save) {
  el('start-btn').addEventListener('click', () => {
    ensureAudio(S.audio);
    startMusic(S.audio);
    S.mode = 'play';
    showOverlay(S, null);
    if (!S.mission.active && !S.storyDone) startMission(S, 0);
  });
  el('continue-btn').addEventListener('click', () => {
    ensureAudio(S.audio);
    startMusic(S.audio);
    const data = loadSave();
    if (data) applySave(S, data);
    S.mode = 'play';
    showOverlay(S, null);
    if (!S.mission.active && !S.storyDone) startMission(S, S.mission.index);
  });
  el('resume-btn').addEventListener('click', () => {
    S.mode = 'play';
    showOverlay(S, null);
  });
  el('restart-btn').addEventListener('click', () => {
    window.localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  });
  el('busted-btn').addEventListener('click', () => {
    respawnAtHospital(S);
    showOverlay(S, null);
  });
  el('wasted-btn').addEventListener('click', () => {
    respawnAtHospital(S);
    showOverlay(S, null);
  });
  const saveData = loadSave();
  if (!saveData) el('continue-btn').classList.add('hidden');
}

// --- Audio dispatch --------------------------------------------------------

function audioFx(S, name) {
  const a = S.audio;
  if (!a || !a.ctx) return;
  if (name === 'gunshot') playGunshot(a);
  else if (name === 'punch') playPunch(a);
  else if (name === 'pickup') playPickup(a);
  else if (name === 'jingle') playMissionJingle(a);
  else if (name === 'busted') playBusted(a);
  else if (name === 'crash') playCrash(a);
}

// --- Main update -----------------------------------------------------------

function update(S, dt) {
  S.time += dt;
  S.clockMinutes += dt * 2;
  const hh = Math.floor(S.clockMinutes / 60) % 24;
  const mm = Math.floor(S.clockMinutes % 60);
  S.clockLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (S.messageTimer > 0) S.messageTimer -= dt;
  if (S.muzzleTimer > 0) S.muzzleTimer -= dt;

  const input = S.input;
  const p = S.player;

  // Edge-triggered keys, consumed from the input queue.
  const justPressed = (key) => wasPressed(input, key);
  if (justPressed('escape') || justPressed('p')) {
    if (S.mode === 'play') {
      S.mode = 'pause';
      showOverlay(S, 'pause-screen');
    } else if (S.mode === 'pause') {
      S.mode = 'play';
      showOverlay(S, null);
    }
  }
  if (justPressed('n')) {
    const muted = toggleMute(S.audio);
    S.message = muted ? 'Sound muted (N to unmute)' : 'Sound on';
    S.messageTimer = 2;
  }
  if (justPressed('m') && S.mode === 'play' && !S.mission.active && !S.storyDone) {
    startMission(S, S.mission.index);
  }
  if (S.mode !== 'play') {
    S.prevKeys = { ...input.keys };
    return;
  }
  if (justPressed('e')) {
    if (p.onFoot) {
      const car = nearestCar(S, 80);
      if (car) enterCar(S, car);
    } else {
      exitCar(S);
    }
  }
  if (justPressed('f') && p.onFoot) punch(S);
  if (input.mouseDown && p.onFoot) shoot(S);
  if (input.clicked) input.clicked = false;

  if (p.onFoot) updatePlayerOnFoot(S, dt);
  else updatePlayerCar(S, dt);
  updateTraffic(S, dt);
  resolveCarCollisions(S);
  updatePoliceCars(S, dt);
  updateFootCops(S, dt);
  updateWanted(S, dt);
  updatePedestrians(S, dt);
  updateBullets(S, dt);
  updatePickups(S, dt);
  updateParticles(S, dt);
  updateMissions(S, dt);
  maybeOfferTaxi(S);
  updateTaxi(S, dt);
  updateCamera(S, dt);

  if (p.health <= 0) {
    wasted(S, 'You got wasted on the streets of Vice Bay.');
    showOverlay(S, 'wasted-screen');
    el('wasted-detail').textContent = `You lost $${S.finePaid}. Patched up at Bay General.`;
  }
  if (S.mode === 'busted') {
    showOverlay(S, 'busted-screen');
    el('busted-detail').textContent = `${S.bustedReason} You lost $${S.finePaid}.`;
  }

  // Engine + siren follow the action.
  const driving = !p.onFoot && p.car;
  const speedRatio = driving ? Math.abs(p.car.speed) / p.car.topSpeed : 0;
  setEngineSound(S.audio, speedRatio, !!driving);
  const nearestCop = S.policeCars().length ? Math.min(...S.policeCars().map((c) => Math.hypot(c.x - p.x, c.y - p.y))) : Infinity;
  setSirenSound(S.audio, Math.floor(S.wanted), nearestCop < 600);

  S.prevKeys = { ...input.keys };
}

// --- Boot ------------------------------------------------------------------

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = parseShotParams();
  const seed = params.seed || 1;
  const S = createState(seed);
  S.input = createInput();
  bindInput(S.input, canvas);
  S.audio = createAudio();
  S.prevKeys = {};

  // Helpers the systems call back into.
  S.addWanted = (stars, reason) => addWanted(S, stars, reason);
  S.audioFx = (name) => audioFx(S, name);
  S.spawnCrash = (x, y, n) => spawnCrash(S, x, y, n);
  S.spawnExplosion = (x, y) => spawnExplosion(S, x, y);
  S.spawnMuzzle = (x, y) => {
    S.muzzleX = x;
    S.muzzleY = y;
    S.muzzleTimer = 0.07;
  };
  S.policeCars = () => S.cars.filter((c) => c.driver === 'police');
  S.explodeCarFn = explodeCar;
  S.busted = (state, reason) => busted(state, reason);
  S.saveGame = () => saveGame(S);
  S.hideOverlays = () => showOverlay(S, null);
  S.showTitle = () => showOverlay(S, 'title-screen');

  // Resize the canvas to the window (desktop play) while keeping the
  // screenshot viewport at 1280x720.
  const resize = () => {
    S.view.w = window.innerWidth;
    S.view.h = window.innerHeight;
    canvas.width = S.view.w;
    canvas.height = S.view.h;
  };
  window.addEventListener('resize', resize);
  resize();

  spawnParkedCars(S, 14);
  spawnTraffic(S, 9);
  spawnPedestrians(S, 34);
  spawnPickups(S);
  wireOverlays(S);

  // Staged screenshot mode: pose the real game, then let it run.
  if (params.shot) {
    stageShot(S, params.shot);
  } else {
    showOverlay(S, 'title-screen');
  }

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.mode !== 'title') update(S, dt);
    else S.time += dt;
    drawGame(ctx, S);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Expose a tiny debug handle for headless play-tests.
  window.__VICE_BAY__ = S;
}

document.addEventListener('DOMContentLoaded', boot);
