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
const nameEntry = document.getElementById('name-entry');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const scoresBody = document.getElementById('scores-body');
const statMaxLines = document.getElementById('stat-max-lines');
const statMaxLevel = document.getElementById('stat-max-level');
const resetScoresBtn = document.getElementById('reset-scores-btn');

const THEME_KEY = 'tetris-theme';
const SCORES_KEY = 'tetris-scores';
const MAX_SCORES = 5;
const GRID_COLORS = { dark: '#22222e', light: '#d7d7e6' };

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
// Fila pendiente de guardar cuando la puntuación entra en el top al terminar la partida.
let pendingEntry = null;
let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
let gridColor = GRID_COLORS[theme];

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

// ---- Tabla de récords (localStorage) ----
function defaultScores() {
  return { top: [], maxLines: 0, maxLevel: 0 };
}

function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return defaultScores();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return defaultScores();
    const top = Array.isArray(data.top)
      ? data.top
          .filter(e => e && typeof e.score === 'number')
          .map(e => ({
            name: typeof e.name === 'string' ? e.name : 'Anónimo',
            score: e.score,
            lines: typeof e.lines === 'number' ? e.lines : 0,
            level: typeof e.level === 'number' ? e.level : 1,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_SCORES)
      : [];
    return {
      top,
      maxLines: typeof data.maxLines === 'number' ? data.maxLines : 0,
      maxLevel: typeof data.maxLevel === 'number' ? data.maxLevel : 0,
    };
  } catch (e) {
    return defaultScores();
  }
}

function saveScores(data) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(data));
  } catch (e) {
    /* almacenamiento no disponible: se ignora */
  }
}

function qualifiesForTop(scoreValue, top) {
  if (scoreValue <= 0) return false;
  if (top.length < MAX_SCORES) return true;
  return scoreValue > top[top.length - 1].score;
}

function sameEntry(a, b) {
  return a && b && a.score === b.score && a.lines === b.lines &&
    a.level === b.level && a.name === b.name;
}

// Renderiza la tabla del top y las estadísticas. `highlight` marca la fila lograda.
function renderScores(highlight) {
  const data = loadScores();
  statMaxLines.textContent = data.maxLines;
  statMaxLevel.textContent = data.maxLevel;

  let list = data.top.slice();
  if (pendingEntry) list = list.concat([pendingEntry]);
  list.sort((a, b) => b.score - a.score);
  list = list.slice(0, MAX_SCORES);

  scoresBody.innerHTML = '';
  if (list.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'scores-empty';
    td.textContent = 'Aún no hay récords';
    tr.appendChild(td);
    scoresBody.appendChild(tr);
    return;
  }

  list.forEach((entry, i) => {
    const tr = document.createElement('tr');
    if (highlight && sameEntry(entry, highlight)) tr.className = 'score-new';
    const rank = document.createElement('td');
    rank.className = 'score-rank';
    rank.textContent = `${i + 1}.`;
    const name = document.createElement('td');
    name.className = 'score-name';
    name.textContent = entry.name || 'Anónimo';
    const pts = document.createElement('td');
    pts.className = 'score-points';
    pts.textContent = Number(entry.score).toLocaleString();
    tr.append(rank, name, pts);
    scoresBody.appendChild(tr);
  });
}

// Al terminar la partida: actualiza estadísticas y prepara la entrada al top si procede.
function handleGameOverScores() {
  const data = loadScores();
  data.maxLines = Math.max(data.maxLines, lines);
  data.maxLevel = Math.max(data.maxLevel, level);
  saveScores(data);

  if (qualifiesForTop(score, data.top)) {
    pendingEntry = { name: '', score, lines, level };
    nameInput.value = '';
    nameEntry.classList.remove('hidden');
    renderScores(pendingEntry);
    setTimeout(() => nameInput.focus(), 30);
  } else {
    pendingEntry = null;
    nameEntry.classList.add('hidden');
    renderScores(null);
  }
}

function savePendingScore() {
  if (!pendingEntry) return;
  pendingEntry.name = (nameInput.value.trim() || 'Anónimo').slice(0, 12);
  const snapshot = { ...pendingEntry };
  const data = loadScores();
  data.top.push(snapshot);
  data.top.sort((a, b) => b.score - a.score);
  data.top = data.top.slice(0, MAX_SCORES);
  saveScores(data);
  pendingEntry = null;
  nameEntry.classList.add('hidden');
  renderScores(snapshot);
}

function resetScores() {
  try {
    localStorage.removeItem(SCORES_KEY);
  } catch (e) {
    /* se ignora */
  }
  pendingEntry = null;
  nameEntry.classList.add('hidden');
  renderScores(null);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  handleGameOverScores();
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
    nameEntry.classList.add('hidden');
    renderScores(null);
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
  // Si había un récord sin confirmar, se guarda con el nombre escrito (o "Anónimo").
  if (pendingEntry) savePendingScore();
  nameEntry.classList.add('hidden');
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

saveScoreBtn.addEventListener('click', savePendingScore);
nameInput.addEventListener('input', () => {
  if (!pendingEntry) return;
  pendingEntry.name = nameInput.value;
  renderScores(pendingEntry);
});
nameInput.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.code === 'Enter') savePendingScore();
});
resetScoresBtn.addEventListener('click', resetScores);

applyTheme();
init();
