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
  '#4a4a52', // 19 - bloque indestructible (modo Puzzle)
  '#78787f', // 20 - línea basura (modo Supervivencia)
];

// ---------------------------------------------------------------------------
// Skins (temas visuales). Cada paleta es PARALELA a COLORS: índice 0 = null y
// entradas 1..20 en el mismo orden (pieza y color comparten índice). Retro y
// Pixel art reutilizan COLORS; solo Neón y Pastel definen paletas propias.
// La tabla SKINS (más abajo, tras las funciones drawBlock*) enlaza cada skin
// con su paleta, fondo de canvas, color de rejilla y función de dibujo.

const NEON_PALETTE = [
  null,
  '#18ffff', // I - cyan neón
  '#ffea00', // O - amarillo neón
  '#e040fb', // T - magenta
  '#00e676', // S - verde neón
  '#ff1744', // Z - rojo neón
  '#2979ff', // J - azul eléctrico
  '#ff9100', // L - naranja neón
  '#b0bec5', // 8  - tuerca (acero claro)
  '#ff3d00', // 9  - bomba
  '#ffff00', // 10 - rayo
  '#ff4081', // 11 - tinte
  '#1de9b6', // 12 - gravedad
  '#40c4ff', // 13 - congelar
  '#ffea00', // 14 - comodín
  '#ff80ab', // 15 - pentominó cruz
  '#69f0ae', // 16 - pentominó copa
  '#ea80fc', // 17 - pentominó Y
  '#ffffff', // 18 - monominó
  '#546e7a', // 19 - indestructible
  '#78909c', // 20 - basura
];

const PASTEL_PALETTE = [
  null,
  '#a7e8ef', // I
  '#ffe9a8', // O
  '#e0bbe4', // T
  '#b8e6c1', // S
  '#f4b6b6', // Z
  '#b6d1f4', // J
  '#ffd9a8', // L
  '#cfcfd6', // 8  - tuerca
  '#ffc4a3', // 9  - bomba
  '#fff3b0', // 10 - rayo
  '#f7c1d9', // 11 - tinte
  '#b5e3dd', // 12 - gravedad
  '#c7e0f7', // 13 - congelar
  '#ffe6a0', // 14 - comodín
  '#f6c6d8', // 15 - pentominó cruz
  '#c8e6c9', // 16 - pentominó copa
  '#e1c4ea', // 17 - pentominó Y
  '#ffffff', // 18 - monominó
  '#c4c4cc', // 19 - indestructible
  '#d0d0d8', // 20 - basura
];

// Paleta neón para tema claro: los tonos neón puros (cian/amarillo brillantes)
// se pierden sobre un lienzo pálido, así que en claro se usan versiones más
// saturadas y oscuras, y el monominó (18) se oscurece para no desaparecer.
const NEON_PALETTE_LIGHT = [
  null,
  '#00acc1', // I - cian
  '#f9a825', // O - ámbar
  '#9c27b0', // T - magenta
  '#00a152', // S - verde
  '#d50000', // Z - rojo
  '#1565c0', // J - azul
  '#ef6c00', // L - naranja
  '#78909c', // 8  - tuerca
  '#dd2c00', // 9  - bomba
  '#fbc02d', // 10 - rayo
  '#e91e63', // 11 - tinte
  '#00897b', // 12 - gravedad
  '#0288d1', // 13 - congelar
  '#fbc02d', // 14 - comodín
  '#ec407a', // 15 - pentominó cruz
  '#43a047', // 16 - pentominó copa
  '#ab47bc', // 17 - pentominó Y
  '#37474f', // 18 - monominó
  '#455a64', // 19 - indestructible
  '#607d8b', // 20 - basura
];

// Las funciones drawBlock* son declaraciones (hoisted), así que se pueden
// referenciar aquí aunque estén definidas más abajo. Cada campo dependiente del
// tema (palette/canvasBg/grid) puede ser un valor fijo o un objeto {dark, light}
// que `themeValue()` resuelve según el tema activo. `canvasBg: null` = usar el
// fondo del CSS/clearRect; `grid: null` = usar GRID_COLORS[theme].
const SKINS = {
  retro:  { label: 'Retro',     palette: COLORS,         canvasBg: null,      grid: null,      draw: drawBlockFlat },
  neon:   { label: 'Neón',      palette: { dark: NEON_PALETTE, light: NEON_PALETTE_LIGHT }, canvasBg: { dark: '#05050a', light: '#eef1ff' }, grid: { dark: '#1b2340', light: '#c3cbee' }, draw: drawBlockNeon },
  pastel: { label: 'Pastel',    palette: PASTEL_PALETTE, canvasBg: null,      grid: null,      draw: drawBlockRounded },
  pixel:  { label: 'Pixel art', palette: COLORS,         canvasBg: null,      grid: null,      draw: drawBlockPixel },
};

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
  null,                                        // indestructible: solo celda de tablero
  null,                                        // basura: solo celda de tablero
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

// ---------------------------------------------------------------------------
// Habilidades cargables: la energía se llena limpiando líneas y se gasta desde
// el menú de habilidades (tecla E), que congela la partida mientras está abierto.
// ---------------------------------------------------------------------------

const ENERGY_MAX = 100;
const ENERGY_GAIN = [0, 10, 25, 45, 70]; // energía por líneas simultáneas

const SKILLS = [
  { id: 'vision', key: 'Digit1', icon: '👁', name: 'Visión de Futuro', cost: 25, color: '#4dd0e1' },
  { id: 'swap', key: 'Digit2', icon: '🔄', name: 'Intercambio de Pool', cost: 30, color: '#ba68c8' },
  { id: 'slow', key: 'Digit3', icon: '⏳', name: 'Distorsión Temporal', cost: 45, color: '#90caf9' },
  { id: 'rewind', key: 'Digit4', icon: '↩', name: 'Rebobinar', cost: 70, color: '#ffd54f' },
];

const QUEUE_MAX = 5;      // piezas precalculadas; la Visión enseña las 5
const VISION_PIECES = 10; // piezas durante las que la cola queda ampliada
const SLOW_MS = 10000;
const SLOW_FACTOR = 0.25; // 25% de velocidad de caída => intervalo x4

