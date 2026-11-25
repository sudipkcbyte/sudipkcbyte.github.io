/* Player profile saved in localStorage */
(function (RB) {
  'use strict';

  var STORAGE_KEY = 'rarebyte';
  var S = RB.state || (RB.state = {});
  var TODAY = RB.TODAY;

  var DEFAULT_PROFILE = Object.freeze({
    name: 'NEPAL_NINJA',
    demo: 1,
    total: 5310,
    games: 12,
    streak: 3,
    longest: 9,
    best: 720,
    rare: 6,
    legend: 0,
    lastDay: null,
    today: null,
  });

  var memStore = null;

  function toNonNegInt(val, fallback) {
    var num = Number(val);
    if (!Number.isFinite(num) || num < 0) return fallback;
    return Math.floor(num);
  }

  function createDefaultProfile() {
    var base = Object.assign({}, DEFAULT_PROFILE);
    base.lastDay = typeof TODAY === 'number' ? TODAY - 1 : 0;
    base.today = null;
    return base;
  }

  function normalizeToday(rawToday) {
    if (!rawToday || typeof rawToday !== 'object') return null;
    return {
      day: toNonNegInt(rawToday.day, 0),
      score: toNonNegInt(rawToday.score, 0),
      correct: toNonNegInt(rawToday.correct, 0),
      rarest: toNonNegInt(rawToday.rarest, 0),
      rank: Math.max(1, toNonNegInt(rawToday.rank, 1)),
      res: Array.isArray(rawToday.res) ? rawToday.res : [],
    };
  }

  function normalizeProfile(raw) {
    var fallback = createDefaultProfile();
    if (!raw || typeof raw !== 'object') return fallback;

    var cleanName =
      typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim().slice(0, 16)
        : fallback.name;

    var lastDay =
      typeof raw.lastDay === 'number' && Number.isFinite(raw.lastDay)
        ? Math.floor(raw.lastDay)
        : fallback.lastDay;

    var streak = toNonNegInt(raw.streak, fallback.streak);
    var longest = Math.max(streak, toNonNegInt(raw.longest, fallback.longest));

    return {
      name: cleanName,
      demo: raw.demo ? 1 : 0,
      total: toNonNegInt(raw.total, fallback.total),
      games: toNonNegInt(raw.games, fallback.games),
      streak: streak,
      longest: longest,
      best: toNonNegInt(raw.best, fallback.best),
      rare: toNonNegInt(raw.rare, fallback.rare),
      legend: raw.legend ? 1 : 0,
      lastDay: lastDay,
      today: normalizeToday(raw.today),
    };
  }

  function canUseLocalStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      var probeKey = '__rb_probe__';
      window.localStorage.setItem(probeKey, '1');
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  var storageAvailable = canUseLocalStorage();

  function load() {
    if (storageAvailable) {
      try {
        var rawStr = window.localStorage.getItem(STORAGE_KEY);
        if (rawStr) {
          var parsed = JSON.parse(rawStr);
          var normalized = normalizeProfile(parsed);
          memStore = normalized;
          return normalized;
        }
      } catch (e) {}
    }
    return memStore ? normalizeProfile(memStore) : null;
  }

  function save(profile) {
    var normalized = normalizeProfile(profile);
    memStore = normalized;

    if (storageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  function resetProfile() {
    var fresh = createDefaultProfile();
    save(fresh);
    S.P = fresh;
    return fresh;
  }

  S.P = load() || createDefaultProfile();

  Object.assign(RB, {
    load: load,
    save: save,
    resetProfile: resetProfile,
  });
})((window.RB = window.RB || {}));
