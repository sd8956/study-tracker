---
title: Blackjack — arrays, bucles, objetos y Math.random
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Build a Blackjack Game (segunda mitad y JavaScript challenges)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Math.random | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Math/random
---

## Objetivo

Terminar el Blackjack: cartas aleatorias, arrays recorridos con bucles, funciones que devuelven valores y un objeto para el jugador.

## Qué hacer

1. (≈ 90 min) **Build a Blackjack Game**, segunda mitad, y los **JavaScript challenges** del final de la sección.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Arrays**: listas ordenadas con índice desde 0; `push` añade al final y `length` da el tamaño.
- **Bucle `for`**: `for (let i = 0; i < cards.length; i++)` recorre un array por índice. Ya lo analizaste con Big O en el módulo 01: recorrer es O(n).
- **`return`**: una función que devuelve un valor se puede usar dentro de expresiones (`let card = getRandomCard()`).
- **Números aleatorios**: `Math.floor(Math.random() * 13) + 1` da un entero entre 1 y 13.
- **Objetos**: agrupan datos relacionados con clave-valor: `{ name: "Per", chips: 145 }`; accedes con `player.name`.

## Preguntas de repaso

1. ¿Qué rango de números produce `Math.floor(Math.random() * 6) + 1` y por qué?
   R: Enteros del 1 al 6. `Math.random()` da un número en [0, 1); por 6 queda en [0, 6); `floor` lo deja en 0–5; sumar 1 lo lleva a 1–6.
2. ¿Qué diferencia hay entre una función que hace `console.log` y una que hace `return`?
   R: `console.log` solo muestra el valor en consola; la función devuelve `undefined`. `return` entrega el valor a quien llamó la función, que puede guardarlo o usarlo en otro cálculo.
3. ¿Cuándo usas un array y cuándo un objeto?
   R: Un array para una colección ordenada de elementos del mismo tipo (las cartas). Un objeto para describir una cosa con propiedades con nombre (el jugador con nombre y fichas).

## Explícalo con tus palabras

Explica cómo calcularías la suma de las cartas de la mano con un bucle, como si se lo dictaras a alguien que escribe el código.
