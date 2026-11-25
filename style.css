/* ==========================================================================
   RAREBYTE — RETRO ARCADE QUIZ — ADVANCED STYLESHEET
   Layout: fixed synthwave sky behind a centered column; the question and
   score dominate the active play view.

   Contents
   01. Design tokens
   02. Reset & base
   03. Sky, stars, sun & grid floor
   04. Keyframes
   05. Accessibility helpers (skip link, sr-only, focus)
   06. Header & navigation
   07. Main & typography
   08. Buttons
   09. Panels, grids & stats
   10. Hero, countdown & pips
   11. Tables & leaderboard
   12. Tabs
   13. Gameplay (HUD, timer, question, input)
   14. Answer reveal & score tiers
   15. Achievements & rows
   16. Forms & misc
   17. Utilities
   18. Footer & noscript
   19. Responsive
   20. User preference queries (motion, contrast, print)
   ========================================================================== */

/* 01. DESIGN TOKENS ------------------------------------------------------- */
:root {
  /* Core palette */
  --bg: #080519;
  --panel: #120a33;
  --panel2: #1a0f47;
  --purple: #9d4dff;
  --cyan: #27e8ff;
  --yellow: #ffd93d;
  --pink: #ff5ca8;
  --fg: #ece7ff;
  --dim: #9a90c8;
  --good: #4dff9a;
  --bad: #ff5c7a;
  --line: #2d1f6b;
  --ink: #10062b;
  --shadow: #05030f;

  /* Typography */
  --px: 'Press Start 2P', 'Courier New', monospace;
  --tx: 'VT323', 'Courier New', monospace;

  /* Layout & motion */
  --container-w: 980px;
  --header-h: 84px;
  --ease-snappy: cubic-bezier(0.2, 0.8, 0.2, 1);
  --scan: 0.14; /* CRT scanline strength: 0 = off, 0.14 = default */

  /* Glow helpers */
  --glow-cyan: 0 0 18px color-mix(in srgb, var(--cyan) 35%, transparent);
  --glow-yellow: 0 0 18px color-mix(in srgb, var(--yellow) 35%, transparent);

  color-scheme: dark;
}

/* 02. RESET & BASE -------------------------------------------------------- */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: var(--header-h);
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scrollbar-color: var(--purple) var(--bg);
  scrollbar-width: thin;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--tx);
  font-size: 22px;
  line-height: 1.25;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-inline: max(16px, env(safe-area-inset-left, 0px))
    max(16px, env(safe-area-inset-right, 0px));
  overflow-x: clip;
  -webkit-font-smoothing: none;
  font-smooth: never;
  -webkit-tap-highlight-color: transparent;
}

::selection {
  background: var(--purple);
  color: #fff;
}

img {
  max-width: 100%;
  display: block;
}

[hidden] {
  display: none !important;
}

/* Top notch / safe-area bar */
body::before {
  content: '';
  position: fixed;
  inset: 0 0 auto;
  height: env(safe-area-inset-top, 0px);
  z-index: 30;
  background: var(--bg);
  pointer-events: none;
}

/* Subtle CRT scanline texture + vignette over the viewport */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 25;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, transparent 62%, rgba(0, 0, 0, 0.35) 100%),
    repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0px,
      rgba(0, 0, 0, 0) 2px,
      rgba(0, 0, 0, var(--scan)) 3px,
      rgba(0, 0, 0, var(--scan)) 4px
    );
}

/* 03. SKY, STARS, SUN & GRID FLOOR --------------------------------------- */
.sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 55% at 50% 105%, rgba(157, 77, 255, 0.36), transparent 65%),
    radial-gradient(circle at 18% 18%, rgba(39, 232, 255, 0.08), transparent 40%),
    var(--bg);
}

/* Synthwave sun with cut-out stripes, sitting on the horizon */
.sky::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 38vh;
  width: min(48vw, 440px);
  aspect-ratio: 1;
  translate: -50% 0;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--yellow) 0%, var(--pink) 55%, var(--purple) 100%);
  opacity: 0.17;
  filter: blur(0.5px);
  mask-image: linear-gradient(
    to bottom,
    #000 0 48%,
    transparent 48% 52%,
    #000 52% 60%,
    transparent 60% 66%,
    #000 66% 75%,
    transparent 75% 82%,
    #000 82% 100%
  );
}

.stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(2px 2px at 20px 30px, #fff, transparent),
    radial-gradient(2px 2px at 90px 140px, var(--cyan), transparent),
    radial-gradient(1.5px 1.5px at 160px 60px, #fff, transparent),
    radial-gradient(2px 2px at 60px 190px, var(--yellow), transparent),
    radial-gradient(1.5px 1.5px at 130px 100px, #fff, transparent);
  background-size: 200px 220px;
  opacity: 0.7;
  animation: tw 4s steps(2) infinite;
}

.floor {
  position: absolute;
  left: -50%;
  right: -50%;
  bottom: 0;
  height: 44vh;
  background:
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--purple) 75%, transparent) 0 2px,
      transparent 2px 64px
    ),
    repeating-linear-gradient(
      0deg,
      color-mix(in srgb, var(--cyan) 35%, var(--purple)) 0 2px,
      transparent 2px 40px
    );
  transform: perspective(260px) rotateX(62deg);
  transform-origin: bottom;
  opacity: 0.32;
  mask-image: linear-gradient(to top, #000 45%, transparent 100%);
  animation: fl 2.4s linear infinite;
}

/* 04. KEYFRAMES ----------------------------------------------------------- */
@keyframes tw {
  50% {
    opacity: 0.35;
  }
}

@keyframes fl {
  to {
    background-position:
      0 0,
      0 40px;
  }
}

@keyframes bl {
  50% {
    opacity: 0;
  }
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes view-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pulse-low {
  50% {
    filter: brightness(1.5);
  }
}

@keyframes glow-rare {
  50% {
    box-shadow: 6px 6px 0 var(--shadow), 0 0 26px color-mix(in srgb, var(--yellow) 45%, transparent);
  }
}

/* 05. ACCESSIBILITY HELPERS ---------------------------------------------- */
.skip-link {
  position: fixed;
  left: 12px;
  top: -80px;
  z-index: 999;
  padding: 12px 16px;
  background: var(--yellow);
  color: var(--ink);
  font: 10px/1.4 var(--px);
  text-decoration: none;
  box-shadow: 0 4px 0 #a77f00;
  transition: top 160ms var(--ease-snappy);
}

.skip-link:focus {
  top: calc(env(safe-area-inset-top, 0px) + 12px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

:focus-visible {
  outline: 3px solid var(--cyan);
  outline-offset: 3px;
}

/* main is focused programmatically on view change; no ring needed there */
main:focus {
  outline: none;
}

/* 06. HEADER & NAVIGATION ------------------------------------------------- */
header {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 20;
  margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px)))
    calc(-1 * max(16px, env(safe-area-inset-right, 0px)));
  padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px
    max(16px, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 3px solid var(--line);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
}

.bar {
  max-width: var(--container-w);
  margin: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  justify-content: space-between;
}

.logo {
  font: 14px/1 var(--px);
  color: var(--yellow);
  text-decoration: none;
  text-shadow: 3px 3px 0 var(--purple);
  transition:
    transform 140ms var(--ease-snappy),
    text-shadow 140ms var(--ease-snappy);

  &:hover {
    transform: translateY(-1px);
    text-shadow:
      3px 3px 0 var(--purple),
      0 0 14px color-mix(in srgb, var(--yellow) 45%, transparent);
  }
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;

  a {
    font: 9px/1.6 var(--px);
    color: var(--dim);
    text-decoration: none;
    padding: 6px 2px;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
    transition:
      color 140ms ease,
      border-color 140ms ease;

    &:hover,
    &.on,
    &[aria-current='page'] {
      color: var(--cyan);
      border-bottom-color: var(--cyan);
    }
  }
}

.tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 07. MAIN & TYPOGRAPHY --------------------------------------------------- */
main {
  flex: 1 0 auto;
  width: 100%;
  max-width: var(--container-w);
  margin: auto;
  padding-block: 28px 56px;
}

/* Each view fades/slides in when JS un-hides it */
.view {
  animation: view-in 260ms var(--ease-snappy) both;
}

h1,
h2,
h3 {
  font-family: var(--px);
  font-weight: 400;
  text-wrap: balance;
}

h1 {
  font-size: clamp(18px, 4.6vw, 34px);
  line-height: 1.5;
  margin: 0 0 14px;
  text-shadow: 3px 3px 0 rgba(157, 77, 255, 0.45);
}

h2 {
  font-size: 14px;
  line-height: 1.6;
  color: var(--cyan);
  margin: 0 0 14px;
}

h3 {
  font-size: 10px;
  line-height: 1.6;
  color: var(--yellow);
  margin: 0 0 8px;
}

p {
  margin: 0 0 10px;
  max-width: 62ch;
}

.ta-center p,
.cta p {
  margin-inline: auto;
}

.dim { color: var(--dim); }
.y   { color: var(--yellow); }
.c   { color: var(--cyan); }
.pp  { color: var(--purple); }
.ok  { color: var(--good); }
.err { color: var(--bad); }

/* 08. ARCADE BUTTONS ------------------------------------------------------ */
.btn {
  font: 12px/1.4 var(--px);
  color: var(--ink);
  background: var(--yellow);
  border: 0;
  padding: 14px 18px;
  cursor: pointer;
  box-shadow:
    0 5px 0 #a77f00,
    0 0 0 3px var(--ink) inset;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  user-select: none;
  touch-action: manipulation;
  transition:
    transform 90ms var(--ease-snappy),
    box-shadow 90ms var(--ease-snappy),
    background-color 140ms ease,
    filter 140ms ease;

  &:hover:not(:disabled):not([aria-disabled='true']) {
    background: #fff06a;
    transform: translateY(-1px);
    box-shadow:
      0 6px 0 #a77f00,
      0 0 0 3px var(--ink) inset,
      var(--glow-yellow);
  }

  &:active:not(:disabled):not([aria-disabled='true']) {
    transform: translateY(4px);
    box-shadow:
      0 1px 0 #a77f00,
      0 0 0 3px var(--ink) inset;
  }

  &.big {
    font-size: clamp(12px, 3.2vw, 17px);
    padding: 20px 26px;
  }

  &.alt {
    background: var(--cyan);
    box-shadow:
      0 5px 0 #0a7f8c,
      0 0 0 3px var(--ink) inset;

    &:hover:not(:disabled):not([aria-disabled='true']) {
      background: #7cf3ff;
      box-shadow:
        0 6px 0 #0a7f8c,
        0 0 0 3px var(--ink) inset,
        var(--glow-cyan);
    }

    &:active:not(:disabled):not([aria-disabled='true']) {
      box-shadow:
        0 1px 0 #0a7f8c,
        0 0 0 3px var(--ink) inset;
    }
  }

  &.ghost {
    background: transparent;
    color: var(--cyan);
    box-shadow: 0 0 0 3px var(--cyan) inset;
    padding: 10px 12px;
    font-size: 9px;

    &:hover:not(:disabled):not([aria-disabled='true']) {
      background: rgba(39, 232, 255, 0.12);
      box-shadow: 0 0 0 3px var(--cyan) inset;
    }

    &:active:not(:disabled):not([aria-disabled='true']) {
      transform: translateY(2px);
    }

    /* Sound toggle looks muted when switched off */
    &[aria-pressed='false'] {
      color: var(--dim);
      box-shadow: 0 0 0 3px var(--line) inset;
    }
  }

  &:disabled,
  &[aria-disabled='true'] {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }
}

/* 09. PANELS, GRIDS & STATS ---------------------------------------------- */
.panel {
  position: relative;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--panel2) 45%, var(--panel)),
    var(--panel)
  );
  border: 3px solid var(--line);
  box-shadow: 6px 6px 0 var(--shadow);
  padding: 18px;

  /* neon top edge */
  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: linear-gradient(90deg, var(--purple), var(--cyan), var(--purple));
    opacity: 0.75;
    pointer-events: none;
  }
}

