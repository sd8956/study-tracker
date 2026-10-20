---
title: Next.js — estrategias de renderizado y caché
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 18 Next.js — Rendering Strategies and More (resto)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Next.js — Caching and Revalidating | https://nextjs.org/docs/app/getting-started/caching-and-revalidating
---

## Objetivo

Elegir entre render estático, dinámico y por streaming según los datos de cada página, y entender cómo cachea Next.js.

## Qué hacer

1. (≈ 85 min) **Rendering Strategies and More**, resto de la sección: render estático y dinámico, `generateStaticParams`, revalidación, streaming con `loading.tsx` y Suspense, y manejo de errores con `error.tsx` y `not-found.tsx`.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Conecta con caching y CDN del módulo 05 (system design).

## Conceptos clave

- **Estático (SSG)**: la página se genera en el build y se sirve desde caché/CDN; ideal para contenido que cambia poco.
- **Dinámico (SSR)**: se genera en cada petición; necesario cuando depende de cookies, cabeceras, search params o datos por usuario.
- **Revalidación (ISR)**: una página estática se regenera cada cierto tiempo o bajo demanda; frescura con coste de estático.
- **Streaming**: el servidor envía primero la parte lista y luego el resto envuelto en `Suspense`; `loading.tsx` es el fallback de una ruta.
- **Errores**: `error.tsx` atrapa errores de una ruta (es un Client Component) y `notFound()` muestra `not-found.tsx`.
- **Caché con criterio**: decide por página cuánto pueden estar desactualizados los datos.

## Preguntas de repaso

1. ¿Qué estrategia elegirías para un blog, para un panel con datos del usuario y para un catálogo de productos que cambia cada hora?
   R: Blog: estático, generado en el build. Panel del usuario: dinámico, porque depende de la sesión. Catálogo: estático con revalidación periódica (ISR, por ejemplo cada hora) o bajo demanda cuando cambia un producto.
2. ¿Qué ganas con el streaming y `loading.tsx`?
   R: El usuario ve de inmediato la estructura y las partes rápidas mientras las lentas se cargan, en lugar de una pantalla en blanco hasta que todo está listo; mejora la velocidad percibida.
3. ¿Qué hace que una página pase de estática a dinámica?
   R: Usar datos que solo existen en la petición: cookies, cabeceras, search params, o pedir explícitamente datos sin caché. Next.js ya no puede generarla una vez en el build.

## Explícalo con tus palabras

Explica a un product manager por qué la página de inicio carga instantánea y la de "mi cuenta" no puede ser igual.