const T_PIECE = 3;
// Un T-Spin sustituye a LINE_SCORES (no se suma): indexado por líneas limpiadas.
const TSPIN_SCORES = [400, 800, 1200, 1600];
const TSPIN_MINI_SCORES = [100, 200, 400, 400];
// Perfect clear: bonus fijo aparte, indexado por líneas.
const PERFECT_SCORES = [0, 800, 1200, 1800, 2000];
const PERFECT_B2B_TETRIS = 3200; // perfect clear de 4 líneas encadenado a otra jugada difícil
const COMBO_UNIT = 50;           // puntos por nivel de combo, antes de multiplicar por level
const B2B_MULTIPLIER = 1.5;

// ---------------------------------------------------------------------------
// Modo Desafío: objetivos de nivel (contra reloj, supervivencia) y mutadores
// (puzzle, piezas invisibles, rotación inversa). Todos combinables entre sí.
// ---------------------------------------------------------------------------

// Tipos de celda exclusivos del modo desafío: nunca se generan como pieza.
const INDESTRUCTIBLE = 19; // no se limpia, no lo borran bomba ni rayo
const GARBAGE = 20;        // bloque normal a todos los efectos, solo cambia el color

// Lock delay: al tocar suelo la pieza espera antes de consolidarse. Es la
// ventana que el mutador "invisibles" aprovecha para ocultarla.
const LOCK_DELAY_MS = 500;
const LOCK_RESET_MAX = 15; // tope de reinicios por pieza: corta el infinite spin

const CHALLENGE_DEFAULTS = {
  mode: 'classic',      // 'classic' | 'timeAttack' | 'survival'
  targetLines: 20,      // contra reloj: líneas a limpiar
  timeLimitMs: 120000,  // contra reloj: tiempo disponible
  garbageEveryMs: 15000,// supervivencia: cada cuánto sube una fila basura
  mutators: { puzzle: false, invisible: false, reverse: false },
};

const TIME_WARNING_MS = 10000; // umbral de aviso del temporizador

// Tableros de partida del mutador Puzzle, anclados al fondo.
// '.' = vacío · '#' = indestructible · dígito = bloque normal (tipo 1-7).
const PUZZLE_LAYOUTS = [
  [
    '..........',
    '###....###',
    '6.11..22.7',
    '6.11..22.7',
  ],
  [
    '....##....',
    '33......44',
    '33..##..44',
    '5555##5555',
  ],
  [
    '#........#',
    '#..7777..#',
    '#.166661.#',
    '..1.##.1..',
  ],
  [
    '..#....#..',
    '2.#.55.#.3',
    '2...55...3',
    '4444..4444',
  ],
];

const MAX_PARTICLES = 300;
const SHAKE_DECAY = 900;   // px/s a los que decae la magnitud del shake
const FLASH_MS = 220;
const AUDIO_KEY = 'tetris-muted';
const RECORDS_KEY = 'tetris-records';
const MAX_RECORDS = 5;
const MODE_LABELS = { classic: 'Clásico', timeAttack: 'Contra Reloj', survival: 'Supervivencia' };

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
const freezeIndicator = document.getElementById('freeze-indicator');
const freezeTimeEl = document.getElementById('freeze-time');
const comboIndicator = document.getElementById('combo-indicator');
const comboCountEl = document.getElementById('combo-count');
const b2bBadge = document.getElementById('b2b-badge');
const muteToggle = document.getElementById('mute-toggle');
const challengeConfig = document.getElementById('challenge-config');
const modeSelect = document.getElementById('mode-select');
const mutPuzzle = document.getElementById('mut-puzzle');
const mutInvisible = document.getElementById('mut-invisible');
const mutReverse = document.getElementById('mut-reverse');
const objectivePanel = document.getElementById('objective-panel');
const objectiveTimerRow = document.getElementById('objective-timer-row');
const objectiveTimerEl = document.getElementById('objective-timer');
const objectiveLinesRow = document.getElementById('objective-lines-row');
const objectiveLinesEl = document.getElementById('objective-lines');
const objectiveGarbageRow = document.getElementById('objective-garbage-row');
const objectiveGarbageEl = document.getElementById('objective-garbage');
const mutatorBadges = document.getElementById('mutator-badges');
const holdPanel = document.getElementById('hold-panel');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const energyBar = document.getElementById('energy-bar');
const energyFill = document.getElementById('energy-fill');
const energyValueEl = document.getElementById('energy-value');
const visionBadge = document.getElementById('vision-badge');
const visionCountEl = document.getElementById('vision-count');
const slowBadge = document.getElementById('slow-badge');
const slowTimeEl = document.getElementById('slow-time');
const skillMenu = document.getElementById('skill-menu');
const skillList = document.getElementById('skill-list');
const skillEnergyFill = document.getElementById('skill-energy-fill');
const skillEnergyValueEl = document.getElementById('skill-energy-value');
const pauseMenu = document.getElementById('pause-menu');
const startLevelSelect = document.getElementById('start-level-select');
const startLevelSelectMenu = document.getElementById('start-level-select-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const pauseControls = document.getElementById('pause-controls');
const recordsPanel = document.getElementById('records-panel');
const recordsList = document.getElementById('records-list');
const recordsEmpty = document.getElementById('records-empty');
const recordComboEl = document.getElementById('record-combo');
const recordLinesEl = document.getElementById('record-lines');
const nameEntry = document.getElementById('name-entry');
const recordNameInput = document.getElementById('record-name');
const saveRecordBtn = document.getElementById('save-record-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');

const THEME_KEY = 'tetris-theme';
const SKIN_KEY = 'tetris-skin';
const GRID_COLORS = { dark: '#22222e', light: '#d7d7e6' };

// `queue` sustituye a la antigua variable `next`: la Visión de Futuro necesita
// tener QUEUE_MAX piezas ya generadas. queue[0] es la pieza siguiente.
let board, current, queue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
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
// Modo desafío. `challenge` lo fija startGame() desde el menú y sobrevive a
// init(), igual que el tema y el silencio: init() resetea la partida, no la
// configuración elegida.
let challenge = cloneChallenge(CHALLENGE_DEFAULTS);
// Nivel con el que arranca la próxima partida. Como `challenge`, es
// configuración: sobrevive a init() y lo fija el selector del menú de pausa /
// principal vía setStartLevel().
let startLevel = 1;
const START_LEVEL_MAX = 15;
let timeRemaining, garbageAccum, warnedTime, won;
// Lock delay de la pieza activa. `lockTimer > 0` significa "apoyada".
let lockTimer, lockResets;
// Habilidades. `undoSnapshot` guarda el estado previo al último bloqueo (un
// solo nivel: Rebobinar no se encadena). `holdType` es un tipo, no una pieza:
// la pieza se reconstruye con makePiece(). `canHold` no es una habilidad: es el
// lockout anti-abuso del hold clásico, un uso por pieza caída.
let energy, holdType, canHold, visionRemaining, slowRemaining, undoSnapshot, skillMenuOpen, energyWasFull;
let shownEnergy = -1; // última energía pintada: el HUD se refresca cada frame
let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
let gridColor = GRID_COLORS[theme];
// Skin activo: configuración persistente, no estado de partida (init() no lo
// resetea, igual que theme/muted/challenge). `activeColors` es la paleta del
// skin en curso; drawBlock y burstRow leen de ahí, no de COLORS directamente.
let skin = SKINS[localStorage.getItem(SKIN_KEY)] ? localStorage.getItem(SKIN_KEY) : 'retro';
let activeColors = activePalette();
// Índice de la entrada del top recién conseguida (para resaltarla). Es estado de
// UI, no de partida: init() no lo toca; showMenu() lo reinicia a -1.
let newRecordIndex = -1;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function cloneChallenge(src) {
  return { ...src, mutators: { ...src.mutators } };
}

// Escribe un layout de PUZZLE_LAYOUTS anclado al fondo del tablero.
function applyPuzzleLayout() {
  const layout = PUZZLE_LAYOUTS[Math.floor(Math.random() * PUZZLE_LAYOUTS.length)];
  const top = ROWS - layout.length;
  for (let r = 0; r < layout.length; r++)
    for (let c = 0; c < COLS; c++) {
      const ch = layout[r][c];
      if (ch === '.') continue;
      board[top + r][c] = ch === '#' ? INDESTRUCTIBLE : Number(ch);
    }
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

// Bloques que se fusionan con el tablero: tetrominós, tuerca, pentominós,
// monominó y basura. Excluye power-ups (9-13), comodín (14) e indestructible
// (19), que no debe contar como color dominante para el Tinte.
function isNormalBlock(type) {
  return (type >= 1 && type <= 8) || (type >= PENTOMINOS[0] && type <= MONOMINO) || type === GARBAGE;
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

function rotateCCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[cols - 1 - c][r] = shape[r][c];
  return result;
}

// `dir` = 1 horario, -1 antihorario. El mutador de rotación inversa se aplica
// en el keydown, no aquí: esta función solo obedece la dirección que recibe.
function tryRotate(dir = 1) {
  const rotated = dir === 1 ? rotateCW(current.shape) : rotateCCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastActionWasRotation = true;
      lastKick = kick;
      resetLockTimer();
      return;
    }
  }
}

