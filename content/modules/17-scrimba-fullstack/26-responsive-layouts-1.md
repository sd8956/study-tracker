---
title: Responsive Design — mobile first y unidades relativas
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 7 Responsive Design — Responsive Layouts (primera parte)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Diseño responsivo | https://developer.mozilla.org/es/docs/Learn/CSS/CSS_layout/Responsive_Design
---

## Objetivo

Diseñar layouts que se adaptan a cualquier pantalla empezando por móvil, con unidades relativas y anchos máximos en lugar de tamaños fijos.

## Qué hacer

1. (≈ 85 min) **Módulo 7 Responsive Design → Responsive Layouts**, primera parte (aprox. dos tercios de la sección).
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Mobile first**: escribes primero los estilos para pantallas pequeñas y añades `@media (min-width: ...)` para pantallas mayores; el CSS base es más simple.
- **Meta viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1">` evita que el móvil simule una pantalla de escritorio.
- **Unidades**: `%` (del padre), `rem` (de la raíz), `vw`/`vh` (de la ventana). Usa `rem` para tipografía y espaciado.
- **`max-width`**: `width: 90%; max-width: 70rem; margin: 0 auto` crea un contenedor fluido que no se estira de más.
- **Funciones**: `min()`, `max()` y `clamp(min, ideal, max)` dan tamaños fluidos sin media queries.

## Preguntas de repaso

1. ¿Por qué mobile first suele producir menos CSS?
   R: Porque en móvil el layout suele ser una sola columna, que es el comportamiento natural de los bloques. Las media queries solo añaden complejidad (columnas) donde hay espacio, en vez de deshacerla.
2. ¿Qué hace `font-size: clamp(1.5rem, 4vw, 3rem)`?
   R: El tamaño ideal es el 4 % del ancho de la ventana, pero nunca menor que 1,5rem ni mayor que 3rem: escala de forma fluida dentro de límites.
3. ¿Qué pasa en un móvil si falta la meta etiqueta viewport?
   R: El navegador renderiza la página como si la pantalla fuera de escritorio (unos 980 px) y la reduce, así que el texto se ve diminuto y las media queries no se aplican como esperas.

## Explícalo con tus palabras

Explica a un diseñador por qué "un ancho fijo de 1200 px" es un problema y qué propones en su lugar.
