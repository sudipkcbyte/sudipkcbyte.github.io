/* ==========================================================================
   RAREBYTE — utils.js
   Tiny helpers and the shared state object. Loaded FIRST, so every other
   script can rely on window.RB.

   Original API (unchanged):  RB.state, RB.$, RB.$$, RB.esc, RB.rng,
                              RB.rngInt, RB.clamp, RB.fmt
   New helpers:               RB.on, RB.el, RB.debounce, RB.throttle,
                              RB.hash, RB.pick, RB.shuffle, RB.pad2,
                              RB.clock, RB.compact, RB.reducedMotion,
                              RB.storageOK, RB.sleep
   ========================================================================== */
(function (RB) {
  'use strict';

  /* ---------- Shared state ------------------------------------------------ */

  RB.state = {
    P: null, // player profile
    G: null, // current game
    LAST: null, // last finished game
    pending: null,
    lbTab: 'daily',
    soundOn: true,
  };

  /* ---------- DOM query helpers ------------------------------------------ */

  /** Select one element. Returns null instead of throwing on a bad selector. */
  function $(selector, scope) {
    if (!selector) return null;
    var root = scope && typeof scope.querySelector === 'function' ? scope : document;
    try {
      return root.querySelector(selector);
    } catch (err) {
      return null;
    }
  }

  /** Select many elements as a real Array. */
  function $$(selector, scope) {
    if (!selector) return [];
    var root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    try {
      return Array.prototype.slice.call(root.querySelectorAll(selector));
    } catch (err) {
      return [];
    }
  }

  /**
   * Add an event listener, with optional delegation. Returns an "off" function.
   *   RB.on(btn, 'click', handler)
   *   RB.on('#arcList', 'click', '.card', function (e, matchedEl) { ... })
   */
  function on(target, type, selector, handler, options) {
    if (typeof selector === 'function') {
      options = handler;
      handler = selector;
      selector = null;
    }
    var root = typeof target === 'string' ? $(target) : target;
    if (!root || typeof root.addEventListener !== 'function' || typeof handler !== 'function') {
      return function noop() {};
    }

    function listener(event) {
      if (!selector) return handler.call(root, event, root);
      var node = event.target && event.target.closest ? event.target.closest(selector) : null;
      if (node && root.contains(node)) handler.call(node, event, node);
    }

    root.addEventListener(type, listener, options);
    return function off() {
      root.removeEventListener(type, listener, options);
    };
  }

  /**
   * Build a DOM element safely (text is never parsed as HTML).
   *   RB.el('button', { class: 'btn', type: 'button', onClick: fn }, ['GO'])
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);

    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value == null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key.length > 2 && key.slice(0, 2) === 'on' && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else node.setAttribute(key, value === true ? '' : value);
      });
    }

    [].concat(children == null ? [] : children).forEach(function (child) {
      if (child == null || child === false) return;
      node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
    });

    return node;
  }

  /* ---------- Strings ----------------------------------------------------- */

  var HTML_ESCAPE_MAP = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
  });

  var HTML_ESCAPE_RE = /[&<>"'`]/g;

  /** Escape a value for safe insertion into innerHTML / attributes. */
  function esc(value) {
    if (value == null) return '';
    return String(value).replace(HTML_ESCAPE_RE, function (ch) {
      return HTML_ESCAPE_MAP[ch] || ch;
    });
  }

  /** Fast, stable 32-bit string hash (FNV-1a). Handy for daily seeds. */
  function hash(str) {
    var s = String(str == null ? '' : str);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /* ---------- Random ------------------------------------------------------ */

  /** Seeded PRNG (mulberry32). Same seed, same sequence. Returns () => [0,1). */
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

  /** Random integer in [min, max] (inclusive). */
  function rngInt(randFn, min, max) {
    var lo = Math.ceil(Number(min));
    var hi = Math.floor(Number(max));
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return 0;
    var r = typeof randFn === 'function' ? randFn() : Math.random();
    return lo + Math.floor(r * (hi - lo + 1));
  }

  /** Pick one random item from an array (or undefined if empty). */
  function pick(list, randFn) {
    if (!list || !list.length) return undefined;
    return list[rngInt(randFn, 0, list.length - 1)];
  }

  /** Fisher-Yates shuffle. Returns a NEW array; the original is untouched. */
  function shuffle(list, randFn) {
    var out = Array.prototype.slice.call(list || []);
    for (var i = out.length - 1; i > 0; i--) {
      var j = rngInt(randFn, 0, i);
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* ---------- Numbers & formatting --------------------------------------- */

  function clamp(value, min, max) {
    var num = Number(value);
    var lo = Number(min);
    var hi = Number(max);
    if (!Number.isFinite(num)) return Number.isFinite(lo) ? lo : 0;
    if (Number.isFinite(lo) && num < lo) return lo;
    if (Number.isFinite(hi) && num > hi) return hi;
    return num;
  }

  // Intl.NumberFormat is slow to construct, so cache one per locale.
  var nfCache = {};

  function numberFormatter(locale, options, key) {
    var id = (locale || 'en-US') + '|' + key;
    if (!nfCache[id]) {
      try {
        nfCache[id] = new Intl.NumberFormat(locale || 'en-US', options);
      } catch (err) {
        nfCache[id] = null;
      }
    }
    return nfCache[id];
  }

  /** Rounded number with thousands separators: 18420 -> "18,420". */
  function fmt(num, locale) {
    var parsed = Number(num);
    if (!Number.isFinite(parsed)) return '0';
    var rounded = Math.round(parsed);
    var nf = numberFormatter(locale, { maximumFractionDigits: 0 }, 'int');
    return nf ? nf.format(rounded) : rounded.toLocaleString(locale || 'en-US');
  }

  /** Compact number: 18420 -> "18.4K". Falls back to fmt() if unsupported. */
  function compact(num, locale) {
    var parsed = Number(num);
    if (!Number.isFinite(parsed)) return '0';
    var nf = numberFormatter(locale, { notation: 'compact', maximumFractionDigits: 1 }, 'compact');
    return nf ? nf.format(parsed) : fmt(parsed, locale);
  }

  /** Zero-pad to two digits: 7 -> "07". */
  function pad2(num) {
    var n = Math.max(0, Math.floor(Number(num) || 0));
    return n < 10 ? '0' + n : String(n);
  }

  /** Seconds -> "HH:MM:SS" (for the countdown). */
  function clock(totalSeconds) {
    var s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60);
  }

  /* ---------- Timing ------------------------------------------------------ */

  /** Run fn only after `wait` ms of silence. Has .cancel(). */
  function debounce(fn, wait) {
    var timer = null;
    function debounced() {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, wait || 0);
    }
    debounced.cancel = function () {
      clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }

  /** Run fn at most once every `wait` ms. */
  function throttle(fn, wait) {
    var last = 0;
    var timer = null;
    return function throttled() {
      var ctx = this;
      var args = arguments;
      var now = Date.now();
      var remaining = (wait || 0) - (now - last);
      if (remaining <= 0) {
        clearTimeout(timer);
        timer = null;
        last = now;
        fn.apply(ctx, args);
      } else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now();
          timer = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  /** Promise-based delay: await RB.sleep(300). */
  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms || 0);
    });
  }

  /* ---------- Environment checks ----------------------------------------- */

  /** True if the user asked the OS for less motion. */
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /** True if localStorage actually works (blocked in some private modes). */
  function storageOK() {
    try {
      var k = '__rb_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ---------- Export ------------------------------------------------------ */

  Object.assign(RB, {
    $: $,
    $$: $$,
    on: on,
    el: el,
    esc: esc,
    hash: hash,
    rng: rng,
    rngInt: rngInt,
    pick: pick,
    shuffle: shuffle,
    clamp: clamp,
    fmt: fmt,
    compact: compact,
    pad2: pad2,
    clock: clock,
    debounce: debounce,
    throttle: throttle,
    sleep: sleep,
    reducedMotion: reducedMotion,
    storageOK: storageOK,
  });
})((window.RB = window.RB || {}));
