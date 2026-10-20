---
title: Advanced React — rendimiento, memo y code splitting
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Performance
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — memo | https://es.react.dev/reference/react/memo ; React — lazy | https://es.react.dev/reference/react/lazy
---

## Objetivo

Entender cuándo y por qué React vuelve a renderizar, y usar `memo`, `useCallback`, `useMemo` y code splitting solo donde aportan.

## Qué hacer

1. (≈ 90 min) **Performance** completa: *Three phases of "rendering"*, *StrictMode - double renders components*, *Value vs. Reference Types & referential equality*, *React.memo() - reducing rerenders* y su práctica, `useCallback`/`useMemo`, y *Code Splitting, lazy, Suspense* (partes 1 y 2).
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Fases**: trigger (cambio de estado) → render (React llama a tus componentes y calcula el nuevo árbol) → commit (aplica al DOM solo las diferencias).
- **Cuándo se re-renderiza un componente**: cuando cambia su estado, cuando se re-renderiza su padre o cuando cambia un contexto que consume.
- **Igualdad referencial**: `{} !== {}` y `(() => {}) !== (() => {})`; los objetos y funciones creados en cada render son "nuevos" aunque tengan el mismo contenido.
- **`React.memo`**: omite el render de un hijo si sus props son iguales (comparación superficial). Necesita props estables: `useCallback` para funciones y `useMemo` para objetos o cálculos caros.
- **StrictMode**: en desarrollo renderiza dos veces y ejecuta los efectos dos veces para destapar efectos impuros; no ocurre en producción.
- **Code splitting**: `lazy(() => import("./Page"))` + `<Suspense fallback>` carga el código de una vista solo cuando se necesita.
- **Mide antes de optimizar**: usa el Profiler de React DevTools; la memoización también tiene coste.

## Preguntas de repaso

1. Un hijo envuelto en `React.memo` se sigue re-renderizando aunque "nada cambió". ¿Cuál es la causa más probable?
   R: Que el padre le pasa una prop de tipo objeto, array o función creada de nuevo en cada render; la comparación superficial ve una referencia distinta. Se estabiliza con `useMemo` o `useCallback`, o pasando valores primitivos.
2. ¿Por qué en desarrollo ves los `console.log` de un efecto dos veces?
   R: Por StrictMode, que monta, desmonta y vuelve a montar los componentes en desarrollo para detectar efectos sin limpieza correcta. En producción no ocurre.
3. ¿Qué ganas con `lazy` y `Suspense` en una app con muchas rutas?
   R: El bundle inicial es más pequeño, porque el código de cada vista se descarga solo cuando el usuario navega a ella; Suspense muestra un fallback mientras llega.

## Explícalo con tus palabras

Explica a un compañero por qué no debe envolver todos sus componentes en `memo` "por si acaso".
