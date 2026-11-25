/* Pixel avatars and trophies */
(function (RB) {
  'use strict';

  var { rng, esc } = RB;

  var AVATAR_SIZE = 8;
  var TROPHY_COLS = Object.freeze(['#ffd93d', '#c9d3e6', '#d18a4a']);

  var TROPHY_MATRIX = Object.freeze([
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'X.XhXXXX.X',
    'X.XhXXXX.X',
    'XXXXXXXXXX',
    '..XXXXXX..',
    '...XXXX...',
    '....XX....',
    '....XX....',
    '...XXXX...',
    '..XXXXXX..',
  ]);

  var avatarCache = new Map();
  var trophyCache = new Map();

  function hash(input) {
    var str = input == null ? '' : String(input);
    var h = 7;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i);
      h |= 0;
    }
    var unsigned = h >>> 0;
    return unsigned || 1;
  }

  function avatar(seed) {
    var key = Number.isFinite(Number(seed)) ? Math.abs(Math.floor(Number(seed))) : hash(seed);
    if (avatarCache.has(key)) {
      return avatarCache.get(key);
    }

    var canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    var ctx = canvas.getContext('2d');
    if (!ctx) return '';

    var rand = typeof rng === 'function' ? rng(key) : Math.random;
    var baseHue = Math.floor(rand() * 360);
    var accentHue = (baseHue + 180) % 360;
    var bodyColor = 'hsl(' + baseHue + ', 72%, 56%)';
    var visorColor = 'hsl(' + accentHue + ', 85%, 62%)';

    ctx.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

    // Subtle dark pixel border/backdrop so sprites stay crisp over any panel
    ctx.fillStyle = 'rgba(8, 5, 25, 0.55)';
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

    ctx.fillStyle = bodyColor;
    var litCells = 0;

    for (var y = 1; y < AVATAR_SIZE - 1; y++) {
      for (var x = 1; x < AVATAR_SIZE / 2; x++) {
        if (rand() > 0.42) {
          ctx.fillRect(x, y, 1, 1);
          ctx.fillRect(AVATAR_SIZE - 1 - x, y, 1, 1);
          litCells += 2;
        }
      }
    }

    // Ensure at least a core head/torso silhouette is present
    if (litCells < 6) {
      ctx.fillRect(2, 2, 4, 4);
      ctx.fillRect(3, 6, 2, 1);
    }

    // Retro pixel eyes + subtle pupil accent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 3, 1, 1);
    ctx.fillRect(5, 3, 1, 1);

    ctx.fillStyle = visorColor;
    ctx.fillRect(2, 4, 1, 1);
    ctx.fillRect(5, 4, 1, 1);

    var url = canvas.toDataURL();
    avatarCache.set(key, url);
    return url;
  }

  function trophy(color) {
    var safeCol = typeof esc === 'function' ? esc(color || TROPHY_COLS[0]) : String(color || TROPHY_COLS[0]);
    if (trophyCache.has(safeCol)) {
      return trophyCache.get(safeCol);
    }

    var rects = [];
    for (var y = 0; y < TROPHY_MATRIX.length; y++) {
      var rowStr = TROPHY_MATRIX[y];
      for (var x = 0; x < rowStr.length; x++) {
        var ch = rowStr.charAt(x);
        if (ch === 'X') {
          rects.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + safeCol + '"/>');
        } else if (ch === 'h') {
          rects.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="#fff" opacity=".72"/>');
        }
      }
    }

    var svg =
      '<svg class="tro" viewBox="0 0 10 11" shape-rendering="crispEdges" role="img" aria-label="trophy">' +
      rects.join('') +
      '</svg>';

    trophyCache.set(safeCol, svg);
    return svg;
  }

  Object.assign(RB, {
    avatar: avatar,
    hash: hash,
    trophy: trophy,
    TCOL: TROPHY_COLS,
  });
})((window.RB = window.RB || {}));
