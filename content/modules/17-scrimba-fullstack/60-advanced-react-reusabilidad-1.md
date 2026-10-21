---
title: Advanced React — children, Context API y prop drilling
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Reusability (primer tercio)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Pasar datos en profundidad con contexto | https://es.react.dev/learn/passing-data-deeply-with-context
---

## Objetivo

Diseñar componentes reutilizables con `children` y compartir datos sin prop drilling usando Context.

## Qué hacer

1. (≈ 85 min) **Módulo 16 Advanced React.js → Reusability**, primer tercio: `children`, spread de props hacia elementos nativos, *Context Intro*, `createContext()` y Provider, `useContext()` y *State + Context*.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`children`**: lo que pones entre las etiquetas de un componente; permite contenedores genéricos (`<Card>...</Card>`).
- **Reenviar props**: `function Button({ children, ...rest }) { return <button {...rest}>{children}</button> }` acepta cualquier atributo nativo.
- **Prop drilling**: pasar props por componentes intermedios que no las usan; se vuelve frágil con muchos niveles.
- **Context**: `createContext` crea el canal, el Provider da el valor a un subárbol y `useContext` lo lee en cualquier descendiente.
- **Coste del contexto**: cuando cambia su valor, todos los consumidores se re-renderizan; úsalo para datos realmente globales a una zona (tema, usuario, estado de un componente compuesto).

## Preguntas de repaso

1. ¿Qué problema resuelve Context y cuál es su coste?
   R: Evita el prop drilling: cualquier descendiente lee el valor sin que los intermedios lo pasen. Su coste es que todo consumidor se re-renderiza cuando el valor cambia, y que el flujo de datos es menos explícito.
2. ¿Por qué un componente `Button` que reenvía `...rest` al `<button>` es más reutilizable?
   R: Porque acepta cualquier atributo nativo (`type`, `disabled`, `aria-*`, `onClick`) sin declararlo uno por uno, así que se comporta como un botón real con estilos propios.
3. ¿Qué pasa si un componente llama a `useContext` pero no hay ningún Provider por encima?
   R: Recibe el valor por defecto pasado a `createContext`. Por eso es habitual un hook propio que lance un error claro si no hay Provider.

## Explícalo con tus palabras

Explica el prop drilling con un ejemplo de tema claro/oscuro y cómo lo resuelve Context.
