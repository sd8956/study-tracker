---
title: Next.js — ordenación, estados de carga, paginación y casos límite
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 18 Next.js — Making Data Flow (segunda mitad, proyecto PrintForge)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — useTransition | https://es.react.dev/reference/react/useTransition
---

## Objetivo

Completar PrintForge con ordenación, interfaz de carga, paginación con `LIMIT`/`OFFSET` y manejo robusto de parámetros inválidos.

## Qué hacer

1. (≈ 95 min) **Making Data Flow**, segunda mitad: ordenación (*Navigating with usePathname and useRouter*, *Sorting Data with SQL ORDER BY*, combinar orden y búsqueda), carga (*Adding Route-Level Loading UI*, varios `loading.tsx`, *Showing Pending UI with useTransition*), estados vacío y no encontrado, el checkpoint de búsqueda por categorías, paginación (*Limiting Results with LIMIT and OFFSET*, *Counting Rows with COUNT()*, cálculo de páginas) y el pulido de casos límite (páginas fuera de rango, parámetros inválidos, el bug de redirección). Usa 1,25x en las explicaciones.
2. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`useRouter` y `usePathname`**: navegar desde un Client Component cambiando solo los search params.
- **`useTransition`**: marca la navegación como no urgente y da un `isPending` para mostrar un indicador sin bloquear la interfaz.
- **Paginación**: `LIMIT pageSize OFFSET (page - 1) * pageSize` y `COUNT(*)` con los mismos filtros para calcular el total de páginas.
- **Parámetros desconfiables**: todo lo que llega por la URL es input del usuario; valida y normaliza (`page` no numérico o fuera de rango, `sort` no permitido) y redirige o usa un valor por defecto.
- **Lista blanca para ORDER BY**: el nombre de columna no se puede parametrizar con `?`; se elige de una lista de valores permitidos.

## Preguntas de repaso

1. ¿Por qué hay que hacer un `COUNT(*)` aparte para la paginación y con qué filtros?
   R: Porque `LIMIT`/`OFFSET` solo devuelven una página y no dicen cuántos resultados hay en total. El `COUNT(*)` debe usar exactamente los mismos filtros (categoría, búsqueda) para que el número de páginas sea correcto.
2. ¿Cómo evitas SQL injection en el `ORDER BY` si el campo de ordenación viene de la URL?
   R: Los placeholders solo sirven para valores, no para nombres de columna. Hay que mapear el parámetro a una lista blanca (`{ name: "name", price: "price" }`) y usar un valor por defecto si no coincide.
3. ¿Qué haces si alguien pide `?page=999` y solo hay 5 páginas, o `?page=abc`?
   R: Validar el parámetro: si no es un entero positivo, usar la página 1; si supera el total, redirigir a la última página válida (o mostrar un estado vacío claro). Nunca pasar el valor sin validar a la consulta.

## Explícalo con tus palabras

Explica cómo calculas el `OFFSET` y el número total de páginas con un ejemplo de 47 modelos y 12 por página.
