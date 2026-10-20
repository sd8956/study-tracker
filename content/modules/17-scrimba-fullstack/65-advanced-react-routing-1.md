---
title: Advanced React — React Router, rutas y parámetros
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Routing (primer cuarto)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React Router — Docs | https://reactrouter.com/home
---

## Objetivo

Añadir navegación de cliente a una app React (el proyecto VanLife) con React Router: rutas, enlaces, un servidor simulado y parámetros de ruta.

## Qué hacer

1. (≈ 85 min) **Routing**, primer cuarto: *Introduction to React Router 6*, *React Router Setup & BrowserRouter*, *Route, path, & element*, `Link`, el servidor falso con Mirage JS, *Fetching data in React* para la lista de vans, *Route Params* (partes 1 a 3.2, `useParams`) y el quiz.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **SPA y enrutado de cliente**: el navegador carga una sola página y React Router cambia la vista según la URL sin recargar, usando la History API.
- **`<BrowserRouter>`, `<Routes>` y `<Route path element>`**: definen qué componente se muestra para cada ruta.
- **`<Link to>`**: navega sin recargar; un `<a href>` normal recargaría toda la app y perdería el estado.
- **Parámetros de ruta**: `path="/vans/:id"` y `const { id } = useParams()` dentro del componente.
- **Servidor simulado**: Mirage JS intercepta `fetch` y devuelve datos falsos, para desarrollar el frontend antes que el backend.

## Preguntas de repaso

1. ¿Por qué usar `<Link>` y no `<a href>` para navegar dentro de la app?
   R: Porque `<a href>` hace una petición nueva al servidor y recarga la página, perdiendo el estado de React. `<Link>` cambia la URL con la History API y React Router renderiza la nueva vista sin recargar.
2. ¿Cómo lees el `42` de la URL `/vans/42` en el componente de detalle?
   R: Definiendo la ruta como `/vans/:id` y llamando a `useParams()` en el componente, que devuelve `{ id: "42" }` (siempre como string).
3. ¿Para qué sirve un servidor simulado como Mirage JS?
   R: Para desarrollar y probar el frontend con respuestas realistas (incluidos retardos y errores) sin depender de que exista el backend.

## Explícalo con tus palabras

Explica qué ocurre en una SPA cuando haces clic en un enlace, comparado con una web tradicional.
