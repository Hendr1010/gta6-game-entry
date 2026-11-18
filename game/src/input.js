// VICE BAY — input.js
// One clear job: keyboard and mouse state, plus the on-screen control hints.
// The game reads this object every frame; nothing here draws or moves anything.

export function createInput() {
  return {
    keys: {},
    queued: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    anyKey: false,
  };
}

export function bindInput(input, canvas) {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    input.keys[k] = true;
    // Queue the press so a quick tap between two frames is never lost.
    input.queued[k] = true;
    input.anyKey = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = {};
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouseDown = true;
      input.clicked = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function isDown(input, ...names) {
  return names.some((n) => input.keys[n]);
}

export function consumeClick(input) {
  const c = input.clicked;
  input.clicked = false;
  return c;
}

// One-shot key press, consumed from the queue so a quick tap between two
// frames is never lost. Returns true once per physical keydown.
export function wasPressed(input, name) {
  if (input.queued[name]) {
    input.queued[name] = false;
    return true;
  }
  return false;
}

export function pressed(input, name) {
  if (input.keys[name] && !input._prev) input._prev = {};
  if (input.keys[name] && !input._prev[name]) {
    input._prev[name] = true;
    return true;
  }
  if (!input.keys[name] && input._prev) input._prev[name] = false;
  return false;
}

export function resetPressed(input) {
  input._prev = {};
}