// Rotar o mover una pieza ya apoyada reinicia su lock delay, con un tope por
// pieza para que no se pueda posponer el bloqueo indefinidamente.
function resetLockTimer() {
  if (lockTimer <= 0) return;
  if (lockResets >= LOCK_RESET_MAX) return;
  lockResets++;
  lockTimer = 0;
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
    // Una fila con un bloque indestructible nunca se limpia, esté llena o no.
    if (board[r].every(v => v !== 0 && v !== INDESTRUCTIBLE)) {
      rows.push({ y: r, cells: [...board[r]] });
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++; // reevalúa la fila que acaba de desplazarse a esta posición
    }
  }
  return { cleared, rows };
}

// Los indestructibles del modo Puzzle no cuentan: si no, el Perfect Clear
// sería inalcanzable con ese mutador activo.
function isBoardEmpty() {
  return board.every(row => row.every(v => v === 0 || v === INDESTRUCTIBLE));
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
  addEnergy(ENERGY_GAIN[Math.min(cleared, ENERGY_GAIN.length - 1)]);
  // Reanclado a `startLevel`: subir 10 líneas sube un nivel sobre el inicial,
  // que puede ser > 1. Con startLevel = 1 es idéntico a la fórmula clásica.
  level = startLevel + Math.floor(lines / 10);
  dropInterval = levelToDropInterval(level);
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
      if (board[r][c] === INDESTRUCTIBLE) continue; // la bomba no lo rompe
      if (board[r][c]) destroyed++;
      board[r][c] = 0;
    }
  }
  score += destroyed * 10;
  updateHUD();
}

