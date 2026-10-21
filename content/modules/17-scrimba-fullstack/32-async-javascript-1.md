---
title: Async JavaScript — callbacks, promesas y async/await
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 8 APIs and Async JavaScript — Async JavaScript (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — async function | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Statements/async_function ; JavaScript.info — Promesas | https://es.javascript.info/promise-basics
---

## Objetivo

Entender cómo JavaScript ejecuta trabajo asíncrono y escribirlo de forma legible con promesas y `async`/`await`.

## Qué hacer

1. (≈ 75 min) **Async JavaScript**, primera mitad (incluye *Thought experiment: what if fetch used callbacks?*), hasta tener `async`/`await` funcionando.
2. (≈ 45 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Un solo hilo y el event loop**: JavaScript ejecuta una cosa a la vez; las operaciones lentas (red, temporizadores) se delegan y su callback vuelve a la cola cuando terminan.
- **Callbacks**: funciones que se pasan para ejecutarse después; anidarlas produce el "callback hell".
- **Promesas**: un objeto que representa un valor futuro en estado pendiente, cumplida o rechazada; se encadenan con `.then` y `.catch`.
- **`async`/`await`**: una función `async` siempre devuelve una promesa; `await` pausa esa función (no todo el programa) hasta que la promesa se resuelve.
- **Orden de ejecución**: el código síncrono termina antes que cualquier callback, aunque el `setTimeout` sea de 0 ms.

## Preguntas de repaso

1. ¿Qué se imprime y en qué orden: `console.log("A"); setTimeout(() => console.log("B"), 0); console.log("C")`?
   R: A, C, B. El callback del `setTimeout` va a la cola de tareas y solo se ejecuta cuando la pila de llamadas queda vacía, es decir, después de todo el código síncrono.
2. ¿Qué devuelve siempre una función `async`?
   R: Una promesa. Si haces `return 5`, la promesa se resuelve con 5; si lanzas un error, se rechaza con ese error.
3. ¿`await` bloquea el navegador?
   R: No. Solo pausa la función `async` en la que está; el resto del programa y la interfaz siguen respondiendo mientras la promesa se resuelve.

## Explícalo con tus palabras

Explica el event loop con la analogía de un camarero que toma pedidos sin quedarse esperando en la cocina.
