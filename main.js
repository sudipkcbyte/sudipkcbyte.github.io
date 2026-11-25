/* Router, events and the countdown clock */
(function (RB) {
  'use strict';

  var QUESTION_TOTAL = 7;
  var VIEWS = ['home', 'play', 'results', 'leaderboard', 'archives', 'profile', 'how', 'login'];
  var RENDERERS = {
    home: 'renderHome',
    results: 'renderResults',
    leaderboard: 'renderLB',
    archives: 'renderArchives',
    profile: 'renderProfile',
  };

  var S = RB.state || (RB.state = {});
  if (typeof S.soundOn !== 'boolean') S.soundOn = true;
  if (!S.lbTab) S.lbTab = 'daily';
  if (S.pending === undefined) S.pending = null;

  var TODAY = RB.TODAY;

  /* ---------- Safe helpers ---------- */

  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /** Call RB[name](...args); log instead of crashing if missing or failing. */
  function call(name) {
    var fn = RB[name];
    if (typeof fn !== 'function') {
      console.error('[RAREBYTE] missing RB.' + name + ' (is its script file loading?)');
      return undefined;
    }
    try {
      return fn.apply(null, Array.prototype.slice.call(arguments, 1));
    } catch (err) {
      console.error('[RAREBYTE] RB.' + name + ' failed:', err);
      return undefined;
    }
  }

  function pad2(n) { return String(Math.max(0, Math.floor(n))).padStart(2, '0'); }

  /* ---------- Game / view state ---------- */

  function stopActiveGame() {
    if (!S.G) return;
    if (S.G.tm) { clearInterval(S.G.tm); S.G.tm = null; }
    S.G = null;
  }

  function resolveViewName() {
    var raw = (window.location.hash || '#home').replace(/^#/, '').trim();
    return VIEWS.indexOf(raw) >= 0 ? raw : 'home';
  }

  function updateNavState(activeView) {
    qa('.view').forEach(function (sec) { sec.hidden = sec.id !== 'v-' + activeView; });
    qa('nav a').forEach(function (link) {
      var current = link.getAttribute('data-v') === activeView;
      link.classList.toggle('on', current);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function route() {
    var view = resolveViewName();

    if (view !== 'play' && S.G) stopActiveGame();

    if (view === 'play' && !S.G) {
      if (S.pending !== null && S.pending !== undefined) {
        var archiveDay = parseInt(S.pending, 10);
        S.pending = null;
        if (Number.isFinite(archiveDay)) call('startGame', archiveDay, true);
        else call('startGame', TODAY, false);
      } else if (S.P && S.P.today && S.P.today.day === TODAY) {
        window.location.hash = '#results';
        return;
      } else {
        call('startGame', TODAY, false);
      }
    }

    // Show the view FIRST so the page is never blank, then render into it.
    updateNavState(view);
    if (RENDERERS[view]) call(RENDERERS[view]);

    window.scrollTo(0, 0);

    if (view === 'play') {
      var inp = q('#pIn');
      if (inp && !inp.disabled) inp.focus();
    } else {
      var mainEl = q('#main-content');
      if (mainEl) mainEl.focus({ preventScroll: true });
    }

    call('syncBgmState');
  }

  /* ---------- Buttons ---------- */

  function setSoundButtonState() {
    var btn = q('#snd');
    if (!btn) return;
    btn.textContent = S.soundOn ? 'SOUND ON' : 'SOUND OFF';
    btn.setAttribute('aria-pressed', String(Boolean(S.soundOn)));
  }

  function setLoginButtonState() {
    var btn = q('#loginBtn');
    if (!btn || !S.P) return;
    btn.textContent = S.P.demo ? 'LOGIN' : S.P.name;
  }

  /* ---------- Countdown ---------- */

  function clock() {
    // A new day began while the tab was open: reload (never mid-game).
    if (typeof RB.today === 'function' && RB.today() !== TODAY && !S.G) {
      window.location.reload();
      return;
    }
    var cd = q('#cd');
    if (!cd) return;
    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var total = Math.max(0, Math.floor((midnight - now) / 1000));
    cd.textContent =
      pad2(total / 3600) + ':' + pad2((total % 3600) / 60) + ':' + pad2(total % 60);
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    var playForm = q('#pForm');
    if (playForm) {
      playForm.addEventListener('submit', function (e) {
        e.preventDefault();
        call('submit', false);
      });
    }

    var nextBtn = q('#pNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!S.G) return;
        S.G.i += 1;
        if (S.G.i >= QUESTION_TOTAL) call('finish');
        else call('showQ');
      });
    }

    var shareBtn = q('#shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        call('copyShare');
        call('beep', 740, 0.07);
      });
    }

    var arcList = q('#arcList');
    if (arcList) {
      arcList.addEventListener('click', function (e) {
        var trigger = e.target && e.target.closest ? e.target.closest('[data-d]') : null;
        if (!trigger) return;
        var dayVal = parseInt(trigger.getAttribute('data-d'), 10);
        if (!Number.isFinite(dayVal)) return;
        S.pending = dayVal;
        if (window.location.hash === '#play') route();
        else window.location.hash = '#play';
      });
    }

    qa('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var next = tab.getAttribute('data-b');
        if (!next) return;
        S.lbTab = next;
        call('renderLB');
        call('beep', 520, 0.06);
      });
    });

    var sndBtn = q('#snd');
    if (sndBtn) {
      sndBtn.addEventListener('click', function () {
        S.soundOn = !S.soundOn;
        setSoundButtonState();
        call('syncBgmState');
        if (S.soundOn) call('beep', 660, 0.08);
      });
    }

    var loginForm = q('#lgForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameInput = q('#lgName');
        var clean = (nameInput ? nameInput.value : '')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 16);

        if (!clean) { if (nameInput) nameInput.focus(); return; }

        if (S.P && !S.P.demo && S.P.games > 0 &&
            !window.confirm('Replace your saved profile? Your progress will be reset.')) {
          return;
        }

        S.P = {
          name: clean, demo: 0, total: 0, games: 0, streak: 0, longest: 0,
          best: 0, rare: 0, legend: 0, today: null,
          lastDay: typeof TODAY === 'number' ? TODAY - 1 : 0,
        };

        call('save', S.P);
        setLoginButtonState();
        window.location.hash = '#profile';
      });
    }

    window.addEventListener('hashchange', route);
  }

  /* ---------- Boot ---------- */

  try { bindEvents(); } catch (err) { console.error('[RAREBYTE] bindEvents failed:', err); }
  setSoundButtonState();
  setLoginButtonState();
  clock();
  setInterval(clock, 1000);
  route();
})((window.RB = window.RB || {}));
