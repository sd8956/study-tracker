---
title: Mini Projects — spread, rest, desestructuración y depuración
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Mini Projects (segunda mitad, incluido Debugging: Errors)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Sintaxis spread | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Operators/Spread_syntax
---

## Objetivo

Terminar el módulo de Essential JavaScript dominando spread/rest, desestructuración, parámetros por defecto y una forma sistemática de leer errores.

## Qué hacer

1. (≈ 85 min) **Mini Projects**, segunda mitad, hasta el cierre del módulo (incluye *Debugging: Errors*). Haz los mini proyectos sin mirar soluciones.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Spread (`...`)**: expande un array u objeto: `[...a, ...b]`, `{ ...user, name: "Ana" }`. Crea copias superficiales.
- **Rest (`...`)**: agrupa el resto en parámetros o desestructuración: `function sum(...nums)`, `const [first, ...others] = arr`.
- **Desestructuración**: `const { title, price } = product` extrae propiedades con menos repetición.
- **Parámetros por defecto**: `function greet(name = "amigo")`.
- **Leer errores**: el tipo (`TypeError`, `ReferenceError`, `SyntaxError`), el mensaje y la línea del stack trace te dicen dónde mirar primero; reproduce, aísla y verifica (módulo 02, debugging).

## Preguntas de repaso

1. ¿Qué diferencia hay entre spread y rest si ambos se escriben `...`?
   R: Spread expande una colección en elementos individuales (en una llamada, array u objeto literal). Rest hace lo contrario: recoge varios elementos en un array u objeto (en parámetros o desestructuración). Lo decide la posición.
2. ¿Por qué `{ ...user }` no es una copia profunda?
   R: Porque solo copia el primer nivel; si `user.address` es un objeto, la copia apunta al mismo objeto y cambiarlo afecta a ambos.
3. ¿Qué suele indicar un `TypeError: Cannot read properties of undefined (reading 'name')`?
   R: Que intentas leer `.name` de algo que vale `undefined`, por ejemplo un `find` que no encontró nada o un elemento del DOM que no existe. Hay que revisar de dónde viene ese valor.

## Explícalo con tus palabras

Explica cómo actualizarías el precio de un producto en un array sin mutar el original, usando `map` y spread.
