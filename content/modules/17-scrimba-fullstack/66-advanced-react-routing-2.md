---
title: Advanced React — rutas anidadas, layouts y Outlet
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Routing (segundo cuarto)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React Router — Routing | https://reactrouter.com/start/declarative/routing
---

## Objetivo

Estructurar la app con rutas anidadas y layouts compartidos para no repetir navegación y organizar las secciones de "host".

## Qué hacer

1. (≈ 85 min) **Routing**, segundo cuarto: *Nested Routes Intro*, *Fixing the Navbar with a Layout Route* (partes 1 y 2), *Index Routes*, *Nesting the /host routes*, *Adding Host Vans Routes* y *Add /host/vans/:id Nested Routes*, `NavLink` y rutas relativas, y el quiz.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Rutas anidadas**: una ruta hija se renderiza dentro de la vista de su padre; refleja la jerarquía de la interfaz.
- **Layout route**: una ruta sin `path` (o con uno compartido) cuyo componente pinta la parte común (navbar, footer) y un `<Outlet />` donde aparecen las hijas.
- **`<Outlet />`**: el hueco donde React Router pinta la ruta hija activa.
- **Index route**: `<Route index element={...} />` es lo que se muestra en la URL exacta del padre.
- **`NavLink`**: como `Link`, pero sabe si su ruta está activa para darle estilo.
- **Rutas relativas**: `to="vans"` dentro de `/host` resuelve a `/host/vans`; `..` sube un nivel.

## Preguntas de repaso

1. ¿Qué problema resuelve una layout route?
   R: Evita repetir en cada página los elementos comunes (como la barra de navegación): el layout los pinta una vez y las rutas hijas se renderizan dentro de su `<Outlet />`.
2. ¿Qué es una index route y cuándo se muestra?
   R: Es la ruta hija por defecto de un padre; se muestra cuando la URL coincide exactamente con la ruta del padre, como `/host`, en el `Outlet` del layout.
3. ¿Qué ventaja tiene `NavLink` sobre `Link` en un menú?
   R: Sabe si su destino coincide con la URL actual y te deja aplicar una clase o estilo activo (por ejemplo, subrayar la sección actual) sin lógica manual.

## Explícalo con tus palabras

Dibuja el árbol de rutas de VanLife y explica qué se pinta en cada `Outlet` al visitar `/host/vans/1`.