function powerRay(x, y) {
  // No se puede usar fill(0): los indestructibles sobreviven al rayo.
  for (let c = 0; c < COLS; c++) if (board[y][c] !== INDESTRUCTIBLE) board[y][c] = 0;
  for (let r = 0; r < ROWS; r++) if (board[r][x] !== INDESTRUCTIBLE) board[r][x] = 0;
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

// Compacta cada columna hacia abajo. Los indestructibles actúan como suelo:
// la columna se compacta por segmentos entre ellos, así ni flotan ni se hunden.
function powerGravity() {
  for (let c = 0; c < COLS; c++) {
    let bottom = ROWS - 1; // fondo del segmento que se está compactando
    for (let r = ROWS - 1; r >= -1; r--) {
      if (r >= 0 && board[r][c] !== INDESTRUCTIBLE) continue;
      // r es un indestructible (o el borde superior): compacta [r+1, bottom].
      const stack = [];
      for (let s = bottom; s > r; s--)
        if (board[s][c]) stack.push(board[s][c]);
      for (let s = bottom, i = 0; s > r; s--, i++)
        board[s][c] = i < stack.length ? stack[i] : 0;
      bottom = r - 1;
    }
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

// Supervivencia: empuja una fila basura desde abajo con un único hueco.
// Todo el tablero sube una fila, la pieza activa incluida.
function pushGarbageRow() {
  if (board[0].some(v => v !== 0)) { endGame('crushed'); return; }
  const row = new Array(COLS).fill(GARBAGE);
  row[Math.floor(Math.random() * COLS)] = 0;
  board.shift();
  board.push(row);
  // La pieza sube con el tablero para no quedar enterrada, salvo que ya esté
  // pegada al techo: ahí se queda donde está y muere solo si la fila la aplasta.
  if (current.y > 0 && !collide(current.shape, current.x, current.y - 1)) current.y--;
  emitEvent('garbage-push', {});
  if (collide(current.shape, current.x, current.y)) endGame('crushed');
}

// Condición de victoria del objetivo activo. Devuelve true si la partida
// terminó, para que quien llama corte su flujo.
function checkObjective() {
  if (challenge.mode !== 'timeAttack') return false;
  if (lines < challenge.targetLines) return false;
  winGame();
  return true;
}

// ---------------------------------------------------------------------------
// Habilidades cargables: recurso, catálogo de efectos y menú de activación.
// ---------------------------------------------------------------------------

function addEnergy(amount) {
  energy = Math.min(ENERGY_MAX, energy + amount);
  if (energy >= ENERGY_MAX && !energyWasFull) emitEvent('energy-full', {});
  energyWasFull = energy >= ENERGY_MAX;
}

function clonePiece(p) {
  return { type: p.type, shape: p.shape.map(row => [...row]), x: p.x, y: p.y };
}

// Estado justo antes de consolidar la pieza. Un solo nivel: Rebobinar no se
// encadena. No guarda los relojes del desafío: rebobinar deshace el tablero,
// no el tiempo transcurrido.
function takeSnapshot() {
  undoSnapshot = {
    board: board.map(row => [...row]),
    piece: clonePiece(current),
    queue: queue.map(clonePiece),
    score, lines, level, dropInterval,
    combo, maxCombo, backToBack,
    linesSincePowerUp, pendingPowerUp, pendingMonomino,
    holdType, canHold,
  };
}

function restoreSnapshot() {
  const s = undoSnapshot;
  board = s.board.map(row => [...row]);
  current = clonePiece(s.piece);
  queue = s.queue.map(clonePiece);
  score = s.score;
  lines = s.lines;
  level = s.level;
  dropInterval = s.dropInterval;
  combo = s.combo;
  maxCombo = s.maxCombo;
  backToBack = s.backToBack;
  linesSincePowerUp = s.linesSincePowerUp;
  pendingPowerUp = s.pendingPowerUp;
  pendingMonomino = s.pendingMonomino;
  holdType = s.holdType;
  canHold = s.canHold;
  lockTimer = 0;
  lockResets = 0;
  dropAccum = 0;
  lastActionWasRotation = false;
  lastKick = 0;
  shownCombo = -1;
  undoSnapshot = null; // sin encadenar rebobinados
}

// Curva de velocidad: baja 90 ms por nivel hasta el suelo de 100 ms. Único
// sitio con la fórmula, la comparten init() y resolveScoring().
function levelToDropInterval(lvl) {
  return Math.max(100, 1000 - (lvl - 1) * 90);
}

// La Distorsión Temporal no toca `dropInterval`: resolveScoring() lo recalcula
// por nivel y se llevaría el efecto por delante.
function effectiveDropInterval() {
  return slowRemaining > 0 ? dropInterval / SLOW_FACTOR : dropInterval;
}

function skillById(id) {
  return SKILLS.find(s => s.id === id);
}

function canUseSkill(skill) {
  if (energy < skill.cost) return false;
  if (skill.id === 'rewind' && !undoSnapshot) return false;
  return true;
}

// Ejecuta el efecto. Devuelve false si la habilidad no llegó a aplicarse:
// quien llama no cobra la energía en ese caso.
function useSkill(id) {
  switch (id) {
    case 'vision':
      visionRemaining = VISION_PIECES;
      drawNext();
      return true;

    case 'swap': {
      const piece = randomPiece();
      // Sin sitio arriba la habilidad no se gasta: no debe poder matar al jugador.
      if (collide(piece.shape, piece.x, piece.y)) return false;
      current = piece;
      lockTimer = 0;
      lockResets = 0;
      dropAccum = 0;
      lastActionWasRotation = false;
      lastKick = 0;
      return true;
    }

    case 'slow':
      slowRemaining = SLOW_MS;
      return true;

    case 'rewind':
      if (!undoSnapshot) return false;
      restoreSnapshot();
      drawNext();
      drawHold();
      return true;
  }
  return false;
}

function activateSkill(id) {
  const skill = skillById(id);
  if (!skill || !canUseSkill(skill)) return;
  if (!useSkill(id)) return; // efecto abortado: no se cobra
  energy -= skill.cost;
  energyWasFull = energy >= ENERGY_MAX;
  emitEvent('skill-use', { skill });
  updateHUD();
  closeSkillMenu();
}

function renderSkillMenu() {
  skillList.innerHTML = '';
  for (let i = 0; i < SKILLS.length; i++) {
    const skill = SKILLS[i];
    const li = document.createElement('li');
    li.classList.toggle('disabled', !canUseSkill(skill));
    li.innerHTML =
      `<kbd>${i + 1}</kbd>` +
      `<span class="skill-icon">${skill.icon}</span>` +
      `<span>${skill.name}</span>` +
      `<span class="skill-cost">${skill.cost}</span>`;
    li.addEventListener('click', () => activateSkill(skill.id));
    skillList.appendChild(li);
  }
  const pct = (energy / ENERGY_MAX) * 100;
  skillEnergyFill.style.width = `${pct}%`;
  skillEnergyValueEl.textContent = `${energy} / ${ENERGY_MAX}`;
}

function openSkillMenu() {
  if (paused || gameOver || skillMenuOpen) return;
  draw(); // deja el último fotograma pintado bajo el overlay
  skillMenuOpen = true;
  cancelAnimationFrame(animId);
  renderSkillMenu();
  skillMenu.classList.remove('hidden');
}

function closeSkillMenu() {
  if (!skillMenuOpen) return;
  skillMenu.classList.add('hidden');
  skillMenuOpen = false;
  if (gameOver || paused) return; // una habilidad pudo terminar la partida
  // Reiniciar lastTime es obligatorio: si no, el primer dt sería enorme.
  lastTime = performance.now();
  loop(lastTime);
}

function handleSkillMenuKey(e) {
  if (e.code === 'Escape' || e.code === 'KeyE') { closeSkillMenu(); return; }
  const skill = SKILLS.find(s => s.key === e.code);
  if (skill) activateSkill(skill.id);
}

function lockPiece() {
  takeSnapshot(); // lo primero: Rebobinar revierte a este instante exacto
  const spin = detectSpin(); // antes del merge: lee el tablero sin la pieza
  applyWildcards();
  const isPower = isPowerUp(current.type);
  if (isPower) applyPowerUp(current);
  else merge();
  const { cleared, rows } = clearLines();
  const perfect = cleared > 0 && isBoardEmpty();
  resolveScoring({ cleared, spin, perfect, isPower, rows });
  // La victoria se comprueba antes del spawn: con el tablero alto, generar la
  // pieza siguiente daría un game over espurio justo al ganar.
  if (checkObjective()) return;
  spawn();
}

// Rellena la cola hasta QUEUE_MAX. Solo añade por el final: las piezas ya
// visibles con la Visión de Futuro no deben cambiar.
function refillQueue() {
  while (queue.length < QUEUE_MAX) queue.push(randomPiece());
}

// Hold clásico: gratis, instantáneo y una sola vez por pieza caída. `holdType`
// guarda el tipo, no la pieza, así que lo reservado vuelve siempre con su
// rotación y posición iniciales.
function holdPiece() {
  if (!canHold) return;
  canHold = false;
  const stored = holdType;
  holdType = current.type;
  if (stored === null) {
    // Slot vacío: se tira de la cola a mano. Llamar a spawn() sería un bug:
    // reactivaría canHold y consumiría las recompensas pendientes fuera de turno.
    current = queue.shift();
    refillQueue();
  } else {
    current = makePiece(stored);
  }
  lockTimer = 0;
  lockResets = 0;
  dropAccum = 0;
  lastActionWasRotation = false; // cambiar de pieza invalida el T-Spin
  lastKick = 0;
  // La pieza recuperada puede no caber si el tablero llegó al techo.
  if (collide(current.shape, current.x, current.y)) { endGame(); return; }
  emitEvent('hold', {});
  drawNext();
  drawHold();
}

function spawn() {
  current = queue.shift();
  lastActionWasRotation = false;
  lastKick = 0;
  lockTimer = 0;
  lockResets = 0;
  canHold = true; // única entrada de pieza nueva: aquí se libera el lockout
  // Los flags pendientes se insertan al frente de lo que queda de cola, es
  // decir en la posición que antes ocupaba `next`: la recompensa sigue saliendo
  // un spawn más tarde, igual que antes de existir la cola.
  if (pendingMonomino) {
    // El monominó gana al power-up, pero no consume su flag: sale en el spawn siguiente.
    pendingMonomino = false;
    queue.unshift(makePiece(MONOMINO));
  } else if (pendingPowerUp) {
    pendingPowerUp = false;
    queue.unshift(randomPowerUp());
  }
  refillQueue();
  if (visionRemaining > 0) visionRemaining--;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
  drawHold();
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
  // La energía no cambia cada frame: escribir solo cuando cambia evita repintar
  // la barra mientras el tablero está congelado.
  if (energy !== shownEnergy) {
    energyFill.style.width = `${(energy / ENERGY_MAX) * 100}%`;
    energyValueEl.textContent = `${energy} / ${ENERGY_MAX}`;
    energyBar.classList.toggle('full', energy >= ENERGY_MAX);
    shownEnergy = energy;
  }
  visionBadge.classList.toggle('hidden', visionRemaining <= 0);
  if (visionRemaining > 0) visionCountEl.textContent = visionRemaining;
  const slow = slowRemaining > 0;
  slowBadge.classList.toggle('hidden', !slow);
  if (slow) slowTimeEl.textContent = (slowRemaining / 1000).toFixed(1);
  updateObjectiveHUD();
}

function updateObjectiveHUD() {
  const timed = challenge.mode === 'timeAttack';
  const survival = challenge.mode === 'survival';
  objectivePanel.classList.toggle('hidden', challenge.mode === 'classic');
  objectiveTimerRow.classList.toggle('hidden', !timed);
  objectiveLinesRow.classList.toggle('hidden', !timed);
  objectiveGarbageRow.classList.toggle('hidden', !survival);
  if (timed) {
    const secs = Math.max(0, timeRemaining) / 1000;
    objectiveTimerEl.textContent = secs < 10 ? secs.toFixed(1) : Math.ceil(secs);
    objectiveTimerEl.classList.toggle('urgent', timeRemaining <= TIME_WARNING_MS);
    objectiveLinesEl.textContent = `${Math.min(lines, challenge.targetLines)}/${challenge.targetLines}`;
  }
  if (survival)
    objectiveGarbageEl.textContent =
      Math.max(0, (challenge.garbageEveryMs - garbageAccum) / 1000).toFixed(1);
}

// Dispatcher: cada celda se pinta con el estilo del skin activo, que lee de
// `activeColors` (no de COLORS). Ghost, next y hold pintan a través de aquí, así
// que heredan el skin gratis.
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  SKINS[skin].draw(context, x, y, colorIndex, size, alpha);
}

// Retro: relleno plano + banda de brillo superior. Estilo histórico del juego.
function drawBlockFlat(context, x, y, colorIndex, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = activeColors[colorIndex];
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Neón: relleno + glow via shadowBlur del propio color. Reseteo shadowBlur al
// final (como drawCellIcon) para no contaminar dibujos posteriores.
function drawBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = activeColors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = size * 0.5;
  context.fillStyle = color;
  context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.globalAlpha = 1;
}

// Pastel: esquinas redondeadas (roundRect, con fallback a fillRect) + brillo
// tenue. Da la sensación "suave" del skin.
function drawBlockRounded(context, x, y, colorIndex, size, alpha) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  const r = size * 0.22;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = activeColors[colorIndex];
  context.beginPath();
  if (context.roundRect) context.roundRect(px, py, s, s, r);
  else context.rect(px, py, s, s);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.22)';
  context.beginPath();
  if (context.roundRect) context.roundRect(px + 2, py + 2, s - 4, s * 0.28, r * 0.6);
  else context.rect(px + 2, py + 2, s - 4, s * 0.28);
  context.fill();
  context.globalAlpha = 1;
}

