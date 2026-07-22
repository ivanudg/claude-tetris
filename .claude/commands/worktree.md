---
description: Crea un git worktree aislado en .trees/ y ejecuta ahí el requerimiento
argument-hint: <descripción del requerimiento a implementar>
allowed-tools: Bash(git worktree add:*), Bash(git worktree list:*), Bash(cd:*), Bash(git status:*), Bash(git branch:*), Read, Write, Edit, Glob, Grep
---

# Comando /worktree

El usuario quiere que trabajes un requerimiento de forma **aislada e independiente** del código principal, dentro de un git worktree separado.

## Requerimiento del usuario

$ARGUMENTS

## Pasos que debes ejecutar

1. **Genera un nombre** en `kebab-case`, corto y descriptivo, basado en el requerimiento de arriba (por ejemplo: si el requerimiento es "añadir modo oscuro", el nombre sería `modo-oscuro`). No preguntes al usuario; decídelo tú.

2. **Crea el worktree** con una rama nueva del mismo nombre:

   ```bash
   git worktree add .trees/[nombre] -b [nombre]
   ```

   - `.trees/` es la carpeta raíz de todos los worktrees. Si `git worktree add` falla porque la rama ya existe, añade un sufijo numérico al nombre (`[nombre]-2`) y reintenta.
   - Verifica con `git worktree list` que el worktree quedó creado.

3. **Trabaja SIEMPRE dentro de `.trees/[nombre]/`**. Todas las lecturas, escrituras y ediciones de archivos deben apuntar a rutas dentro de ese worktree, nunca al directorio principal del proyecto. Ese es el punto del aislamiento: el código principal no se toca.

4. **Implementa el requerimiento** descrito arriba dentro del worktree, respetando las convenciones del proyecto documentadas en `CLAUDE.md`.

5. **Al terminar**, informa al usuario:
   - La ruta del worktree (`.trees/[nombre]`) y el nombre de la rama.
   - Un resumen de los cambios realizados.
   - Cómo revisarlos y, si procede, cómo integrarlos (por ejemplo `git merge [nombre]` desde `main`) o eliminarlos (`git worktree remove .trees/[nombre]`).

No hagas commit ni merge salvo que el usuario lo pida explícitamente.
