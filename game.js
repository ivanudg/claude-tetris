'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - azul pálido
  '#ffb74d', // L - orange
  '#9e9e9e', // N - tuerca (gris acero)
  '#ff7043', // 9  - power-up bomba
  '#fff176', // 10 - power-up rayo
  '#f06292', // 11 - power-up tinte
  '#4db6ac', // 12 - power-up gravedad
  '#90caf9', // 13 - power-up congelar
  '#ffd700', // 14 - comodín (solo celda de tablero)
  '#f48fb1', // 15 - pentominó + (cruz)
  '#a5d6a7', // 16 - pentominó U (copa)
  '#ce93d8', // 17 - pentominó Y
  '#ffffff', // 18 - monominó 1x1 (recompensa por Tetris)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (anillo con hueco central)
  [[9]],                                       // power-up bomba
  [[10]],                                      // power-up rayo
  [[11]],                                      // power-up tinte
  [[12]],                                      // power-up gravedad
  [[13]],                                      // power-up congelar
  null,                                        // comodín: nunca se genera como pieza
  [[0,15,0],[15,15,15],[0,15,0]],              // pentominó + (cruz, invariante al rotar)
  [[16,0,16],[16,16,16],[0,0,0]],              // pentominó U (copa)
  [[0,17,0,0],[17,17,17,17],[0,0,0,0],[0,0,0,0]], // pentominó Y (línea de 4 + bump en el 2º)
  [[18]],                                      // monominó 1x1
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const POWERUP_EVERY = 10;   // líneas completadas entre power-ups
const FIRST_POWER = 9;
const LAST_POWER = 13;
const WILDCARD = 14;
const FREEZE_MS = 5000;
// Pentominós: sustituyen a un tetrominó estándar con PENTOMINO_CHANCE de probabilidad.
const PENTOMINOS = [15, 16, 17];
const PENTOMINO_CHANCE = 0.15;
// Monominó: recompensa inmediata por un Tetris (4 líneas de golpe).
const MONOMINO = 18;
// Iconos por tipo de celda: los 5 power-ups más el comodín, que si no se
// confundiría con el amarillo de la pieza O.
const CELL_ICONS = { 9: '💣', 10: '⚡', 11: '🎨', 12: '⬇️', 13: '❄️', 14: '✨' };

const T_PIECE = 3;
// Un T-Spin sustituye a LINE_SCORES (no se suma): indexado por líneas limpiadas.
const TSPIN_SCORES = [400, 800, 1200, 1600];
const TSPIN_MINI_SCORES = [100, 200, 400, 400];
// Perfect clear: bonus fijo aparte, indexado por líneas.
const PERFECT_SCORES = [0, 800, 1200, 1800, 2000];
const PERFECT_B2B_TETRIS = 3200; // perfect clear de 4 líneas encadenado a otra jugada difícil
const COMBO_UNIT = 50;           // puntos por nivel de combo, antes de multiplicar por level
const B2B_MULTIPLIER = 1.5;

const MAX_PARTICLES = 300;
const SHAKE_DECAY = 900;   // px/s a los que decae la magnitud del shake
const FLASH_MS = 220;
const AUDIO_KEY = 'tetris-muted';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const freezeIndicator = document.getElementById('freeze-indicator');
const freezeTimeEl = document.getElementById('freeze-time');
const comboIndicator = document.getElementById('combo-indicator');
const comboCountEl = document.getElementById('combo-count');
const b2bBadge = document.getElementById('b2b-badge');
const muteToggle = document.getElementById('mute-toggle');

const THEME_KEY = 'tetris-theme';
const GRID_COLORS = { dark: '#22222e', light: '#d7d7e6' };

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePowerUp, pendingPowerUp, pendingMonomino, freezeRemaining;
// Combo y bonificaciones. `combo` vale -1 sin combo activo y 0 en la primera
// limpieza: el bonus solo aplica desde combo >= 1 (convención estándar).
let combo, maxCombo, backToBack;
let shownCombo = -1; // último combo pintado en el HUD, para no reiniciar el pulso cada frame
// Última acción de la pieza activa: el T-Spin solo cuenta si acabó en rotación.
let lastActionWasRotation, lastKick;
// Efectos visuales (todos avanzan con el dt del loop, nunca con reloj de pared).
let particles = [], floatTexts = [];
let shakeRemaining = 0, shakeMagnitude = 0, flashRemaining = 0, flashColor = '#fff';
let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
let gridColor = GRID_COLORS[theme];

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  if (Math.random() < PENTOMINO_CHANCE)
    return makePiece(PENTOMINOS[Math.floor(Math.random() * PENTOMINOS.length)]);
  return makePiece(Math.floor(Math.random() * 8) + 1);
}

