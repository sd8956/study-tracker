---
title: Git y GitHub básico y Blackjack — condicionales
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Git and GitHub basics; Build a Blackjack Game (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Pro Git (libro gratuito) | https://git-scm.com/book/es/v2
---

## Objetivo

Versionar tus proyectos con Git y GitHub, y empezar el Blackjack aprendiendo condicionales y booleanos.

## Qué hacer

1. (≈ 15 min) **Git and GitHub basics**: crea un repositorio para tus solo projects y haz commit y push.
2. (≈ 75 min) **Build a Blackjack Game**, primera mitad: `if/else if/else`, comparaciones, booleanos, operadores lógicos y arrays básicos.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Commit**: una foto del proyecto con un mensaje. Usa Conventional Commits (`feat:`, `fix:`) como viste en el módulo 02.
- **Remoto**: GitHub guarda una copia de tu repositorio; `git push` envía tus commits y `git pull` trae los de otros.
- **Condicionales**: `if (cond) {...} else if (...) {...} else {...}` ejecutan un bloque u otro según el valor de la condición.
- **Igualdad estricta**: `===` compara valor y tipo; `==` convierte tipos y produce sorpresas (`"1" == 1` es `true`).
- **Booleanos y lógica**: `&&` (y), `||` (o) y `!` (no) combinan condiciones; por ejemplo `isAlive && !hasBlackJack`.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `git commit` y `git push`?
   R: `commit` guarda una versión en tu repositorio local. `push` envía los commits locales al remoto (GitHub). Puedes hacer muchos commits sin conexión y empujarlos después.
2. ¿Por qué se recomienda `===` en lugar de `==`?
   R: Porque `===` no convierte tipos: compara valor y tipo. `==` aplica coerción y da resultados poco intuitivos, como `"" == 0` igual a `true`.
3. En el Blackjack, ¿qué condición decide que el jugador "sigue vivo" y puede pedir otra carta?
   R: Que su suma sea menor que 21 y que no tenga ya blackjack; en código, algo como `isAlive === true && hasBlackJack === false`.

## Explícalo con tus palabras

Explica a un compañero por qué un historial de commits pequeños con buenos mensajes vale más que un único commit gigante al final.
