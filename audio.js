/* 8-bit sound effects & continuous background music */
(function (RB) {
  'use strict';

  var S = RB.state || (RB.state = { soundOn: true });

  var AC = null;
  var masterComp = null;
  var bgmGain = null;
  var sfxGain = null;
  var bgmTimer = null;
  var bgmRunning = false;
  var stepIndex = 0;
  var nextNoteTime = 0;
  var unlockBound = false;

  // Volume levels
  var BGM_LEVEL = 0.6;
  var SFX_LEVEL = 1.4;

  // Tempo & scheduler settings (retro synth-arcade groove)
  var BPM = 128;
  var STEP_SEC = 60 / BPM / 4; // 16th notes
  var LOOKAHEAD_MS = 100;
  var SCHEDULE_AHEAD_SEC = 0.22;

  // 32-step (2-bar) 8-bit lead & bass patterns (Hz; 0 = rest)
  var LEAD_NOTES = [
    659.25, 0, 783.99, 0, 880.0, 0, 783.99, 659.25,
    587.33, 0, 659.25, 0, 783.99, 659.25, 587.33, 493.88,
    523.25, 0, 659.25, 0, 783.99, 0, 880.0, 783.99,
    659.25, 587.33, 493.88, 587.33, 659.25, 0, 0, 0,
  ];

  var BASS_NOTES = [
    130.81, 0, 130.81, 196.0, 130.81, 0, 130.81, 196.0,
    98.0,   0, 98.0,   146.83, 98.0,   0, 98.0,   146.83,
    110.0,  0, 110.0,  164.81, 110.0,  0, 110.0,  164.81,
    87.31,  0, 98.0,   0,      130.81, 0, 196.0,  0,
  ];

  function ensureContext() {
    if (!AC) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      AC = new Ctx();

      // Master compressor prevents distortion at higher volumes
      masterComp = AC.createDynamicsCompressor();
      masterComp.threshold.setValueAtTime(-14, AC.currentTime);
      masterComp.knee.setValueAtTime(12, AC.currentTime);
      masterComp.ratio.setValueAtTime(6, AC.currentTime);
      masterComp.attack.setValueAtTime(0.003, AC.currentTime);
      masterComp.release.setValueAtTime(0.15, AC.currentTime);
      masterComp.connect(AC.destination);

      sfxGain = AC.createGain();
      sfxGain.gain.value = SFX_LEVEL;
      sfxGain.connect(masterComp);

      bgmGain = AC.createGain();
      bgmGain.gain.value = S.soundOn ? BGM_LEVEL : 0.0001;
      bgmGain.connect(masterComp);
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
    var endTime = Math.max(startTime + 0.015, startTime + duration);

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, startTime);

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, endTime);

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
      scheduleTone(leadFreq, STEP_SEC * 0.78, 'square', time, bgmGain, 0.55);
    }
    if (bassFreq > 0) {
      scheduleTone(bassFreq, STEP_SEC * 0.85, 'triangle', time, bgmGain, 0.95);
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
    bgmGain.gain.exponentialRampToValueAtTime(active ? BGM_LEVEL : 0.0001, now + 0.08);
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
      scheduleTone(f, d || 0.12, type || 'square', t, sfxGain, 0.18);
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
      beep(f, 0.14, pts ? 'square' : 'sawtooth', i * 0.1);
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
