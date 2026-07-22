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
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ---- Skins visuales ----
// Cada paleta comparte los MISMOS índices que COLORS (0 = null): la celda N usa colors[N].
const NEON_COLORS = [
  null,
  '#18f0ff', // I
  '#fff23d', // O
  '#e46bff', // T
  '#5cff8f', // S
  '#ff5c6b', // Z
  '#4d9bff', // J
  '#ffab3d', // L
];

const PASTEL_COLORS = [
  null,
  '#a8e6e2', // I
  '#fdf1a8', // O
  '#d7b8e8', // T
  '#b8e6c1', // S
  '#f5b8bd', // Z
  '#b8cdec', // J
  '#f5d3a8', // L
];

// SKINS: por cada skin, la paleta `colors` y su función de dibujo de bloque.
// El render lee siempre la paleta y la función del skin ACTIVO (ver drawBlock).
const SKINS = {
  retro:  { colors: COLORS,         grid: null,                                  draw: drawRetroBlock  },
  neon:   { colors: NEON_COLORS,    grid: { dark: '#0e2a2e', light: '#0e2a2e' }, draw: drawNeonBlock   },
  pastel: { colors: PASTEL_COLORS,  grid: null,                                  draw: drawPastelBlock },
  pixel:  { colors: COLORS,         grid: null,                                  draw: drawPixelBlock  },
};

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
const skinSelect = document.getElementById('skin-select');

const THEME_KEY = 'tetris-theme';
const SKIN_KEY = 'tetris-skin';
const GRID_COLORS = { dark: '#22222e', light: '#d7d7e6' };

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
let skin = localStorage.getItem(SKIN_KEY) || 'retro';
if (!SKINS[skin]) skin = 'retro';
let gridColor = currentGrid();

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
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

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
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
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
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
}

// Dispatcher: delega en la función de dibujo del skin ACTIVO.
// Lo usan draw(), drawNext(), el ghost (alpha 0.2) y cualquier panel de piezas.
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  SKINS[skin].draw(context, x, y, colorIndex, size, alpha);
}

// Retro: idéntico al render histórico (fillRect + highlight, colores planos).
function drawRetroBlock(context, x, y, colorIndex, size, alpha) {
  const color = SKINS.retro.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Neon: relleno con glow via shadowBlur sobre fondo negro.
function drawNeonBlock(context, x, y, colorIndex, size, alpha) {
  const color = SKINS.neon.colors[colorIndex];
  const a = alpha ?? 1;
  context.save();
  context.globalAlpha = a;
  context.shadowColor = color;
  context.shadowBlur = Math.max(4, size * 0.45);
  context.fillStyle = color;
  context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
  context.restore();
  // núcleo brillante sin sombra
  context.globalAlpha = a;
  context.fillStyle = 'rgba(255,255,255,0.28)';
  context.fillRect(x * size + size * 0.32, y * size + size * 0.32, size * 0.36, size * 0.36);
  context.globalAlpha = 1;
}

// Pastel: colores suaves con esquinas redondeadas.
function drawPastelBlock(context, x, y, colorIndex, size, alpha) {
  const color = SKINS.pastel.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  const px = x * size + 1, py = y * size + 1, s = size - 2, r = Math.max(3, size * 0.24);
  context.fillStyle = color;
  pathRoundRect(context, px, py, s, s, r);
  context.fill();
  // brillo superior suave (inset)
  context.fillStyle = 'rgba(255,255,255,0.4)';
  pathRoundRect(context, px + s * 0.16, py + s * 0.12, s * 0.68, s * 0.28, r * 0.5);
  context.fill();
  context.globalAlpha = 1;
}

// Pixel art: relleno base + textura de píxeles y borde nítido.
function drawPixelBlock(context, x, y, colorIndex, size, alpha) {
  const color = SKINS.pixel.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  const px = x * size, py = y * size;
  context.fillStyle = color;
  context.fillRect(px, py, size, size);
  // textura: rejilla 4x4 de sombras alternas (patrón determinista)
  const n = 4;
  const ps = size / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      context.fillStyle = ((i + j) % 2 === 0) ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.14)';
      context.fillRect(px + i * ps, py + j * ps, ps, ps);
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.4)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
  context.globalAlpha = 1;
}

// Traza un rectángulo redondeado (usa roundRect nativo si existe).
function pathRoundRect(context, x, y, w, h, r) {
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(x, y, w, h, r);
    return;
  }
  r = Math.min(r, w / 2, h / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// Color de rejilla del skin activo (con fallback al tema).
function currentGrid() {
  const g = SKINS[skin] && SKINS[skin].grid;
  return (g && g[theme]) || GRID_COLORS[theme];
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

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  gridColor = currentGrid();
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

const SKIN_CLASSES = Object.keys(SKINS).map(s => 'skin-' + s);

// Aplica clase de skin al body, recalcula rejilla y sincroniza el selector.
// Ortogonal al tema claro/oscuro: skin y tema conviven.
function applySkin() {
  document.body.classList.remove(...SKIN_CLASSES);
  document.body.classList.add('skin-' + skin);
  gridColor = currentGrid();
  if (skinSelect) skinSelect.value = skin;
}

function changeSkin(newSkin) {
  if (!SKINS[newSkin]) return;
  skin = newSkin;
  localStorage.setItem(SKIN_KEY, skin);
  applySkin();
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
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
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
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
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
if (skinSelect) skinSelect.addEventListener('change', () => changeSkin(skinSelect.value));

applyTheme();
applySkin();
init();
