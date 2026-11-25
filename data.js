/* Question banks, answer matching, rarity tiers, daily challenge number */
(function (RB) {
  'use strict';

  var { rng } = RB;

  var PLAYERS = 18420;
  var MS_PER_DAY = 864e5;
  var EPOCH_UTC_MS = Date.UTC(2026, 0, 1);

  var RAW_BANKS = [
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

  var ALIAS = Object.freeze({
    usa: 'United States',
    us: 'United States',
    'u s a': 'United States',
    'u s': 'United States',
    'united states of america': 'United States',
    america: 'United States',
    uk: 'United Kingdom',
    'u k': 'United Kingdom',
    england: 'United Kingdom',
    britain: 'United Kingdom',
    'great britain': 'United Kingdom',
    js: 'JavaScript',
    cpp: 'C++',
    'c plus plus': 'C++',
    csharp: 'C#',
    'c sharp': 'C#',
    golang: 'Go',
    ts: 'TypeScript',
    'the moon': 'Moon',
    luna: 'Moon',
    'mt fuji': 'Fuji',
    'mount fuji': 'Fuji',
    'sagarmatha': 'Mount Everest',
    'chomolungma': 'Mount Everest',
  });

  function norm(str) {
    return String(str == null ? '' : str)
      .toLowerCase()
      .replace(/[^a-z0-9+# ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(mount|mt|the)\s+/, '');
  }

  function singularizeToken(token) {
    if (!token || token.length <= 3) return token;
    if (token.endsWith('ies') && token.length > 4) {
      return token.slice(0, -3) + 'y';
    }
    if (/(ches|shes|xes|zes|sses)$/.test(token)) {
      return token.slice(0, -2);
    }
    if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('us')) {
      return token.slice(0, -1);
    }
    return token;
  }

  function buildCandidateKeys(normalized) {
    var keys = new Set();
    if (!normalized) return keys;

    keys.add(normalized);
    if (ALIAS[normalized]) {
      keys.add(norm(ALIAS[normalized]));
    }

    var words = normalized.split(' ');
    var singularWords = words.map(singularizeToken).join(' ');
    keys.add(singularWords);
    if (ALIAS[singularWords]) {
      keys.add(norm(ALIAS[singularWords]));
    }

    return keys;
  }

  function parseBank(rawBank) {
    var entries = String(rawBank.a || '')
      .split(',')
      .map(function (item) {
        var trimmed = item.trim();
        var splitIdx = trimmed.lastIndexOf(' ');
        var name = splitIdx > -1 ? trimmed.slice(0, splitIdx).trim() : trimmed;
        var weight = splitIdx > -1 ? parseFloat(trimmed.slice(splitIdx + 1)) : 0;
        var safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0.05;
        var normalizedName = norm(name);
        var parts = normalizedName.split(' ').filter(Boolean);

        return {
          name: name,
          w: safeWeight,
          _norm: normalizedName,
          _last: parts.length ? parts[parts.length - 1] : normalizedName,
        };
      })
      .filter(function (entry) {
        return Boolean(entry.name);
      });

    var total = entries.reduce(function (sum, entry) {
      return sum + entry.w;
    }, 0);

    return {
      q: rawBank.q,
      person: rawBank.person ? 1 : 0,
      list: entries,
      total: total || 1,
    };
  }

  var BANKS = RAW_BANKS.map(parseBank);

  function match(bank, input) {
    if (!bank || !Array.isArray(bank.list)) return null;
    var n = norm(input);
    if (!n) return null;

    var candidates = buildCandidateKeys(n);

    for (var i = 0; i < bank.list.length; i++) {
      var entry = bank.list[i];
      if (candidates.has(entry._norm)) {
        return entry;
      }
    }

    if (bank.person) {
      for (var j = 0; j < bank.list.length; j++) {
        var personEntry = bank.list[j];
        if (candidates.has(personEntry._last)) {
          return personEntry;
        }
      }
    }

    return null;
  }

  function tier(share) {
    var pct = (Number(share) || 0) * 100;
    if (pct >= 10) return { pts: 10, label: 'VERY COMMON' };
    if (pct >= 4) return { pts: 25, label: 'COMMON' };
    if (pct >= 1.5) return { pts: 50, label: 'UNCOMMON' };
    if (pct >= 0.5) return { pts: 100, label: 'RARE' };
    return { pts: 200, label: 'EXTREMELY RARE' };
  }

  /* ---------- Date & Challenge Index ---------- */

  function dayIndex(dateObj) {
    var d = dateObj instanceof Date ? dateObj : new Date();
    var utcDayStart = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((utcDayStart - EPOCH_UTC_MS) / MS_PER_DAY) + 1;
  }

  var TODAY = dayIndex(new Date());

  function order(day) {
    var count = BANKS.length;
    var indices = [];
    for (var k = 0; k < count; k++) indices.push(k);

    var rand = rng((Number(day) || 1) * 7919);
    for (var i = count - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    return indices;
  }

  function dateOf(day) {
    var d = new Date(EPOCH_UTC_MS + (Number(day) - 1) * MS_PER_DAY);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  /* ---------- Fuzzy Spelling Suggestion ---------- */

  function lev(a, b) {
    var s1 = String(a || '');
    var s2 = String(b || '');
    var len1 = s1.length;
    var len2 = s2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    var prev = new Array(len2 + 1);
    var curr = new Array(len2 + 1);

    for (var j = 0; j <= len2; j++) prev[j] = j;

    for (var i = 1; i <= len1; i++) {
      curr[0] = i;
      var ch1 = s1.charCodeAt(i - 1);
      for (var col = 1; col <= len2; col++) {
        var cost = ch1 === s2.charCodeAt(col - 1) ? 0 : 1;
        curr[col] = Math.min(
          prev[col] + 1,
          curr[col - 1] + 1,
          prev[col - 1] + cost,
        );
      }
      var swap = prev;
      prev = curr;
      curr = swap;
    }

    return prev[len2];
  }

  function suggest(bank, input) {
    if (!bank || !Array.isArray(bank.list)) return null;
    var n = norm(input);
    var maxEdit = n.length >= 7 ? 2 : n.length >= 4 ? 1 : 0;
    if (!maxEdit) return null;

    var best = null;
    var bestDist = Infinity;

    for (var i = 0; i < bank.list.length; i++) {
      var entry = bank.list[i];
      var dist = lev(n, entry._norm);
      if (dist > 0 && dist <= maxEdit && dist < bestDist) {
        bestDist = dist;
        best = entry;
      }
    }

    return best;
  }

  Object.assign(RB, {
    PLAYERS: PLAYERS,
    BANKS: BANKS,
    norm: norm,
    match: match,
    tier: tier,
    TODAY: TODAY,
    order: order,
    dateOf: dateOf,
    suggest: suggest,
  });
})((window.RB = window.RB || {}));
