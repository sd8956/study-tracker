---
title: Next.js — Server y Client Components, imágenes y formularios
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 18 Next.js — Build a Next.js App (segunda mitad); Rendering Strategies and More (primera parte)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Next.js — Server and Client Components | https://nextjs.org/docs/app/getting-started/server-and-client-components
---

## Objetivo

Distinguir componentes de servidor y de cliente, decidir dónde va cada uno y usar los componentes optimizados de Next.js.

## Qué hacer

1. (≈ 90 min) Termina **Build a Next.js App** y empieza **Rendering Strategies and More**: *Aside: Client vs. Server Components*, `"use client"`, el componente `Image`, *Adding Dynamic Routes and Image Optimisation* y *NextJS Form Component*.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Server Components (por defecto)**: se ejecutan solo en el servidor, pueden leer datos directamente (base de datos, archivos, secretos) y no envían su JavaScript al navegador.
- **Client Components (`"use client"`)**: necesarios para estado, efectos, manejadores de eventos y APIs del navegador; se renderizan en el servidor y se hidratan en el cliente.
- **Frontera**: `"use client"` marca la entrada al cliente; todo lo que importa ese archivo también va al cliente. Empuja la frontera hacia las hojas del árbol.
- **Props serializables**: de servidor a cliente solo pasan datos serializables, no funciones.
- **`next/image`**: tamaños responsivos, formatos modernos y carga diferida automáticamente.
- **`next/form`**: un formulario que navega con los datos en la URL (search params), ideal para buscadores.

## Preguntas de repaso

1. ¿Cuándo necesita un componente `"use client"`?
   R: Cuando usa estado o efectos (`useState`, `useEffect`), manejadores de eventos como `onClick` o APIs del navegador (`window`, `localStorage`). Si solo muestra datos, puede quedarse como componente de servidor.
2. ¿Por qué conviene que la frontera `"use client"` esté lo más abajo posible del árbol?
   R: Porque todo lo que está por debajo de esa frontera se envía al navegador; si marcas un layout entero como cliente, mandas mucho más JavaScript y pierdes la lectura directa de datos en servidor. Mejor una isla interactiva pequeña (un botón) dentro de una página de servidor.
3. ¿Puede un Server Component leer una variable de entorno secreta? ¿Y un Client Component?
   R: El Server Component sí, porque se ejecuta solo en el servidor y su código no llega al navegador. El Client Component no debe: solo ve las variables expuestas públicamente (prefijo `NEXT_PUBLIC_`), que terminan en el bundle del cliente.

## Explícalo con tus palabras

Explica con una página de producto qué partes harías de servidor y cuáles de cliente, y por qué.
