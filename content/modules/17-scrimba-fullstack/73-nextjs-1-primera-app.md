---
title: Next.js — crear la app, rutas por archivos y enlaces
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 18 Next.js — Build a Next.js App (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Next.js — Docs | https://nextjs.org/docs
---

## Objetivo

Crear una app con Next.js y el App Router: estructura del proyecto, rutas basadas en carpetas, layouts y navegación.

## Qué hacer

1. (≈ 90 min) **Módulo 18 Next.js → Build a Next.js App**, primera mitad: *Welcome to Next.js*, *Running create-next-app*, *create-next-app files walkthrough*, *A Minimal Next.js Setup*, *File-based routing in Next.js* y *Links in Next.js*. Haz *Challenge: create a new Next.js app from scratch!*.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Nota: este mismo Study Tracker es una app de Next.js; cuando termines el módulo, abre su carpeta `src/app` y reconoce las piezas.

## Conceptos clave

- **Framework sobre React**: Next.js añade enrutado, renderizado en servidor, optimización de imágenes y build de producción.
- **App Router**: cada carpeta dentro de `app/` es un segmento de URL y `page.tsx` es la página de ese segmento.
- **Layouts**: `layout.tsx` envuelve a las páginas de su carpeta y de las subcarpetas, y se conserva al navegar entre ellas.
- **`<Link>` de Next**: navegación de cliente con precarga de las rutas visibles.
- **Metadatos**: exportar `metadata` en una página o layout define el título y la descripción para SEO.
- **Versiones**: Next.js cambia rápido; si algo del curso no coincide con tu versión, la documentación oficial manda.

## Preguntas de repaso

1. ¿Qué URL sirve el archivo `app/blog/[slug]/page.tsx`?
   R: Cualquier URL `/blog/algo`; `[slug]` es un segmento dinámico cuyo valor llega a la página como parámetro.
2. ¿Qué diferencia hay entre `layout.tsx` y `page.tsx`?
   R: `page.tsx` es el contenido único de una ruta. `layout.tsx` es la estructura compartida que envuelve a esa página y a las de sus subcarpetas, y no se vuelve a montar al navegar entre ellas.
3. ¿Qué ofrece Next.js que no tienes con React y Vite solos?
   R: Enrutado por archivos, renderizado en servidor (y generación estática), componentes de servidor que acceden a datos directamente, optimización de imágenes y fuentes, y endpoints de servidor en el mismo proyecto.

## Explícalo con tus palabras

Explica cómo la estructura de carpetas de `app/` se convierte en las URLs de tu sitio.
