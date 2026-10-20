---
title: React — terminar Tenzies, condición de victoria y accesibilidad
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build a notes app and Tenzies games (segunda mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Referenciar valores con refs | https://es.react.dev/learn/referencing-values-with-refs ; MDN — ARIA live regions | https://developer.mozilla.org/es/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
---

## Objetivo

Terminar Tenzies: retener dados, volver a tirar, detectar la victoria como estado derivado y hacer el juego accesible.

## Qué hacer

1. (≈ 80 min) **Build a notes app and Tenzies games**, segunda mitad: retener dados, tirar solo los no retenidos, condición de victoria, nueva partida, confeti y mejoras de accesibilidad (foco y anuncios).
2. (≈ 40 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Actualizar un elemento del array**: `prev.map(d => d.id === id ? { ...d, isHeld: !d.isHeld } : d)`.
- **Victoria como estado derivado**: `const won = dice.every(d => d.isHeld) && dice.every(d => d.value === dice[0].value)`; no hace falta otro `useState`.
- **`useRef`**: guarda una referencia a un nodo del DOM (por ejemplo, para mover el foco al botón "New game") o un valor que no debe provocar render.
- **Accesibilidad**: botones reales para los dados, `aria-pressed` para indicar retenido y una región `aria-live` que anuncia la victoria.

## Preguntas de repaso

1. ¿Por qué la condición de victoria no necesita su propio `useState`?
   R: Porque se puede calcular a partir del array de dados en cada render; guardarla aparte sería estado duplicado y necesitarías un efecto para mantenerla sincronizada.
2. ¿Qué diferencia hay entre `useRef` y `useState`?
   R: Cambiar `ref.current` no provoca un nuevo render; cambiar el estado sí. `useRef` sirve para referencias al DOM o valores que deben persistir entre renders sin afectar a la vista.
3. ¿Qué hace una región `aria-live` en el juego?
   R: Hace que los lectores de pantalla anuncien automáticamente el texto que cambia dentro de ella (por ejemplo, "¡Ganaste!"), aunque el foco esté en otro lugar.

## Explícalo con tus palabras

Explica cómo se actualiza un único dado en un array de estado sin mutarlo.
