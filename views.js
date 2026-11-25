/* Rendering of each screen */
(function (RB) {
  'use strict';

  var S = RB.state;
  var {
    $,
    $$,
    esc,
    rng,
    fmt,
    PLAYERS,
    TODAY,
    dateOf,
    avatar,
    hash,
    board,
    lbRows,
    titleOf,
  } = RB;

  var SQUARE_MAP = Object.freeze({
    0: '⬛',
    10: '⬜',
    25: '🟦',
    50: '🟪',
    100: '🟨',
    200: '🟥',
  });

  function setText(selector, value) {
    var el = $(selector);
    if (el) el.textContent = value;
  }

  function setHtml(selector, html) {
    var el = $(selector);
    if (el) el.innerHTML = html;
  }

  function getPlayer() {
    return S && S.P ? S.P : {
      name: 'PLAYER_ONE',
      demo: true,
      best: 0,
      total: 0,
      games: 0,
      streak: 0,
      longest: 0,
      rare: 0,
      legend: 0,
      today: null,
    };
  }

  /* ---------- Results Screen ---------- */

  function resolveResultsData() {
    var player = getPlayer();
    var r = S.LAST;

    if (!r && player.today && player.today.day === TODAY) {
      r = {
        day: TODAY,
        score: player.today.score,
        correct: player.today.correct,
        rarest: player.today.rarest,
        res: player.today.res || [],
        rank: player.today.rank,
        practice: false,
        newBest: false,
      };
    }

    if (!r) return null;
    S.LAST = r;
    return r;
  }

  function renderResults() {
    var r = resolveResultsData();
    if (!r) {
      location.hash = '#home';
      return;
    }

    var player = getPlayer();
    var bestOverall = Math.max(Number(player.best) || 0, r.practice ? 0 : Number(r.score) || 0);
    var totalQuestions = Array.isArray(r.res) && r.res.length ? r.res.length : 7;

    setText('#sTot', fmt(r.score) + ' PTS');
    setText(
      '#sBest',
      r.practice
        ? 'PRACTICE RUN. NOT RANKED.'
        : r.newBest
          ? 'NEW PERSONAL BEST!'
          : '',
    );
    setText('#sCor', r.correct + '/' + totalQuestions);
    setText('#sRank', r.rank > 200 ? '#200+' : '#' + r.rank);
    setText('#sRare', (Number(r.rarest) || 0) + ' PTS');
    setText('#sPB', fmt(bestOverall) + ' PTS');
    setText('#sStr', (Number(player.streak) || 0) + ' DAYS');
    setText('#sTitle', titleOf(r.score));

    var rowsHtml =
      '<tr><th>Q</th><th>YOUR ANSWER</th><th>TIER</th><th>PTS</th></tr>' +
      (Array.isArray(r.res) ? r.res : [])
        .map(function (item, idx) {
          return (
            '<tr>' +
            '<td class="n">' + (idx + 1) + '</td>' +
            '<td>' + esc(item.ans) + '</td>' +
            '<td>' + esc(item.label) + '</td>' +
            '<td class="y">' + fmt(item.pts) + '</td>' +
            '</tr>'
          );
        })
        .join('');

    setHtml('#sTable', rowsHtml);
    setText('#shareMsg', '');
  }

  function shareText() {
    var r = S.LAST || resolveResultsData();
    if (!r) return 'RAREBYTE — Think different. Score higher.';

    var grid = (Array.isArray(r.res) ? r.res : [])
      .map(function (x) {
        return SQUARE_MAP[x.pts] || '⬛';
      })
      .join('');

    return [
      'RAREBYTE #' + r.day,
      fmt(r.score) + ' pts · ' + r.correct + '/7 correct · rarest ' + r.rarest,
      grid,
      'Think different. Score higher.',
    ].join('\n');
  }

  function copyShare() {
    var text = shareText();
    var msgEl = $('#shareMsg');

    function showFallback() {
      if (!msgEl) return;
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.readOnly = true;
      ta.style.cssText =
        'width:100%;height:120px;background:#05030f;color:#27e8ff;font:20px VT323,monospace;border:2px solid #9d4dff;padding:8px';
      msgEl.textContent = 'Select and copy:';
      msgEl.appendChild(document.createElement('br'));
      msgEl.appendChild(ta);
      ta.focus();
      ta.select();
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(
        function () {
          if (msgEl) msgEl.textContent = 'Copied to clipboard.';
        },
        showFallback,
      );
    } else {
      showFallback();
    }
  }

  /* ---------- Home Screen ---------- */

  function renderDailyPulse() {
    var rand = rng(TODAY * 97 + 13);
    var basePlayers = Math.max(1000, Number(PLAYERS) || 18420);
    var activePlayers = Math.round(basePlayers * (0.92 + rand() * 0.18));
    var totalAnswers = activePlayers * 4 + Math.round(rand() * 1400);

    setText('#hPlayers', fmt(activePlayers));
    setText('#hAns', fmt(totalAnswers));
    setText('#hNum', '#' + TODAY);
  }

  function renderHome() {
    var player = getPlayer();
    var done = Boolean(player.today && player.today.day === TODAY);
    var playBtn = $('#playBtn');

    if (playBtn) {
      playBtn.textContent = done ? "VIEW TODAY'S RESULTS" : "PLAY TODAY'S CHALLENGE";
      playBtn.setAttribute('href', done ? '#results' : '#play');
    }

    renderDailyPulse();

    var streak = Math.max(0, Number(player.streak) || 0);
    var filledPips = Math.min(streak, 7);
    var pipsHtml = '';
    for (var i = 0; i < 7; i++) {
      pipsHtml += '<div class="pip' + (i < filledPips ? ' f' : '') + '"></div>';
    }
    setHtml('#hPips', pipsHtml);

    var dayWord = streak === 1 ? ' DAY' : ' DAYS';
    var statusText = done ? 'played today' : 'play today to extend it';
    setHtml(
      '#hStreak',
      '<span class="y" style="font:12px var(--px)">' +
        streak +
        dayWord +
        '</span> ' +
        '<span class="dim">' +
        esc(statusText) +
        '</span>',
    );

    setHtml('#hLb', lbRows(board('daily'), 5));
  }

  /* ---------- Leaderboard Screen ---------- */

  function renderLB() {
    var activeTab = S.lbTab || 'daily';
    setHtml('#lbT', lbRows(board(activeTab), 10));

    $$('.tab').forEach(function (tabEl) {
      var isCurrent = tabEl.getAttribute('data-b') === activeTab;
      tabEl.classList.toggle('on', isCurrent);
      tabEl.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });
  }

  /* ---------- Archives Screen ---------- */

  function renderArchives() {
    var cards = [];
    for (var d = TODAY - 1; d >= TODAY - 8; d--) {
      var top = Math.round(1150 + rng(d * 17)() * 220);
      cards.push(
        '<div class="panel">' +
          '<h3>#' + d + ' · ' + esc(dateOf(d)) + '</h3>' +
          '<p class="dim">7 questions. Top score that day: <span class="y">' +
          fmt(top) +
          '</span></p>' +
          '<button class="btn alt" data-d="' + d + '" type="button">REPLAY</button>' +
          '</div>',
      );
    }
    setHtml('#arcList', cards.join(''));
  }

  /* ---------- Profile Screen ---------- */

  function renderProfile() {
    var player = getPlayer();
    var games = Math.max(0, Number(player.games) || 0);
    var total = Math.max(0, Number(player.total) || 0);
    var best = Math.max(0, Number(player.best) || 0);
    var streak = Math.max(0, Number(player.streak) || 0);
    var longest = Math.max(0, Number(player.longest) || 0);
    var rare = Math.max(0, Number(player.rare) || 0);
    var avg = games ? Math.round(total / games) : 0;

    var avEl = $('#prAv');
    if (avEl) {
      avEl.src = avatar(hash(player.name));
      avEl.alt = (player.name || 'Player') + ' pixel avatar';
    }

    setText('#prName', player.name || 'PLAYER_ONE');
    setText(
      '#prNote',
      player.demo
        ? 'Sample profile for this demo. Register to start your own.'
        : 'Saved in this browser · Title: ' + titleOf(best),
    );

    var achievements = [
      ['FIRST BYTE', 'Complete your first game', games >= 1],
      ['RARE HUNTER', 'Submit 10 rare answers (' + Math.min(rare, 10) + '/10)', rare >= 10],
      ['CONSISTENT', 'Play 7 days in a row', longest >= 7],
      ['BRAIN MASTER', 'Score 1,000 points in one game', best >= 1000],
      ['LEGENDARY', 'Reach the top 10', Boolean(player.legend)],
    ];

    var unlockedCount = achievements.filter(function (a) {
      return Boolean(a[2]);
    }).length;

    var stats = [
      ['TOTAL POINTS', fmt(total)],
      ['GAMES PLAYED', fmt(games)],
      ['CURRENT STREAK', streak + ' DAYS'],
      ['LONGEST STREAK', longest + ' DAYS'],
      ['AVERAGE SCORE', fmt(avg)],
      ['RARE ANSWERS', fmt(rare)],
      ['ACHIEVEMENTS', unlockedCount + '/' + achievements.length],
    ];

    setHtml(
      '#prStats',
      stats
        .map(function (s) {
          return '<div class="stat"><span>' + esc(s[0]) + '</span><b>' + esc(s[1]) + '</b></div>';
        })
        .join(''),
    );

    setHtml(
      '#prAch',
      achievements
        .map(function (a) {
          var unlocked = Boolean(a[2]);
          return (
            '<div class="ach' +
            (unlocked ? '' : ' off') +
            '">' +
            '<i aria-hidden="true"></i>' +
            '<div>' +
            '<h3 style="margin:0 0 4px">' + esc(a[0]) + '</h3>' +
            '<span class="dim">' + esc(a[1]) + '</span>' +
            '</div>' +
            '</div>'
          );
        })
        .join(''),
    );
  }

  Object.assign(RB, {
    renderResults: renderResults,
    shareText: shareText,
    copyShare: copyShare,
    renderHome: renderHome,
    renderLB: renderLB,
    renderArchives: renderArchives,
    renderProfile: renderProfile,
  });
})((window.RB = window.RB || {}));