function isPowerUp(type) {
  return type >= FIRST_POWER && type <= LAST_POWER;
}

// Bloques que se fusionan con el tablero: tetrominós, tuerca, pentominós y monominó.
// Excluye power-ups (9-13) y comodín (14).
function isNormalBlock(type) {
  return (type >= 1 && type <= 8) || (type >= PENTOMINOS[0] && type <= MONOMINO);
}

function randomPowerUp() {
  return makePiece(FIRST_POWER + Math.floor(Math.random() * (LAST_POWER - FIRST_POWER + 1)));
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastActionWasRotation = true;
      lastKick = kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// Solo desplaza filas y cuenta. La puntuación vive en resolveScoring(), que
// necesita `cleared` para el combo y las bonificaciones.
function clearLines() {
  let cleared = 0;
  // Copia de cada fila antes de borrarla: las partículas necesitan sus colores
  // reales, y tras el splice el contenido de esa `y` ya es otro.
  const rows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      rows.push({ y: r, cells: [...board[r]] });
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++; // reevalúa la fila que acaba de desplazarse a esta posición
    }
  }
  return { cleared, rows };
}

function isBoardEmpty() {
  return board.every(row => row.every(v => v === 0));
}

// T-Spin: se evalúa ANTES del merge, con el tablero aún sin la pieza.
// Regla de 3 esquinas: la T ocupa una matriz 3x3 y su centro es (x+1, y+1);
// si 3 de las 4 diagonales están ocupadas (o fuera del tablero) es un T-Spin.
function detectSpin() {
  if (current.type !== T_PIECE || !lastActionWasRotation) return null;
  const cx = current.x + 1, cy = current.y + 1;
  let corners = 0;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const nx = cx + dx, ny = cy + dy;
    // Fuera del tablero cuenta como ocupado, igual que en collide().
    if (nx < 0 || nx >= COLS || ny >= ROWS) { corners++; continue; }
    if (ny >= 0 && board[ny][nx]) corners++;
  }
  if (corners < 3) return null;
  // Con kick lateral y solo 3 esquinas la jugada es un mini T-Spin.
  return (corners === 3 && lastKick !== 0) ? 'mini' : 'full';
}

// Aplica combo, back-to-back, T-Spin y perfect clear sobre la puntuación base,
// y emite los eventos de retroalimentación. Único punto que toca `score`
// por limpieza de líneas.
function resolveScoring({ cleared, spin, perfect, isPower, rows }) {
  if (!cleared) {
    // Un power-up se consume solo: no es un fallo del jugador, así que no
    // rompe el combo. Cualquier otra pieza sí lo rompe.
    if (!isPower && combo >= 0) {
      emitEvent('combo-break', { combo });
      combo = -1;
    }
    return;
  }

  combo++;
  if (combo > maxCombo) maxCombo = combo;

  const hardMove = cleared === 4 || spin !== null; // jugada "difícil" a efectos de B2B
  const b2bActive = hardMove && backToBack;

  const table = spin === 'mini' ? TSPIN_MINI_SCORES : spin ? TSPIN_SCORES : LINE_SCORES;
  let base = table[cleared] || 0;
  if (b2bActive) base = Math.floor(base * B2B_MULTIPLIER);

  const comboBonus = combo >= 1 ? COMBO_UNIT * combo : 0;
  let gained = (base + comboBonus) * level;

  if (perfect) {
    const perfectBase = (cleared === 4 && b2bActive) ? PERFECT_B2B_TETRIS : PERFECT_SCORES[cleared];
    gained += perfectBase * level;
  }

  score += gained;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  if (cleared === 4) pendingMonomino = true; // Tetris: recompensa con bloque 1x1
  linesSincePowerUp += cleared;
  while (linesSincePowerUp >= POWERUP_EVERY) {
    linesSincePowerUp -= POWERUP_EVERY;
    pendingPowerUp = true;
  }
  // Una limpieza fácil rompe el B2B; una difícil lo mantiene o lo abre.
  backToBack = hardMove;
  updateHUD();

  // Ancla vertical de los textos: la fila más alta de las limpiadas.
  const y = rows.length ? rows[rows.length - 1].y : Math.floor(ROWS / 2);
  emitEvent('line-clear', { cleared, y, gained, rows });
  if (spin) emitEvent('tspin', { spin, cleared, y });
  if (cleared === 4) emitEvent('tetris', { y });
  if (b2bActive) emitEvent('b2b', { y });
  if (combo >= 1) emitEvent('combo', { combo, y });
  if (perfect) emitEvent('perfect-clear', { cleared });
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastActionWasRotation = false; // bajar invalida el T-Spin
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

// Comodines creados por el Tinte: rellenan los huecos de su propia fila.
// Se ejecuta al inicio de cada bloqueo, así los comodines recién creados
// sobreviven un turno antes de actuar.
function applyWildcards() {
  for (let r = 0; r < ROWS; r++) {
    if (!board[r].includes(WILDCARD)) continue;
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === 0) board[r][c] = WILDCARD;
  }
}

