/* Tiny helpers and the shared state object */
(function (RB) {
  'use strict';

  var HTML_ESCAPE_MAP = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });

  var HTML_ESCAPE_RE = /[&<>"']/g;

  RB.state = {
    P: null,
    G: null,
    LAST: null,
    pending: null,
    lbTab: 'daily',
    soundOn: true,
  };

  function $(selector, scope) { if (!selector) return null; var root = scope && typeof scope.querySelector === 'function' ? scope : document; return root.querySelector(selector); }    function $$(selector, scope) {
    if (!selector) return [];
    var root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function esc(value) {
    if (value == null) return '';
    return String(value).replace(HTML_ESCAPE_RE, function (ch) {
      return HTML_ESCAPE_MAP[ch] || ch;
    });
  }

  function rng(seed) {
    var numericSeed = Number(seed);
    var state = (Number.isFinite(numericSeed) ? Math.floor(numericSeed) : 0) >>> 0;

    return function nextRandom() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngInt(randFn, min, max) {
    var lo = Math.ceil(Number(min));
    var hi = Math.floor(Number(max));
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return 0;
    var r = typeof randFn === 'function' ? randFn() : Math.random();
    return lo + Math.floor(r * (hi - lo + 1));
  }

  function clamp(value, min, max) {
    var num = Number(value);
    var lo = Number(min);
    var hi = Number(max);
    if (!Number.isFinite(num)) return Number.isFinite(lo) ? lo : 0;
    if (Number.isFinite(lo) && num < lo) return lo;
    if (Number.isFinite(hi) && num > hi) return hi;
    return num;
  }

  function fmt(num, locale) {
    var parsed = Number(num);
    if (!Number.isFinite(parsed)) return '0';
    return Math.round(parsed).toLocaleString(locale || 'en-US');
  }

  Object.assign(RB, {
    $:$,
    $$:$$
,
    esc: esc,
    rng: rng,
    rngInt: rngInt,
    clamp: clamp,
    fmt: fmt,
  });
})((window.RB = window.RB || {}));
