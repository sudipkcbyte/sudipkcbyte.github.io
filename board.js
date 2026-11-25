/* ==========================================================================
   RAREBYTE — board.js
   Daily, weekly and all-time leaderboards (simulated rivals + your row).

   Public API (unchanged): RB.board(kind), RB.lbRows(list, limit)
   New:                    RB.myRank(kind), RB.clearBoardCache()

   Needs (load order): utils.js, data.js, art.js (avatar / trophy / TCOL).
   ========================================================================== */
(function (RB) {
  'use strict';

  const S = RB.state;
  const { esc, rng, fmt } = RB;

  /* ---------- Config ------------------------------------------------------ */

  const KIND_CONFIG = Object.freeze({
    daily:  { salt: 1, top: 1380,  decay: 0.992, size: 200 },
    weekly: { salt: 2, top: 7100,  decay: 0.992, size: 200 },
    all:    { salt: 3, top: 61000, decay: 0.985, size: 200 },
  });

  
const NAMES = Object.freeze([
  'Skirk', 'Aether', 'Lumine', 'Furina', 'Arlecchino',
  'Neuvillette', 'Childe', 'Scaramouche', 'Xiao', 'Kaeya',
  'Alhaitham', 'Kazuha', 'Ayato', 'Wanderer', 'Dainsleif',
  'Astra', 'Kairo', 'Lucien', 'Evelyn', 'Riven',
  'Soren', 'Akira', 'Luna', 'Rin', 'Kieran',
]);


  const DEFAULT_LIMIT = 10;
  const AVATAR_CACHE_MAX = 500;

  const rivalCache = new Map();
  const avatarCache = new Map();

  const getConfig = (kind) => KIND_CONFIG[kind] || KIND_CONFIG.daily;
  const currentDay = () => Number(RB.TODAY) || 1;
  const cloneEntries = (list) => list.map((entry) => Object.assign({}, entry));

  /* ---------- Simulated rivals -------------------------------------------- */

  function uniqueName(baseName, rand, used) {
    if (!used.has(baseName)) {
      used.add(baseName);
      return baseName;
    }

    let candidate = '';
    let attempts = 0;
    do {
      candidate = baseName + '_' + (10 + Math.floor(rand() * 89));
      attempts += 1;
    } while (used.has(candidate) && attempts < 12);

    if (used.has(candidate)) candidate = baseName + '_' + (used.size + 1);
    used.add(candidate);
    return candidate;
  }

  /** Deterministic rivals for a day + board kind (cached, returns copies). */
  function generateRivals(kind, day) {
    const cfg = getConfig(kind);
    const cacheKey = day + ':' + kind;
    if (rivalCache.has(cacheKey)) return cloneEntries(rivalCache.get(cacheKey));

    const seed = day * 131 + cfg.salt;
    const rand = rng(seed);
    const used = new Set();
    const rivals = [];

    for (let i = 0; i < cfg.size; i++) {
      const raw = NAMES[(i * 7 + seed) % NAMES.length];
      const name = uniqueName(raw, rand, used);
      const jitter = 0.97 + rand() * 0.06;
      const score = Math.max(10, Math.round(cfg.top * Math.pow(cfg.decay, i) * jitter));
      rivals.push({ name: name, score: score, me: 0 });
    }

    rivals.sort((a, b) => b.score - a.score);
    rivalCache.set(cacheKey, rivals);
    return cloneEntries(rivals);
  }

  /* ---------- Player score per board -------------------------------------- */

  function getPlayerScore(kind, player, day) {
    if (!player) return null;

    const hasToday = Boolean(player.today) && player.today.day === day;
    const todayScore = hasToday ? Number(player.today.score) || 0 : 0;
    const totalScore = Math.max(0, Number(player.total) || 0);

    if (kind === 'daily') return hasToday && todayScore > 0 ? todayScore : null;

    if (kind === 'weekly') {
      const carryOver = Math.min(Math.round(totalScore * 0.25), 6200);
      const weekly = todayScore + carryOver;
      return weekly > 0 ? weekly : null;
    }

    return totalScore > 0 ? totalScore : null;
  }

  function rankEntries(entries) {
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.me !== b.me) return b.me - a.me;
      return a.name.localeCompare(b.name);
    });
    return entries.map((entry, idx) => Object.assign({}, entry, { rank: idx + 1 }));
  }

  /** Full ranked board for 'daily' | 'weekly' | 'all'. */
  function board(kind) {
    const normalizedKind = KIND_CONFIG[kind] ? kind : 'daily';
    const day = currentDay();
    const player = S && S.P ? S.P : null;
    const entries = generateRivals(normalizedKind, day);
    const playerScore = getPlayerScore(normalizedKind, player, day);

    if (playerScore !== null) {
      const displayName = (player && player.name && String(player.name).trim()) || 'PLAYER_1';
      entries.push({ name: displayName, score: playerScore, me: 1 });
    }

    return rankEntries(entries);
  }

  /** The player's place on a board: { rank, score, of } or null if unranked. */
  function myRank(kind) {
    const list = board(kind);
    const me = list.find((entry) => entry.me);
    return me ? { rank: me.rank, score: me.score, of: list.length } : null;
  }

  function clearBoardCache() {
    rivalCache.clear();
    avatarCache.clear();
  }

  /* ---------- Rendering --------------------------------------------------- */

  // art.js helpers are looked up at call time so a load-order slip can't
  // crash the whole script at startup.
  function avatarSrc(name) {
    if (avatarCache.has(name)) return avatarCache.get(name);

    let src = '';
    if (typeof RB.avatar === 'function') {
      try {
        src = String(RB.avatar(typeof RB.hash === 'function' ? RB.hash(name) : 0) || '');
      } catch (err) {
        src = '';
      }
    }

    if (avatarCache.size >= AVATAR_CACHE_MAX) avatarCache.clear();
    avatarCache.set(name, src);
    return src;
  }

  function badgeForRank(rank) {
    if (rank >= 1 && rank <= 3 && typeof RB.trophy === 'function' && Array.isArray(RB.TCOL)) {
      // Trophy is decorative; the sr-only text keeps the rank readable.
      return (
        '<span aria-hidden="true">' + RB.trophy(RB.TCOL[rank - 1]) + '</span>' +
        '<span class="sr-only">#' + rank + '</span>'
      );
    }
    return '#' + rank;
  }

  function renderRow(entry) {
    const rowAttrs = entry.me ? ' class="me" aria-current="true"' : '';
    const src = avatarSrc(entry.name);
    const img = src
      ? '<img class="av" alt="" width="32" height="32" loading="lazy" decoding="async" src="' + esc(src) + '">'
      : '';
    const you = entry.me ? '<span class="sr-only"> (you)</span>' : '';

    return (
      '<tr' + rowAttrs + '>' +
      '<td class="n">' + badgeForRank(entry.rank) + '</td>' +
      '<td><span class="who">' + img + esc(entry.name) + you + '</span></td>' +
      '<td>' + fmt(entry.score) + '</td>' +
      '</tr>'
    );
  }

  /**
   * Table markup (thead + tbody) for the top `limit` rows. If the player is
   * ranked below the cut-off, their row is appended after a "..." divider.
   */
  function lbRows(list, limit) {
    const header =
      '<thead><tr><th scope="col">#</th><th scope="col">PLAYER</th><th scope="col">SCORE</th></tr></thead>';
    const rows = Array.isArray(list) ? list : [];
    const cap = Number(limit) > 0 ? Math.floor(Number(limit)) : DEFAULT_LIMIT;

    if (!rows.length) {
      return header + '<tbody><tr><td colspan="3" class="dim">NO SCORES RECORDED</td></tr></tbody>';
    }

    let body = rows.slice(0, cap).map(renderRow).join('');

    const me = rows.find((entry) => Boolean(entry.me));
    if (me && me.rank > cap) {
      body +=
        '<tr class="sep" aria-hidden="true"><td class="n ta-center" colspan="3">...</td></tr>' +
        renderRow(me);
    }

    return header + '<tbody>' + body + '</tbody>';
  }

  /* ---------- Export ------------------------------------------------------ */

  Object.assign(RB, {
    board: board,
    lbRows: lbRows,
    myRank: myRank,
    clearBoardCache: clearBoardCache,
  });
})((window.RB = window.RB || {}));
