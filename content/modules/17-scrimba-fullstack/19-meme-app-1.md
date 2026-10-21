---
title: Meme App — arrays de objetos y filtrado
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Build a Meme App (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Array.prototype.filter | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
---

## Objetivo

Trabajar con datos reales en forma de array de objetos: recorrerlos, extraer valores únicos y generar controles del formulario a partir de ellos.

## Qué hacer

1. (≈ 85 min) **Build a Meme App** (selector de memes de gatos), primera mitad: `for...of`, arrays anidados, `includes` para no repetir emociones, radios generados desde datos, `event.target` y resaltar el radio elegido.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`for...of`**: recorre los valores de un array sin manejar índices: `for (const cat of catsData)`.
- **Arrays anidados**: cada gato tiene un array `emotionTags`; necesitas dos bucles para recorrer todas las emociones.
- **Valores únicos**: `if (!emotions.includes(e)) emotions.push(e)`; más adelante verás `new Set(...)`.
- **Inputs radio**: comparten `name` para ser excluyentes; el `value` identifica la opción.
- **`event.target`**: el elemento que originó el evento; con un listener en el contenedor sabes qué radio cambió.

## Preguntas de repaso

1. ¿Cómo obtienes la lista de emociones sin repetir a partir de todos los gatos?
   R: Recorres cada gato y cada emoción de su `emotionTags`, y añades la emoción al resultado solo si no está ya (`includes`). Alternativa: `[...new Set(catsData.flatMap(c => c.emotionTags))]`.
2. ¿Qué diferencia hay entre `for...of` y `for...in`?
   R: `for...of` recorre los valores de un iterable (arrays, strings). `for...in` recorre las claves enumerables de un objeto; en un array daría los índices como strings, por eso no se usa para arrays.
3. ¿Por qué todos los radios de un grupo comparten el mismo atributo `name`?
   R: Porque así el navegador sabe que pertenecen al mismo grupo y solo deja marcado uno; además `FormData` devuelve el `value` del marcado bajo ese nombre.

## Explícalo con tus palabras

Explica cómo convertirías un array de objetos en un formulario de opciones sin escribir ninguna opción a mano.