.panel-narrow {
  max-width: 460px;
}

.grid {
  display: grid;
  gap: 16px;

  > * {
    min-width: 0;
  }
}

.g2 {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}

.g3 {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
}

.stat {
  background: var(--panel);
  border: 3px solid var(--line);
  box-shadow: 4px 4px 0 var(--shadow);
  padding: 14px;

  span {
    font: 8px/1.6 var(--px);
    color: var(--dim);
    letter-spacing: 0.04em;
  }

  b {
    display: block;
    font: 16px/1.3 var(--px);
    color: var(--yellow);
    margin-top: 8px;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
}

/* 10. HERO, COUNTDOWN & PIPS --------------------------------------------- */
.hero {
  padding: 10px 0 26px;

  .sub {
    font-size: clamp(22px, 3.5vw, 28px);
    color: var(--cyan);
  }
}

.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin: 20px 0;
}

.blink {
  animation: bl 1s steps(1) infinite;
  font: 10px var(--px);
  color: var(--purple);
}

.count {
  font: clamp(14px, 3.4vw, 20px) / 1 var(--px);
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(39, 232, 255, 0.35);
}

.pips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.pip {
  width: 22px;
  height: 22px;
  background: var(--line);
  transition:
    transform 150ms var(--ease-snappy),
    background-color 150ms ease;

  &.f {
    background: var(--yellow);
    box-shadow:
      inset -4px -4px 0 #c99a00,
      0 0 10px rgba(255, 217, 61, 0.3);
  }
}

