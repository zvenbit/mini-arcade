'use strict';
// Capture each finger separately, so steering and both actions can overlap.
function makeTouchControls(pad, begin, press, releaseJump) {
  const stick = pad.querySelector('.stick');
  const knob = pad.querySelector('.stick-knob');
  const buttons = [...pad.querySelectorAll('button[data-key]')];
  const fingers = new Map();
  let stickId = null, stickBox = null, travel = 0, axis = 0, down = false;

  function setAxis(value, low = false) {
    const changed = low !== down;
    down = low;
    axis = value;
    const percent = Math.round(value * 100);
    if (!changed && stick.getAttribute('aria-valuenow') === String(percent)) return;
    stick.classList.toggle('low', down);
    stick.setAttribute('aria-valuenow', String(percent));
    const direction = percent === 0 ? 'Centered' : Math.abs(percent) + '% ' + (percent < 0 ? 'left' : 'right');
    stick.setAttribute('aria-valuetext', down ? direction + ', crouching' : direction);
  }

  function steer(event) {
    if (event.pointerId !== stickId) return;
    const dx = event.clientX - stickBox.left - stickBox.width / 2;
    const dy = event.clientY - stickBox.top - stickBox.height / 2;
    const scale = Math.min(1, travel / Math.max(1, Math.hypot(dx, dy)));
    knob.style.setProperty('--x', (dx * scale).toFixed(1) + 'px');
    knob.style.setProperty('--y', (dy * scale).toFixed(1) + 'px');
    // A wider release zone keeps a diagonal crawl steady while the thumb changes direction.
    const reach = Math.abs(dx) / travel;
    const magnitude = Math.max(0, Math.min(1, (reach - .14) / .64));
    const vertical = dy * scale / travel;
    setAxis(Math.sign(dx) * magnitude, vertical > (down ? .36 : .57));
  }
  function centerStick() {
    stickId = null;
    knob.style.removeProperty('--x');
    knob.style.removeProperty('--y');
    stick.classList.remove('active');
    setAxis(0);
  }
  stick.addEventListener('pointerdown', event => {
    if (stickId !== null || event.button !== 0 || !begin()) return;
    event.preventDefault();
    stickId = event.pointerId;
    stickBox = stick.getBoundingClientRect();
    travel = Math.max(10, (stickBox.width - knob.offsetWidth) / 2 - 4);
    stick.setPointerCapture(stickId);
    stick.classList.add('active');
    steer(event);
  });
  stick.addEventListener('pointermove', steer);
  const releaseStick = event => { if (event.pointerId === stickId) centerStick(); };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, releaseStick);

  function held(action) { return [...fingers.values()].includes(action); }
  function showButtons() {
    for (const button of buttons) button.classList.toggle('held', held(button.dataset.key));
  }
  function changeAction(id, action) {
    if (fingers.get(id) === action) return;
    const alreadyHeld = held(action);
    fingers.set(id, action);
    if (!alreadyHeld) press(action);
    showButtons();
  }
  function releaseAction(event) {
    const previous = fingers.get(event.pointerId);
    if (!previous) return;
    fingers.delete(event.pointerId);
    if (previous === 'jump' && !held('jump')) releaseJump();
    showButtons();
  }
  for (const button of buttons) {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !begin()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      changeAction(event.pointerId, button.dataset.key);
    });
    button.addEventListener('pointermove', event => {
      if (!fingers.has(event.pointerId)) return;
      const underFinger = document.elementFromPoint(event.clientX, event.clientY)?.closest('button[data-key]');
      // Crossing the gap preserves the jump until the same thumb finds Dash.
      if (buttons.includes(underFinger)) changeAction(event.pointerId, underFinger.dataset.key);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, releaseAction);
    button.addEventListener('click', event => {
      if (event.detail === 0 && begin()) press(button.dataset.key);
    });
  }
  pad.addEventListener('contextmenu', event => event.preventDefault());
  function clear() {
    centerStick();
    fingers.clear();
    showButtons();
  }
  return { get axis() { return axis; }, get down() { return down; }, held, clear };
}
