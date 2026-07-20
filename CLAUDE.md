# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

No hay build, ni tests, ni linter, ni dependencias. **No existe `package.json`** — no busques scripts npm.

Ejecutar el juego:

```bash
open index.html                 # abrir directamente (macOS)
python3 -m http.server 8000     # o servidor estático
```

Verificar un cambio = abrirlo en el navegador y jugar. No hay suite automatizada.

## Arquitectura

Tres archivos, sin módulos: `game.js` se carga con `<script src>` clásico y todo vive en scope global. No uses `import`/`export` (el `<script>` no es `type="module"`).

- **Estado global mutable**, declarado en un bloque de `let` justo bajo las constantes DOM: partida (`board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`), power-ups (`linesSincePowerUp, pendingPowerUp, pendingMonomino, freezeRemaining`), puntuación avanzada (`combo, maxCombo, backToBack, lastActionWasRotation, lastKick`), desafío (`challenge, timeRemaining, garbageAccum, warnedTime, won, lockTimer, lockResets`) y efectos (`particles, floatTexts, shakeRemaining, shakeMagnitude, flashRemaining, flashColor`). `init()` lo resetea entero — al añadir estado nuevo hay que resetearlo ahí. Fuera de `init()` quedan a propósito `theme`/`gridColor`, `muted`/`audioCtx` y **`challenge`** (lo fija `startGame()` desde el menú: `init()` resetea la partida, no la configuración elegida).
- **Tablero**: matriz `ROWS × COLS` de enteros. `0` = vacía; `1–20` = índice compartido en `COLORS` y `PIECES`. El mismo entero identifica pieza y color, así que añadir una pieza obliga a extender ambos arrays en paralelo (y el sorteo de `randomPiece()`). Reparto: `1–7` piezas estándar, `8` tuerca, `9–13` power-ups (`FIRST_POWER`/`LAST_POWER`), `14` comodín (`WILDCARD`, sin entrada en `PIECES` — nunca es pieza), `15–17` pentominós (`PENTOMINOS`: cruz, copa, Y), `18` monominó (`MONOMINO`), `19` indestructible (`INDESTRUCTIBLE`) y `20` basura (`GARBAGE`); los dos últimos tampoco tienen entrada en `PIECES`: solo existen como celda de tablero. `isNormalBlock()` distingue los tipos que se fusionan con el tablero (`1–8`, `15–18`, `20`) de power-ups, comodín e indestructible — el rango **no** es contiguo, ojo al añadir tipos.
- **Construcción de piezas**: `makePiece(type)` clona `PIECES[type]` y centra la `x`. Lo usan `randomPiece()`, `randomPowerUp()` y el monominó; no construyas el objeto pieza a mano.
- **Pentominós** (`15–17`): `randomPiece()` los sortea con `PENTOMINO_CHANCE` (15%) en lugar de un tetrominó. La cruz (`15`) es invariante bajo `rotateCW` — que rotar no haga nada visible es correcto, no un bug. La `Y` (`17`) es 4×4, el máximo que `drawNext()` admite.
- **Monominó** (`18`): recompensa por Tetris. `resolveScoring()` marca `pendingMonomino` cuando `cleared === 4`; `spawn()` lo consume **antes** que `pendingPowerUp` y sin limpiar ese flag, así el power-up sale en el spawn siguiente. Hace `merge()` normal (no es power-up) y no tiene icono en `CELL_ICONS` a propósito: quedaría fijo en el tablero.
- **Tuerca** (tipo `8`): anillo 3×3 `[[8,8,8],[8,0,8],[8,8,8]]`. Su hueco central es un `0` normal — celda vacía a todos los efectos, sin estado ni render especial —, pero ninguna pieza puede alcanzarlo (no hay deslizamiento lateral), así que bloquea la fila hasta que se limpie lo de encima.
- **Pieza activa**: `{ type, shape, x, y }`. `shape` es una matriz cuadrada que se **reemplaza** al rotar (`rotateCW` transpone + invierte filas); no se guarda índice de rotación. `tryRotate` prueba kicks `[0, -1, 1, -2, 2]`.
- **Game loop**: `requestAnimationFrame(loop)` acumula `dt` en `dropAccum`; al superar `dropInterval` baja una fila. Con la pieza apoyada no bloquea al instante: acumula `lockTimer` hasta `LOCK_DELAY_MS` (500 ms) y entonces llama a `lockPiece()`. Pausa y game over hacen `cancelAnimationFrame(animId)`; al reanudar hay que reiniciar `lastTime` antes de re-entrar en `loop` (si no, el primer `dt` es enorme).
- **Lock delay**: `lockTimer > 0` significa "pieza apoyada". `resetLockTimer()` lo reinicia al mover o rotar, con tope de `LOCK_RESET_MAX` (15) por pieza para cortar el infinite spin; `spawn()` limpia ambos. `hardDrop()` y `softDrop()` sobre suelo bloquean **al instante**, sin pasar por el timer: son acciones deliberadas. El mutador de piezas invisibles se apoya justo en `lockTimer > 0`.
- **Modo desafío**: `challenge` (objetivo + mutadores) se lee del menú en `startGame()`. `tickChallenge(dt)` corre desde `loop()` **dentro del `else` de la congelación**, así ❄️ y la pausa detienen tanto el contrarreloj como el contador de basura. La victoria se comprueba con `checkObjective()` en `lockPiece()` **entre** `resolveScoring()` y `spawn()`: hacerlo después daría un game over espurio al ganar con el tablero alto. `pushGarbageRow()` hace `board.shift()` + `push()` y sube la pieza activa solo si cabe (si está pegada al techo se queda donde está y muere únicamente si la fila la aplasta).
- **Bloques del desafío**: el indestructible (`19`) obliga a tratarlo aparte en `clearLines()` (su fila nunca se completa), `powerBomb()`/`powerRay()` (lo saltan), `powerGravity()` (compacta cada columna **por segmentos** entre indestructibles) e `isBoardEmpty()` (lo ignora, si no el Perfect Clear sería imposible con el mutador puzzle). La basura (`20`) es un bloque normal: solo cambia el color.
- **Overlay**: uno solo para menú, pausa y fin de partida. `showOverlay(withConfig)` decide si se ve `#challenge-config` y qué dice el botón; `showMenu()` pone `gameOver = true` para congelar el loop mientras el menú está abierto. El listener de `restartBtn` despacha según el estado visible (Jugar / Reanudar / Volver al menú).
- **Power-ups**: piezas `1×1` de tipo `9–13` (`💣 Bomba`, `⚡ Rayo`, `🎨 Tinte`, `⬇️ Gravedad`, `❄️ Congelar`). `resolveScoring()` acumula `linesSincePowerUp` y activa `pendingPowerUp` cada `POWERUP_EVERY` líneas; `spawn()` consume el flag generando `randomPowerUp()` como `next`. No hacen `merge()`: al bloquearse ejecutan `applyPowerUp()` y desaparecen. Congelar solo pone `freezeRemaining = FREEZE_MS`, que `loop()` descuenta con `dt` (no con reloj de pared, para que la pausa no lo consuma).
- **Comodines**: el Tinte convierte los bloques del color dominante en `WILDCARD`. `applyWildcards()` corre al **inicio** de `lockPiece()`, antes del efecto, así los comodines recién creados sobreviven un turno; luego rellenan los huecos de su propia fila y `clearLines()` limpia las que queden completas.
- **Cadena de bloqueo**: `lockPiece()` → `detectSpin()` → `applyWildcards()` → (`applyPowerUp()` **o** `merge()`) → `clearLines()` → `isBoardEmpty()` → `resolveScoring()` → `spawn()`. El orden importa: `detectSpin()` va **antes** del merge (necesita el tablero sin la pieza) y `applyWildcards()` antes del efecto. `spawn()` es además el detector de game over: si la pieza recién generada ya colisiona, llama a `endGame()`.
- **Puntuación**: `clearLines()` solo desplaza filas y devuelve `{ cleared, rows }` (copias de las filas borradas, con sus colores, para las partículas). Todo el cálculo vive en `resolveScoring()`: combo, T-Spin, Back-to-Back, Perfect Clear, nivel, velocidad y flags de recompensa. Es el único sitio que toca `score` por limpieza de líneas.
- **Combo**: `combo` vale `-1` sin combo activo y `0` en la primera limpieza; el bonus solo aplica desde `combo >= 1` y el HUD muestra `x(combo + 1)`. Un power-up que se consume sin limpiar **no** rompe el combo (no es un fallo del jugador); cualquier otra pieza sí.
- **T-Spin**: regla de 3 esquinas sobre el centro de la `T` (`current.x + 1, current.y + 1`), con las paredes contando como ocupadas. Depende de `lastActionWasRotation`, que `tryRotate()` pone a `true` y que **hay que poner a `false` en toda acción que mueva la pieza**: movimiento lateral, soft drop y caída por gravedad. El hard drop lo conserva a propósito. `spawn()` lo limpia por pieza.
- **Render**: `draw()` redibuja todo cada frame (grid, tablero, ghost con `alpha 0.2`, pieza actual, efectos) envuelto en un `save()`/`restore()` que aplica el screen shake. `drawEffects()` cierra el frame. `drawNext()` solo se llama desde `spawn()`, no por frame.
- **Efectos**: `particles` y `floatTexts` avanzan en `updateEffects(dt)`, llamado desde `loop()` **fuera** del bloque de congelación, así siguen animando con el tablero congelado por ❄️. Nunca uses reloj de pared: la pausa no debe consumirlos. `MAX_PARTICLES` es un tope duro.
- **Eventos**: `resolveScoring()` no dibuja ni suena, solo llama a `emitEvent(name, data)`; `emitEvent()` es el único punto que traduce jugadas en partículas, textos, shake, flash y sonido. Añade ahí cualquier retroalimentación nueva.
- **Audio**: sintetizado con Web Audio, sin ficheros. `ensureAudio()` crea el `AudioContext` perezosamente en el primer `keydown` porque los navegadores bloquean el autoplay. `playTone`/`playSweep` usan rampa exponencial de ganancia (un corte seco produce un click audible). El pitch sube un semitono por nivel de combo (`comboPitch`), capado a una octava.
- **HUD**: `updateHUD()` escribe directo en elementos DOM cacheados al inicio del archivo. Hay que llamarlo tras cualquier cambio de `score` / `lines` / `level` / `combo`. Ojo: se llama **cada frame** mientras el tablero está congelado, por eso el pulso del combo se reinicia solo cuando `combo !== shownCombo`.

