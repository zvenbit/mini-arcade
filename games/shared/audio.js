// Original, locally synthesized arcade music and effects. No audio downloads.
const preferenceKey = 'mini-arcade-game:sound';
const songs = {
  tetris: { beat: .23, notes: [64,71,76,74,71,67,64,0,62,69,74,72,69,65,62,0] },
  memory: { beat: .42, notes: [72,0,76,79,76,72,67,0,69,0,72,76,74,71,67,0] },
  minesweeper: { beat: .48, notes: [64, 67, 71, 0, 67, 64, 62, 0, 60, 64, 67, 0, 62, 67, 64, 0] },
  sokoban: { beat: .4, notes: [60, 0, 67, 64, 65, 0, 69, 67, 62, 0, 65, 69, 67, 64, 60, 0] },
  numbers: { beat: .36, notes: [60, 64, 67, 72, 67, 64, 62, 67, 59, 62, 67, 71, 67, 62, 64, 0] },
  snake: { beat: .24, notes: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 0] },
  breakout: { beat: .19, notes: [57, 64, 69, 72, 76, 72, 69, 64, 53, 60, 65, 69, 72, 69, 65, 60] }
};
const effects = {
  rotate: [[480,.04],[640,.05]], drop: [[180,.04],[100,.09]],
  clear: [[523,.07],[659,.07],[784,.07],[1047,.16]],
  flip: [[540,.04],[760,.055]], match: [[659,.08],[880,.08],[1047,.14]], miss: [[390,.07],[330,.09]],
  reveal: [[620, .045], [830, .06]], flag: [[440, .055], [590, .07]],
  push: [[180, .06], [240, .08]], undo: [[650, .06], [430, .08]], blocked: [[150, .055]],
  move: [[330, .045]], merge: [[523, .09], [784, .13]],
  turn: [[240, .035]], eat: [[660, .065], [990, .11]],
  brick: [[880, .055], [1175, .07]], bounce: [[350, .045]],
  start: [[392, .07], [523, .07], [784, .12]],
  lose: [[330, .12], [220, .17]],
  over: [[392, .16], [330, .16], [262, .16], [196, .35]],
  win: [[523, .1], [659, .1], [784, .1], [1047, .3]]
};

// Short, dry accents suit the faster Tetris lock/clear cycle.
const tetrisEffects = {
  move: [[360,.016]], rotate: [[560,.023]],
  drop: [[155,.035]], clear: [[880,.045],[1320,.05]]
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
  const effectVoices = new Map();
  const song = songs[theme] || songs.numbers;
  const hz = note => 440 * 2 ** ((note - 69) / 12);

  function updateButton() {
    button.textContent = enabled ? '声音：开' : '声音：关';
    button.setAttribute('aria-label', enabled ? '关闭声音' : '开启声音');
    button.setAttribute('aria-pressed', String(enabled));
  }
  function tone(frequency, when, duration, volume, type = 'sine', group = '') {
    if (!context || context.state !== 'running' || !enabled || disposed) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + (group ? .002 : .008));
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    voices.add(oscillator);
    if(group)effectVoices.set(oscillator,{gain,group});
    oscillator.onended = () => { voices.delete(oscillator); effectVoices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when);
    oscillator.stop(when + duration + (group ? .004 : .02));
  }
  function stop() {
    generation++;
    clearInterval(timer);
    timer = undefined;
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
    effectVoices.clear();
  }
  function scheduleMusic() {
    if (!enabled || !active || disposed || context?.state !== 'running') return;
    // Only schedule a short look-ahead, so background tabs cannot build a backlog.
    if (nextNote < context.currentTime) nextNote = context.currentTime + .02;
    while (nextNote < context.currentTime + .12) {
      const note = song.notes[step % song.notes.length];
      if (note) tone(hz(note), nextNote, theme === 'tetris' ? .09 : song.beat * .8, theme === 'tetris' ? .014 : .025, 'triangle');
      if (step % 4 === 0) tone(hz(song.notes[Math.floor(step % 16 / 8) * 8] - 24), nextNote, theme === 'tetris' ? .09 : song.beat * 2, theme === 'tetris' ? .014 : .035);
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
      const crisp = theme === 'tetris' && tetrisEffects[name];
      const group = crisp ? (name === 'drop' || name === 'clear' ? 'impact' : 'movement') : '';
      if(group) {
        // An impact replaces previous accents; movement must not cut a clear sound.
        for(const [voice,record] of effectVoices) {
          if(group !== 'impact' && record.group !== group)continue;
          const end=context.currentTime+.004;
          record.gain.gain.cancelScheduledValues(context.currentTime);
          record.gain.gain.setTargetAtTime(.0001,context.currentTime,.001);
          try { voice.stop(end); } catch {}
          effectVoices.delete(voice);
        }
      }
      let when = context.currentTime + .005;
      for (const [frequency, duration] of crisp || effects[name] || []) {
        tone(frequency, when, duration, crisp ? .1 : .12, theme === 'breakout' || crisp ? 'triangle' : 'sine', group);
        when += duration * (crisp ? .35 : .8);
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
