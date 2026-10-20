---
title: Counter App, el DOM y el solo project Basketball Scoreboard
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Build a Counter App (segunda mitad, JavaScript challenges y Solo Project - Basketball Scoreboard)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Introducción al DOM | https://developer.mozilla.org/es/docs/Web/API/Document_Object_Model/Introduction
---

## Objetivo

Leer y modificar la página desde JavaScript con el DOM, y aplicarlo solo en el marcador de baloncesto.

## Qué hacer

1. (≈ 50 min) **Módulo 3 → Build a Counter App**, segunda mitad: `document.getElementById`, `innerText`/`textContent`, concatenación, guardar el conteo y resetear, más los **JavaScript challenges** de la sección.
2. (≈ 40 min) **Solo Project - Basketball Scoreboard**: dos marcadores con botones +1, +2 y +3. Sin ver soluciones. Súbelo a GitHub.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **DOM (Document Object Model)**: la representación en memoria del HTML como un árbol de objetos que JavaScript puede leer y cambiar.
- **`document.getElementById("id")`**: devuelve el elemento con ese id para trabajar con él.
- **`textContent` vs `innerText` vs `innerHTML`**: los dos primeros escriben texto plano (`innerText` tiene en cuenta el CSS); `innerHTML` interpreta HTML y, con datos del usuario, abre la puerta a XSS.
- **Estado**: el valor que tu app recuerda (el conteo). La regla de oro: cambia el estado y luego vuelve a pintar la vista a partir de él.
- **Concatenación y template literals**: `"Total: " + count` o `` `Total: ${count}` ``.

## Preguntas de repaso

1. ¿Qué es el DOM y por qué JavaScript lo necesita?
   R: Es el árbol de objetos que el navegador construye a partir del HTML. JavaScript no edita el archivo HTML: lee y cambia ese árbol, y el navegador repinta la página.
2. ¿Por qué es peligroso usar `innerHTML` con texto que escribe el usuario?
   R: Porque el navegador interpreta ese texto como HTML; un usuario podría inyectar etiquetas o scripts (XSS). Con texto del usuario usa `textContent`.
3. En el marcador, ¿por qué conviene guardar los puntos en una variable en lugar de leerlos del texto del elemento cada vez?
   R: Porque la variable es la fuente de verdad del estado; leer del DOM obliga a convertir texto a número y mezcla vista con datos. Actualizas la variable y luego pintas.

## Explícalo con tus palabras

Explica la idea "estado primero, luego pinto la vista" usando el marcador de baloncesto como ejemplo.
