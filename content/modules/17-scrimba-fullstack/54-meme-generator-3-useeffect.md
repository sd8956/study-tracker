---
title: React — efectos secundarios con useEffect y fetch
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build a meme generator (último tercio)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Sincronizar con efectos | https://es.react.dev/learn/synchronizing-with-effects ; React — Quizás no necesites un efecto | https://es.react.dev/learn/you-might-not-need-an-effect
---

## Objetivo

Sincronizar un componente con el mundo exterior (una API, temporizadores, listeners) usando `useEffect` correctamente, incluido el array de dependencias y la limpieza.

## Qué hacer

1. (≈ 85 min) **Build a meme generator**, último tercio: *Meme Generator - Planning data fetch*, `useEffect`, array de dependencias, *Meme Generator - Fetch Memes*, funciones de limpieza y el cierre del proyecto.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Efecto secundario**: algo fuera del render (red, temporizadores, suscripciones, DOM manual). El render debe ser puro.
- **`useEffect(fn, deps)`**: ejecuta `fn` después del render; con `[]` solo al montar, con `[a, b]` cuando cambian `a` o `b`, sin array en cada render.
- **Bucle infinito clásico**: un efecto que hace `setState` sin dependencias correctas vuelve a renderizar y vuelve a ejecutarse.
- **Limpieza**: la función que devuelve el efecto se ejecuta antes del siguiente efecto y al desmontar (quitar listeners, cancelar temporizadores, ignorar respuestas viejas).
- **No todo es un efecto**: transformar datos para mostrar o reaccionar a un clic no necesita `useEffect`.

## Preguntas de repaso

1. ¿Por qué `fetch` no se pone directamente en el cuerpo del componente?
   R: Porque el cuerpo se ejecuta en cada render; al recibir los datos harías `setState`, que provoca otro render, que vuelve a hacer el fetch: un bucle infinito. En `useEffect` con dependencias controlas cuándo se ejecuta.
2. ¿Qué hace la función que devuelve un `useEffect`?
   R: Es la limpieza: React la ejecuta antes de volver a correr el efecto y cuando el componente se desmonta, para quitar listeners, cancelar temporizadores o abortar peticiones y evitar fugas o actualizaciones tardías.
3. ¿Cuándo no necesitas `useEffect`?
   R: Cuando puedes calcular el valor durante el render (filtrar o formatear datos) o cuando la lógica responde a un evento del usuario: va en el manejador del evento, no en un efecto.

## Explícalo con tus palabras

Explica el array de dependencias de `useEffect` con los tres casos: sin array, vacío y con valores.
