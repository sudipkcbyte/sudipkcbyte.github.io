/* ==========================================================================
   RAREBYTE — data.js
   Question banks, answer matching, rarity tiers, daily challenge number.

   Public API (unchanged): RB.PLAYERS, RB.BANKS, RB.norm, RB.match, RB.tier,
                           RB.TODAY, RB.order, RB.dateOf, RB.suggest
   New:                    RB.today(), RB.daily(day), RB.lev(), RB.validateBanks()
   ========================================================================== */
(function (RB) {
  'use strict';

  if (typeof RB.rng !== 'function') {
    if (window.console) console.error('[RAREBYTE] data.js needs utils.js to load first.');
    return;
  }

  const rng = RB.rng;

  /* ---------- Constants --------------------------------------------------- */

  const PLAYERS = 18420; // simulated field size
  const MS_PER_DAY = 864e5;
  const EPOCH_UTC_MS = Date.UTC(2026, 0, 1); // challenge #1 = Jan 1, 2026
  const MIN_WEIGHT = 0.05;

  /* ---------- Question banks ---------------------------------------------- */
  /* Format: "Answer weight" pairs, comma separated. Weights are relative;
     a bank's total is the sum of its weights, and an answer's share of the
     field is weight / total. Set `person: 1` to also accept last names. */

  const RAW_BANKS = [
    {
      q: 'Name a country in the world.',
      a: [
        'United States 13', 'India 10', 'China 9', 'Canada 8', 'France 8',
        'Germany 7', 'Japan 7', 'Brazil 6', 'Australia 6', 'Italy 5',
        'Spain 5', 'United Kingdom 5', 'Mexico 4', 'Russia 4', 'Egypt 3',
        'South Africa 3', 'Argentina 2.5', 'Nigeria 2', 'Turkey 2', 'Thailand 1.8',
        'Norway 1.5', 'Peru 1.2', 'Nepal 0.9', 'Kenya 0.8', 'Vietnam 0.8',
        'Bhutan 0.3', 'Mongolia 0.3', 'Laos 0.2', 'Eritrea 0.1', 'Tuvalu 0.05',
      ].join(','),
    },
    {
      q: 'Name a programming language.',
      a: [
        'Python 16', 'JavaScript 15', 'Java 12', 'C++ 9', 'C 8',
        'C# 7', 'PHP 5', 'Ruby 4', 'Go 4', 'Swift 3.5',
        'Rust 3', 'Kotlin 3', 'TypeScript 3', 'SQL 2.5', 'R 1.5',
        'Perl 1', 'Haskell 0.6', 'Lua 0.6', 'Scala 0.5', 'Elixir 0.3',
        'COBOL 0.3', 'Fortran 0.2', 'Prolog 0.1', 'Brainfuck 0.05',
      ].join(','),
    },
    {
      q: 'Name a fruit.',
      a: [
        'Apple 18', 'Banana 15', 'Orange 12', 'Mango 9', 'Grape 7',
        'Strawberry 7', 'Watermelon 5', 'Pineapple 5', 'Pear 3', 'Peach 3',
        'Cherry 3', 'Lemon 2.5', 'Kiwi 2', 'Papaya 1.5', 'Plum 1.2',
        'Pomegranate 1', 'Lychee 0.8', 'Guava 0.8', 'Fig 0.6', 'Dragon Fruit 0.5',
        'Jackfruit 0.4', 'Persimmon 0.2', 'Quince 0.1', 'Rambutan 0.1',
      ].join(','),
    },
    {
      q: 'Name a planet or a moon in our solar system.',
      a: [
        'Mars 14', 'Jupiter 12', 'Saturn 11', 'Earth 10', 'Venus 9',
        'Mercury 8', 'Neptune 6', 'Uranus 6', 'Moon 5', 'Pluto 4',
        'Titan 2', 'Europa 2', 'Io 1', 'Ganymede 0.8', 'Callisto 0.5',
        'Enceladus 0.5', 'Triton 0.4', 'Phobos 0.2', 'Charon 0.2', 'Ceres 0.15',
        'Eris 0.1', 'Miranda 0.05',
      ].join(','),
    },
    {
      q: 'Name a musical instrument.',
      a: [
        'Guitar 16', 'Piano 15', 'Drums 12', 'Violin 9', 'Flute 7',
        'Trumpet 5', 'Saxophone 4', 'Cello 3', 'Harp 2.5', 'Clarinet 2.5',
        'Bass 2', 'Ukulele 2', 'Harmonica 1.5', 'Trombone 1.2', 'Accordion 1',
        'Banjo 1', 'Tabla 0.5', 'Sitar 0.4', 'Oboe 0.4', 'Didgeridoo 0.3',
        'Sarangi 0.1', 'Madal 0.1', 'Theremin 0.1',
      ].join(','),
    },
    {
      q: 'Name a famous scientist.',
      person: 1,
      a: [
        'Albert Einstein 25', 'Isaac Newton 14', 'Marie Curie 9', 'Charles Darwin 8',
        'Stephen Hawking 8', 'Nikola Tesla 6', 'Galileo Galilei 5', 'Thomas Edison 3',
        'Louis Pasteur 2', 'Richard Feynman 1.5', 'Carl Sagan 1.5', 'Ada Lovelace 1',
        'Alan Turing 1', 'Rosalind Franklin 0.5', 'Srinivasa Ramanujan 0.4',
        'Katherine Johnson 0.3', 'Jagadish Bose 0.1', 'Emmy Noether 0.1',
        'Barbara McClintock 0.05',
      ].join(','),
    },
    {
      q: 'Name a famous mountain.',
      a: [
        'Mount Everest 30', 'Kilimanjaro 8', 'K2 6', 'Fuji 6', 'Mont Blanc 5',
        'Matterhorn 4', 'Denali 3', 'Annapurna 1.5', 'Aconcagua 1.2', 'Olympus 1',
        'Rushmore 1', 'Kangchenjunga 0.8', 'Elbrus 0.8', 'Makalu 0.3', 'Lhotse 0.3',
        'Cho Oyu 0.2', 'Dhaulagiri 0.2', 'Cotopaxi 0.2', 'Manaslu 0.15', 'Ama Dablam 0.1',
        'Vinson 0.1',
      ].join(','),
    },
  ];

  /* ---------- Aliases (alternate spellings -> canonical answer) ----------- */
  /* Keys and values are normalised at load, so write them naturally. */

  const ALIAS_RAW = {
    // Countries
    usa: 'United States', us: 'United States', 'u s a': 'United States', 'u s': 'United States',
    'united states of america': 'United States', america: 'United States',
    uk: 'United Kingdom', 'u k': 'United Kingdom', gb: 'United Kingdom',
    england: 'United Kingdom', britain: 'United Kingdom', 'great britain': 'United Kingdom',
    deutschland: 'Germany', nippon: 'Japan', bharat: 'India', prc: 'China',
    'russian federation': 'Russia', turkiye: 'Turkey', brasil: 'Brazil',
    espana: 'Spain', italia: 'Italy',
    // Programming languages
    js: 'JavaScript', ts: 'TypeScript', py: 'Python', cpp: 'C++',
    'c plus plus': 'C++', csharp: 'C#', 'c sharp': 'C#', golang: 'Go', bf: 'Brainfuck',
    // Fruit
    pitaya: 'Dragon Fruit',
    // Planets & moons
    'the moon': 'Moon', luna: 'Moon',
    // Instruments
    'electric guitar': 'Guitar', 'acoustic guitar': 'Guitar',
    'bass guitar': 'Bass', 'double bass': 'Bass', 'upright bass': 'Bass',
    'drum kit': 'Drums', 'drum set': 'Drums', sax: 'Saxophone', uke: 'Ukulele',
    didjeridu: 'Didgeridoo', didjeridoo: 'Didgeridoo',
    // Mountains
    'mt fuji': 'Fuji', 'mount fuji': 'Fuji', fujiyama: 'Fuji', fujisan: 'Fuji',
    sagarmatha: 'Mount Everest', chomolungma: 'Mount Everest', qomolangma: 'Mount Everest',
    kili: 'Kilimanjaro', mckinley: 'Denali',
  };

  /* ---------- Text normalisation ------------------------------------------ */

  /** Lowercase, strip accents/punctuation/possessives and leading Mount/Mt/The. */
  function norm(str) {
    let s = String(str == null ? '' : str);
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return s
      .toLowerCase()
      .replace(/['\u2019`]s\b/g, '') // Newton's -> newton
      .replace(/[^a-z0-9+# ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:(?:mount|mt|the)\s+)+/, '');
  }

  const flat = (s) => s.replace(/ /g, '');

  // Null-prototype so inputs like "constructor" can never hit Object.prototype.
  const ALIAS = Object.create(null);
  Object.keys(ALIAS_RAW).forEach((key) => {
    ALIAS[norm(key)] = norm(ALIAS_RAW[key]);
  });

  function singularizeToken(token) {
    if (!token || token.length <= 3) return token;
    if (token.endsWith('ies') && token.length > 4) return token.slice(0, -3) + 'y';
    if (/(ches|shes|xes|zes|sses|oes)$/.test(token)) return token.slice(0, -2);
    if (token.endsWith('s') && !/(ss|us|is)$/.test(token)) return token.slice(0, -1);
    return token;
  }

  const singular = (s) => s.split(' ').map(singularizeToken).join(' ');

  /** Ordered, de-duplicated lookup keys for one normalised input. */
  function candidateKeys(n) {
    const out = [];
    const add = (k) => {
      if (k && out.indexOf(k) === -1) out.push(k);
    };
    const expand = (k) => {
      add(k);
      add(singular(k));
      add(flat(k));
    };

    expand(n);
    if (ALIAS[n]) expand(ALIAS[n]);
    const sing = singular(n);
    if (ALIAS[sing]) expand(ALIAS[sing]);
    return out;
  }

  /* ---------- Bank parsing & indexing ------------------------------------- */

  const ENTRY_RE = /^(.*\S)\s+(\d+(?:\.\d+)?)$/;

  function parseEntry(item) {
    const trimmed = item.trim();
    if (!trimmed) return null;

    // Only treat the last token as a weight when it is actually a number,
    // so a multi-word name without a weight is never chopped.
    const m = ENTRY_RE.exec(trimmed);
    const name = m ? m[1].trim() : trimmed;
    const weight = m ? parseFloat(m[2]) : 0;
    const normalized = norm(name);
    const parts = normalized.split(' ').filter(Boolean);

    return {
      name: name,
      w: Number.isFinite(weight) && weight > 0 ? weight : MIN_WEIGHT,
      _norm: normalized,
      _flat: flat(normalized),
      _last: parts.length ? parts[parts.length - 1] : normalized,
    };
  }

  function parseBank(rawBank) {
    const list = String(rawBank.a || '')
      .split(',')
      .map(parseEntry)
      .filter((entry) => entry && entry.name);

    const total = list.reduce((sum, entry) => sum + entry.w, 0);

    return {
      q: rawBank.q,
      person: rawBank.person ? 1 : 0,
      list: list,
      total: total || 1,
    };
  }

  const BANKS = RAW_BANKS.map(parseBank);

  // Lazy per-bank lookup index (WeakMap keeps the public bank objects clean).
  const INDEX = new WeakMap();

  function indexFor(bank) {
    let ix = INDEX.get(bank);
    if (ix) return ix;

    const exact = new Map();
    const loose = new Map();
    const lastSeen = new Map();
    const lastCount = new Map();

    bank.list.forEach((entry) => {
      if (!exact.has(entry._norm)) exact.set(entry._norm, entry);
    });

    bank.list.forEach((entry) => {
      // Plural-tolerant keys. Short words ("Mars") are left alone on purpose.
      const sing = entry._norm.length > 4 ? singular(entry._norm) : entry._norm;
      [sing, entry._flat].forEach((key) => {
        if (key && !exact.has(key) && !loose.has(key)) loose.set(key, entry);
      });

      lastCount.set(entry._last, (lastCount.get(entry._last) || 0) + 1);
      if (!lastSeen.has(entry._last)) lastSeen.set(entry._last, entry);
    });

    // Last names only count when they identify exactly one person.
    const last = new Map();
    lastSeen.forEach((entry, key) => {
      if (lastCount.get(key) === 1) last.set(key, entry);
    });

    ix = { exact: exact, loose: loose, last: last };
    INDEX.set(bank, ix);
    return ix;
  }

  /* ---------- Matching ---------------------------------------------------- */

  /** Find the bank entry that a typed answer refers to, or null. */
  function match(bank, input) {
    if (!bank || !Array.isArray(bank.list)) return null;
    const n = norm(input);
    if (!n) return null;

    const ix = indexFor(bank);
    const keys = candidateKeys(n);

    for (let i = 0; i < keys.length; i++) {
      const hit = ix.exact.get(keys[i]) || ix.loose.get(keys[i]);
      if (hit) return hit;
    }

    if (bank.person) {
      for (let j = 0; j < keys.length; j++) {
        const hit = ix.last.get(keys[j]);
        if (hit) return hit;
      }
    }

    return null;
  }

  /* ---------- Rarity tiers ------------------------------------------------ */

  /** share is a fraction of the field (0.02 = 2%). */
  function tier(share) {
    const pct = (Number(share) || 0) * 100;
    if (pct >= 10) return { pts: 10, label: 'VERY COMMON', cls: 't10' };
    if (pct >= 4) return { pts: 25, label: 'COMMON', cls: 't25' };
    if (pct >= 1.5) return { pts: 50, label: 'UNCOMMON', cls: 't50' };
    if (pct >= 0.5) return { pts: 100, label: 'RARE', cls: 't100' };
    return { pts: 200, label: 'EXTREMELY RARE', cls: 't200' };
  }

  /* ---------- Daily challenge --------------------------------------------- */

  /** Challenge number for a date (uses the player's local calendar day). */
  function dayIndex(dateObj) {
    const d = dateObj instanceof Date && !isNaN(dateObj) ? dateObj : new Date();
    const dayStart = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.max(1, Math.floor((dayStart - EPOCH_UTC_MS) / MS_PER_DAY) + 1);
  }

  // Fixed when the page loads (kept for compatibility). Use RB.today() for
  // the live value if the tab may stay open past midnight.
  const TODAY = dayIndex(new Date());

  /** Seeded question order for a given challenge number. */
  function order(day) {
    const count = BANKS.length;
    const indices = [];
    for (let k = 0; k < count; k++) indices.push(k);

    const rand = rng((Number(day) || 1) * 7919);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    return indices;
  }

  /** The banks for a challenge, already in play order. */
  function daily(day) {
    return order(day).map((i) => BANKS[i]);
  }

  /** "Jan 1" style label for a challenge number. */
  function dateOf(day) {
    const n = Number(day);
    const d = new Date(EPOCH_UTC_MS + ((Number.isFinite(n) ? n : 1) - 1) * MS_PER_DAY);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  /* ---------- Typo suggestions ("did you mean...?") ----------------------- */

  /** Edit distance that also counts a swapped pair of letters as one edit. */
  function lev(a, b) {
    const s = String(a || '');
    const t = String(b || '');
    const m = s.length;
    const n = t.length;
    if (m === 0) return n;
    if (n === 0) return m;

    let prev2 = new Array(n + 1);
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      const si = s.charCodeAt(i - 1);
      for (let j = 1; j <= n; j++) {
        const tj = t.charCodeAt(j - 1);
        let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (si === tj ? 0 : 1));
        if (i > 1 && j > 1 && si === t.charCodeAt(j - 2) && s.charCodeAt(i - 2) === tj) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        curr[j] = v;
      }
      const spare = prev2;
      prev2 = prev;
      prev = curr;
      curr = spare;
    }
    return prev[n];
  }

  /** Closest bank entry to a mistyped answer, or null if nothing is close. */
  function suggest(bank, input) {
    if (!bank || !Array.isArray(bank.list)) return null;
    const n = norm(input);
    if (!n) return null;

    const maxEdit = n.length >= 7 ? 2 : n.length >= 4 ? 1 : 0;
    if (!maxEdit) return null;
    if (match(bank, input)) return null; // already a valid answer

    const nFlat = flat(n);
    let best = null;
    let bestDist = Infinity;

    bank.list.forEach((entry) => {
      const targets = bank.person ? [entry._norm, entry._last] : [entry._norm, entry._flat];
      let dist = Infinity;

      targets.forEach((target) => {
        if (!target || Math.abs(target.length - n.length) > maxEdit + 1) return;
        dist = Math.min(dist, lev(n, target), lev(nFlat, flat(target)));
      });

      if (dist > 0 && dist <= maxEdit) {
        // Closest wins; on a tie, prefer the more popular answer.
        if (dist < bestDist || (dist === bestDist && best && entry.w > best.w)) {
          bestDist = dist;
          best = entry;
        }
      }
    });

    return best;
  }

  /* ---------- Data self-check --------------------------------------------- */

  /** Returns a list of human-readable problems with the data (empty = OK). */
  function validateBanks() {
    const problems = [];

    BANKS.forEach((bank, bi) => {
      const seen = new Set();
      if (bank.list.length < 5) problems.push('Bank ' + (bi + 1) + ' has very few answers.');
      bank.list.forEach((entry) => {
        if (seen.has(entry._norm)) {
          problems.push('Bank ' + (bi + 1) + ': duplicate answer "' + entry.name + '".');
        }
        seen.add(entry._norm);
      });
    });

    Object.keys(ALIAS).forEach((key) => {
      const target = ALIAS[key];
      const found = BANKS.some((bank) => indexFor(bank).exact.has(target));
      if (!found) problems.push('Alias "' + key + '" points to missing answer "' + target + '".');
    });

    return problems;
  }

  const problems = validateBanks();
  if (problems.length && window.console && console.warn) {
    console.warn('[RAREBYTE] data check:\n- ' + problems.join('\n- '));
  }

  /* ---------- Export ------------------------------------------------------ */

  Object.assign(RB, {
    PLAYERS: PLAYERS,
    BANKS: BANKS,
    norm: norm,
    match: match,
    tier: tier,
    TODAY: TODAY,
    today: function () {
      return dayIndex(new Date());
    },
    order: order,
    daily: daily,
    dateOf: dateOf,
    suggest: suggest,
    lev: lev,
    validateBanks: validateBanks,
  });
})((window.RB = window.RB || {}));