// Pixel art: relleno base + textura chunky determinista (borde interior oscuro,
// destello claro arriba-izquierda y sombreado en damero por celda). Determinista
// por (x,y): no usa Math.random, así no parpadea entre frames.
function drawBlockPixel(context, x, y, colorIndex, size, alpha) {
  const px = x * size;
  const py = y * size;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = activeColors[colorIndex];
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  // borde interior oscuro (2px)
  context.fillStyle = 'rgba(0,0,0,0.28)';
  context.fillRect(px + 1, py + size - 3, size - 2, 2);   // inferior
  context.fillRect(px + size - 3, py + 1, 2, size - 2);   // derecho
  // destello claro arriba-izquierda
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fillRect(px + 1, py + 1, size - 2, 2);          // superior
  context.fillRect(px + 1, py + 1, 2, size - 2);          // izquierdo
  // sombreado en damero para textura
  if ((x + y) % 2 === 0) {
    context.fillStyle = 'rgba(0,0,0,0.10)';
    context.fillRect(px + 3, py + 3, size - 6, size - 6);
  }
  context.globalAlpha = 1;
}

// Resuelve un campo del skin dependiente del tema: si es un objeto {dark, light}
// devuelve la variante del tema activo; si no, el valor tal cual (o null). Ojo:
// las paletas son arrays, no objetos {dark,light}, así que se devuelven íntegras.
function themeValue(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v[theme] ?? null;
  return v ?? null;
}

