/* Daily, weekly and all-time leaderboards */
(function (RB) {
  'use strict';

  var S = RB.state;
  var {
    esc,
    rng,
    fmt,
    TODAY,
    avatar,
    hash,
    trophy,
    TCOL,
  } = RB;

  var KIND_CONFIG = Object.freeze({
    daily:  { salt: 1, top: 1380, decay: 0.992, size: 200 },
    weekly: { salt: 2, top: 7100, decay: 0.992, size: 200 },
    all:    { salt: 3, top: 61000, decay: 0.985, size: 200 },
  });

  var RAW_NAMES =
    'NEO_BYTE,PIXEL_PAL,LASERCAT,KRYPTON,GLITCHY,TURBO_T,ZERO_COOL,SYNTHWAVE,' +
    'ARCADIA,BYTE_ME,NIGHT_OWL,COSMO,RETRO_RAY,MAXWELL,QUARK,DISCO_DOT,VOLT,' +
    'STARDUST,CRT_KID,LUNA_8,BOSS_FIGHT,ROMAN_8,TETRA,HYPERLOOP,NOVA_9';

  var NAMES = Object.freeze(RAW_NAMES.split(','));
  var cache = new Map();

  function getConfig(kind) {
    return KIND_CONFIG[kind] || KIND_CONFIG.daily;
  }

  function uniqueName(baseName, rand, used) {
    if (!used.has(baseName)) {
      used.add(baseName);
      return baseName;
    }
    var candidate = '';
    var attempts = 0;
    do {
      var suffix = 10 + Math.floor(rand() * 89);
      candidate = baseName + '_' + suffix;
      attempts += 1;
    } while (used.has(candidate) && attempts < 12);

    if (used.has(candidate)) {
      candidate = baseName + '_' + (used.size + 1);
    }
    used.add(candidate);
    return candidate;
  }

  function generateRivals(kind, day) {
    var cfg = getConfig(kind);
    var cacheKey = day + ':' + kind;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey).map(function (entry) {
        return Object.assign({}, entry);
      });
    }

    var seed = day * 131 + cfg.salt;
    var rand = rng(seed);
    var used = new Set();
    var rivals = [];

    for (var i = 0; i < cfg.size; i++) {
      var raw = NAMES[(i * 7 + seed) % NAMES.length];
      var name = uniqueName(raw, rand, used);
      var jitter = 0.97 + rand() * 0.06;
      var score = Math.max(10, Math.round(cfg.top * Math.pow(cfg.decay, i) * jitter));

      rivals.push({
        name: name,
        score: score,
        me: 0,
      });
    }

    rivals.sort(function (a, b) {
      return b.score - a.score;
    });

    cache.set(cacheKey, rivals);
    return rivals.map(function (entry) {
      return Object.assign({}, entry);
    });
  }

  function getPlayerScore(kind, player, day) {
    if (!player) return null;

    var hasToday = player.today && player.today.day === day;
    var todayScore = hasToday ? Number(player.today.score) || 0 : 0;
    var totalScore = Math.max(0, Number(player.total) || 0);

    if (kind === 'daily') {
      return hasToday && todayScore > 0 ? todayScore : null;
    }

    if (kind === 'weekly') {
      var carryOver = Math.min(Math.round(totalScore * 0.25), 6200);
      var weekly = todayScore + carryOver;
      return weekly > 0 ? weekly : null;
    }

    return totalScore > 0 ? totalScore : null;
  }

  function rankEntries(entries) {
    entries.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (a.me !== b.me) return b.me - a.me;
      return a.name.localeCompare(b.name);
    });

    return entries.map(function (entry, idx) {
      return Object.assign({}, entry, { rank: idx + 1 });
    });
  }

  /**
   * Build a ranked leaderboard for 'daily', 'weekly', or 'all'.
   */
  function board(kind) {
    var normalizedKind = KIND_CONFIG[kind] ? kind : 'daily';
    var player = S && S.P ? S.P : null;
    var entries = generateRivals(normalizedKind, TODAY);
    var playerScore = getPlayerScore(normalizedKind, player, TODAY);

    if (playerScore !== null) {
      var displayName = (player && player.name && String(player.name).trim()) || 'PLAYER_1';
      entries.push({
        name: displayName,
        score: playerScore,
        me: 1,
      });
    }

    return rankEntries(entries);
  }

  function badgeForRank(rank) {
    if (rank >= 1 && rank <= 3 && typeof trophy === 'function' && Array.isArray(TCOL)) {
      return trophy(TCOL[rank - 1]);
    }
    return '#' + rank;
  }

  function renderRow(entry) {
    var cls = entry.me ? ' class="me"' : '';
    var rankCell = '<td class="n">' + badgeForRank(entry.rank) + '</td>';
    var avatarSrc = avatar(hash(entry.name));
    var whoCell =
      '<td><span class="who">' +
      '<img class="av" alt="" loading="lazy" decoding="async" src="' + esc(avatarSrc) + '">' +
      esc(entry.name) +
      '</span></td>';
    var scoreCell = '<td>' + fmt(entry.score) + '</td>';

    return '<tr' + cls + '>' + rankCell + whoCell + scoreCell + '</tr>';
  }

  /**
   * Render leaderboard table rows (header + top `limit` entries + pinned player row if outside top `limit`).
   */
  function lbRows(list, limit) {
    var header = '<tr><th>#</th><th>PLAYER</th><th>SCORE</th></tr>';
    var rows = Array.isArray(list) ? list : [];
    var cap = typeof limit === 'number' && limit > 0 ? limit : 10;

    if (!rows.length) {
      return header + '<tr><td colspan="3" class="dim">NO SCORES RECORDED</td></tr>';
    }

    var me = rows.find(function (entry) {
      return Boolean(entry.me);
    });

    var html = header + rows.slice(0, cap).map(renderRow).join('');

    if (me && me.rank > cap) {
      html +=
        '<tr class="sep"><td class="n" colspan="3" style="text-align:center">...</td></tr>' +
        renderRow(me);
    }

    return html;
  }

  Object.assign(RB, {
    board: board,
    lbRows: lbRows,
  });
})((window.RB = window.RB || {}));
