/* ==========================================================================
   RAREBYTE — game.js
   Question flow, countdown, scoring, saved progress and finishing a challenge.

   Public API (unchanged): RB.startGame(day, practice), RB.showQ(),
                           RB.submit(timeout), RB.rankOf(score),
                           RB.titleOf(score), RB.finish()
   New:                    RB.clearRun()

   Needs (load order): utils.js, data.js, storage.js, audio.js, board.js.
   Everything is looked up at the moment it is used, so a load-order slip
   shows a message on the play screen and in the console instead of crashing.

   Drop-in: same element IDs as index.html, same S.G / S.LAST / profile shape.
   ========================================================================== */
(function (RB) {
  'use strict';

  /* ---------- Settings ---------------------------------------------------- */

  const ROUND_SECONDS = 25;
  const QUESTION_COUNT = 7; // main.js also finishes after 7 answers: keep them equal
  const LOW_TIME_THRESHOLD = 6;
  const TICK_MS = 100;

  const TICK_SOUND = true; // soft beep on each of the last few seconds
  const TICK_SOUND_FROM = 5;
  const ANNOUNCE_AT = [10, 5]; // "10 seconds left", read out to screen readers

  const NEXT_DELAY_MS = 350; // a double Enter can no longer skip the result
  const NEXT_DELAY_TIMEOUT_MS = 900; // longer after a time-out: you may still be typing
  const SCORE_COUNT_MS = 500;
  const HOT_STREAK_MIN_PTS = 50; // back-to-back uncommon-or-rarer answers
  const TOP_ANSWERS_SHOWN = 3;

  const RUN_KEY = 'rarebyte_run';
  const RUN_VERSION = 1;

  const FLAVOR = {
    200: 'Almost nobody thinks of this one!',
    100: 'Sharp thinking. Very few players find this.',
    50: 'A solid, uncommon pick.',
    25: 'Plenty of players thought of this too.',
    10: 'The crowd favorite. Safe, but low value.',
  };

  const TITLES = [
    [1250, 'RAREBYTE MYTH'],
    [1000, 'RAREBYTE LEGEND'],
    [750, 'RAREBYTE MASTER'],
    [600, 'RAREBYTE EXPLORER'],
    [450, 'RAREBYTE HUNTER'],
    [300, 'RAREBYTE SCOUT'],
    [150, 'BYTE APPRENTICE'],
    [0, 'ROOKIE BYTE'],
  ];

  const S = RB.state || (RB.state = { soundOn: true });
  const topCache = new WeakMap();

  /* ---------- Tiny helpers ------------------------------------------------ */

  const $ = (selector) => document.querySelector(selector);

  /** Call RB[name](...args). Logs instead of throwing if it is missing or fails. */
  function call(name) {
    const fn = RB[name];
    if (typeof fn !== 'function') return undefined;
    try {
      return fn.apply(RB, Array.prototype.slice.call(arguments, 1));
    } catch (err) {
      if (window.console) console.error('[RAREBYTE] RB.' + name + ' failed:', err);
      return undefined;
    }
  }

  /** Run a non-essential step. A failure there must never stall the game. */
  function attempt(label, fn) {
    try {
      fn();
    } catch (err) {
      if (window.console) console.error('[RAREBYTE] ' + label + ' failed:', err);
    }
  }

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value;
  }

  function fmt(n) {
    const out = call('fmt', n);
    return out == null ? String(Math.round(Number(n) || 0)) : out;
  }

  /** 0.0213 -> "2.1%", 0.0004 -> "0.04%". */
  function pctText(share) {
    const p = (Number(share) || 0) * 100;
    return p.toFixed(p < 1 ? 2 : 1) + '%';
  }

  function cleanText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function sumPts(list) {
    return list.reduce(function (sum, r) {
      return sum + (Number(r.pts) || 0);
    }, 0);
  }

  /** How many answers in a row (counting back from the last) were uncommon or rarer. */
  function trailingHot(list) {
    let run = 0;
    for (let k = list.length - 1; k >= 0 && list[k].pts >= HOT_STREAK_MIN_PTS; k--) run += 1;
    return run;
  }

  function reducedMotion() {
    return typeof RB.reducedMotion === 'function' && RB.reducedMotion();
  }

  function requestFrame(fn) {
    return window.requestAnimationFrame ? window.requestAnimationFrame(fn) : window.setTimeout(fn, 16);
  }

  function cancelFrame(id) {
    if (window.cancelAnimationFrame) window.cancelAnimationFrame(id);
    else window.clearTimeout(id);
  }

  /** Short buzz on phones. Follows the SOUND toggle so players can turn it off. */
  function vibrate(pattern) {
    if (!S.soundOn || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      /* not supported: ignore */
    }
  }

  /** Message for screen readers (hidden visually, announced politely). */
  function announce(message) {
    let box = document.getElementById('rbLive');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rbLive';
      box.className = 'sr-only';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    box.textContent = '';
    window.setTimeout(function () {
      box.textContent = message;
    }, 50);
  }

  function keepInView(selector) {
    const el = $(selector);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function bankAt(g) {
    const banks = RB.BANKS;
    if (!g || !Array.isArray(g.ord) || !Array.isArray(banks)) return null;
    return banks[g.ord[g.i]] || null;
  }

  /** Put an on-screen message in the question slot and stop the input. */
  function showFatal(message) {
    if (window.console) console.error('[RAREBYTE] ' + message);
    setText('#pQ', message);
    setText('#pHint', '');
    const rev = $('#pRev');
    const inp = $('#pIn');
    const goBtn = $('#pGo');
    if (rev) rev.hidden = true;
    if (inp) {
      inp.value = '';
      inp.placeholder = '';
      inp.disabled = true;
    }
    if (goBtn) goBtn.disabled = true;
  }

  /* ---------- Progress squares (one per question) ------------------------- */

  function ensurePips() {
    let el = $('#pPips');
    if (el) return el;
    const bar = $('#pBar');
    if (!bar || !bar.parentNode) return null;
    el = document.createElement('div');
    el.id = 'pPips';
    el.className = 'pips';
    el.style.margin = '0 0 12px';
    el.setAttribute('role', 'img');
    bar.parentNode.insertBefore(el, bar);
    return el;
  }

  /** Answered squares reuse the tier colours (.t0 .t10 ... .t200) from style.css. */
  function renderPips(g) {
    const el = ensurePips();
    if (!el || !g) return;
    el.textContent = '';
    for (let n = 0; n < g.total; n++) {
      const pip = document.createElement('div');
      const result = g.res[n];
      pip.className = 'pip' + (result ? ' t' + result.pts : '');
      if (!result && n === g.i) {
        pip.style.outline = '2px solid var(--cyan)';
        pip.style.outlineOffset = '1px';
      }
      el.appendChild(pip);
    }
    el.setAttribute('aria-label', g.res.length + ' of ' + g.total + ' questions answered');
  }

  /** The "Q 1/7" label has a fixed "/7" in the HTML; keep it honest. */
  function syncTotalLabel(g) {
    const qn = $('#pQn');
    const tail = qn && qn.nextSibling;
    if (tail && tail.nodeType === 3) tail.nodeValue = '/' + g.total;
  }

  /* ---------- Countdown --------------------------------------------------- */

  function onNewSecond(whole) {
    if (TICK_SOUND && whole > 0 && whole <= TICK_SOUND_FROM) {
      call('beep', 620 + (TICK_SOUND_FROM - whole) * 90, 0.05, 'square');
    }
    if (ANNOUNCE_AT.indexOf(whole) >= 0) announce(whole + ' seconds left');
  }

  /** The bar moves every tick; text, colour and ARIA only change each second. */
  function updateTimerUI(g, remaining, force) {
    const bar = $('#pBar');
    const label = $('#pT');
    const fill = bar && bar.firstElementChild;
    const clamped = Math.max(0, Math.min(ROUND_SECONDS, Number(remaining) || 0));
    const whole = Math.ceil(clamped);

    if (fill) fill.style.width = (clamped / ROUND_SECONDS) * 100 + '%';
    if (!force && whole === g.shownWhole) return;
    g.shownWhole = whole;

    if (label) label.textContent = String(whole);
    if (bar) {
      bar.className = 'timer' + (clamped > 0 && clamped <= LOW_TIME_THRESHOLD ? ' low' : '');
      bar.setAttribute('aria-valuenow', String(Math.round((clamped / ROUND_SECONDS) * 100)));
      bar.setAttribute('aria-valuetext', whole + (whole === 1 ? ' second left' : ' seconds left'));
    }
    if (!force) onNewSecond(whole);
  }

  function stopTimer(g) {
    if (g && g.tm) {
      clearInterval(g.tm);
      g.tm = null;
    }
  }

  /** Stop everything a game started (interval, animation, delayed NEXT). */
  function teardown(g) {
    if (!g) return;
    stopTimer(g);
    if (g.raf) {
      cancelFrame(g.raf);
      g.raf = 0;
    }
    if (g.nextTimer) {
      clearTimeout(g.nextTimer);
      g.nextTimer = 0;
      const nextBtn = $('#pNext');
      if (nextBtn) nextBtn.disabled = false;
    }
  }

  function tick() {
    const g = S.G;
    if (!g || g.locked) return;

    const remaining = Math.max(0, (g.deadline - performance.now()) / 1000);
    g.t = remaining;
    updateTimerUI(g, remaining, false);

    if (remaining <= 0) submit(true);
  }

  /* ---------- Saved progress ---------------------------------------------- */
  /* Answers are saved the moment they are locked in, and the open question keeps
     its deadline. Refreshing the page therefore resumes the daily instead of
     restarting it: answered questions stay answered and the clock keeps running. */

  function readRun() {
    try {
      const raw = window.localStorage.getItem(RUN_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const ok = data && data.v === RUN_VERSION && Array.isArray(data.res) && Array.isArray(data.ord);
      return ok ? data : null;
    } catch (err) {
      return null;
    }
  }

  function writeRun(g) {
    if (!g || g.practice) return;
    try {
      window.localStorage.setItem(
        RUN_KEY,
        JSON.stringify({
          v: RUN_VERSION,
          name: S.P && S.P.name ? S.P.name : '',
          day: g.day,
          ord: g.ord,
          i: g.i,
          res: g.res,
          deadline: g.wallDeadline || 0,
        })
      );
    } catch (err) {
      /* storage blocked or full: the game still works, it just cannot resume */
    }
  }

  function clearRun() {
    try {
      window.localStorage.removeItem(RUN_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  function cleanResult(r) {
    if (!r || typeof r !== 'object') return null;
    const pts = Number(r.pts);
    if (!Number.isFinite(pts) || pts < 0 || pts > 10000) return null;
    return {
      q: String(r.q == null ? '' : r.q),
      ans: String(r.ans == null ? '' : r.ans),
      pts: pts,
      label: String(r.label == null ? '' : r.label),
      share: Number(r.share) > 0 ? Number(r.share) : 0,
      sec: Number(r.sec) > 0 ? Number(r.sec) : 0,
    };
  }

  function sameOrder(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let k = 0; k < a.length; k++) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  function restoreRun(g) {
    const saved = readRun();
    if (!saved) return;

    if (saved.day !== g.day) {
      clearRun(); // left over from an earlier day
      return;
    }
    const sameOwner = !saved.name || !S.P || saved.name === S.P.name;
    if (!sameOwner || !sameOrder(saved.ord, g.ord)) return;

    const answered = saved.res.map(cleanResult);
    const broken = answered.some(function (r) {
      return r === null;
    });
    if (broken || answered.length > g.total) {
      clearRun();
      return;
    }

    g.res = answered;
    g.score = sumPts(answered);
    g.hot = trailingHot(answered);
    g.i = answered.length;

    // The open question keeps its original deadline (wall clock).
    const stamp = Number(saved.deadline);
    if (g.i < g.total && saved.i === g.i && stamp > 0) {
      g.resumeLeft = Math.min(ROUND_SECONDS, (stamp - Date.now()) / 1000);
    }
    g.resumed = answered.length > 0 || g.resumeLeft !== null;
  }

  /* ---------- Start a challenge ------------------------------------------- */

  function startGame(day, practice) {
    teardown(S.G);
    S.G = null;

    const banks = RB.BANKS;
    if (!Array.isArray(banks) || !banks.length) {
      showFatal('NO QUESTIONS LOADED. CHECK THAT data.js LOADS.');
      return;
    }

    const dayNum = Math.floor(Number(day));
    const safeDay = Number.isFinite(dayNum) && dayNum > 0 ? dayNum : Number(RB.TODAY) || 1;

    // order() shuffles every bank for the day; the first QUESTION_COUNT are today's set.
    // With more than 7 banks in data.js this gives a different set of 7 each day.
    let ord = call('order', safeDay);
    if (!Array.isArray(ord) || !ord.length) {
      ord = banks.map(function (_, k) {
        return k;
      });
    }
    ord = ord
      .filter(function (idx) {
        return Boolean(banks[idx]);
      })
      .slice(0, QUESTION_COUNT);

    if (!ord.length) {
      showFatal('NO QUESTIONS FOUND. CHECK THE BANKS IN data.js.');
      return;
    }

    const g = {
      day: safeDay,
      practice: Boolean(practice),
      ord: ord,
      total: ord.length,
      i: 0,
      score: 0,
      res: [],
      hot: 0,
      t: ROUND_SECONDS,
      deadline: 0,
      wallDeadline: 0,
      locked: false,
      hinted: false,
      tm: null,
      resumed: false,
      resumeLeft: null,
      shownWhole: -1,
      raf: 0,
      nextTimer: 0,
    };
    S.G = g;

    if (!g.practice) {
      const done = S.P && S.P.today && S.P.today.day === g.day;
      if (done) clearRun();
      else restoreRun(g);
    }

    if (g.i >= g.total) {
      finish(); // everything was already answered before the page closed
      return;
    }
    showQ();
  }

  /* ---------- Show the current question ----------------------------------- */

  function showQ() {
    const g = S.G;
    if (!g) return;
    teardown(g);

    if (g.i >= g.total) {
      finish();
      return;
    }

    const bank = bankAt(g);
    if (!bank) {
      showFatal('QUESTION MISSING. CHECK THAT data.js LOADS.');
      return;
    }

    const inp = $('#pIn');
    const goBtn = $('#pGo');
    const rev = $('#pRev');
    const nextBtn = $('#pNext');

    // Time left: full round, or what remains after a refresh / leaving the page.
    const resumedClock = g.resumeLeft !== null;
    const left = resumedClock ? Math.min(ROUND_SECONDS, g.resumeLeft) : ROUND_SECONDS;
    let note = '';
    if (g.resumed) {
      note = 'Welcome back! Your progress was saved.';
      if (resumedClock && left > 0) note += ' The clock kept running while you were away.';
    }
    g.resumeLeft = null;
    g.resumed = false;

    setText('#pMode', (g.practice ? 'PRACTICE #' : 'DAILY #') + g.day);
    setText('#pQn', String(g.i + 1));
    setText('#pSc', fmt(g.score));
    setText('#pQ', bank.q);
    setText('#pHint', note);
    attempt('question counter', function () {
      syncTotalLabel(g);
    });
    if (rev) rev.hidden = true;
    if (nextBtn) nextBtn.disabled = false;

    if (inp) {
      inp.value = '';
      inp.placeholder = 'TYPE YOUR ANSWER';
      inp.disabled = false;
      inp.setAttribute('aria-describedby', 'pQ pHint'); // read the question with the field
    }
    if (goBtn) goBtn.disabled = false;

    const secs = Math.max(0, left);
    g.locked = false;
    g.hinted = false;
    g.shownWhole = -1;
    g.t = secs;
    g.deadline = performance.now() + secs * 1000;
    g.wallDeadline = Date.now() + secs * 1000;

    attempt('progress squares', function () {
      renderPips(g);
    });
    updateTimerUI(g, secs, true);

    if (secs <= 0) {
      // The clock ran out while the player was away: that question scores zero.
      lockAnswer(g, bank, '', 'away');
      return;
    }

    writeRun(g);
    g.tm = setInterval(tick, TICK_MS);

    if (inp) inp.focus();
    if (g.i > 0) {
      attempt('scroll', function () {
        keepInView('#v-play .hud');
      });
    }
  }

  /* ---------- Scoring ----------------------------------------------------- */

  /** reason: 'answer' (locked in), 'timeout' (clock ended), 'away' (ended while away). */
  function evaluateAnswer(bank, raw, reason) {
    const matched = raw ? call('match', bank, raw) || null : null;
    const lead = reason === 'timeout' && raw ? 'Time is up! ' : '';

    if (matched && bank.total > 0) {
      const share = matched.w / bank.total;
      const info = call('tier', share) || { label: 'SCORED', pts: 10 };
      const players = Number(RB.PLAYERS) || 18420;
      const count = Math.max(1, Math.round(share * players));
      const text = [
        lead + '"' + String(matched.name).toUpperCase() + '" was given by',
        fmt(count) + ' of ' + fmt(players) + ' players (' + pctText(share) + ').',
        FLAVOR[info.pts] || '',
      ];

      return {
        matched: matched,
        share: share,
        pts: info.pts,
        tierLabel: info.label,
        answerLabel: matched.name,
        explanation: text.filter(Boolean).join(' '),
      };
    }

    if (raw) {
      return {
        matched: null,
        share: 0,
        pts: 0,
        tierLabel: 'NOT ON BOARD',
        answerLabel: raw,
        explanation: lead + '"' + raw.toUpperCase() + '" is not on the board. Zero points.',
      };
    }

    return {
      matched: null,
      share: 0,
      pts: 0,
      tierLabel: 'TIME UP',
      answerLabel: '(no answer)',
      explanation:
        reason === 'away'
          ? 'The clock ran out while you were away. No answer locked in.'
          : 'Time is up. No answer locked in.',
    };
  }

  /* ---------- Reveal ------------------------------------------------------ */

  /** Most popular answers, cached per bank. Rare answers are never listed. */
  function topAnswers(bank, count) {
    let sorted = topCache.get(bank);
    if (!sorted) {
      sorted = bank.list.slice().sort(function (a, b) {
        return b.w - a.w;
      });
      topCache.set(bank, sorted);
    }
    return sorted.slice(0, count);
  }

  function ensureExtra() {
    let box = $('#rExtra');
    if (box) return box;
    const rev = $('#pRev');
    if (!rev) return null;
    box = document.createElement('div');
    box.id = 'rExtra';
    box.style.margin = '14px 0 18px';
    const nextBtn = $('#pNext');
    if (nextBtn && nextBtn.parentNode === rev) rev.insertBefore(box, nextBtn);
    else rev.appendChild(box);
    return box;
  }

  function renderExtra(bank, matched) {
    const box = ensureExtra();
    if (!box) return;
    box.textContent = '';

    const list = topAnswers(bank, TOP_ANSWERS_SHOWN);
    if (!list.length) return;

    const title = document.createElement('h3');
    title.textContent = 'TOP ANSWERS';
    box.appendChild(title);

    const rows = document.createElement('div');
    rows.className = 'rows';
    list.forEach(function (entry, idx) {
      const mine = matched === entry;
      const row = document.createElement('div');
      const name = document.createElement('span');
      const share = document.createElement('b');

      row.className = 'row' + (mine ? ' c' : '');
      name.textContent = idx + 1 + '. ' + entry.name + (mine ? ' (YOU)' : '');
      share.className = mine ? '' : 'y';
      share.style.fontWeight = '400';
      share.textContent = pctText(entry.w / bank.total);

      row.appendChild(name);
      row.appendChild(share);
      rows.appendChild(row);
    });
    box.appendChild(rows);

    const more = bank.list.length - list.length;
    if (more > 0) {
      const note = document.createElement('p');
      note.className = 'note';
      note.style.marginTop = '8px';
      note.textContent = '+' + more + (more === 1 ? ' more answer was' : ' more answers were') + ' on the board.';
      box.appendChild(note);
    }
  }

  function renderReveal(g, bank, outcome) {
    const tierEl = $('#rTier');
    const meterEl = $('#rMeter');
    const nextBtn = $('#pNext');
    const rev = $('#pRev');
    const isLast = g.i >= g.total - 1;

    let text = outcome.explanation;
    if (g.hot >= 2) text += ' HOT STREAK x' + g.hot + '!';

    if (tierEl) {
      tierEl.textContent = outcome.tierLabel;
      tierEl.className = 'tier t' + outcome.pts;
    }
    setText('#rPts', '+' + outcome.pts + ' PTS');
    setText('#rTxt', text);
    if (meterEl) {
      meterEl.style.width = outcome.matched ? Math.max(2, Math.min(100, outcome.share * 500)) + '%' : '0%';
    }
    if (nextBtn) nextBtn.textContent = isLast ? 'SEE RESULTS' : 'NEXT';
    if (rev) rev.hidden = false;

    attempt('top answers', function () {
      renderExtra(bank, outcome.matched);
    });
    attempt('scroll', function () {
      keepInView('#pRev');
    });
  }

  /** HUD score ticks up to its new value (snaps instantly with reduced motion). */
  function animateScore(g, from, to) {
    const el = $('#pSc');
    if (!el) return;
    if (g.raf) {
      cancelFrame(g.raf);
      g.raf = 0;
    }
    if (reducedMotion() || from === to) {
      el.textContent = fmt(to);
      return;
    }

    const started = performance.now();
    function step() {
      if (S.G !== g) {
        g.raf = 0;
        return;
      }
      const p = Math.min(1, (performance.now() - started) / SCORE_COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * eased);
      g.raf = p < 1 ? requestFrame(step) : 0;
    }
    g.raf = requestFrame(step);
  }

  function feedback(pts) {
    call('jingle', pts);
    if (pts >= 200) vibrate([40, 40, 40, 40, 90]);
    else if (pts >= 100) vibrate([30, 40, 30]);
    else if (pts === 0) vibrate(80);
  }

  /** NEXT is briefly disabled, then focused: no accidental skips, keyboard friendly. */
  function armNext(g, slow) {
    const nextBtn = $('#pNext');
    if (!nextBtn) return;
    if (g.nextTimer) clearTimeout(g.nextTimer);
    nextBtn.disabled = true;
    g.nextTimer = setTimeout(
      function () {
        g.nextTimer = 0;
        nextBtn.disabled = false;
        if (S.G === g && g.locked) nextBtn.focus();
      },
      slow ? NEXT_DELAY_TIMEOUT_MS : NEXT_DELAY_MS
    );
  }

  /* ---------- Submit an answer -------------------------------------------- */

  function lockAnswer(g, bank, raw, reason) {
    if (!g || g.locked) return;
    g.locked = true;
    stopTimer(g);

    const inp = $('#pIn');
    const goBtn = $('#pGo');
    if (inp) inp.disabled = true;
    if (goBtn) goBtn.disabled = true;
    setText('#pHint', '');

    const left = reason === 'away' ? 0 : Math.max(0, (g.deadline - performance.now()) / 1000);
    const outcome = evaluateAnswer(bank, raw, reason);

    g.res.push({
      q: bank.q,
      ans: outcome.answerLabel,
      pts: outcome.pts,
      label: outcome.tierLabel,
      share: outcome.share,
      sec: Math.round((ROUND_SECONDS - left) * 10) / 10,
    });

    const before = g.score;
    g.score = sumPts(g.res);
    g.hot = outcome.pts >= HOT_STREAK_MIN_PTS ? g.hot + 1 : 0;
    writeRun(g);

    attempt('progress squares', function () {
      renderPips(g);
    });
    attempt('reveal', function () {
      renderReveal(g, bank, outcome);
    });
    attempt('score count-up', function () {
      animateScore(g, before, g.score);
    });
    attempt('sound', function () {
      feedback(outcome.pts);
    });
    armNext(g, reason !== 'answer');
  }

  /** timeout === true means the clock ran out. Anything else is a player submit. */
  function submit(timeout) {
    const g = S.G;
    if (!g || g.locked) return;

    const bank = bankAt(g);
    if (!bank) return;

    const timedOut = timeout === true;
    const inp = $('#pIn');
    const hintEl = $('#pHint');
    const raw = inp ? cleanText(inp.value) : '';

    if (!timedOut) {
      if (!raw) {
        if (hintEl) hintEl.textContent = 'Type an answer first, or wait for the clock to run out.';
        call('beep', 140, 0.12, 'sawtooth');
        if (inp) inp.focus();
        return;
      }

      // One "did you mean...?" per question, only when the answer is not on the board.
      if (!call('match', bank, raw) && !g.hinted) {
        const guess = call('suggest', bank, raw);
        if (guess && guess.name) {
          g.hinted = true;
          if (inp) {
            inp.value = guess.name;
            inp.focus();
            if (typeof inp.select === 'function') inp.select();
          }
          if (hintEl) {
            hintEl.textContent = 'Did you mean ' + guess.name + '? Press LOCK IT IN to confirm, or change it.';
          }
          call('beep', 440, 0.08);
          return;
        }
      }
    }

    lockAnswer(g, bank, raw, timedOut ? 'timeout' : 'answer');
  }

  /* ---------- Rank and title ---------------------------------------------- */

  function rankOf(score) {
    const entries = call('board', 'daily');
    let higher = 0;
    if (Array.isArray(entries)) {
      for (let k = 0; k < entries.length; k++) {
        if (!entries[k].me && entries[k].score > score) higher += 1;
      }
    }
    return higher + 1;
  }

  function titleOf(score) {
    const s = Number(score) || 0;
    for (let k = 0; k < TITLES.length; k++) {
      if (s >= TITLES[k][0]) return TITLES[k][1];
    }
    return 'ROOKIE BYTE';
  }

  function nextStreak(player, day) {
    const current = Math.max(0, Number(player.streak) || 0);
    if (player.lastDay === day) return Math.max(1, current);
    if (player.lastDay === day - 1) return current + 1;
    return 1;
  }

  /** Updates the profile for a finished daily. Returns false if today was already recorded. */
  function recordDailyProgress(player, summary) {
    const p = player;
    if (p.today && p.today.day === summary.day) return false;

    p.games = (Number(p.games) || 0) + 1;
    p.total = (Number(p.total) || 0) + summary.score;
    p.streak = nextStreak(p, summary.day);
    p.lastDay = summary.day;
    p.longest = Math.max(Number(p.longest) || 0, p.streak);
    p.best = Math.max(Number(p.best) || 0, summary.score);
    p.rare =
      (Number(p.rare) || 0) +
      summary.res.filter(function (x) {
        return x.pts >= 100;
      }).length;

    if (summary.rank <= 10) p.legend = 1;

    p.today = {
      day: summary.day,
      score: summary.score,
      correct: summary.correct,
      rarest: summary.rarest,
      res: summary.res,
      rank: summary.rank,
    };

    call('save', p);
    return true;
  }

  /* ---------- Finish the challenge ---------------------------------------- */

  function celebrate(score) {
    const notes = score >= 1000 ? [523, 659, 784, 1047, 1319] : score >= 450 ? [523, 659, 784, 1047] : [440, 523, 659];
    notes.forEach(function (freq, k) {
      call('beep', freq, 0.13, 'square', k * 0.11);
    });
  }

  function finish() {
    const g = S.G;
    if (!g) return;
    teardown(g);

    const results = Array.isArray(g.res) ? g.res : [];
    const score = sumPts(results);
    const correct = results.filter(function (r) {
      return r.pts > 0;
    }).length;
    const rarest = results.reduce(function (max, r) {
      return r.pts > max ? r.pts : max;
    }, 0);
    const previousBest = S.P ? Number(S.P.best) || 0 : 0;

    const summary = {
      day: g.day,
      score: score,
      correct: correct,
      rarest: rarest,
      res: results,
      practice: g.practice,
      rank: rankOf(score),
      newBest: !g.practice && score > previousBest,
      total: g.total,
    };

    if (!g.practice) {
      if (S.P) recordDailyProgress(S.P, summary);
      clearRun();
    }

    S.G = null;
    S.LAST = summary;
    attempt('finish sound', function () {
      celebrate(score);
    });
    window.location.hash = '#results';
  }

  /* ---------- Page-level listeners ---------------------------------------- */

  /** Enter on the result panel goes to the next question (when nothing is focused). */
  function onKeyDown(e) {
    if (e.key !== 'Enter' || e.repeat || e.defaultPrevented) return;
    const g = S.G;
    if (!g || !g.locked) return;

    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;

    const nextBtn = $('#pNext');
    const rev = $('#pRev');
    if (nextBtn && !nextBtn.disabled && rev && !rev.hidden) {
      e.preventDefault();
      nextBtn.click();
    }
  }

  /** Typing clears old hints ("did you mean...", "type an answer first"). */
  function onType() {
    const g = S.G;
    if (!g || g.locked) return;
    const hintEl = $('#pHint');
    if (hintEl && hintEl.textContent) hintEl.textContent = '';
  }

  function init() {
    // Back from another tab: check the clock right away instead of waiting for the next tick.
    document.addEventListener('visibilitychange', function () {
      const g = S.G;
      if (!document.hidden && g && !g.locked) tick();
    });
    document.addEventListener('keydown', onKeyDown);

    const inp = $('#pIn');
    if (inp) inp.addEventListener('input', onType);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ---------- Export ------------------------------------------------------ */

  Object.assign(RB, {
    startGame: startGame,
    showQ: showQ,
    submit: submit,
    rankOf: rankOf,
    titleOf: titleOf,
    finish: finish,
    clearRun: clearRun,
  });
})((window.RB = window.RB || {}));