// Paleta de colores del skin para el tema activo (Neón la cambia; el resto es fija).
function activePalette() {
  return themeValue(SKINS[skin].palette);
}

// Pinta el fondo del lienzo si el skin define uno propio (p. ej. el negro de
// Neón); si no, deja el clearRect/CSS decidir. Depende del tema activo.
function paintCanvasBg(context, w, h) {
  const bg = themeValue(SKINS[skin].canvasBg);
  if (!bg) return;
  context.fillStyle = bg;
  context.fillRect(0, 0, w, h);
}

// Color de rejilla efectivo: el skin puede forzar el suyo (Neón sobre negro);
// si no, se usa el del tema claro/oscuro. Lo comparten applyTheme y applySkin.
function resolveGridColor() {
  return themeValue(SKINS[skin].grid) ?? GRID_COLORS[theme];
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
  // Pixel art marca más la rejilla para reforzar el look de cuadrícula.
  ctx.lineWidth = skin === 'pixel' ? 1 : 0.5;
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
    spawnParticles(c * BLOCK + BLOCK / 2, cy, 5, activeColors[row.cells[c]] || fallbackColor);
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
    case 'skill-use':
      addFlash(data.skill.color);
      spawnFloatText(`${data.skill.icon} ${data.skill.name.toUpperCase()}`, Math.floor(ROWS / 3), data.skill.color, 20);
      playSweep(330, 880, 0.25, 'triangle', 0.1);
      break;
    case 'hold':
      // Acción de rutina: solo un clic corto, sin partículas ni shake.
      playTone(587.33, 0.08, 'triangle', 0.06);
      break;
    case 'energy-full':
      spawnFloatText('⚡ ENERGÍA AL 100%', Math.floor(ROWS / 4), '#4dd0e1', 22);
      [659.25, 987.77].forEach((f, i) => playTone(f, 0.2, 'triangle', 0.09, i * 0.09));
      break;
    case 'game-over':
      playSweep(440, 60, 0.9, 'sawtooth', 0.12);
      break;
    case 'garbage-push':
      addShake(9);
      playTone(90, 0.18, 'square', 0.09);
      break;
    case 'time-warning':
      addFlash('#ff5d5d');
      spawnFloatText('¡10 SEGUNDOS!', Math.floor(ROWS / 3), '#ff5d5d', 26);
      [880, 660].forEach((f, i) => playTone(f, 0.16, 'square', 0.09, i * 0.18));
      break;
    case 'challenge-win':
      addFlash('#8bffb0');
      addShake(18);
      spawnFloatText('¡DESAFÍO SUPERADO!', Math.floor(ROWS / 2), '#8bffb0', 28);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        playTone(f, 0.34, 'triangle', 0.11, i * 0.09));
      break;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shakeMagnitude > 0)
    ctx.translate((Math.random() - 0.5) * 2 * shakeMagnitude, (Math.random() - 0.5) * 2 * shakeMagnitude);
  paintCanvasBg(ctx, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      drawBlock(ctx, c, r, board[r][c], BLOCK);
      drawCellIcon(ctx, c, r, board[r][c], BLOCK);
    }

  // Mutador "piezas invisibles": en cuanto la pieza se apoya y entra en el
  // lock delay desaparece por completo (también su ghost) hasta consolidarse.
  const hidden = challenge.mutators.invisible && lockTimer > 0;

  if (!hidden) {
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

  drawEffects();
  ctx.restore();
}

// Pinta una pieza centrada en una caja lógica 4x4 cuya esquina está en (px, py).
function drawPieceBox(context, piece, px, py, NB) {
  const shape = piece.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  context.save();
  context.translate(px, py);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      drawBlock(context, offX + c, offY + r, shape[r][c], NB);
      drawCellIcon(context, offX + c, offY + r, shape[r][c], NB);
    }
  context.restore();
}

// Sin Visión de Futuro: una sola pieza a 30 px, como siempre. Con Visión, la
// cola entera: la primera grande y las cuatro restantes a media escala en una
// rejilla 2x2 debajo (apilarlas en columna estiraría el panel 120 px de más).
function drawNext() {
  const vision = visionRemaining > 0;
  const height = vision ? 240 : 120;
  // Asignar height limpia el canvas: solo se toca cuando cambia de verdad.
  if (nextCanvas.height !== height) nextCanvas.height = height;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  paintCanvasBg(nextCtx, nextCanvas.width, nextCanvas.height);
  drawPieceBox(nextCtx, queue[0], 0, 0, 30);
  if (!vision) return;
  for (let i = 1; i < QUEUE_MAX; i++)
    drawPieceBox(nextCtx, queue[i], ((i - 1) % 2) * 60, 120 + Math.floor((i - 1) / 2) * 60, 15);
}

function drawHold() {
  // El atenuado se sincroniza aquí: drawHold() se llama exactamente en los
  // momentos en que canHold cambia (spawn, hold, rewind, init).
  holdPanel.classList.toggle('locked', !canHold);
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  paintCanvasBg(holdCtx, holdCanvas.width, holdCanvas.height);
  if (holdType === null) return;
  drawPieceBox(holdCtx, makePiece(holdType), 0, 0, 30);
}

const END_TITLES = {
  topout: 'GAME OVER',
  timeout: 'TIEMPO AGOTADO',
  crushed: 'APLASTADO',
};

// ─── Tabla de records local (localStorage) ──────────────────────────────────
// Estructura persistida bajo RECORDS_KEY:
//   { top: [{ name, score, mode, date }], bestCombo, maxLines }
// `bestCombo`/`maxLines` son marcas históricas globales (se actualizan cada
// partida); `top` es el ranking de las MAX_RECORDS mejores puntuaciones.

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (data && Array.isArray(data.top)) {
      return {
        top: data.top,
        bestCombo: typeof data.bestCombo === 'number' ? data.bestCombo : -1,
        maxLines: typeof data.maxLines === 'number' ? data.maxLines : 0,
      };
    }
  } catch (e) {
    /* JSON corrupto o clave ausente: caemos al default */
  }
  return { top: [], bestCombo: -1, maxLines: 0 };
}

