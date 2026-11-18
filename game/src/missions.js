// VICE BAY — missions.js
// One clear job: the story — a chain of 5 missions with objectives, timers
// and rewards — plus repeatable taxi fares as side work.

import { MISSIONS, TAXI_FARE } from './config.js';
import { randomRoadPoint } from './world.js';

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    timer: 0,
    target: null,
    targetLabel: '',
    active: false,
    complete: false,
    text: '',
    drops: [],
    surviveTimer: 0,
    robTimer: 0,
  };
}

export function startMission(S, index) {
  const def = MISSIONS[index];
  if (!def) return;
  const m = S.mission;
  m.index = index;
  m.step = 0;
  m.active = true;
  m.complete = false;
  m.timer = def.timeLimit || 0;
  m.text = def.title;
  S.message = `${def.title} — ${def.brief}`;
  S.messageTimer = 6;
  setupStep(S);
}

export function setupStep(S) {
  const m = S.mission;
  const w = S.world;
  const setTarget = (x, y, label) => {
    m.target = { x, y };
    m.targetLabel = label;
  };
  switch (m.index) {
    case 0:
      if (m.step === 0) setTarget(w.garage.x, w.garage.y, 'Steal any car');
      else setTarget(w.garage.x, w.garage.y, 'Deliver the car to Mara\'s Garage');
      break;
    case 1: {
      if (m.step === 0) {
        m.drops = [
          { x: 1900, y: 700, done: false },
          { x: 300, y: 1500, done: false },
          { x: 1500, y: 1100, done: false },
        ];
      }
      const drop = m.drops[m.step];
      setTarget(drop.x, drop.y, `Drop ${m.step + 1} of 3 — ${Math.ceil(m.timer)}s left`);
      break;
    }
    case 2:
      if (m.step === 0) setTarget(w.diner.x, w.diner.y, 'Pick up the crew at the diner');
      else setTarget(w.safehouse.x, w.safehouse.y, 'Lose the heat — reach the safehouse');
      break;
    case 3:
      if (m.step === 0) setTarget(w.kiosk.x, w.kiosk.y, 'Rob the beach kiosk — hold E at the till');
      else setTarget(w.safehouse.x, w.safehouse.y, 'Escape! Reach the safehouse');
      break;
    case 4:
      if (m.step === 0) {
        m.surviveTimer = 60;
        setTarget(w.pier.x, w.pier.y, 'Survive the 3-star chase — 60s');
      } else setTarget(w.pier.x, w.pier.y, 'Deliver to Sunset Pier');
      break;
    default:
      break;
  }
}

function atTarget(S, radius) {
  const m = S.mission;
  if (!m.target) return false;
  const p = S.player;
  const fx = p.onFoot ? p.x : p.car.x;
  const fy = p.onFoot ? p.y : p.car.y;
  return Math.hypot(fx - m.target.x, fy - m.target.y) < radius;
}

export function completeMission(S) {
  const def = MISSIONS[S.mission.index];
  S.player.money += def.reward;
  S.mission.active = false;
  S.mission.complete = true;
  S.message = `MISSION COMPLETE — ${def.title}  +$${def.reward}`;
  S.messageTimer = 5;
  S.audioFx('jingle');
  S.saveGame();
  if (S.mission.index + 1 < MISSIONS.length) {
    S.mission.index += 1;
    window.setTimeout(() => {
      if (S.mode === 'play') startMission(S, S.mission.index);
    }, 2500);
  } else {
    S.message = 'VICE KING! You own Vice Bay. Free roam — taxi fares still pay.';
    S.messageTimer = 8;
    S.storyDone = true;
  }
}

export function failMission(S, reason) {
  S.mission.active = false;
  S.message = `MISSION FAILED — ${reason} Restarting mission…`;
  S.messageTimer = 4;
  window.setTimeout(() => {
    if (S.mode === 'play') startMission(S, S.mission.index);
  }, 2500);
}

