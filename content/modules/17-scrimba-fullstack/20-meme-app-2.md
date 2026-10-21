---
title: Meme App — filter, modal y refactor a funciones pequeñas
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Build a Meme App (segunda mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Array.prototype.find | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/find
---

## Objetivo

Terminar la Meme App: filtrar los gatos que coinciden con la emoción elegida, mostrar uno al azar en un modal y refactorizar en funciones de una sola responsabilidad.

## Qué hacer

1. (≈ 85 min) **Build a Meme App**, segunda mitad: `filter` con condición combinada (emoción + solo GIFs), elegir un resultado al azar, abrir y cerrar el modal, y el refactor final.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`filter(callback)`**: devuelve un array nuevo con los elementos para los que el callback devuelve `true`; no muta el original.
- **Checkbox**: `checkbox.checked` es un booleano; combínalo en la condición del filtro.
- **Modal**: un elemento oculto que se muestra cambiando `display` o una clase; ciérralo también al hacer clic fuera.
- **Refactor**: `getMatchingCatsArray()`, `getSingleCatObject()`, `renderCat()`: cada función hace una cosa y se nombra por su intención (módulo 02, funciones).

## Preguntas de repaso

1. ¿Qué devuelve `filter` si ningún elemento cumple la condición?
   R: Un array vacío `[]`, nunca `undefined`. Por eso puedes encadenar métodos o comprobar `length === 0` para mostrar un mensaje.
2. ¿Por qué es mejor que `filter` no mute el array original?
   R: Porque los datos originales siguen intactos para la próxima búsqueda y no hay efectos secundarios ocultos; es más fácil razonar y depurar (y es la base de cómo React detecta cambios).
3. ¿Qué ganaste con el refactor en funciones pequeñas?
   R: Cada función tiene un nombre que explica qué hace, se puede probar y reutilizar por separado, y el flujo principal se lee como una lista de pasos.

## Explícalo con tus palabras

Explica qué hace `filter` usando como ejemplo "gatos felices que además son GIF".
