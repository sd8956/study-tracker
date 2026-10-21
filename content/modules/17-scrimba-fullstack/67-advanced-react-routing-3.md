---
title: Advanced React — Outlet context y search params
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Routing (tercer cuarto)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React Router — useSearchParams | https://reactrouter.com/api/hooks/useSearchParams
---

## Objetivo

Compartir datos entre una ruta y sus hijas con Outlet context y guardar filtros en la URL con search params.

## Qué hacer

1. (≈ 85 min) **Routing**, tercer cuarto: *Outlet Context*, query params (`useSearchParams`), filtrar vans por tipo desde la URL, conservar los filtros al ir al detalle y volver (estado en `Link`), y *Route Not Found* (página 404).
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Outlet context**: `<Outlet context={{ van }} />` y `useOutletContext()` pasan datos del layout a la ruta hija sin Context global.
- **Search params como estado**: `?type=rugged` guarda el filtro en la URL; se puede compartir, guardar en favoritos y sobrevive a recargar.
- **`useSearchParams()`**: devuelve `[searchParams, setSearchParams]`; `searchParams.get("type")`.
- **Estado de navegación**: `<Link to=".." state={{ search }}>` lleva datos a la siguiente vista (por ejemplo, para volver con el filtro aplicado).
- **Ruta comodín**: `path="*"` captura cualquier URL no definida para mostrar una 404.

## Preguntas de repaso

1. ¿Por qué guardar un filtro en la URL y no en `useState`?
   R: Porque la URL es compartible, sobrevive a la recarga y funciona con los botones atrás y adelante del navegador. Un `useState` se pierde al recargar y no se puede enviar a otra persona.
2. ¿Cuándo usarías `useOutletContext` en lugar de Context de React?
   R: Cuando los datos solo interesan a las rutas hijas de un layout concreto (por ejemplo, la van cargada en `/host/vans/:id` para sus pestañas); es más local y explícito que un Context global.
3. ¿Cómo muestras una página 404 para rutas no definidas?
   R: Con una ruta comodín `<Route path="*" element={<NotFound />} />` al final de las rutas (dentro del layout si quieres conservar la navegación).

## Explícalo con tus palabras

Explica por qué la URL es una forma de estado de la aplicación y qué tipo de estado debería vivir en ella.