export function updateMissions(S, dt) {
  const m = S.mission;
  if (!m.active) return;
  const p = S.player;
  const def = MISSIONS[m.index];
  if (def.timeLimit) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(S, 'Out of time on the Courier Run.');
      return;
    }
    if (m.target) m.targetLabel = `Drop ${m.step + 1} of 3 — ${Math.ceil(m.timer)}s left`;
  }
  switch (m.index) {
    case 0:
      if (m.step === 0 && !p.onFoot) {
        m.step = 1;
        setupStep(S);
        S.message = 'Nice wheels. Now deliver it to the garage.';
        S.messageTimer = 3;
      } else if (m.step === 1 && atTarget(S, 70)) {
        completeMission(S);
      }
      break;
    case 1:
      if (atTarget(S, 70)) {
        m.drops[m.step].done = true;
        S.player.money += 50;
        S.message = `Drop ${m.step + 1} done (+$50).`;
        S.messageTimer = 2;
        m.step += 1;
        if (m.step >= 3) completeMission(S);
        else setupStep(S);
      }
      break;
    case 2:
      if (m.step === 0 && atTarget(S, 70)) {
        m.step = 1;
        S.addWanted(2, 'getaway');
        setupStep(S);
        S.message = 'Crew aboard! The cops are on you — reach the safehouse.';
        S.messageTimer = 4;
      } else if (m.step === 1 && atTarget(S, 80) && Math.floor(S.wanted) === 0) {
        completeMission(S);
      } else if (m.step === 1 && atTarget(S, 80)) {
        S.message = 'Too hot! Lose the cops first.';
        S.messageTimer = 2;
      }
      break;
    case 3:
      if (m.step === 0 && atTarget(S, 60) && p.onFoot && S.input.keys['e']) {
        m.robTimer += dt;
        S.message = `Robbing the till… ${Math.ceil(3 - m.robTimer)}s (hold E)`;
        S.messageTimer = 0.5;
        if (m.robTimer >= 3) {
          m.step = 1;
          S.addWanted(2, 'robbery');
          setupStep(S);
          S.message = 'Got the cash! Run — reach the safehouse.';
          S.messageTimer = 4;
        }
      } else if (m.step === 0) {
        m.robTimer = Math.max(0, m.robTimer - dt);
      } else if (m.step === 1 && atTarget(S, 80) && Math.floor(S.wanted) === 0) {
        completeMission(S);
      }
      break;
    case 4:
      if (m.step === 0) {
        if (Math.floor(S.wanted) < 3) S.addWanted(3, 'vice-king');
        m.surviveTimer -= dt;
        if (m.target) m.targetLabel = `Survive the 3-star chase — ${Math.ceil(m.surviveTimer)}s`;
        if (m.surviveTimer <= 0) {
          m.step = 1;
          setupStep(S);
          S.message = 'You survived! Now deliver to the pier.';
          S.messageTimer = 3;
        }
      } else if (m.step === 1 && atTarget(S, 80)) {
        completeMission(S);
      }
      break;
    default:
      break;
  }
}

// --- Taxi side jobs -------------------------------------------------------

export function maybeOfferTaxi(S) {
  if (S.taxi || S.mission.active) return;
  if (S.rng() < 0.002) {
    const pt = randomRoadPoint(S.world, S.rng, S.player, 600);
    const dest = randomRoadPoint(S.world, S.rng, null, 0);
    S.taxi = {
      stage: 'pickup',
      pickup: pt,
      dest,
      fare: TAXI_FARE.min + Math.floor(S.rng() * (TAXI_FARE.max - TAXI_FARE.min)),
    };
    S.message = 'Taxi fare nearby! Pick up the passenger (yellow $ marker).';
    S.messageTimer = 4;
  }
}

export function updateTaxi(S, dt) {
  const t = S.taxi;
  if (!t) return;
  const p = S.player;
  const fx = p.onFoot ? p.x : p.car.x;
  const fy = p.onFoot ? p.y : p.car.y;
  const target = t.stage === 'pickup' ? t.pickup : t.dest;
  if (Math.hypot(fx - target.x, fy - target.y) < 70) {
    if (t.stage === 'pickup') {
      t.stage = 'dropoff';
      S.message = 'Passenger aboard — drive to the destination.';
      S.messageTimer = 3;
    } else {
      S.player.money += t.fare;
      S.message = `Taxi fare paid +$${t.fare}`;
      S.messageTimer = 3;
      S.audioFx('pickup');
      S.taxi = null;
      S.saveGame();
    }
  }
}
