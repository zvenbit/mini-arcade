// Original, locally synthesized arcade music and effects. No audio downloads.
const preferenceKey = 'mini-arcade-game:sound';
const songs = {
  numbers: { beat: .36, notes: [60, 64, 67, 72, 67, 64, 62, 67, 59, 62, 67, 71, 67, 62, 64, 0] },
  snake: { beat: .24, notes: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 0] },
  breakout: { beat: .19, notes: [57, 64, 69, 72, 76, 72, 69, 64, 53, 60, 65, 69, 72, 69, 65, 60] }
};
const effects = {
  move: [[330, .045]], merge: [[523, .09], [784, .13]],
  turn: [[240, .035]], eat: [[660, .065], [990, .11]],
  brick: [[880, .055], [1175, .07]], bounce: [[350, .045]],
  start: [[392, .07], [523, .07], [784, .12]],
  lose: [[330, .12], [220, .17]],
  over: [[392, .16], [330, .16], [262, .16], [196, .35]],
  win: [[523, .1], [659, .1], [784, .1], [1047, .3]]
};

export function createAudio(theme, button) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let enabled = true;
  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch {}
  let context;
  let active = true;
  let timer;
  let nextNote = 0;
  let step = 0;
  let generation = 0;
  let disposed = false;
  const voices = new Set();
  const song = songs[theme] || songs.numbers;
  const hz = note => 440 * 2 ** ((note - 69) / 12);

  function updateButton() {
    button.textContent = enabled ? '声音：开' : '声音：关';
    button.setAttribute('aria-label', enabled ? '关闭声音' : '开启声音');
    button.setAttribute('aria-pressed', String(enabled));
  }
  function tone(frequency, when, duration, volume, type = 'sine') {
    if (!context || context.state !== 'running' || !enabled || disposed) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
  }
  function stop() {
    generation++;
    clearInterval(timer);
    timer = undefined;
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
  }
  function scheduleMusic() {
    if (!enabled || !active || disposed || context?.state !== 'running') return;
    // Only schedule a short look-ahead, so background tabs cannot build a backlog.
    if (nextNote < context.currentTime) nextNote = context.currentTime + .02;
    while (nextNote < context.currentTime + .12) {
      const note = song.notes[step % song.notes.length];
      if (note) tone(hz(note), nextNote, song.beat * .8, .025, 'triangle');
      if (step % 4 === 0) tone(hz(song.notes[Math.floor(step % 16 / 8) * 8] - 24), nextNote, song.beat * 2, .035);
      step++;
      nextNote += song.beat;
    }
  }
  function music() {
    if (timer || !enabled || !active || disposed || context?.state !== 'running') return;
    nextNote = context.currentTime + .02;
    scheduleMusic();
    timer = setInterval(scheduleMusic, 80);
  }
  function unlock() {
    if (!enabled || !AudioContext || disposed) return;
    try {
      context ||= new AudioContext();
      if (context.state === 'suspended') context.resume().then(music).catch(() => {});
      else music();
    } catch { /* An unavailable audio device must not interrupt the game. */ }
  }
  function play(name) {
    if (!enabled || !context || disposed) return;
    const token = generation;
    const emit = () => {
      if (token !== generation || !enabled || disposed || context.state !== 'running') return;
      let when = context.currentTime + .005;
      for (const [frequency, duration] of effects[name] || []) {
        tone(frequency, when, duration, .12, theme === 'breakout' ? 'triangle' : 'sine');
        when += duration * .8;
      }
    };
    if (context.state === 'running') emit();
    else context.resume().then(emit).catch(() => {});
  }
  function setActive(value) {
    active = value;
    stop();
    if (active) music();
  }
  button.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch {}
    updateButton();
    stop();
    if (enabled) { unlock(); play('move'); }
  });
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  window.addEventListener('pagehide', () => {
    disposed = true;
    stop();
    context?.close().catch(() => {});
  }, { once: true });
  // Also silence result jingles if the player leaves while an overlay is open.
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  if (!AudioContext) { enabled = false; button.disabled = true; button.title = '当前浏览器不支持游戏音频'; }
  updateButton();
  return { play, setActive };
}
