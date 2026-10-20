---
title: React — Notes App con localStorage y comienzo de Tenzies
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build a notes app and Tenzies games (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — useState (inicializador) | https://es.react.dev/reference/react/useState
---

## Objetivo

Sincronizar estado con `localStorage`, usar inicialización perezosa del estado y empezar el juego Tenzies con componentes generados desde datos.

## Qué hacer

1. (≈ 85 min) **Build a notes app and Tenzies games**, primera mitad: *Notes App: Sync notes with localStorage*, *Lazy State Initialization*, ordenar y borrar notas, y el inicio de Tenzies (*Tenzies: Setup*, *Die component*, *Map array to Die components*).
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Persistir estado**: un `useEffect` que guarda en `localStorage` cada vez que cambian las notas (`[notes]` como dependencia).
- **Inicialización perezosa**: `useState(() => JSON.parse(localStorage.getItem("notes")) || [])` lee el almacenamiento solo en el primer render, no en todos.
- **Orden sin mutar**: `[...notes].sort(...)` o `toSorted`, porque `sort` muta el array del estado.
- **Generar dados**: un array de 10 objetos `{ value, isHeld, id }` creado por una función; cada dado es un componente `Die`.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `useState(load())` y `useState(() => load())`?
   R: En el primero `load()` se ejecuta en cada render aunque React solo use el valor la primera vez. En el segundo pasas una función que React llama solo en el render inicial, lo que evita trabajo costoso repetido (como leer y parsear `localStorage`).
2. ¿Por qué `notes.sort(...)` directamente sobre el estado es un error?
   R: Porque `sort` muta el array original, es decir, el estado, sin pasar por el setter; React puede no detectar el cambio y el estado queda inconsistente. Hay que ordenar una copia.
3. ¿Qué datos necesita cada dado de Tenzies y por qué un `id`?
   R: Su valor, si está retenido (`isHeld`) y un id estable. El id sirve como `key` en la lista y para saber qué dado alternar al hacer clic.

## Explícalo con tus palabras

Explica cómo la Notes App recuerda tus notas al recargar la página, desde el primer render hasta cada cambio.
