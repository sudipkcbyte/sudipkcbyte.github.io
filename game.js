/* Question flow, timer, scoring, finishing a challenge */
(function (RB) {
  'use strict';

  var ROUND_SECONDS = 25;
  var QUESTION_COUNT = 7;
  var LOW_TIME_THRESHOLD = 6;
  var TICK_MS = 100;

  var S = RB.state;
  var {
    $,
    fmt,
    PLAYERS,
    BANKS,
    norm,
    match,
    tier,
    TODAY,
    order,
    save,
    beep,
    jingle,
    board,
    suggest,
  } = RB;

  function clearRoundTimer() {
    if (S.G && S.G.tm) {
      clearInterval(S.G.tm);
      S.G.tm = null;
    }
  }

  function getQuestionBank(game) {
    if (!game || !Array.isArray(game.ord) || !Array.isArray(BANKS) || !BANKS.length) {
      return null;
    }
    var idx = game.ord[game.i];
    return BANKS[idx] || BANKS[0];
  }

  /* ---------- Start a challenge ---------- */

  function startGame(day, practice) {
    if (S.G) clearRoundTimer();

    S.G = {
      day: day,
      practice: Boolean(practice),
      ord: order(day),
      i: 0,
      score: 0,
      res: [],
      used: Object.create(null),
      t: ROUND_SECONDS,
      deadline: 0,
      locked: false,
      hinted: false,
      tm: null,
    };

    showQ();
  }

  /* ---------- Timer bar ---------- */

  function updateTimerUI(remainingSec) {
    var bar = $('#pBar');
    var tEl = $('#pT');
    var fill = bar && bar.firstElementChild;
    var clamped = Math.max(0, Math.min(ROUND_SECONDS, remainingSec));
    var pct = (clamped / ROUND_SECONDS) * 100;

    if (tEl) tEl.textContent = String(Math.ceil(clamped));
    if (bar) {
      bar.className = 'timer' + (clamped > 0 && clamped <= LOW_TIME_THRESHOLD ? ' low' : '');
      bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
    if (fill) {
      fill.style.width = pct + '%';
    }
  }

  function tick() {
    if (!S.G || S.G.locked) return;

    var now = performance.now();
    var remaining = Math.max(0, (S.G.deadline - now) / 1000);
    S.G.t = remaining;
    updateTimerUI(remaining);

    if (remaining <= 0) {
      submit(true);
    }
  }

  /* ---------- Show the current question ---------- */

  function showQ() {
    if (!S.G) return;
    clearRoundTimer();

    var b = getQuestionBank(S.G);
    var inp = $('#pIn');
    var goBtn = $('#pGo');
    var rev = $('#pRev');
    var hint = $('#pHint');
    var qEl = $('#pQ');
    var modeEl = $('#pMode');
    var qnEl = $('#pQn');
    var scEl = $('#pSc');

    if (!b) return;

    if (modeEl) modeEl.textContent = (S.G.practice ? 'PRACTICE #' : 'DAILY #') + S.G.day;
    if (qnEl) qnEl.textContent = String(S.G.i + 1);
    if (scEl) scEl.textContent = fmt(S.G.score);
    if (qEl) qEl.textContent = b.q;
    if (rev) rev.hidden = true;
    if (hint) hint.textContent = '';

    if (inp) {
      inp.value = '';
      inp.placeholder = 'TYPE YOUR ANSWER';
      inp.disabled = false;
    }
    if (goBtn) goBtn.disabled = false;

    S.G.locked = false;
    S.G.hinted = false;
    S.G.t = ROUND_SECONDS;
    S.G.deadline = performance.now() + ROUND_SECONDS * 1000;

    updateTimerUI(ROUND_SECONDS);
    S.G.tm = setInterval(tick, TICK_MS);

    if (inp) inp.focus();
  }

  /* ---------- Scoring & Reveal helpers ---------- */

  function evaluateAnswer(bank, rawText, timedOut) {
    var matched = rawText && typeof match === 'function' ? match(bank, rawText) : null;
    var share = 0;
    var tr = null;
    var pts = 0;
    var explanation = '';

    if (matched && bank && bank.total > 0) {
      share = matched.w / bank.total;
      tr = typeof tier === 'function' ? tier(share) : { label: 'SCORED', pts: 10 };
      pts = tr.pts;
      var estCount = Math.max(1, Math.round(share * PLAYERS));
      var pctStr = (share * 100).toFixed(share < 0.01 ? 2 : 1);

      explanation =
        '"' +
        String(matched.name).toUpperCase() +
        '" was given by ' +
        fmt(estCount) +
        ' of ' +
        fmt(PLAYERS) +
        ' players (' +
        pctStr +
        '%).';
    } else if (timedOut && !rawText) {
      explanation = 'Time is up. No answer locked in.';
    } else {
      explanation = '"' + String(rawText).toUpperCase() + '" is not on the board. Zero points.';
    }

    return {
      matched: matched,
      pts: pts,
      tierInfo: tr,
      share: share,
      explanation: explanation,
      answerLabel: matched ? matched.name : rawText || '(none)',
      tierLabel: tr ? tr.label : 'NO SCORE',
    };
  }

  function renderReveal(outcome, isLastQuestion) {
    var tg = $('#rTier');
    var ptsEl = $('#rPts');
    var txtEl = $('#rTxt');
    var meterEl = $('#rMeter');
    var nextBtn = $('#pNext');
    var scEl = $('#pSc');
    var revEl = $('#pRev');

    if (scEl) scEl.textContent = fmt(S.G.score);

    if (tg) {
      tg.textContent = outcome.tierLabel;
      tg.className = 'tier t' + outcome.pts;
    }
    if (ptsEl) ptsEl.textContent = '+' + outcome.pts + ' PTS';
    if (txtEl) txtEl.textContent = outcome.explanation;
    if (meterEl) {
      meterEl.style.width = outcome.matched ? Math.min(100, outcome.share * 500) + '%' : '0%';
    }
    if (nextBtn) {
      nextBtn.textContent = isLastQuestion ? 'SEE RESULTS' : 'NEXT';
    }
    if (revEl) revEl.hidden = false;
  }

  /* ---------- Submit an answer ---------- */

  function submit(timeout) {
    var timedOut = Boolean(timeout);
    if (!S.G || S.G.locked) return;

    var b = getQuestionBank(S.G);
    var inp = $('#pIn');
    var goBtn = $('#pGo');
    var hintEl = $('#pHint');
    var txt = inp ? inp.value.trim() : '';

    if (!b) return;

    if (!timedOut) {
      if (!txt) return;

      var normalizedInput = norm(txt);
      var provisionalMatch = typeof match === 'function' ? match(b, txt) : null;
      var normalizedCanonical = provisionalMatch ? norm(provisionalMatch.name) : '';

      if (
        S.G.used[normalizedInput] ||
        (normalizedCanonical && S.G.used[normalizedCanonical])
      ) {
        if (inp) {
          inp.value = '';
          inp.placeholder = 'ALREADY USED. TRY ANOTHER';
        }
        if (typeof beep === 'function') beep(140, 0.2, 'sawtooth');
        return;
      }

      if (!provisionalMatch && !S.G.hinted && typeof suggest === 'function') {
        var sg = suggest(b, txt);
        if (sg) {
          S.G.hinted = true;
          if (inp) inp.value = sg.name;
          if (hintEl) {
            hintEl.textContent =
              'Did you mean ' + sg.name + '? Press LOCK IT IN to confirm, or change it.';
          }
          if (typeof beep === 'function') beep(440, 0.08);
          return;
        }
      }
    }

    if (hintEl) hintEl.textContent = '';
    S.G.locked = true;
    clearRoundTimer();
    if (inp) inp.disabled = true;
    if (goBtn) goBtn.disabled = true;

    var outcome = evaluateAnswer(b, txt, timedOut);

    if (txt) S.G.used[norm(txt)] = 1;
    if (outcome.matched) S.G.used[norm(outcome.matched.name)] = 1;

    S.G.score += outcome.pts;
    S.G.res.push({
      q: b.q,
      ans: outcome.answerLabel,
      pts: outcome.pts,
      label: outcome.tierLabel,
    });

    var isLastQuestion = S.G.i >= QUESTION_COUNT - 1;
    renderReveal(outcome, isLastQuestion);

    if (typeof jingle === 'function') jingle(outcome.pts);

    var nextBtn = $('#pNext');
    if (nextBtn) nextBtn.focus();
  }

  /* ---------- Rank and title ---------- */

  function rankOf(score) {
    var higher = 0;
    var entries = typeof board === 'function' ? board('daily') : [];
    for (var i = 0; i < entries.length; i++) {
      if (!entries[i].me && entries[i].score > score) {
        higher += 1;
      }
    }
    return higher + 1;
  }

  function titleOf(s) {
    if (s >= 1000) return 'RAREBYTE LEGEND';
    if (s >= 600) return 'RAREBYTE EXPLORER';
    if (s >= 300) return 'RAREBYTE SCOUT';
    return 'ROOKIE BYTE';
  }

  function nextStreak(player, today) {
    var current = Math.max(0, Number(player.streak) || 0);
    if (player.lastDay === today) return Math.max(1, current);
    if (player.lastDay === today - 1) return current + 1;
    return 1;
  }

  function recordDailyProgress(player, summary) {
    var p = player;
    p.games = (Number(p.games) || 0) + 1;
    p.total = (Number(p.total) || 0) + summary.score;
    p.streak = nextStreak(p, TODAY);
    p.lastDay = TODAY;
    p.longest = Math.max(Number(p.longest) || 0, p.streak);
    p.best = Math.max(Number(p.best) || 0, summary.score);

    var rareCount = summary.res.filter(function (x) {
      return x.pts >= 100;
    }).length;
    p.rare = (Number(p.rare) || 0) + rareCount;

    if (summary.rank <= 10) p.legend = 1;

    p.today = {
      day: TODAY,
      score: summary.score,
      correct: summary.correct,
      rarest: summary.rarest,
      res: summary.res,
      rank: summary.rank,
    };

    if (typeof save === 'function') save(p);
  }

  /* ---------- Finish the challenge ---------- */

  function finish() {
    if (!S.G) return;

    var g = S.G;
    clearRoundTimer();

    var results = Array.isArray(g.res) ? g.res : [];
    var correct = results.filter(function (r) {
      return r.pts > 0;
    }).length;
    var rarest = results.reduce(function (maxPts, r) {
      return r.pts > maxPts ? r.pts : maxPts;
    }, 0);

    var previousBest = S.P ? Number(S.P.best) || 0 : 0;
    var summary = {
      day: g.day,
      score: g.score,
      correct: correct,
      rarest: rarest,
      res: results,
      practice: g.practice,
      rank: rankOf(g.score),
      newBest: !g.practice && g.score > previousBest,
    };

    if (!g.practice && S.P) {
      recordDailyProgress(S.P, summary);
    }

    S.G = null;
    S.LAST = summary;
    location.hash = '#results';
  }

  Object.assign(RB, {
    startGame: startGame,
    showQ: showQ,
    submit: submit,
    rankOf: rankOf,
    titleOf: titleOf,
    finish: finish,
  });
})((window.RB = window.RB || {}));
