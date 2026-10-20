---
title: Clon de X — respuestas, nuevos posts y UUID
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Build an X Clone (segunda mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — crypto.randomUUID | https://developer.mozilla.org/es/docs/Web/API/Crypto/randomUUID
---

## Objetivo

Completar el clon: mostrar u ocultar respuestas, publicar posts nuevos con id único y mantener la vista sincronizada con los datos.

## Qué hacer

1. (≈ 75 min) **Build an X Clone**, segunda mitad: retweets, respuestas anidadas, `classList.toggle("hidden")`, nuevo post con un id generado (librería UUID por CDN o `crypto.randomUUID()`), `unshift` para ponerlo arriba y el reto final del módulo.
2. (≈ 15 min) Extra: persiste los posts en `localStorage` como hiciste en la extensión.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Ids únicos**: cada post necesita un id estable para que los clics lo encuentren; un UUID evita colisiones sin un servidor.
- **`unshift`**: añade al principio del array (lo más nuevo arriba).
- **Re-render completo**: tras cambiar los datos, `render()` vuelve a generar el feed; es simple y suficiente con pocos elementos (React lo hará eficiente después).
- **Validar el input**: no publicar si el texto está vacío; limpiar el textarea después.

## Preguntas de repaso

1. ¿Por qué no sirve usar la posición en el array como id de un post?
   R: Porque la posición cambia cuando insertas o borras elementos (por ejemplo, con `unshift`); el id dejaría de apuntar al mismo post. Un id único y estable no cambia.
2. ¿Qué limitación tiene volver a renderizar todo el feed en cada cambio?
   R: Con muchos elementos es costoso y se pierde estado de la interfaz como el foco o el scroll. Para apps pequeñas es aceptable; React resuelve esto comparando y actualizando solo lo necesario.
3. ¿Qué validaciones mínimas harías antes de publicar un post?
   R: Que el texto no esté vacío ni sea solo espacios (`trim()`), y opcionalmente un límite de longitud; luego limpiar el campo y re-renderizar.

## Explícalo con tus palabras

Explica el ciclo completo de publicar un post: input, objeto nuevo, array, render y persistencia.
