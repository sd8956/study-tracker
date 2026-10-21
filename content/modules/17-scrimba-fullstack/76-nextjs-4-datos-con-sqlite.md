---
title: Next.js — datos desde SQLite, rutas dinámicas y búsqueda
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 18 Next.js — Making Data Flow (primera mitad, proyecto PrintForge)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Next.js — Fetching Data | https://nextjs.org/docs/app/getting-started/fetching-data
---

## Objetivo

Conectar una app Next.js a una base de datos SQLite y construir páginas dinámicas de categorías, detalle y búsqueda leyendo datos en el servidor.

## Qué hacer

1. (≈ 90 min) **Making Data Flow**, primera mitad (PrintForge): reconstruir el shell, rutas dinámicas e imágenes, *Introducing Data in Next.js*, configurar y sembrar la base de datos (modelos y categorías), leer modelos y categorías, filtrar con `WHERE`, páginas dinámicas de categoría y de modelo, y la búsqueda con `searchParams` (*Understanding the Search Data Flow* hasta *Passing Search Through the UI*).
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Capa de datos**: funciones como `getModels()` y `getCategories()` en un módulo de servidor; las páginas las llaman directamente, sin API intermedia.
- **Rutas dinámicas con datos**: `app/models/[id]/page.tsx` recibe `params`, busca el modelo y llama a `notFound()` si no existe.
- **Búsqueda en la URL**: el formulario actualiza `?q=...`; la página lee `searchParams` en el servidor y lo pasa a la consulta.
- **Consultas parametrizadas**: `WHERE name LIKE ?` con el valor aparte, nunca concatenado (sesión 43).
- **Funciones con objeto de opciones**: `getModels({ category, query })` escala mejor que argumentos posicionales.

## Preguntas de repaso

1. ¿Por qué en un Server Component puedes consultar la base de datos directamente sin crear un endpoint de API?
   R: Porque el componente se ejecuta en el servidor, donde está la conexión a la base de datos, y su código no se envía al navegador; el cliente solo recibe el HTML resultante.
2. ¿Qué ventaja tiene guardar el término de búsqueda en `searchParams` en lugar de en un estado de cliente?
   R: La búsqueda se puede compartir y recargar, funciona con atrás y adelante, y el servidor la lee directamente para hacer la consulta y renderizar los resultados sin JavaScript extra en el cliente.
3. ¿Qué debe hacer la página de detalle si el id no existe en la base de datos?
   R: Llamar a `notFound()` para que Next.js muestre la página 404 correspondiente y devuelva el código de estado adecuado, en lugar de fallar o mostrar una página vacía.

## Explícalo con tus palabras

Explica el flujo completo desde que escribes en el buscador de PrintForge hasta que ves los resultados.
