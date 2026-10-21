---
title: CSS Grid — layouts en dos dimensiones
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 7 Responsive Design — CSS Grid
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; CSS-Tricks — A Complete Guide to CSS Grid | https://css-tricks.com/snippets/css/complete-guide-grid/
---

## Objetivo

Usar CSS Grid para layouts de filas y columnas a la vez, incluidas galerías que se adaptan solas sin media queries.

## Qué hacer

1. (≈ 80 min) **CSS Grid** completa (incluye *Tablet view with span* y *Tablet Media Queries*).
2. (≈ 40 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Grid vs flexbox**: flexbox reparte en una dimensión (fila o columna); grid controla filas y columnas a la vez.
- **`grid-template-columns`**: `repeat(3, 1fr)` crea tres columnas iguales; `fr` es una fracción del espacio libre.
- **`gap`**: separación entre celdas.
- **Colocar elementos**: `grid-column: span 2` ocupa dos columnas; `grid-column: 1 / -1` ocupa toda la fila.
- **`grid-template-areas`**: nombras zonas (`"header header" "sidebar main"`) y asignas elementos con `grid-area`.
- **Grids auto-adaptables**: `repeat(auto-fit, minmax(15rem, 1fr))` crea tantas columnas como quepan.

## Preguntas de repaso

1. ¿Cuándo eliges grid y cuándo flexbox?
   R: Grid cuando el layout depende de filas y columnas a la vez (una página completa, una galería). Flexbox para alinear elementos en una sola dirección (una barra de navegación, los botones de una tarjeta). Se combinan a menudo.
2. ¿Qué hace `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`?
   R: Crea tantas columnas como quepan con un mínimo de 200 px cada una y reparte el espacio sobrante entre ellas; al estrecharse la pantalla las columnas bajan de línea solas.
3. ¿Qué significa `grid-column: 1 / -1`?
   R: Que el elemento empieza en la primera línea de columna y termina en la última, es decir, ocupa todo el ancho del grid.

## Explícalo con tus palabras

Explica qué es la unidad `fr` y por qué es más cómoda que los porcentajes cuando hay `gap`.