function saveRecords(data) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(data));
}

// Una puntuación entra al top si es positiva y hay hueco o supera a la última.
function qualifiesForTop(sc, top) {
  return sc > 0 && (top.length < MAX_RECORDS || sc > top[top.length - 1].score);
}

// Pinta el panel: ranking, marcas históricas y (des)aparición del "sin récords".
function renderRecords(data) {
  recordsList.textContent = '';
  data.top.forEach((rec, i) => {
    const li = document.createElement('li');
    if (i === newRecordIndex) li.classList.add('record-new');

    const rank = document.createElement('span');
    rank.className = 'record-rank';
    rank.textContent = `${i + 1}.`;

    const name = document.createElement('span');
    name.className = 'record-name';
    name.textContent = rec.name || '---'; // textContent: el nombre es del usuario

    const mode = document.createElement('span');
    mode.className = 'record-mode';
    mode.textContent = MODE_LABELS[rec.mode] || '';

    const sc = document.createElement('span');
    sc.className = 'record-score';
    sc.textContent = rec.score.toLocaleString();

    li.append(rank, name, mode, sc);
    recordsList.appendChild(li);
  });

  recordsEmpty.classList.toggle('hidden', data.top.length > 0);
  recordComboEl.textContent = data.bestCombo >= 0 ? `x${data.bestCombo + 1}` : '—';
  recordLinesEl.textContent = data.maxLines;
}

// Fin de partida: actualiza marcas históricas y, si la puntuación clasifica,
// inserta la entrada (con nombre vacío) y abre el campo de nombre.
function recordGameResult() {
  const data = loadRecords();
  if (maxCombo > data.bestCombo) data.bestCombo = maxCombo;
  if (lines > data.maxLines) data.maxLines = lines;

  if (qualifiesForTop(score, data.top)) {
    const entry = { name: '', score, mode: challenge.mode, date: Date.now() };
    data.top.push(entry);
    data.top.sort((a, b) => b.score - a.score);
    data.top = data.top.slice(0, MAX_RECORDS);
    newRecordIndex = data.top.indexOf(entry);
    saveRecords(data);
    renderRecords(data);
    nameEntry.classList.remove('hidden');
    recordNameInput.value = '';
    recordNameInput.focus();
  } else {
    newRecordIndex = -1;
    saveRecords(data);
    renderRecords(data);
    nameEntry.classList.add('hidden');
  }
  recordsPanel.classList.remove('hidden');
}

// Guarda el nombre tecleado en la entrada recién conseguida (conserva el resalte).
function commitRecordName() {
  if (newRecordIndex < 0) return;
  const data = loadRecords();
  if (!data.top[newRecordIndex]) return;
  data.top[newRecordIndex].name = recordNameInput.value.trim().toUpperCase() || '---';
  saveRecords(data);
  nameEntry.classList.add('hidden');
  renderRecords(data);
}

function resetRecords() {
  if (!confirm('¿Borrar todos los récords guardados?')) return;
  localStorage.removeItem(RECORDS_KEY);
  newRecordIndex = -1;
  nameEntry.classList.add('hidden');
  renderRecords(loadRecords());
}

