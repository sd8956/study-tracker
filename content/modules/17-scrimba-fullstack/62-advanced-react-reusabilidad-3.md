---
title: Advanced React — custom hooks
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 16 Advanced React.js — Reusability (último tercio)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Reutilizar lógica con hooks personalizados | https://es.react.dev/learn/reusing-logic-with-custom-hooks
---

## Objetivo

Extraer lógica con estado a custom hooks reutilizables y testeables.

## Qué hacer

1. (≈ 85 min) **Reusability**, último tercio: *Custom Hooks Intro*, *Custom Hooks - useToggle* (todas las partes), *Use Toggle with Menu component*, *Custom Hooks - useEffectOnUpdate* y el resto de la sección.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Custom hook**: una función que empieza por `use` y usa otros hooks; comparte **lógica**, no estado (cada componente que lo usa tiene su propia copia).
- **API de un hook**: decide qué devuelve (`[on, toggle]` como `useState`, o un objeto con nombres) y qué opciones acepta (`initialValue`, `onToggle`).
- **Reglas de los hooks**: solo en el nivel superior de componentes o de otros hooks, nunca dentro de condiciones o bucles, porque React los identifica por el orden de llamada.
- **`useEffectOnUpdate`**: un efecto que se salta el primer render, implementado con un `useRef` que recuerda si ya se montó.
- **Separar lógica de vista**: el componente se queda con el JSX; el hook, con el comportamiento (módulo 02, container-presentational).

## Preguntas de repaso

1. Si dos componentes usan `useToggle()`, ¿comparten el mismo estado?
   R: No. Cada llamada a un hook crea su propio estado; un custom hook comparte la lógica, no los datos. Para compartir datos hace falta levantar el estado o usar Context.
2. ¿Por qué no puedes llamar a un hook dentro de un `if`?
   R: Porque React asocia cada estado al orden de las llamadas a hooks en cada render; si una condición cambia ese orden, React asignaría el estado equivocado a cada hook.
3. ¿Cómo implementarías un efecto que no se ejecute en el primer render?
   R: Con un `useRef(true)` que marca el primer render: en el efecto, si `ref.current` es `true`, lo pones a `false` y sales; en los siguientes renders ejecutas la lógica.

## Explícalo con tus palabras

Explica qué ganas extrayendo la lógica de abrir y cerrar a `useToggle` en lugar de repetir `useState` en cada componente.
