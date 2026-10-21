---
title: Sitio de cumpleaños — posicionamiento y fuentes
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 2 HTML and CSS Fundamentals — Build a Birthday Website
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — position | https://developer.mozilla.org/es/docs/Web/CSS/position ; Google Fonts | https://fonts.google.com
---

## Objetivo

Construir el sitio de cumpleaños guiado y consolidar posicionamiento, tipografías web, sombras y bordes redondeados.

## Qué hacer

1. (≈ 90 min) **Módulo 2 → Build a Birthday Website** completa. Haz cada reto antes de mirar la solución.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`position`**: `static` (por defecto), `relative` (se mueve respecto a su lugar normal y sirve de referencia), `absolute` (se saca del flujo y se ubica respecto al ancestro posicionado más cercano), `fixed` (respecto a la ventana) y `sticky`.
- **Contexto de posicionamiento**: un hijo `absolute` busca el ancestro más cercano con `position` distinta de `static`; por eso se pone `relative` al contenedor.
- **Fuentes web**: con Google Fonts enlazas una fuente y la usas en `font-family`, siempre con una fuente genérica de respaldo.
- **Detalles visuales**: `border-radius`, `box-shadow` y `opacity` dan acabado sin imágenes extra.
- **Centrar**: con flexbox (`display: flex; justify-content: center; align-items: center`) centras en ambos ejes.

## Preguntas de repaso

1. ¿Respecto a qué se posiciona un elemento con `position: absolute`?
   R: Respecto al ancestro más cercano que tenga `position` distinta de `static`. Si no hay ninguno, respecto al bloque contenedor inicial (la página).
2. ¿Por qué siempre conviene declarar una fuente genérica de respaldo como `sans-serif`?
   R: Porque si la fuente web no carga (red lenta, bloqueo), el navegador usa la de respaldo y el texto sigue legible con un estilo parecido.
3. ¿Qué diferencia hay entre `position: fixed` y `position: sticky`?
   R: `fixed` queda siempre en el mismo lugar de la ventana aunque hagas scroll. `sticky` se comporta como normal hasta que llega a un umbral de scroll y desde ahí se queda pegado dentro de su contenedor.

## Explícalo con tus palabras

Explica por qué un ícono con `position: absolute` "salta" a la esquina de la página cuando olvidas poner `position: relative` en su contenedor.