function powerBomb(x, y) {
  let destroyed = 0;
  for (let r = y - 1; r <= y + 1; r++) {
    if (r < 0 || r >= ROWS) continue;
    for (let c = x - 1; c <= x + 1; c++) {
      if (c < 0 || c >= COLS) continue;
      if (board[r][c]) destroyed++;
      board[r][c] = 0;
    }
  }
  score += destroyed * 10;
  updateHUD();
}

function powerRay(x, y) {
  board[y].fill(0);
  for (let r = 0; r < ROWS; r++) board[r][x] = 0;
}

function powerTint() {
  const counts = new Array(COLORS.length).fill(0);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (isNormalBlock(v)) counts[v]++;
    }
  let dominant = 0; // counts[0] siempre 0: gana el primer máximo estricto
  for (let t = 1; t < counts.length; t++) if (counts[t] > counts[dominant]) dominant = t;
  if (!dominant) return;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === dominant) board[r][c] = WILDCARD;
}

function powerGravity() {
  for (let c = 0; c < COLS; c++) {
    const stack = [];
    for (let r = ROWS - 1; r >= 0; r--)
      if (board[r][c]) stack.push(board[r][c]);
    for (let r = ROWS - 1, i = 0; r >= 0; r--, i++)
      board[r][c] = i < stack.length ? stack[i] : 0;
  }
}

function applyPowerUp(piece) {
  const { type, x, y } = piece;
  switch (type) {
    case 9:  powerBomb(x, y); break;
    case 10: powerRay(x, y); break;
    case 11: powerTint(); break;
    case 12: powerGravity(); break;
    case 13: freezeRemaining = FREEZE_MS; break;
  }
}

function lockPiece() {
  const spin = detectSpin(); // antes del merge: lee el tablero sin la pieza
  applyWildcards();
  const isPower = isPowerUp(current.type);
  if (isPower) applyPowerUp(current);
  else merge();
  const { cleared, rows } = clearLines();
  const perfect = cleared > 0 && isBoardEmpty();
  resolveScoring({ cleared, spin, perfect, isPower, rows });
  spawn();
}

