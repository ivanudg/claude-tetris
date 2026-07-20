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

const THEME_KEY = 'tetris-theme';
const GRID_COLORS = { dark: '#22222e', light: '#d7d7e6' };

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePowerUp, pendingPowerUp, pendingMonomino, freezeRemaining;
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
    if (cleared === 4) pendingMonomino = true; // Tetris: recompensa con bloque 1x1
    linesSincePowerUp += cleared;
    while (linesSincePowerUp >= POWERUP_EVERY) {
      linesSincePowerUp -= POWERUP_EVERY;
      pendingPowerUp = true;
    }
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
  applyWildcards();
  if (isPowerUp(current.type)) applyPowerUp(current);
  else merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
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

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
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

applyTheme();
init();
