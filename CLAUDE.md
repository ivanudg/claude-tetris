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
- **Tablero**: matriz `ROWS × COLS` de enteros. `0` = vacía; `1–8` = índice compartido en `COLORS` y `PIECES`. El mismo entero identifica pieza y color, así que añadir una pieza obliga a extender ambos arrays en paralelo (y el rango de `randomPiece()`).
- **Tuerca** (tipo `8`): anillo 3×3 `[[8,8,8],[8,0,8],[8,8,8]]`. Su hueco central es un `0` normal — celda vacía a todos los efectos, sin estado ni render especial —, pero ninguna pieza puede alcanzarlo (no hay deslizamiento lateral), así que bloquea la fila hasta que se limpie lo de encima.
- **Pieza activa**: `{ type, shape, x, y }`. `shape` es una matriz cuadrada que se **reemplaza** al rotar (`rotateCW` transpone + invierte filas); no se guarda índice de rotación. `tryRotate` prueba kicks `[0, -1, 1, -2, 2]`.
- **Game loop**: `requestAnimationFrame(loop)` acumula `dt` en `dropAccum`; al superar `dropInterval` baja una fila o llama a `lockPiece()`. Pausa y game over hacen `cancelAnimationFrame(animId)`; al reanudar hay que reiniciar `lastTime` antes de re-entrar en `loop` (si no, el primer `dt` es enorme).
- **Cadena de bloqueo**: `lockPiece()` → `merge()` → `clearLines()` → `spawn()`. `spawn()` es además el detector de game over: si la pieza recién generada ya colisiona, llama a `endGame()`.
- **Render**: `draw()` redibuja todo cada frame (grid, tablero, ghost con `alpha 0.2`, pieza actual). `drawNext()` solo se llama desde `spawn()`, no por frame.
- **HUD**: `updateHUD()` escribe directo en elementos DOM cacheados al inicio del archivo. Hay que llamarlo tras cualquier cambio de `score` / `lines` / `level`.

## Invariantes y trampas

- `COLS × BLOCK` y `ROWS × BLOCK` deben coincidir con `width`/`height` del `<canvas id="board">` en `index.html` (hoy 300 × 600). Cambiar las constantes sin tocar el HTML deforma el render.
- `drawNext()` asume una rejilla 4×4 con `NB = 30` sobre un canvas de 120px; piezas mayores se saldrían.
- `clearLines()` hace `r++` después de `splice` + `unshift` para reevaluar la fila que se desplazó hacia abajo. No simplifiques ese bucle sin tener eso en cuenta.
- Curva de velocidad: `dropInterval = max(100, 1000 − (level − 1) × 90)`, nivel sube cada 10 líneas.
- Los textos visibles de la UI están en español (`PAUSA`, `Puntuación`, `Reiniciar`). Mantenlo.

`README.md` documenta controles, tabla de puntuación y parámetros personalizables con detalle — consúltalo en vez de duplicarlo aquí.
