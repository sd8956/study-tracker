---
title: Async JavaScript — errores, Promise.all y crear promesas
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 8 APIs and Async JavaScript — Async JavaScript (segunda mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Promise.all | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
---

## Objetivo

Manejar errores de red correctamente, lanzar peticiones en paralelo y crear tus propias promesas.

## Qué hacer

1. (≈ 75 min) **Async JavaScript**, segunda mitad: `try/catch` con `await`, comprobar `response.ok`, lanzar errores propios, `new Promise`, y peticiones en paralelo.
2. (≈ 45 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`fetch` no rechaza en 404 o 500**: solo rechaza si falla la red. Hay que comprobar `if (!res.ok) throw new Error(...)`.
- **`try/catch/finally`**: captura errores de `await`; `finally` sirve para quitar un spinner pase lo que pase.
- **`new Promise((resolve, reject) => {...})`**: envuelve APIs basadas en callbacks (como `setTimeout`) en una promesa.
- **`Promise.all`**: ejecuta varias promesas en paralelo y espera a todas; si una falla, falla el conjunto. `Promise.allSettled` espera todas y te da el resultado de cada una.
- **Secuencial vs paralelo**: dos `await` seguidos e independientes tardan la suma; con `Promise.all` tardan el máximo.

## Preguntas de repaso

1. ¿Por qué un `try/catch` alrededor de `await fetch(url)` no captura un 404 por sí solo?
   R: Porque `fetch` considera exitosa cualquier respuesta HTTP, incluida una 404; solo rechaza por fallos de red. Hay que comprobar `response.ok` y lanzar un error si es falso.
2. Tienes que pedir el usuario y su lista de pedidos, que no dependen entre sí. ¿Cómo lo haces más rápido?
   R: Lanzando ambas peticiones a la vez con `const [user, orders] = await Promise.all([getUser(), getOrders()])`, en lugar de dos `await` secuenciales.
3. ¿Cómo convertirías `setTimeout` en una función `wait(ms)` que se pueda usar con `await`?
   R: `const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))`; luego `await wait(1000)` pausa la función un segundo.

## Explícalo con tus palabras

Explica qué debe hacer una buena función `getData()` cuando la red falla, cuando el servidor responde 500 y cuando todo va bien.
