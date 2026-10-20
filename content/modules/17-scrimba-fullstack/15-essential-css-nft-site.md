---
title: Essential CSS — sitio NFT, organización y especificidad
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 5 Essential CSS — Build an NFT Site
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Especificidad | https://developer.mozilla.org/es/docs/Web/CSS/Specificity
---

## Objetivo

Escribir CSS ordenado y predecible: selectores compuestos y combinadores, especificidad, unidades relativas y variables CSS.

## Qué hacer

1. (≈ 95 min) **Módulo 5 Essential CSS → Build an NFT Site** completa (incluye *CSS organisation*, *Compound selectors and specificity* y *The compounding issue with em*). Usa 1,25x en las explicaciones, nunca en los retos.
2. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Organización del CSS**: primero reset y estilos globales, luego tipografía, luego componentes y utilidades; los comentarios de sección ayudan a navegar.
- **Combinadores**: descendiente (`.card p`), hijo directo (`.card > p`), hermano adyacente (`h2 + p`).
- **Especificidad**: se cuenta como (ids, clases/atributos/pseudo-clases, tipos). `#a` gana a `.a.b.c`. Mantenla baja con clases simples.
- **`em` vs `rem`**: `em` es relativo al tamaño de fuente del elemento (y se acumula al anidar); `rem` es relativo a la raíz, más predecible.
- **Custom properties**: `--color-primary: #...` en `:root` y `var(--color-primary)` donde se use; cambiar un tema es cambiar una variable.
- **Pseudo-clases**: `:hover`, `:focus`, `:nth-child()` aplican estilos según estado o posición.

## Preguntas de repaso

1. ¿Por qué un `font-size: 1.2em` dentro de otro `1.2em` se "acumula"?
   R: Porque `em` se calcula respecto al tamaño de fuente del padre. Cada nivel multiplica por 1,2, así que un elemento anidado tres veces termina en 1,2³ del tamaño base. Con `rem` no pasa, porque siempre es relativo a la raíz.
2. ¿Qué selector gana: `#hero p` o `.hero .text p.lead`?
   R: `#hero p`, porque tiene un selector de id y la especificidad se compara primero por número de ids. Ninguna cantidad de clases supera a un id.
3. ¿Qué problema resuelven las variables CSS?
   R: Centralizan valores repetidos (colores, espaciados); cambias el valor en un sitio y se actualiza en todo el sitio, y pueden redefinirse por contexto, por ejemplo para un tema oscuro.

## Explícalo con tus palabras

Explica a alguien por qué su `!important` "funciona" pero es una mala idea, usando la especificidad.
