'use strict';
// Eight bars in D minor. The second pass answers the first, with a busier arrangement upstairs.
function createClimbScore(ctx) {
  const sixteenth = 60 / 136 / 4;
  const chords = [
    [50,53,57,64], [46,50,53,57], [53,57,60,64], [48,52,55,62],
    [43,46,50,57], [50,53,57,60], [46,50,53,60], [45,49,52,55]
  ];
  const melody = [
    [[0,74,2],[3,77,1],[4,81,3],[9,79,2],[12,77,3]],
    [[0,74,3],[4,70,2],[7,74,1],[8,77,3],[13,76,2]],
    [[0,77,3],[4,81,2],[7,84,1],[8,86,4],[14,84,2]],
    [[0,79,3],[4,76,2],[8,72,3],[12,76,1],[14,79,1]],
    [[0,79,2],[3,82,1],[4,86,4],[10,84,2],[13,82,2]],
    [[0,81,3],[4,77,2],[7,74,1],[8,77,3],[12,81,3]],
    [[0,82,3],[4,81,2],[7,77,1],[8,74,4],[14,77,1]],
    [[0,76,2],[3,73,1],[4,76,2],[7,79,1],[8,81,4],[14,73,1]]
  ];
  const arp = [0,2,1,3,2,1,3,2];
  const frequency = note => 440 * 2 ** ((note - 69) / 12);
  const mix = ctx.createGain();
  const tonal = ctx.createBiquadFilter();
  const delay = ctx.createDelay(.6), echo = ctx.createGain(), feedback = ctx.createGain();
  mix.gain.value = .0001;
  tonal.type = 'lowpass'; tonal.frequency.value = 2500; tonal.Q.value = .6;
  tonal.connect(mix); mix.connect(ctx.destination);
  delay.delayTime.value = sixteenth * 3;
  echo.gain.value = .16; feedback.gain.value = .22;
  delay.connect(echo); echo.connect(tonal); delay.connect(feedback); feedback.connect(delay);
  const noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * .24), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  let seed = 61927;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = seed / 2147483648 - 1;
  }
  const sources = new Set();
  const scheduled = [];
  let cursor = 0, next = 0, active = false;
  function envelope(at, peak, duration, attack) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak * .40), at + duration * .74);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    return gain;
  }
  function start(source, at, duration, nodes) {
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
    source.start(at); source.stop(at + duration + .006);
  }
  function voice(note, wave, at, duration, level, wet = false, detune = 0, attack = .009) {
    const osc = ctx.createOscillator(), gain = envelope(at, level, duration, attack);
    osc.type = wave; osc.frequency.value = frequency(note); osc.detune.value = detune;
    osc.connect(gain); gain.connect(tonal);
    if (wet) gain.connect(delay);
    start(osc, at, duration, [gain]);
  }
  function kick(at, level = .42) {
    const osc = ctx.createOscillator(), gain = envelope(at, level, .19, .004);
    osc.frequency.setValueAtTime(148, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + .058);
    osc.frequency.exponentialRampToValueAtTime(37, at + .19);
    osc.connect(gain); gain.connect(mix); start(osc, at, .19, [gain]);
  }
  function percussion(at, kind, level, length) {
    const sample = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
    const gain = envelope(at, level, length, .003);
    sample.buffer = noise;
    filter.type = kind === 'snare' ? 'bandpass' : 'highpass';
    filter.frequency.value = kind === 'snare' ? 1850 : 6900;
    filter.Q.value = kind === 'snare' ? .8 : .55;
    sample.connect(filter); filter.connect(gain); gain.connect(mix);
    start(sample, at, length, [gain,filter]);
    if (kind === 'snare') voice(43,'triangle',at,.075,level * .32);
  }
  function arrange(index, at, floor, nightmare) {
    const bar = Math.floor(index / 16), beat = index % 16;
    const phrase = bar % 8, answer = Math.floor(bar / 8) % 2 === 1;
    const chord = chords[phrase], root = chord[0];
    if (beat === 0 || beat === 8 || (beat === 10 && phrase % 2 === 1) || (beat === 14 && floor >= 3)) {
      kick(at, beat % 8 === 0 ? .43 : .29);
    }
    if (beat === 4 || beat === 12) percussion(at,'snare',.34,.14);
    else if (phrase === 7 && beat >= 13 && (answer || floor >= 2)) percussion(at,'snare',.13 + .035*(beat-13),.07);
    if (beat % 2 === 0 || (beat === 15 && (floor >= 2 || nightmare))) {
      percussion(at,'hat',beat % 4 === 2 ? .13 : .08,beat === 14 && phrase % 2 ? .105 : .035);
    }
    if ([0,3,6,8,10,14].includes(beat)) {
      const bass = root - 12 + (beat === 14 ? 7 : beat === 6 || beat === 10 ? 12 : 0);
      const length = beat % 8 === 0 ? .19 : .105;
      voice(bass,'triangle',at,length,.27);
      voice(bass+12,'sawtooth',at,length*.78,.046);
    }
    if (beat === 0) {
      for (const note of chord.slice(0,3)) voice(note+12,'sawtooth',at,sixteenth*14,.035,false,-5,.14);
    }
    if ((floor >= 1 || answer) && beat % (floor >= 4 ? 1 : 2) === 0) {
      const note = chord[arp[(beat + phrase) % 8]] + 24;
      voice(note,'triangle',at,.085,beat % 4 === 0 ? .047 : .036,true);
    }
    const lead = melody[phrase].find(item => item[0] === beat);
    if (lead) {
      const note = lead[1] + (answer && phrase === 7 && beat >= 8 ? 12 : 0);
      const length = sixteenth * lead[2] * .9;
      voice(note,'triangle',at,length,.18,true);
      voice(note-12,'sawtooth',at,length*.93,.056,true,4);
      if (floor >= 3 && beat % 4 === 0) voice(note+7,'triangle',at,length*.83,.043,true);
    }
  }
  function tick(floor, nightmare) {
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (!active) {
      active = true; next = now + .018;
      mix.gain.cancelScheduledValues(now);
      mix.gain.setTargetAtTime(.29, now, .012);
    }
    while (scheduled.length && scheduled[0].at <= now) scheduled.shift();
    if (next < now - .12) next = now + .012;
    while (next < now + .12) {
      scheduled.push({index:cursor,at:next});
      arrange(cursor++,next,floor,nightmare);
      next += sixteenth;
    }
  }
  function pause() {
    if (!active) return;
    active = false;
    const now = ctx.currentTime, pending = scheduled.find(item => item.at > now);
    if (pending) cursor = pending.index;
    scheduled.length = 0;
    mix.gain.cancelScheduledValues(now); mix.gain.setTargetAtTime(.0001,now,.006);
    for (const source of sources) { try { source.stop(now+.018); } catch {} }
  }
  function reset() { pause(); cursor = 0; }
  return { tick, pause, reset };
}
