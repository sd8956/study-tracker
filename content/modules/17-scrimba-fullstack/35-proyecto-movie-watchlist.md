---
title: Proyecto — Movie Watchlist con la API de OMDb
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 8 APIs and Async JavaScript — Solo Project - Movie Watchlist
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; OMDb API | https://www.omdbapi.com
---

## Objetivo

Construir solo una app de dos páginas que busca películas en una API real, muestra detalles y guarda una lista personal en `localStorage`.

## Qué hacer

1. (≈ 15 min) Lee el enunciado de **Solo Project - Movie Watchlist** y consigue una API key gratuita de OMDb.
2. (≈ 2 h 15 min) Construye:
   - **Búsqueda**: un formulario busca por título (`?s=`) y, como la búsqueda solo trae datos básicos, pide los detalles de cada resultado (`?i=`) en paralelo con `Promise.all`.
   - **Tarjetas**: póster, título, nota, duración, género y sinopsis; botón "+ Watchlist".
   - **Watchlist**: segunda página que lee de `localStorage` y permite quitar películas.
   - **Estados**: cargando, sin resultados, error de red y watchlist vacía, cada uno con su mensaje.
   - Criterio de terminado: `async`/`await` con `try/catch` y comprobación de `response.ok`, sin duplicados en la watchlist, funciona en móvil.
3. (≈ 30 min) Refactor: separa en módulos `api.js`, `storage.js` y `render.js`. Sube a GitHub y publica. Anota en el README que la key está en el cliente solo porque OMDb es gratuita y que en producción iría en un servidor.

## Conceptos clave

- **N+1 peticiones**: una búsqueda y luego una petición por resultado; con `Promise.all` al menos van en paralelo.
- **Estados de UI**: toda vista que depende de la red tiene cuatro estados: cargando, éxito, vacío y error.

## Preguntas de repaso

1. ¿Por qué pides los detalles de los resultados con `Promise.all` en lugar de con un `await` dentro de un `for`?
   R: Porque las peticiones son independientes; en paralelo el tiempo total es el de la más lenta, mientras que en secuencia es la suma de todas.
2. ¿Cómo evitas guardar la misma película dos veces en la watchlist?
   R: Comprobando por su id (`imdbID`) antes de añadirla, por ejemplo con `some`, o guardando un objeto indexado por id.
3. ¿Qué cuatro estados de interfaz tiene una búsqueda y por qué importa diseñarlos todos?
   R: Cargando, con resultados, sin resultados y error. Si solo diseñas el caso feliz, el usuario ve una pantalla vacía o rota cuando la red es lenta o falla y no sabe qué pasó.

## Explícalo con tus palabras

Explica cómo viaja una película desde la búsqueda hasta tu watchlist y por qué sigue ahí al recargar.