## Invariantes y trampas

- `COLS × BLOCK` y `ROWS × BLOCK` deben coincidir con `width`/`height` del `<canvas id="board">` en `index.html` (hoy 300 × 600). Cambiar las constantes sin tocar el HTML deforma el render.
- `drawNext()` asume una rejilla 4×4 con `NB = 30` sobre un canvas de 120px; piezas mayores se saldrían.
- `clearLines()` hace `r++` después de `splice` + `unshift` para reevaluar la fila que se desplazó hacia abajo. No simplifiques ese bucle sin tener eso en cuenta. Copia cada fila **antes** del `splice`: después, esa `y` ya contiene otra cosa y las partículas saldrían con colores erróneos.
- El Perfect Clear se comprueba con `isBoardEmpty()` **después** de `clearLines()`. Comodines y tuerca son bloques normales del tablero, así que cualquier resto lo impide — es lo correcto. Los indestructibles son la única excepción.
- `PUZZLE_LAYOUTS` son arrays de strings de **exactamente `COLS` caracteres**, anclados al fondo. Cambiar `COLS` obliga a reescribirlos.
- Curva de velocidad: `dropInterval = max(100, 1000 − (level − 1) × 90)`, nivel sube cada 10 líneas.
- Los textos visibles de la UI están en español (`PAUSA`, `Puntuación`, `Reiniciar`). Mantenlo.

`README.md` documenta controles, tabla de puntuación y parámetros personalizables con detalle — consúltalo en vez de duplicarlo aquí.
