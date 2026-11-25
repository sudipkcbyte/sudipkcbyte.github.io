/* Router, events and the countdown clock */
(function (RB) {
  'use strict';

  var QUESTION_TOTAL = 7;
  var VIEWS = Object.freeze([
    'home',
    'play',
    'results',
    'leaderboard',
    'archives',
    'profile',
    'how',
    'login',
  ]);

  var S = RB.state || (RB.state = { soundOn: true, lbTab: 'daily', pending: null });
  if (typeof S.soundOn !== 'boolean') S.soundOn = true;
  if (!S.lbTab) S.lbTab = 'daily';
  if (S.pending === undefined) S.pending = null;

  var {
    $,
    $$,
    TODAY,
    save,
    beep,
    syncBgmState,
    startGame,
    showQ,
    submit,
    finish,
    renderResults,
    copyShare,
    renderHome,
    renderLB,
    renderArchives,
    renderProfile,
  } = RB;

  function stopActiveGame() {
    if (!S.G) return;
    if (S.G.tm) {
      clearInterval(S.G.tm);
      S.G.tm = null;
    }
    S.G = null;
  }

  function resolveViewName() {
    var raw = (window.location.hash || '#home').replace(/^#/, '').trim();
    return VIEWS.indexOf(raw) >= 0 ? raw : 'home';
  }

  function updateNavState(activeView) {
    $$('.view').forEach(function (sec) {
      sec.hidden = sec.id !== 'v-' + activeView;
    });

    $$('nav a').forEach(function (link) {
      var isCurrent = link.getAttribute('data-v') === activeView;
      link.classList.toggle('on', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function route() {
    var view = resolveViewName();

    if (view !== 'play' && S.G) {
      stopActiveGame();
    }

    if (view === 'play' && !S.G) {
      if (S.pending !== null && S.pending !== undefined) {
        var archiveDay = parseInt(S.pending, 10);
        S.pending = null;
        if (Number.isFinite(archiveDay)) {
          startGame(archiveDay, true);
        } else {
          startGame(TODAY, false);
        }
      } else if (S.P && S.P.today && S.P.today.day === TODAY) {
        window.location.hash = '#results';
        return;
      } else {
        startGame(TODAY, false);
      }
    }

    updateNavState(view);

    if (view === 'home') renderHome();
    else if (view === 'results') renderResults();
    else if (view === 'leaderboard') renderLB();
    else if (view === 'archives') renderArchives();
    else if (view === 'profile') renderProfile();

    window.scrollTo(0, 0);

    if (view === 'play') {
      var inputEl = $('#pIn');
      if (inputEl && !inputEl.disabled) inputEl.focus();
    }

    if (typeof syncBgmState === 'function') {
      syncBgmState();
    }
  }

  function setSoundButtonState() {
    var sndBtn = $('#snd');
    if (!sndBtn) return;
    sndBtn.textContent = S.soundOn ? 'SOUND ON' : 'SOUND OFF';
    sndBtn.setAttribute('aria-pressed', String(Boolean(S.soundOn)));
  }

  function setLoginButtonState() {
    var loginBtn = $('#loginBtn');
    if (!loginBtn || !S.P) return;
    loginBtn.textContent = S.P.demo ? 'LOGIN' : S.P.name;
  }

  function pad2(num) {
    return String(Math.max(0, Math.floor(num))).padStart(2, '0');
  }

  function clock() {
    var cdEl = $('#cd');
    if (!cdEl) return;

    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var totalSec = Math.max(0, Math.floor((midnight - now) / 1000));

    var hrs = Math.floor(totalSec / 3600);
    var mins = Math.floor((totalSec % 3600) / 60);
    var secs = totalSec % 60;

    cdEl.textContent = pad2(hrs) + ':' + pad2(mins) + ':' + pad2(secs);
  }

  function bindEvents() {
    var playForm = $('#pForm');
    if (playForm) {
      playForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submit(false);
      });
    }

    var nextBtn = $('#pNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!S.G) return;
        S.G.i += 1;
        if (S.G.i >= QUESTION_TOTAL) {
          finish();
        } else {
          showQ();
        }
      });
    }

    var shareBtn = $('#shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        copyShare();
        if (typeof beep === 'function') beep(740, 0.07);
      });
    }

    var arcList = $('#arcList');
    if (arcList) {
      arcList.addEventListener('click', function (e) {
        var trigger = e.target && e.target.closest ? e.target.closest('[data-d]') : null;
        if (!trigger) return;
        var dayVal = parseInt(trigger.getAttribute('data-d'), 10);
        if (!Number.isFinite(dayVal)) return;

        S.pending = dayVal;
        if (window.location.hash === '#play') {
          route();
        } else {
          window.location.hash = '#play';
        }
      });
    }

    $$('.tab').forEach(function (tabEl) {
      tabEl.addEventListener('click', function () {
        var nextTab = tabEl.getAttribute('data-b');
        if (!nextTab) return;
        S.lbTab = nextTab;
        renderLB();
        if (typeof beep === 'function') beep(520, 0.06);
      });
    });

    var sndBtn = $('#snd');
    if (sndBtn) {
      sndBtn.addEventListener('click', function () {
        S.soundOn = !S.soundOn;
        setSoundButtonState();
        if (typeof syncBgmState === 'function') {
          syncBgmState();
        }
        if (S.soundOn && typeof beep === 'function') {
          beep(660, 0.08);
        }
      });
    }

    var loginForm = $('#lgForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nameInput = $('#lgName');
        var rawName = nameInput ? nameInput.value : '';
        var cleanName = rawName
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 16);

        if (!cleanName) {
          if (nameInput) nameInput.focus();
          return;
        }

        S.P = {
          name: cleanName,
          demo: 0,
          total: 0,
          games: 0,
          streak: 0,
          longest: 0,
          best: 0,
          rare: 0,
          legend: 0,
          today: null,
          lastDay: typeof TODAY === 'number' ? TODAY - 1 : 0,
        };

        if (typeof save === 'function') save(S.P);
        setLoginButtonState();
        window.location.hash = '#profile';
      });
    }

    window.addEventListener('hashchange', route);
  }

  bindEvents();
  setSoundButtonState();
  setLoginButtonState();
  clock();
  setInterval(clock, 1000);
  route();
})((window.RB = window.RB || {}));
