---
title: Proyecto capstone — app fullstack con Next.js, TypeScript y tests
kind: project
hours: 3
sources: Proyecto propio de integración tras los módulos 15 Testing, 17 TypeScript y 18 Next.js del Scrimba Fullstack Developer Path
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Next.js — Server Actions y mutaciones | https://nextjs.org/docs/app/getting-started/updating-data ; Vitest | https://vitest.dev/guide/
---

## Objetivo

Construir de punta a punta, en local y sin despliegue, una app fullstack con Next.js (App Router) y TypeScript: base de datos SQLite, lectura en Server Components, mutaciones en el servidor, validación, búsqueda y paginación por URL, y tests automatizados.

## Qué hacer

1. (≈ 20 min) **Diseño.** Elige un dominio pequeño (por ejemplo, un catálogo de recetas o el tracker de lecturas de la sesión 46). En el README escribe: entidades, páginas, mutaciones y qué es servidor y qué es cliente.
2. (≈ 2 h) **Implementación** en TypeScript estricto:
   - Esquema SQLite con seed, y una capa `lib/data.ts` con funciones tipadas (`getItems({ q, page, sort })`, `getItem(id)`, `createItem(input)`, `updateItem`, `deleteItem`), con consultas parametrizadas y lista blanca para la ordenación.
   - Páginas: listado con búsqueda, orden y paginación en search params; detalle con `notFound()`; formulario de alta y edición.
   - Mutaciones con Server Actions (o route handlers) que validan la entrada en ejecución (por ejemplo, con Zod) y devuelven errores por campo al formulario.
   - `loading.tsx`, `error.tsx`, estado vacío y un componente de cliente pequeño (por ejemplo, el selector de orden con `useTransition`).
   - Tests con Vitest: unitarios de la capa de datos contra una base SQLite temporal (validación, paginación, `ORDER BY` inválido) y al menos un test de componente con Testing Library.
3. (≈ 30 min) **Calidad.** `npm run build` sin errores, `tsc --noEmit` limpio, tests en verde, linter sin avisos. README con cómo arrancar en local (`npm install`, seed, `npm run dev`) y una lista de decisiones y deudas. Commits convencionales y push.
4. (≈ 10 min) Repasa tu app con la lista de la evaluación de React: estado duplicado, efectos innecesarios, claves, accesibilidad y seguridad (qué valida el servidor).

## Conceptos clave

- **Validar en el borde**: todo lo que entra por formulario o URL se valida en el servidor antes de tocar la base de datos.
- **Tests de la capa de datos**: son los más baratos y los que más bugs atrapan (paginación, filtros, validación).
- **Arquitectura**: páginas (presentación) → acciones (casos de uso) → `lib/data` (persistencia); la misma separación que en la sesión 46 y en el módulo 03.

## Preguntas de repaso

1. ¿Por qué hay que validar en la Server Action aunque el formulario tenga `required` y tipos de TypeScript?
   R: Porque la validación del navegador se puede saltar (cualquiera puede enviar una petición a mano) y los tipos de TypeScript desaparecen en ejecución. La única validación fiable es la que corre en el servidor antes de escribir en la base de datos.
2. ¿Qué pruebas aporta testear la capa de datos contra una base SQLite temporal en lugar de mockearla?
   R: Que el SQL real funciona: filtros, orden, paginación y restricciones se ejecutan de verdad, con un coste bajo y de forma determinista, porque cada test parte de una base limpia.
3. ¿Qué parte de tu app es un Client Component y por qué no puede ser de servidor?
   R: Solo la que necesita interactividad en el navegador, como el selector de orden que usa `useRouter` y `useTransition` o un formulario con estado de envío; necesita hooks y eventos, que no existen en un Server Component.

## Explícalo con tus palabras

Presenta tu capstone en cinco minutos: problema, arquitectura, flujo de una mutación de punta a punta y cómo lo testeaste.
