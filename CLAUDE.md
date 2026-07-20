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

- **Estado global mutable**, declarado en una sola línea (`game.js:43`): `board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`. `init()` lo resetea entero y es también el handler de "Reiniciar".
- **Tablero**: matriz `ROWS × COLS` de enteros. `0` = vacía; `1–18` = índice compartido en `COLORS` y `PIECES`. El mismo entero identifica pieza y color, así que añadir una pieza obliga a extender ambos arrays en paralelo (y el sorteo de `randomPiece()`). Reparto: `1–7` piezas estándar, `8` tuerca, `9–13` power-ups (`FIRST_POWER`/`LAST_POWER`), `14` comodín (`WILDCARD`, sin entrada en `PIECES` — nunca es pieza), `15–17` pentominós (`PENTOMINOS`: cruz, copa, Y), `18` monominó (`MONOMINO`). `isNormalBlock()` distingue los tipos que se fusionan con el tablero (`1–8`, `15–18`) de power-ups y comodín — el rango **no** es contiguo, ojo al añadir tipos.
- **Construcción de piezas**: `makePiece(type)` clona `PIECES[type]` y centra la `x`. Lo usan `randomPiece()`, `randomPowerUp()` y el monominó; no construyas el objeto pieza a mano.
- **Pentominós** (`15–17`): `randomPiece()` los sortea con `PENTOMINO_CHANCE` (15%) en lugar de un tetrominó. La cruz (`15`) es invariante bajo `rotateCW` — que rotar no haga nada visible es correcto, no un bug. La `Y` (`17`) es 4×4, el máximo que `drawNext()` admite.
- **Monominó** (`18`): recompensa por Tetris. `clearLines()` marca `pendingMonomino` cuando `cleared === 4`; `spawn()` lo consume **antes** que `pendingPowerUp` y sin limpiar ese flag, así el power-up sale en el spawn siguiente. Hace `merge()` normal (no es power-up) y no tiene icono en `CELL_ICONS` a propósito: quedaría fijo en el tablero.
- **Tuerca** (tipo `8`): anillo 3×3 `[[8,8,8],[8,0,8],[8,8,8]]`. Su hueco central es un `0` normal — celda vacía a todos los efectos, sin estado ni render especial —, pero ninguna pieza puede alcanzarlo (no hay deslizamiento lateral), así que bloquea la fila hasta que se limpie lo de encima.
- **Pieza activa**: `{ type, shape, x, y }`. `shape` es una matriz cuadrada que se **reemplaza** al rotar (`rotateCW` transpone + invierte filas); no se guarda índice de rotación. `tryRotate` prueba kicks `[0, -1, 1, -2, 2]`.
- **Game loop**: `requestAnimationFrame(loop)` acumula `dt` en `dropAccum`; al superar `dropInterval` baja una fila o llama a `lockPiece()`. Pausa y game over hacen `cancelAnimationFrame(animId)`; al reanudar hay que reiniciar `lastTime` antes de re-entrar en `loop` (si no, el primer `dt` es enorme).
- **Power-ups**: piezas `1×1` de tipo `9–13` (`💣 Bomba`, `⚡ Rayo`, `🎨 Tinte`, `⬇️ Gravedad`, `❄️ Congelar`). `clearLines()` acumula `linesSincePowerUp` y activa `pendingPowerUp` cada `POWERUP_EVERY` líneas; `spawn()` consume el flag generando `randomPowerUp()` como `next`. No hacen `merge()`: al bloquearse ejecutan `applyPowerUp()` y desaparecen. Congelar solo pone `freezeRemaining = FREEZE_MS`, que `loop()` descuenta con `dt` (no con reloj de pared, para que la pausa no lo consuma).
- **Comodines**: el Tinte convierte los bloques del color dominante en `WILDCARD`. `applyWildcards()` corre al **inicio** de `lockPiece()`, antes del efecto, así los comodines recién creados sobreviven un turno; luego rellenan los huecos de su propia fila y `clearLines()` limpia las que queden completas.
- **Cadena de bloqueo**: `lockPiece()` → `applyWildcards()` → (`applyPowerUp()` **o** `merge()`) → `clearLines()` → `spawn()`. El orden importa: `applyWildcards()` va primero. `spawn()` es además el detector de game over: si la pieza recién generada ya colisiona, llama a `endGame()`.
- **Render**: `draw()` redibuja todo cada frame (grid, tablero, ghost con `alpha 0.2`, pieza actual). `drawNext()` solo se llama desde `spawn()`, no por frame.
- **HUD**: `updateHUD()` escribe directo en elementos DOM cacheados al inicio del archivo. Hay que llamarlo tras cualquier cambio de `score` / `lines` / `level`.

## Invariantes y trampas

- `COLS × BLOCK` y `ROWS × BLOCK` deben coincidir con `width`/`height` del `<canvas id="board">` en `index.html` (hoy 300 × 600). Cambiar las constantes sin tocar el HTML deforma el render.
- `drawNext()` asume una rejilla 4×4 con `NB = 30` sobre un canvas de 120px; piezas mayores se saldrían.
- `clearLines()` hace `r++` después de `splice` + `unshift` para reevaluar la fila que se desplazó hacia abajo. No simplifiques ese bucle sin tener eso en cuenta.
- Curva de velocidad: `dropInterval = max(100, 1000 − (level − 1) × 90)`, nivel sube cada 10 líneas.
- Los textos visibles de la UI están en español (`PAUSA`, `Puntuación`, `Reiniciar`). Mantenlo.

`README.md` documenta controles, tabla de puntuación y parámetros personalizables con detalle — consúltalo en vez de duplicarlo aquí.
