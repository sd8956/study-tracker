---
title: Clon de X — data attributes y delegación de eventos
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Build an X Clone (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Uso de data attributes | https://developer.mozilla.org/es/docs/Learn/HTML/Howto/Use_data_attributes
---

## Objetivo

Construir el feed de un clon de X (Twitter) con un único listener para todo el documento, usando data attributes para saber qué se pulsó.

## Qué hacer

1. (≈ 80 min) **Build an X Clone**, primera mitad: importar datos de un módulo, renderizar el feed, `data-like`/`data-retweet`, delegación de eventos con un listener en `document`, `find` para localizar el post y alternar likes.
2. (≈ 40 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Data attributes**: `data-like="id"` guarda información en el HTML; se lee con `element.dataset.like`.
- **Delegación de eventos**: un solo listener en un ancestro atiende clics de elementos creados dinámicamente, gracias a la propagación (bubbling).
- **`find`**: devuelve el primer elemento que cumple la condición o `undefined`.
- **Toggle de estado**: `isLiked = !isLiked` y ajustar el contador según el nuevo valor.
- **Iconos con clases**: cambiar una clase (`liked`) cambia el estilo del icono sin tocar el HTML.

## Preguntas de repaso

1. ¿Por qué la delegación de eventos funciona con elementos que se crean después de registrar el listener?
   R: Porque el listener está en un ancestro que ya existe; los eventos suben (bubbling) desde el elemento pulsado hasta él, y ahí miras `event.target` para decidir qué hacer.
2. ¿Qué diferencia hay entre `find` y `filter`?
   R: `find` devuelve el primer elemento que cumple la condición (o `undefined`) y se detiene; `filter` recorre todo y devuelve un array con todos los que cumplen.
3. Si el HTML tiene `data-tweet-id="42"`, ¿cómo lees ese valor en JavaScript?
   R: Con `element.dataset.tweetId`: el nombre pasa de kebab-case a camelCase y el valor siempre es un string.

## Explícalo con tus palabras

Explica la delegación de eventos con una analogía (por ejemplo, un recepcionista que atiende todas las llamadas de un edificio).