function endGame(reason = 'topout') {
  if (gameOver) return; // pushGarbageRow() puede detectar la derrota dos veces
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = END_TITLES[reason] || END_TITLES.topout;
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()} · Combo máx.: x${maxCombo + 1}`;
  recordGameResult();
  showOverlay(false);
  emitEvent('game-over', {});
}

function winGame() {
  gameOver = true;
  won = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = '¡DESAFÍO SUPERADO!';
  const secs = (timeRemaining / 1000).toFixed(1);
  overlayScore.textContent =
    `${lines} líneas · Puntuación: ${score.toLocaleString()} · Tiempo restante: ${secs}s`;
  recordGameResult();
  showOverlay(false);
  emitEvent('challenge-win', {});
}

// El overlay se reutiliza para menú, pausa y fin de partida: `withConfig`
// decide si se ve el selector de desafío.
function showOverlay(withConfig) {
  challengeConfig.classList.toggle('hidden', !withConfig);
  restartBtn.textContent = withConfig ? 'Jugar' : 'Volver al menú';
  overlay.classList.remove('hidden');
}

function showMenu() {
  paused = false;
  gameOver = true; // congela el loop mientras el menú está abierto
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'TETRIS';
  overlayScore.textContent = 'Elige un desafío';
  newRecordIndex = -1;
  nameEntry.classList.add('hidden');
  renderRecords(loadRecords());
  recordsPanel.classList.remove('hidden');
  showOverlay(true);
}

// Lee el menú en `challenge` y arranca la partida.
function startGame() {
  challenge = cloneChallenge(CHALLENGE_DEFAULTS);
  challenge.mode = modeSelect.value;
  challenge.mutators.puzzle = mutPuzzle.checked;
  challenge.mutators.invisible = mutInvisible.checked;
  challenge.mutators.reverse = mutReverse.checked;
  init();
}

// Distintivos de los mutadores activos, junto al panel de objetivo.
function updateMutatorBadges() {
  const active = [];
  if (challenge.mutators.puzzle) active.push('🧩 Puzzle');
  if (challenge.mutators.invisible) active.push('👻 Invisibles');
  if (challenge.mutators.reverse) active.push('🔄 Inversa');
  mutatorBadges.textContent = active.join(' · ');
  mutatorBadges.classList.toggle('hidden', active.length === 0);
}

function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  activeColors = activePalette();  // Neón cambia de paleta según el tema
  gridColor = resolveGridColor();
  themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
  themeToggle.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
}

function applySkin() {
  activeColors = activePalette();
  document.body.dataset.skin = skin;   // hook CSS del chrome (fondo/acentos)
  gridColor = resolveGridColor();
  skinSelect.value = skin;
}

function changeSkin() {
  skin = SKINS[skinSelect.value] ? skinSelect.value : 'retro';
  localStorage.setItem(SKIN_KEY, skin);
  applySkin();
  draw();
  drawNext();
  drawHold();
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
  draw();
  drawNext();
  drawHold();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseMenu.classList.add('hidden');
    lastTime = performance.now(); // evita un dt gigante al reanudar
    loop(lastTime);
  } else {
    draw(); // deja el último fotograma pintado bajo el overlay
    cancelAnimationFrame(animId);
    startLevelSelect.value = startLevel;   // refleja el valor vigente
    pauseControls.classList.add('hidden'); // los controles arrancan colapsados
    pauseMenu.classList.remove('hidden');
  }
}

// Reinicia sin recargar desde el menú de pausa: reusa el `challenge` vigente e
// init() lee `startLevel`.
function restartFromPause() {
  paused = false;
  pauseMenu.classList.add('hidden');
  init();
}

// Fija el nivel inicial y mantiene ambos selectores en sync con la variable.
function setStartLevel(n) {
  startLevel = n;
  startLevelSelect.value = n;
  startLevelSelectMenu.value = n;
}

// Relojes del objetivo activo. Se llama solo desde loop() y solo cuando el
// tablero no está congelado.
function tickChallenge(dt) {
  if (challenge.mode === 'timeAttack') {
    timeRemaining = Math.max(0, timeRemaining - dt);
    if (!warnedTime && timeRemaining <= TIME_WARNING_MS) {
      warnedTime = true;
      emitEvent('time-warning', {});
    }
    updateHUD();
    if (timeRemaining <= 0) { endGame('timeout'); return; }
  }
  if (challenge.mode === 'survival') {
    garbageAccum += dt;
    while (garbageAccum >= challenge.garbageEveryMs && !gameOver) {
      garbageAccum -= challenge.garbageEveryMs;
      pushGarbageRow();
    }
    updateHUD();
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
    // Distorsión Temporal: también por dt, para que ni ❄️ ni la pausa se coman
    // los 10 segundos del efecto.
    if (slowRemaining > 0) {
      slowRemaining = Math.max(0, slowRemaining - dt);
      updateHUD();
    }
    // Los relojes del desafío corren aquí dentro: ❄️ los detiene igual que
    // la pausa, y por dt, nunca por reloj de pared.
    tickChallenge(dt);
    if (gameOver) { draw(); return; }
  }

  // Lock delay: la pieza apoyada espera antes de consolidarse.
  if (!collide(current.shape, current.x, current.y + 1)) {
    lockTimer = 0;
    if (dropAccum >= effectiveDropInterval()) {
      dropAccum = 0;
      current.y++;
      lastActionWasRotation = false; // la caída por gravedad invalida el T-Spin
    }
  } else if (freezeRemaining <= 0) {
    dropAccum = 0;
    lockTimer += dt;
    if (lockTimer >= LOCK_DELAY_MS) lockPiece();
  }
  draw();
  if (gameOver || paused) return; // partida congelada: no reprogramar el frame
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  if (challenge.mutators.puzzle) applyPuzzleLayout();
  score = 0;
  lines = 0;
  level = startLevel;
  paused = false;
  gameOver = false;
  dropInterval = levelToDropInterval(level);
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
  lockTimer = 0;
  lockResets = 0;
  // Habilidades
  energy = 0;
  shownEnergy = -1;
  energyWasFull = false;
  holdType = null;
  canHold = true;
  visionRemaining = 0;
  slowRemaining = 0;
  undoSnapshot = null;
  skillMenuOpen = false;
  skillMenu.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  // Estado del desafío. `challenge` no se resetea: lo fija startGame().
  timeRemaining = challenge.mode === 'timeAttack' ? challenge.timeLimitMs : 0;
  garbageAccum = 0;
  warnedTime = false;
  won = false;
  particles = [];
  floatTexts = [];
  shakeRemaining = 0;
  shakeMagnitude = 0;
  flashRemaining = 0;
  lastTime = performance.now();
  queue = [];
  refillQueue();
  spawn();
  drawHold();
  updateMutatorBadges();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  ensureAudio(); // primer gesto del usuario: desbloquea el AudioContext
  // Al escribir en el campo de nombre (o usar el selector de modo) el teclado no
  // debe pilotar la partida: el listener global cuelga de `document`.
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  // El menú de habilidades captura el teclado entero: la partida está congelada.
  if (skillMenuOpen) { handleSkillMenuKey(e); return; }
  // P y Escape abren/cierran la pausa. Van tras el desvío de habilidades, así
  // Esc cierra ese menú primero. El guard de abajo bloquea el resto de inputs.
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastActionWasRotation = false; // mover lateralmente invalida el T-Spin
        resetLockTimer();
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastActionWasRotation = false;
        resetLockTimer();
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    // Mutador de rotación inversa: intercambia el sentido de ambas teclas.
    case 'ArrowUp':
    case 'KeyX':
      tryRotate(challenge.mutators.reverse ? -1 : 1);
      break;
    case 'KeyZ':
      tryRotate(challenge.mutators.reverse ? 1 : -1);
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
    case 'KeyE':
      openSkillMenu();
      break;
  }
  updateHUD();
});

// El botón de #overlay despacha dos estados: menú (con config) y fin de partida
// (sin config). La pausa vive en su propio overlay #pause-menu.
restartBtn.addEventListener('click', () => {
  if (!challengeConfig.classList.contains('hidden')) startGame();
  else showMenu();
});

// Tabla de records: guardar el nombre (botón o Enter) y borrar el ranking.
saveRecordBtn.addEventListener('click', commitRecordName);
recordNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') commitRecordName();
});
resetRecordsBtn.addEventListener('click', resetRecords);
// El selector de modo solo tiene sentido con su objetivo: refleja en el menú
// qué parámetros afectan al modo elegido.
modeSelect.addEventListener('change', () => {
  challengeConfig.dataset.mode = modeSelect.value;
});

// Menú de pausa: botones y selector de nivel inicial.
resumeBtn.addEventListener('click', () => togglePause());
pauseRestartBtn.addEventListener('click', restartFromPause);
controlsToggleBtn.addEventListener('click', () => {
  pauseControls.classList.toggle('hidden');
});
startLevelSelect.addEventListener('change', () => setStartLevel(parseInt(startLevelSelect.value, 10)));
startLevelSelectMenu.addEventListener('change', () => setStartLevel(parseInt(startLevelSelectMenu.value, 10)));

// Puebla ambos selectores con niveles 1–START_LEVEL_MAX.
for (let n = 1; n <= START_LEVEL_MAX; n++) {
  for (const sel of [startLevelSelect, startLevelSelectMenu]) {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  }
}
setStartLevel(startLevel);

themeToggle.addEventListener('click', toggleTheme);
muteToggle.addEventListener('click', toggleMute);
skinSelect.addEventListener('change', changeSkin);

applyTheme();
applyMute();
applySkin();
challengeConfig.dataset.mode = modeSelect.value;
init();
showMenu();
