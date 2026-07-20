# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Power-ups](#power-ups)
  - [Modo Desafío](#modo-desafío)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- La **tuerca** (N): pieza extra 3 × 3, un anillo gris con un hueco cuadrado en el centro. Ese
  agujero no se puede rellenar (no hay deslizamiento lateral), así que deja la fila bloqueada hasta
  que se limpien las líneas de encima. Sale con la misma frecuencia que las demás (1 de cada 8).
- **Pentominós** (piezas de 5 bloques): ver más abajo.
- **Monominó** 1 × 1 como recompensa por hacer un Tetris: ver más abajo.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación avanzado**: base clásica (100 / 300 / 500 / 800 × nivel) más combos encadenados, T-Spin, Back-to-Back y Perfect Clear (ver más abajo).
- **Retroalimentación**: partículas, textos flotantes, _screen shake_, destellos y efectos de sonido sintetizados cuyo tono sube con el combo (botón 🔊 junto al título).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Modo claro/oscuro**: switch junto al título (por defecto modo oscuro); la preferencia se guarda en `localStorage`.
- **Power-ups aleatorios** cada 10 líneas completadas (ver más abajo).
- **Modo Desafío**: objetivos de nivel (contra reloj, supervivencia) y modificadores combinables (ver más abajo).
- **Lock delay** de 500 ms: al tocar suelo la pieza espera medio segundo antes de consolidarse, con
  hasta 15 reinicios por pieza al moverla o rotarla. `↓` y `Espacio` siguen bloqueando al instante.

---

## Piezas no estándar

### Pentominós (5 bloques)

Cada vez que se genera una pieza hay un **15 %** (`PENTOMINO_CHANCE`) de que salga un pentominó en
lugar de un tetrominó estándar. Los tres se eligen con igual probabilidad y **rotan en las cuatro
direcciones** con los mismos _wall kicks_ que el resto.

| Pieza | Forma                                                       | Nota                                                     |
| ----- | ----------------------------------------------------------- | -------------------------------------------------------- |
| **+** | Cruz: un bloque central con 4 adyacentes                     | Simétrica: rotarla no cambia su forma                     |
| **U** | Copa: base de 3 bloques y 2 bloques hacia arriba en los extremos | Deja un hueco central que sólo se rellena desde arriba |
| **Y** | Línea de 4 bloques con un bloque perpendicular en el segundo | Cuatro orientaciones distintas                            |

### Monominó (1 bloque)

Al limpiar **4 líneas de golpe** (un **Tetris**), la siguiente pieza de la cola se sustituye
obligatoriamente por un bloque blanco **1 × 1**, pensado para rellenar el hueco difícil que suele
quedar tras el Tetris. A diferencia de los power-ups, se fusiona con el tablero como cualquier otra
pieza.

Si en el mismo momento había un power-up pendiente, el monominó pasa primero y el power-up se
conserva para la pieza siguiente: no se pierde ninguno de los dos.

---

## Power-ups

Cada **10 líneas** completadas (`POWERUP_EVERY`), la siguiente pieza en aparecer es un power-up: un
bloque **1 × 1** con un icono, elegido de forma equitativa entre los cinco tipos (**20 % cada uno**).
Se mueve y se suelta como cualquier otra pieza; el efecto se dispara al bloquearse, tomando como
**punto de impacto** la celda donde reposa.

| Icono | Nombre       | Efecto                                                                                                          |
| ----- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| 💣    | **Bomba**    | Destruye todos los bloques en un radio **3 × 3** alrededor del punto de impacto. Bonus de 10 puntos por bloque.   |
| ⚡    | **Rayo**     | Vacía por completo la **fila y la columna** del impacto. No cuenta como línea completada (no suma a LINES).       |
| 🎨    | **Tinte**    | Convierte todos los bloques del **color dominante** en **comodines** dorados.                                     |
| ⬇️    | **Gravedad** | Compacta el tablero por columnas: elimina todos los huecos, incluido el centro de la tuerca.                       |
| ❄️    | **Congelar** | Detiene la caída automática durante **5 segundos** (`FREEZE_MS`). Mover, rotar y soltar siguen disponibles.        |

**Cómo funcionan los comodines**: son bloques normales a todos los efectos, salvo que en el
**siguiente bloqueo** cada comodín rellena los huecos vacíos de su propia fila. Las filas que quedan
completas se limpian con normalidad, así que un Tinte bien colocado suele encadenar varias líneas.
Los comodines de filas que no llegan a completarse se quedan en el tablero como bloques corrientes.

La congelación se descuenta con el `dt` del game loop, no con el reloj del sistema: pausar la partida
**no** consume el tiempo restante.

---

## Habilidades y barra de energía

Cada limpieza de líneas carga la **barra de energía** (máximo 100). Con `E` se abre el **menú de
habilidades**, que congela la partida mientras eliges: `1`–`5` o clic activan, `Esc` vuelve al juego.
Las opciones sin energía suficiente salen atenuadas.

| Energía ganada | 1 línea | 2 líneas | 3 líneas | Tetris |
| -------------- | ------- | -------- | -------- | ------ |
|                | 10      | 25       | 45       | 70     |

| Tecla | Habilidad                | Coste | Efecto                                                                                                   |
| ----- | ------------------------ | ----- | -------------------------------------------------------------------------------------------------------- |
| `1`   | 👁 **Visión de Futuro**  | 25    | Muestra las **5 piezas siguientes** durante las 10 piezas próximas, en lugar de solo la siguiente.        |
| `2`   | 🔄 **Intercambio de Pool** | 30  | Sustituye la pieza activa por otra aleatoria, otra vez arriba. Si no cabe, no se gasta energía.           |
| `3`   | ⏳ **Distorsión Temporal** | 45  | La caída automática baja al **25 %** durante 10 segundos. Los controles responden igual de rápido.        |
| `4`   | ↩ **Rebobinar**          | 70    | Deshace la **última pieza consolidada**: tablero, puntuación, líneas, nivel, combo y cola vuelven atrás.  |
| `5`   | 🎒 **Reserva Táctica**    | 15    | Guarda la pieza activa; si ya había una guardada, se intercambian.                                        |

El Rebobinar guarda **un solo nivel** de historial (no se encadena) y se toma justo antes de que la
pieza se consolide, así que la pieza vuelve exactamente donde estaba. La Distorsión Temporal se
descuenta con el `dt` del loop: ni la pausa ni ❄️ consumen sus 10 segundos.

---

## Modo Desafío

Antes de cada partida se elige un **objetivo** y, opcionalmente, cualquier combinación de
**modificadores**. Todo se configura en el menú que aparece al cargar la página y al terminar una
partida; el modo **Clásico** sin modificadores es la partida de siempre.

### Objetivos

| Objetivo          | Victoria                        | Derrota                                        |
| ----------------- | ------------------------------- | ---------------------------------------------- |
| **Clásico**       | —                               | Que la pieza nueva no quepa                    |
| **Contra Reloj**  | Limpiar 20 líneas antes de 2:00 | Que el temporizador llegue a 0                 |
| **Supervivencia** | —                               | Que la basura te aplaste contra el techo       |

En **Supervivencia** el tablero genera cada 15 segundos una fila de bloques grises con un único hueco
aleatorio y empuja todo hacia arriba, la pieza activa incluida. La fila que se sale por arriba se
pierde.

Ambos relojes se descuentan con el `dt` del game loop: pausar la partida o congelar el tablero con ❄️
**no** consume tiempo ni acerca la siguiente fila de basura.

### Modificadores

| Modificador             | Efecto                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 **Tablero puzzle**   | La partida arranca con una disposición fija de bloques, incluidos **bloques indestructibles**: no se limpian aunque completes la fila, y ni la bomba ni el rayo los rompen. |
| 👻 **Piezas invisibles** | En cuanto la pieza toca una superficie y entra en el lock delay se vuelve **100 % invisible** (también su ghost) hasta consolidarse. Si la mueves y vuelve a caer, reaparece. |
| 🔄 **Rotación inversa**  | Se intercambia el sentido de las dos teclas de rotación: `↑`/`X` gira a la izquierda y `Z` a la derecha. |

Los tres son ortogonales entre sí y con el objetivo elegido: se pueden activar todos a la vez.

Los bloques indestructibles **no** impiden el Perfect Clear (se ignoran al comprobar si el tablero
quedó vacío) y tampoco cuentan como color dominante para el 🎨 Tinte. La ⬇️ Gravedad los trata como
suelo: compacta cada columna por segmentos, así ni flotan ni se hunden.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `Z`       | Rotar en sentido antihorario      |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `E`       | Abrir / cerrar el menú de habilidades |
| `1`–`5`   | Activar una habilidad (con el menú abierto) |
| `P`       | Pausar / reanudar                 |

Con el modificador **rotación inversa** activo, `↑`/`X` y `Z` intercambian su sentido.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER**.
- Un botón `#theme-toggle` (switch tipo píldora con iconos 🌙/☀️) junto al título para alternar entre modo oscuro y claro.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays. Los colores están definidos como variables CSS en `:root` (paleta oscura, por defecto) y sobreescritos en `body.light` (paleta clara) para soportar el toggle de tema.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (`1–18`) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación** (`resolveScoring`): parte de la tabla clásica `[0, 100, 300, 500, 800]` y le aplica combo, T-Spin, Back-to-Back y Perfect Clear (ver la sección siguiente). El hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila; ninguno de los dos participa en el combo.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Tema** (`applyTheme` / `toggleTheme`): alterna la clase `light` en `<body>`, persiste la preferencia en `localStorage` y fuerza un redibujado inmediato (`draw` + `drawNext`) porque el color de la rejilla del canvas no se puede resolver vía CSS.

### Combos, multiplicadores y bonificaciones

La puntuación de cada limpieza se calcula así:

```
base   = T-Spin ? TSPIN_SCORES[líneas] : LINE_SCORES[líneas]
base   = Back-to-Back activo ? floor(base × 1.5) : base
puntos = (base + 50 × combo) × nivel + bonus de Perfect Clear
```

**Combo encadenado.** El contador arranca en la primera pieza que limpia al menos una línea y sube
`+1` con cada pieza consecutiva que vuelva a limpiar. El HUD lo muestra como `x2`, `x3`… (combo `N`
se muestra como `x(N+1)`). Se reinicia en el instante en que una pieza se bloquea sin limpiar nada.
Un power-up que se consume sin limpiar **no** rompe el combo: no es un fallo del jugador.

**T-Spin.** Se detecta con la regla de las 3 esquinas: si la pieza `T` se bloquea con al menos 3 de
las 4 diagonales de su centro ocupadas (las paredes cuentan como ocupadas) **y** la última acción del
jugador fue una rotación, la jugada puntúa con `TSPIN_SCORES` en lugar de `LINE_SCORES`. Mover o
bajar la pieza tras rotar invalida el T-Spin. Un T-Spin logrado con _wall kick_ y solo 3 esquinas se
clasifica como **mini** y usa una tabla reducida.

**Back-to-Back.** Una jugada "difícil" es un Tetris (4 líneas) o cualquier T-Spin con líneas. Si dos
jugadas difíciles se encadenan sin ninguna limpieza fácil entre medias, la base se multiplica por
`1.5`. Una limpieza de 1–3 líneas sin T-Spin rompe la cadena; una pieza que no limpia nada solo rompe
el combo, no el B2B.

**Perfect Clear.** Si tras limpiar el tablero queda completamente vacío, se suma un bonus fijo
adicional (`PERFECT_SCORES × nivel`, y `3200 × nivel` en un Tetris encadenado por B2B). Ojo: los
comodines y la tuerca son bloques normales del tablero, así que cualquier resto impide el Perfect Clear.

| Jugada                          | Puntos base                    |
| ------------------------------- | ------------------------------ |
| 1 / 2 / 3 / 4 líneas            | 100 / 300 / 500 / 800          |
| T-Spin con 0 / 1 / 2 / 3 líneas | 400 / 800 / 1200 / 1600        |
| Mini T-Spin                     | 100 / 200 / 400                |
| Bonus por nivel de combo        | 50 × combo                     |
| Back-to-Back                    | × 1.5 sobre la base            |
| Perfect Clear (1–4 líneas)      | 800 / 1200 / 1800 / 2000       |
| Perfect Clear de Tetris con B2B | 3200                           |

Todo lo anterior se multiplica además por el nivel actual.

### Retroalimentación

`resolveScoring()` no dibuja ni suena: emite eventos (`line-clear`, `combo`, `tetris`, `tspin`,
`b2b`, `perfect-clear`, `combo-break`, `game-over`) a `emitEvent()`, el único punto que los traduce
en efectos. Los efectos se dibujan sobre el canvas del juego y avanzan con el `dt` del bucle, así que
la pausa no los consume:

- **Partículas** (`spawnParticles`): una ráfaga por celda de cada fila limpiada, con su color real.
  Limitadas a `MAX_PARTICLES` para no hundir los FPS.
- **Textos flotantes** (`spawnFloatText`): `+puntos`, `COMBO xN`, `TETRIS`, `T-SPIN`, `BACK-TO-BACK`,
  `PERFECT CLEAR!`.
- **Screen shake** y **destello** de pantalla, con intensidad proporcional a la jugada.
- **Sonido** sintetizado con la Web Audio API (sin ficheros de audio). El tono sube un semitono por
  nivel de combo, hasta una octava. El `AudioContext` se crea en la primera pulsación de tecla
  porque los navegadores bloquean el autoplay. El botón 🔊 silencia y guarda la preferencia en
  `localStorage`.

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`         | Paleta de colores por tipo de pieza       | 18 colores            |
| `LINE_SCORES`    | Puntos por 1, 2, 3 o 4 líneas eliminadas  | `[0,100,300,500,800]` |
| `TSPIN_SCORES`   | Puntos de un T-Spin por líneas            | `[400,800,1200,1600]` |
| `COMBO_UNIT`     | Puntos por nivel de combo                 | `50`                  |
| `B2B_MULTIPLIER` | Multiplicador de Back-to-Back             | `1.5`                 |
| `PERFECT_SCORES` | Bonus de Perfect Clear por líneas         | `[0,800,1200,1800,2000]` |
| `MAX_PARTICLES`  | Tope de partículas simultáneas            | `300`                 |
| `dropInterval`   | Velocidad inicial de caída en ms          | `1000`                |
| `POWERUP_EVERY`  | Líneas completadas entre power-ups        | `10`                  |
| `FREEZE_MS`      | Duración del power-up Congelar en ms      | `5000`                |
| `PENTOMINO_CHANCE` | Probabilidad de que salga un pentominó  | `0.15`                |
| `POWER_ICONS`    | Emoji dibujado sobre cada power-up        | 💣 ⚡ 🎨 ⬇️ ❄️        |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
