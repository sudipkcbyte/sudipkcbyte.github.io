/* 8-bit sound effects & continuous background music */
(function (RB) {
  'use strict';

  var S = RB.state || (RB.state = { soundOn: true });

  var AC = null;
  var masterComp = null;
  var saturator = null;
  var makeupGain = null;
  var bgmGain = null;
  var sfxGain = null;
  var bgmTimer = null;
  var bgmRunning = false;
  var stepIndex = 0;
  var nextNoteTime = 0;
  var unlockBound = false;

  // Tune loudness here (higher = louder)
  var BGM_LEVEL = 0.75;
  var SFX_LEVEL = 2.6;
  var MAKEUP_GAIN = 2.2;

  // Tempo & scheduler settings (retro synth-arcade groove)
  var BPM = 128;
  var STEP_SEC = 60 / BPM / 4; // 16th notes
  var LOOKAHEAD_MS = 100;
  var SCHEDULE_AHEAD_SEC = 0.22;

  // 32-step (2-bar) 8-bit lead & bass patterns (Hz; 0 = rest)
  var LEAD_NOTES = [
    659.25, 659.25, 783.99, 783.99, 880.0, 880.0, 783.99, 659.25,
    587.33, 587.33, 659.25, 659.25, 783.99, 659.25, 587.33, 493.88,
    523.25, 523.25, 659.25, 659.25, 783.99, 783.99, 880.0, 783.99,
    659.25, 587.33, 493.88, 587.33, 659.25, 659.25, 493.88, 0,
  ];

  var BASS_NOTES = [
    261.63, 261.63, 392.0, 261.63, 261.63, 392.0, 261.63, 392.0,
    196.0,  196.0,  293.66, 196.0, 196.0,  293.66, 196.0, 293.66,
    220.0,  220.0,  329.63, 220.0, 220.0,  329.63, 220.0, 329.63,
    174.61, 196.0,  261.63, 261.63, 392.0, 392.0, 261.63, 0,
  ];

  function makeSaturationCurve(amount) {
    var samples = 44100;
    var curve = new Float32Array(samples);
    var k = typeof amount === 'number' ? amount : 35;
    for (var i = 0; i < samples; i++) {
      var x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function ensureContext() {
    if (!AC) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      AC = new Ctx();

      saturator = AC.createWaveShaper();
      saturator.curve = makeSaturationCurve(40);
      saturator.oversample = '2x';

      masterComp = AC.createDynamicsCompressor();
      masterComp.threshold.setValueAtTime(-4, AC.currentTime);
      masterComp.knee.setValueAtTime(10, AC.currentTime);
      masterComp.ratio.setValueAtTime(4, AC.currentTime);
      masterComp.attack.setValueAtTime(0.002, AC.currentTime);
      masterComp.release.setValueAtTime(0.12, AC.currentTime);

      makeupGain = AC.createGain();
      makeupGain.gain.value = MAKEUP_GAIN;

      sfxGain = AC.createGain();
      sfxGain.gain.value = SFX_LEVEL;

      bgmGain = AC.createGain();
      bgmGain.gain.value = S.soundOn ? BGM_LEVEL : 0.0001;

      sfxGain.connect(saturator);
      bgmGain.connect(saturator);
      saturator.connect(masterComp);
      masterComp.connect(makeupGain);
      makeupGain.connect(AC.destination);
    }
    return AC;
  }

  function unlockAudio() {
    var ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(function () {
        syncBgmState();
      }).catch(function () {});
    } else {
      syncBgmState();
    }
  }

  function bindUnlockListeners() {
    if (unlockBound) return;
    unlockBound = true;

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, unlockAudio, { passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (!AC) return;
      if (document.hidden) {
        stopBgmLoop();
      } else if (S.soundOn) {
        nextNoteTime = AC.currentTime + 0.05;
        startBgmLoop();
      }
    });
  }

  function scheduleTone(freq, duration, type, startTime, gainNode, peakGain) {
    if (!AC || !gainNode || !freq || freq <= 0) return;

    var osc = AC.createOscillator();
    var env = AC.createGain();
    var endTime = Math.max(startTime + 0.02, startTime + duration);

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, startTime);

    env.gain.setValueAtTime(0.001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.connect(env);
    env.connect(gainNode);

    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  function scheduleStep(step, time) {
    var idx = step % LEAD_NOTES.length;
    var leadFreq = LEAD_NOTES[idx];
    var bassFreq = BASS_NOTES[idx];

    if (leadFreq > 0) {
      scheduleTone(leadFreq, STEP_SEC * 0.94, 'square', time, bgmGain, 1.0);
      scheduleTone(leadFreq * 0.5, STEP_SEC * 0.85, 'sawtooth', time, bgmGain, 0.45);
    }
    if (bassFreq > 0) {
      scheduleTone(bassFreq, STEP_SEC * 0.94, 'square', time, bgmGain, 0.85);
    }
  }

  function scheduler() {
    if (!AC || !bgmRunning || !S.soundOn || document.hidden) return;
    if (AC.state !== 'running') return;

    while (nextNoteTime < AC.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleStep(stepIndex, nextNoteTime);
      nextNoteTime += STEP_SEC;
      stepIndex = (stepIndex + 1) % LEAD_NOTES.length;
    }
  }

  function startBgmLoop() {
    if (bgmRunning || !S.soundOn || document.hidden) return;
    var ctx = ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    bgmRunning = true;
    nextNoteTime = Math.max(nextNoteTime, ctx.currentTime + 0.04);
    bgmTimer = setInterval(scheduler, LOOKAHEAD_MS);
  }

  function stopBgmLoop() {
    bgmRunning = false;
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  function setBgmVolume(active) {
    if (!AC || !bgmGain) return;
    var now = AC.currentTime;
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value), now);
    bgmGain.gain.exponentialRampToValueAtTime(active ? BGM_LEVEL : 0.0001, now + 0.06);
  }

  function syncBgmState() {
    bindUnlockListeners();
    if (!S.soundOn) {
      setBgmVolume(false);
      stopBgmLoop();
      return;
    }
    var ctx = ensureContext();
    if (!ctx) return;
    setBgmVolume(true);
    if (ctx.state === 'running') {
      startBgmLoop();
    }
  }

  /* ---------- Sound Effects ---------- */

  function beep(f, d, type, delay) {
    if (!S.soundOn) return;
    try {
      var ctx = ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }

      var t = ctx.currentTime + (delay || 0);
      scheduleTone(f, d || 0.14, type || 'square', t, sfxGain, 0.55);
    } catch (e) {}
  }

  function jingle(pts) {
    var notes = {
      200: [660, 880, 1320],
      100: [587, 784, 988],
      50:  [523, 659],
      25:  [440, 523],
      10:  [330],
      0:   [160, 120],
    }[pts] || [330];

    notes.forEach(function (f, i) {
      beep(f, 0.15, pts ? 'square' : 'sawtooth', i * 0.1);
    });
  }

  bindUnlockListeners();
  if (S.soundOn) {
    syncBgmState();
  }

  Object.assign(RB, {
    beep: beep,
    jingle: jingle,
    syncBgmState: syncBgmState,
  });
})((window.RB = window.RB || {}));