/* 11. TABLES & LEADERBOARD ------------------------------------------------ */
.tw {
  overflow-x: auto;
  border: 2px solid var(--line);
  background: rgba(5, 3, 15, 0.45);
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid var(--line);
  white-space: nowrap;
}

th {
  font: 8px var(--px);
  color: var(--dim);
  font-weight: 400;
  background: rgba(18, 10, 51, 0.7);
}

tbody tr {
  transition: background-color 120ms ease;

  &:hover {
    background: rgba(39, 232, 255, 0.06);
  }

  &:last-child td {
    border-bottom: 0;
  }

  /* Podium colours for the top 3 rows */
  &:nth-child(1):not(.me) td.n { color: var(--yellow); text-shadow: 0 0 10px rgba(255, 217, 61, 0.5); }
  &:nth-child(2):not(.me) td.n { color: #d8d4ee; }
  &:nth-child(3):not(.me) td.n { color: #ff9a5c; }

  &.me td {
    background: rgba(157, 77, 255, 0.28);
    color: var(--yellow);
  }
}

td.n {
  font: 10px var(--px);
  width: 3.5em;
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.who-profile {
  gap: 18px;
  flex-wrap: wrap;
}

.av {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex: none;
  background: var(--panel2);
  border: 2px solid var(--line);

  &.l {
    width: 96px;
    height: 96px;
    border-width: 3px;
    box-shadow: 4px 4px 0 var(--shadow);
  }
}

/* 12. TABS ---------------------------------------------------------------- */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  font: 9px var(--px);
  padding: 10px 12px;
  background: var(--panel);
  color: var(--dim);
  border: 3px solid var(--line);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    color 130ms var(--ease-snappy),
    background-color 130ms var(--ease-snappy),
    border-color 130ms var(--ease-snappy),
    box-shadow 130ms var(--ease-snappy);

  &:hover:not(.on) {
    color: var(--fg);
    border-color: var(--purple);
  }

  &.on,
  &[aria-selected='true'] {
    color: var(--ink);
    background: var(--cyan);
    border-color: var(--cyan);
    box-shadow: 0 0 14px rgba(39, 232, 255, 0.25);
  }
}

/* 13. GAMEPLAY: HUD, TIMER, QUESTION, INPUT ------------------------------- */
.hud {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  font: 10px var(--px);
  color: var(--dim);
  margin-bottom: 10px;
  font-variant-numeric: tabular-nums;

  b {
    color: var(--yellow);
    font-weight: 400;
  }
}

.timer {
  height: 14px;
  background: var(--shadow);
  border: 2px solid var(--line);
  margin-bottom: 22px;
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    width: 100%;
    background: var(--cyan);
    transform-origin: left center;
    transition:
      width 100ms linear,
      background-color 200ms ease;
  }

  &.low i {
    background: var(--bad);
    box-shadow: 0 0 12px rgba(255, 92, 122, 0.6);
    animation: pulse-low 0.5s steps(2) infinite;
  }
}

.q {
  font: clamp(14px, 3.8vw, 24px) / 1.6 var(--px);
  color: var(--fg);
  margin: 0 0 22px;
  text-wrap: balance;
}

.ans {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  input {
    flex: 1 1 220px;
    min-width: 0;
    font: 32px var(--tx);
    padding: 10px 14px;
    background: var(--shadow);
    color: var(--cyan);
    border: 3px solid var(--purple);
    border-radius: 0;
    caret-color: var(--yellow);
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease;

    &::placeholder {
      color: #5a4f94;
    }

    &:focus {
      outline: none;
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px rgba(39, 232, 255, 0.22);
    }
  }
}

/* 14. ANSWER REVEAL & SCORE TIERS ---------------------------------------- */
.rev {
  margin-top: 22px;
  border: 3px solid var(--purple);
  padding: 16px;
  background: var(--panel2);
  box-shadow: 6px 6px 0 var(--shadow);
  animation: pop-in 180ms var(--ease-snappy);

  .pts {
    font: clamp(22px, 6vw, 38px) / 1.2 var(--px);
    color: var(--yellow);
    font-variant-numeric: tabular-nums;
  }
}

.tier {
  display: inline-block;
  font: 9px var(--px);
  padding: 6px 8px;
  color: var(--ink);
  margin-bottom: 10px;
}

.t0   { background: var(--bad); color: #fff; }
.t10  { background: #b9b2e0; }
.t25  { background: var(--cyan); }
.t50  { background: var(--purple); color: #fff; }
.t100 { background: var(--yellow); }
.t200 { background: var(--good); }

/* Extra sparkle on the rarest tiers */
.t100,
.t200 {
  box-shadow: 0 0 14px color-mix(in srgb, currentColor 0%, transparent), 0 0 16px rgba(255, 217, 61, 0.35);
}

.rev:has(.t200) {
  animation:
    pop-in 180ms var(--ease-snappy),
    glow-rare 1.2s ease-in-out 3;
}

.meter {
  height: 12px;
  background: var(--shadow);
  border: 2px solid var(--line);
  margin: 10px 0;
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--purple), var(--cyan));
    transition: width 320ms var(--ease-snappy);
  }
}

.score {
  font: clamp(28px, 9vw, 60px) / 1.1 var(--px);
  color: var(--yellow);
  text-shadow:
    4px 4px 0 var(--purple),
    0 0 24px rgba(255, 217, 61, 0.25);
  margin: 10px 0;
  font-variant-numeric: tabular-nums;
}

.results-stats {
  margin: 22px 0;
  text-align: left;
}

/* 15. ACHIEVEMENTS & ROWS ------------------------------------------------- */
.ach {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 3px solid var(--line);
  background: var(--panel);
  transition:
    transform 140ms var(--ease-snappy),
    border-color 140ms ease;

  &:not(.off):hover {
    transform: translateY(-2px);
    border-color: var(--yellow);
  }

  &.off {
    opacity: 0.42;
    filter: grayscale(1);
  }

  i {
    width: 28px;
    height: 28px;
    flex: none;
    background: var(--yellow);
    box-shadow: inset -5px -5px 0 #c99a00;
  }
}

.rows {
  display: grid;
  gap: 8px;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  border-bottom: 2px solid var(--line);
  padding: 6px 0;
}

/* 16. FORMS & MISC -------------------------------------------------------- */
form {
  label {
    display: block;
    font: 9px var(--px);
    color: var(--dim);
    margin: 14px 0 6px;
  }

  input,
  select,
  textarea {
    width: 100%;
    font: 28px var(--tx);
    padding: 8px 12px;
    background: var(--shadow);
    color: var(--cyan);
    border: 3px solid var(--purple);
    border-radius: 0;
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease;

    &:focus {
      outline: none;
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px rgba(39, 232, 255, 0.22);
    }

    &:user-invalid {
      border-color: var(--bad);
    }
  }
}

/* The answer form has its own (hidden) label; don't apply form label spacing */
.ans label.sr-only {
  margin: -1px;
}

.note {
  font-size: 18px;
  color: var(--dim);
}

.tro {
  width: 34px;
  height: 37px;
  flex: none;
}

/* 17. UTILITIES ----------------------------------------------------------- */
.mt-10 { margin-top: 10px; }
.mt-12 { margin-top: 12px; }
.mt-14 { margin-top: 14px; }
.mb-16 { margin-bottom: 16px; }
.my-16 { margin-block: 16px; }
.m-0-6 { margin: 0 0 6px; }

.fs-18    { font-size: 18px; }
.fs-px-10 { font: 10px var(--px); }
.fs-px-11 { font-size: 11px; }

.ta-center { text-align: center; }
.ta-left   { text-align: left; }
.jc-center { justify-content: center; }

/* 18. FOOTER & NOSCRIPT --------------------------------------------------- */
.site-footer {
  flex: none;
  padding: 24px 16px calc(24px + env(safe-area-inset-bottom, 0px));
  text-align: center;
  border-top: 3px solid var(--line);
  margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px)))
    calc(-1 * max(16px, env(safe-area-inset-right, 0px)));
  background: color-mix(in srgb, var(--bg) 85%, transparent);

  p {
    margin: 0 auto;
  }
}

.noscript {
  max-width: var(--container-w);
  margin: 16px auto;
  text-align: center;
}

/* 19. RESPONSIVE ---------------------------------------------------------- */
@media (max-width: 760px) {
  /* Nav becomes a swipeable single row under the logo/tools */
  nav {
    order: 3;
    width: 100%;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

@media (max-width: 520px) {
  body {
    font-size: 21px;
  }

  .btn.big {
    width: 100%;
  }

  .panel {
    padding: 14px;
  }

  .av.l {
    width: 72px;
    height: 72px;
  }
}

/* 20. USER PREFERENCE QUERIES -------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

@media (prefers-contrast: more) {
  :root {
    --line: #6a55d6;
    --dim: #c9c2ee;
    --scan: 0;
  }
}

@media (forced-colors: active) {
  .btn,
  .tab,
  .panel,
  .stat {
    border: 2px solid ButtonText;
  }
}

@media print {
  .sky,
  header,
  .site-footer,
  body::before,
  body::after {
    display: none !important;
  }

  body {
    background: #fff;
    color: #000;
  }
}