function spawn() {
  current = next;
  lastActionWasRotation = false;
  lastKick = 0;
  if (pendingMonomino) {
    // El monominó gana al power-up, pero no consume su flag: sale en el spawn siguiente.
    pendingMonomino = false;
    next = makePiece(MONOMINO);
  } else if (pendingPowerUp) {
    pendingPowerUp = false;
    next = randomPowerUp();
  } else {
    next = randomPiece();
  }
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  const frozen = freezeRemaining > 0;
  freezeIndicator.classList.toggle('hidden', !frozen);
  if (frozen) freezeTimeEl.textContent = (freezeRemaining / 1000).toFixed(1);
  comboIndicator.classList.toggle('hidden', combo < 1);
  if (combo >= 1 && combo !== shownCombo) {
    comboCountEl.textContent = `x${combo + 1}`;
    // Reinicia la animación de pulso, pero solo cuando el combo cambia:
    // updateHUD() se llama cada frame mientras el tablero está congelado.
    comboIndicator.classList.remove('pulse');
    void comboIndicator.offsetWidth;
    comboIndicator.classList.add('pulse');
  }
  shownCombo = combo;
  b2bBadge.classList.toggle('hidden', !backToBack);
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawCellIcon(context, x, y, type, size, alpha) {
  const icon = CELL_ICONS[type];
  if (!icon) return;
  context.globalAlpha = alpha ?? 1;
  context.font = `${Math.floor(size * 0.7)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // sombra para que el emoji destaque sobre el color del bloque
  context.shadowColor = 'rgba(0,0,0,0.55)';
  context.shadowBlur = 3;
  context.fillText(icon, x * size + size / 2, y * size + size / 2);
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Retroalimentación: partículas, textos flotantes, shake y flash.
// Todo se dibuja sobre el canvas del juego y avanza con el dt de loop().
// ---------------------------------------------------------------------------

function spawnParticles(cx, cy, count, color) {
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 220;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      life: 1, decay: 0.8 + Math.random() * 0.8,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

// Estalla una fila limpiada: una ráfaga por celda, con el color real del bloque.
// Recibe la copia hecha por clearLines(), no el tablero ya desplazado.
function burstRow(row, fallbackColor) {
  const cy = row.y * BLOCK + BLOCK / 2;
  for (let c = 0; c < COLS; c++)
    spawnParticles(c * BLOCK + BLOCK / 2, cy, 5, COLORS[row.cells[c]] || fallbackColor);
}

function spawnFloatText(text, y, color, size) {
  let py = y * BLOCK + BLOCK / 2;
  // Varios eventos de la misma jugada pueden apuntar a la misma fila: separa
  // los textos para que no se pisen.
  while (floatTexts.some(t => Math.abs(t.y - py) < 24)) py -= 26;
  floatTexts.push({
    text,
    x: canvas.width / 2,
    y: py,
    life: 1, decay: 0.7,
    color, size: size ?? 22,
  });
}

function addShake(magnitude) {
  shakeMagnitude = Math.max(shakeMagnitude, magnitude);
  shakeRemaining = Math.max(shakeRemaining, magnitude / SHAKE_DECAY * 1000);
}

function addFlash(color) {
  flashColor = color;
  flashRemaining = FLASH_MS;
}

function updateEffects(dt) {
  const s = dt / 1000;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * s;
    p.y += p.vy * s;
    p.vy += 520 * s; // gravedad
    p.life -= p.decay * s;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const t = floatTexts[i];
    t.y -= 40 * s;
    t.life -= t.decay * s;
    if (t.life <= 0) floatTexts.splice(i, 1);
  }
  if (shakeRemaining > 0) {
    shakeRemaining = Math.max(0, shakeRemaining - dt);
    shakeMagnitude = Math.max(0, shakeMagnitude - SHAKE_DECAY * s);
  }
  if (flashRemaining > 0) flashRemaining = Math.max(0, flashRemaining - dt);
}

function drawEffects() {
  if (flashRemaining > 0) {
    ctx.globalAlpha = (flashRemaining / FLASH_MS) * 0.35;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of floatTexts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life * 1.4));
    ctx.font = `bold ${t.size}px "Courier New", monospace`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

// ---------------------------------------------------------------------------
// Audio: sintetizado con Web Audio, sin ficheros. El AudioContext se crea
// perezosamente en el primer gesto del usuario (los navegadores bloquean
// el autoplay antes de eso).
// ---------------------------------------------------------------------------

let audioCtx = null;
let muted = localStorage.getItem(AUDIO_KEY) === '1';

function ensureAudio() {
  if (muted) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'triangle', gain = 0.12, delay = 0) {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(gain, t0);
  // Rampa exponencial: un corte seco produciría un click audible.
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function playSweep(from, to, duration, type = 'sawtooth', gain = 0.12) {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// Un semitono por nivel de combo, capado a una octava.
function comboPitch(base) {
  return base * Math.pow(2, Math.min(Math.max(combo, 0), 12) / 12);
}

function applyMute() {
  muteToggle.setAttribute('aria-checked', muted ? 'false' : 'true');
  muteToggle.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
  muteToggle.textContent = muted ? '🔇' : '🔊';
}

function toggleMute() {
  muted = !muted;
  localStorage.setItem(AUDIO_KEY, muted ? '1' : '0');
  applyMute();
}

// ---------------------------------------------------------------------------
// Bus de eventos: único punto que traduce jugadas en efectos y sonido.
// resolveScoring() solo emite; no sabe nada de partículas ni de audio.
// ---------------------------------------------------------------------------

function emitEvent(name, data) {
  switch (name) {
    case 'line-clear':
      for (const row of data.rows) burstRow(row, '#ffffff');
      addShake(4 + data.cleared * 3);
      spawnFloatText(`+${data.gained.toLocaleString()}`, data.y, '#ffffff', 18);
      playTone(comboPitch(440), 0.14, 'triangle');
      break;
    case 'combo':
      spawnFloatText(`COMBO x${data.combo + 1}`, Math.max(0, data.y - 1), '#ffd166', 24);
      playTone(comboPitch(660), 0.12, 'square', 0.08);
      break;
    case 'tetris':
      addFlash('#4cc9f0');
      addShake(14);
      spawnFloatText('TETRIS', Math.max(0, data.y - 2), '#4cc9f0', 30);
      [523.25, 659.25, 783.99].forEach((f, i) => playTone(f, 0.22, 'triangle', 0.1, i * 0.05));
      break;
    case 'tspin':
      addFlash('#c77dff');
      addShake(10);
      spawnFloatText(data.spin === 'mini' ? 'MINI T-SPIN' : 'T-SPIN', Math.max(0, data.y - 3), '#c77dff', 26);
      playSweep(880, 220, 0.3, 'sawtooth', 0.1);
      break;
    case 'b2b':
      spawnFloatText('BACK-TO-BACK', Math.max(0, data.y - 4), '#ff9f1c', 20);
      playTone(1046.5, 0.18, 'triangle', 0.09, 0.12);
      break;
    case 'perfect-clear':
      addFlash('#ffffff');
      addShake(22);
      spawnFloatText('PERFECT CLEAR!', Math.floor(ROWS / 2), '#ffffff', 30);
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        playTone(f, 0.3, 'triangle', 0.11, i * 0.07));
      break;
    case 'combo-break':
      if (data.combo >= 1) playTone(110, 0.2, 'square', 0.07);
      break;
    case 'game-over':
      playSweep(440, 60, 0.9, 'sawtooth', 0.12);
      break;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shakeMagnitude > 0)
    ctx.translate((Math.random() - 0.5) * 2 * shakeMagnitude, (Math.random() - 0.5) * 2 * shakeMagnitude);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, c, r, board[r][c], BLOCK);
      drawCellIcon(ctx, c, r, board[r][c], BLOCK);
    }

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
        drawCellIcon(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
      }

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++) {
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
      drawCellIcon(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    }

  drawEffects();
  ctx.restore();
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
      drawCellIcon(nextCtx, offX + c, offY + r, shape[r][c], NB);
    }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Combo máx.: x${maxCombo + 1}`;
  overlay.classList.remove('hidden');
  emitEvent('game-over', {});
}

function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  gridColor = GRID_COLORS[theme];
  themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  draw();
  drawNext();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  // Los efectos corren siempre, también con el tablero congelado por ❄️.
  updateEffects(dt);
  if (freezeRemaining > 0) {
    // congelación medida en dt: la pausa no consume el tiempo restante
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    dropAccum = 0;
    updateHUD();
  } else {
    dropAccum += dt;
  }
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      lastActionWasRotation = false; // la caída por gravedad invalida el T-Spin
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver || paused) return; // partida congelada: no reprogramar el frame
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  linesSincePowerUp = 0;
  pendingPowerUp = false;
  pendingMonomino = false;
  freezeRemaining = 0;
  combo = -1;
  maxCombo = 0;
  shownCombo = -1;
  backToBack = false;
  lastActionWasRotation = false;
  lastKick = 0;
  particles = [];
  floatTexts = [];
  shakeRemaining = 0;
  shakeMagnitude = 0;
  flashRemaining = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  ensureAudio(); // primer gesto del usuario: desbloquea el AudioContext
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastActionWasRotation = false; // mover lateralmente invalida el T-Spin
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastActionWasRotation = false;
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggle.addEventListener('click', toggleTheme);
muteToggle.addEventListener('click', toggleMute);

applyTheme();
applyMute();
init();
