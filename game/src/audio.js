// VICE BAY — audio.js
// One clear job: every sound is synthesized with WebAudio — no audio files.
// Engine hum follows speed, a two-tone siren, gunshots, chimes and a music loop.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    musicTimer: null,
    musicStep: 0,
    started: false,
  };
  return audio;
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
  } catch (e) {
    audio.ctx = null;
  }
  if (!audio.ctx) return;
  // Engine hum: low sawtooth whose pitch follows the car.
  audio.engineOsc = audio.ctx.createOscillator();
  audio.engineOsc.type = 'sawtooth';
  audio.engineOsc.frequency.value = 55;
  audio.engineGain = audio.ctx.createGain();
  audio.engineGain.gain.value = 0;
  const engineFilter = audio.ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 320;
  audio.engineOsc.connect(engineFilter);
  engineFilter.connect(audio.engineGain);
  audio.engineGain.connect(audio.ctx.destination);
  audio.engineOsc.start();
  // Police siren: two alternating tones.
  audio.sirenOsc = audio.ctx.createOscillator();
  audio.sirenOsc.type = 'triangle';
  audio.sirenOsc.frequency.value = 700;
  audio.sirenGain = audio.ctx.createGain();
  audio.sirenGain.gain.value = 0;
  audio.sirenOsc.connect(audio.sirenGain);
  audio.sirenGain.connect(audio.ctx.destination);
  audio.sirenOsc.start();
  audio.started = true;
}

export function setEngineSound(audio, speedRatio, driving) {
  if (!audio.ctx || audio.muted) return;
  const target = driving ? 0.05 + speedRatio * 0.09 : 0;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(55 + speedRatio * 140, audio.ctx.currentTime, 0.08);
}

export function setSirenSound(audio, wanted, near) {
  if (!audio.ctx || audio.muted) return;
  const on = wanted > 0 && near;
  audio.sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, audio.ctx.currentTime, 0.2);
  if (on) {
    const t = audio.ctx.currentTime;
    const tone = Math.floor(t * 1.6) % 2 === 0 ? 700 : 950;
    audio.sirenOsc.frequency.setTargetAtTime(tone, t, 0.05);
  }
}

function blip(audio, freq, dur, type, vol, when) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime + (when || 0);
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playGunshot(audio) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const len = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.22;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  blip(audio, 180, 0.08, 'square', 0.08);
}

export function playPunch(audio) {
  blip(audio, 120, 0.08, 'sine', 0.14);
}

export function playPickup(audio) {
  blip(audio, 660, 0.12, 'sine', 0.12);
  blip(audio, 990, 0.16, 'sine', 0.12, 0.09);
}

export function playMissionJingle(audio) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => blip(audio, n, 0.22, 'triangle', 0.14, i * 0.12));
}

export function playBusted(audio) {
  const notes = [392, 330, 262];
  notes.forEach((n, i) => blip(audio, n, 0.3, 'sawtooth', 0.1, i * 0.18));
}

export function playCrash(audio) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const len = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.7;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = 0.25;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

// Simple sunny bassline + sparkle loop, scheduled in small steps.
const BASS = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 73.4, 0, 65.4, 0];
const SPARKLE = [880, 0, 1047, 0, 0, 1319, 0, 1047, 880, 0, 1175, 0, 0, 1047, 0, 0];

export function startMusic(audio) {
  if (!audio.ctx || audio.musicTimer) return;
  audio.musicTimer = window.setInterval(() => {
    if (audio.muted || !audio.ctx) return;
    const step = audio.musicStep % 16;
    const bass = BASS[step];
    if (bass) blip(audio, bass, 0.28, 'triangle', 0.07);
    const spark = SPARKLE[step];
    if (spark) blip(audio, spark, 0.14, 'sine', 0.03);
    audio.musicStep += 1;
  }, 240);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.ctx && audio.engineGain) {
    audio.engineGain.gain.value = 0;
    audio.sirenGain.gain.value = 0;
  }
  return audio.muted;
}
