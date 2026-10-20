---
title: TypeScript — fundamentos con el proyecto de la pizzería
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 17 TypeScript — TypeScript Fundamentals
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; TypeScript Handbook | https://www.typescriptlang.org/docs/handbook/intro.html
---

## Objetivo

Tipar código JavaScript real: tipos básicos y propios, uniones de literales, narrowing, utility types y genéricos.

## Qué hacer

1. (≈ 90 min) **Módulo 17 TypeScript → TypeScript Fundamentals** completa (proyecto de la pizzería: *Defining Custom Types*, *Type orderQueue*, *Update order status to use literal type unions*, *Type Narrowing*, *TS-specific types: any*, *Void return type*, *Utility Types & Partial*, *Generic functions in the pizza restaurant*). Ya escribiste TypeScript en todos los ejercicios de los módulos de libros y en el libro de Gentleman: ve rápido en lo básico y concéntrate en narrowing y genéricos.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Tipado estático**: el compilador detecta errores antes de ejecutar; los tipos desaparecen al compilar a JavaScript.
- **`type` e `interface`**: describen la forma de los objetos; propiedades opcionales con `?`.
- **Uniones de literales**: `type Status = "ordered" | "completed"` limita los valores posibles mejor que `string`.
- **Narrowing**: con `typeof`, `in`, comparaciones o propiedades discriminantes, TypeScript reduce el tipo dentro de cada rama.
- **`any` vs `unknown`**: `any` apaga el chequeo; `unknown` obliga a comprobar el tipo antes de usarlo.
- **Utility types**: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`.
- **Genéricos**: `function addToArray<T>(arr: T[], item: T): T[]` conserva la relación entre tipos de entrada y salida.

## Preguntas de repaso

1. ¿Por qué `type Status = "ordered" | "completed"` es mejor que `status: string`?
   R: Porque solo admite valores válidos: un typo como `"complted"` es un error de compilación, el editor autocompleta las opciones y el narrowing por valor funciona en `if` o `switch`.
2. ¿Qué diferencia hay entre `any` y `unknown`?
   R: Con `any` puedes hacer cualquier cosa con el valor sin chequeo, lo que esconde errores. Con `unknown` TypeScript te obliga a comprobar el tipo (narrowing) antes de usarlo, así que es la opción segura para datos de origen desconocido.
3. ¿Qué aporta un genérico en `function first<T>(arr: T[]): T | undefined`?
   R: Que el tipo de retorno depende del tipo del array: `first([1, 2])` devuelve `number | undefined` y `first(["a"])` devuelve `string | undefined`, sin perder información como pasaría con `any`.

## Explícalo con tus palabras

Explica a un desarrollador de JavaScript qué errores le habría ahorrado TypeScript en el proyecto de la pizzería.
