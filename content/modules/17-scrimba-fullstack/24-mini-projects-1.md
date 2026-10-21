---
title: Mini Projects — funciones flecha, métodos de array y expresiones
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Mini Projects (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Funciones flecha | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Functions/Arrow_functions
---

## Objetivo

Afianzar herramientas del JavaScript moderno a través de mini proyectos: expresiones de función, funciones flecha, `map` + `join`, ternarios y valores truthy/falsy.

## Qué hacer

1. (≈ 85 min) **Mini Projects**, primera mitad: incluye *Beyond Function Declarations* (expresiones de función y su reto), *The .join() Method* y su reto, y *Guess the expression - truthy or falsy?*. Resuelve cada mini proyecto antes de ver la solución.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Declaración vs expresión de función**: `function f(){}` se eleva (hoisting) y se puede llamar antes de declararla; `const f = function(){}` o `const f = () => {}` no.
- **Funciones flecha**: sintaxis corta; con una sola expresión devuelven implícitamente (`x => x * 2`) y no tienen `this` propio.
- **`map` + `join`**: `` items.map(i => `<li>${i}</li>`).join("") `` convierte datos en HTML sin bucles manuales ni comas sobrantes.
- **Ternario**: `cond ? a : b` para elegir un valor en una expresión; no lo anides más de un nivel.
- **Truthy/falsy y cortocircuito**: `a || b` devuelve el primer truthy; `a ?? b` solo cae a `b` si `a` es `null` o `undefined`; `a && b` devuelve el primer falsy.

## Preguntas de repaso

1. ¿Por qué `map` sin `join` produce comas en el HTML?
   R: Porque `map` devuelve un array, y al convertir un array a string (al asignarlo a `innerHTML`) JavaScript une los elementos con comas. `join("")` los une sin separador.
2. ¿Qué devuelve `0 || 10` y qué devuelve `0 ?? 10`?
   R: `0 || 10` devuelve `10`, porque 0 es falsy. `0 ?? 10` devuelve `0`, porque `??` solo reemplaza `null` o `undefined`. Por eso `??` es mejor para valores por defecto numéricos.
3. ¿Puedes llamar a una función definida con `const f = () => {}` antes de esa línea?
   R: No. La constante está en la zona muerta temporal hasta que se ejecuta su declaración; llamarla antes lanza un `ReferenceError`. Las declaraciones `function` sí se elevan completas.

## Explícalo con tus palabras

Explica la diferencia entre `||` y `??` con un ejemplo de "cantidad por defecto" en un carrito.
