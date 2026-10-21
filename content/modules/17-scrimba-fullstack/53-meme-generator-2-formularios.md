---
title: React — props hacia arriba, formularios y componentes controlados
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build a meme generator (segundo tercio)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Compartir estado entre componentes | https://es.react.dev/learn/sharing-state-between-components
---

## Objetivo

Compartir estado entre componentes y manejar formularios con componentes controlados.

## Qué hacer

1. (≈ 85 min) **Build a meme generator**, segundo tercio: pasar estado como props, *Setting state from child components*, estado derivado, formularios y *Meme Generator - Controlled Components*.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Levantar el estado**: si dos componentes necesitan el mismo dato, vive en su ancestro común y baja por props.
- **Estado derivado**: lo que se puede calcular a partir de otro estado o de las props no se guarda en un `useState` aparte.
- **Componente controlado**: el valor del input viene del estado (`value={meme.topText}`) y cada cambio pasa por `onChange`; React es la única fuente de verdad.
- **Un manejador para varios campos**: `const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value }))`.
- **Formularios en React moderno**: también puedes leer los datos al enviar con `FormData` o la prop `action`; los controlados son útiles cuando necesitas el valor en cada tecla.

## Preguntas de repaso

1. ¿Qué es un componente controlado?
   R: Un input cuyo valor lo define el estado de React (`value`) y que actualiza ese estado en `onChange`. Así el estado siempre refleja lo que se ve y puedes validar o transformar en cada cambio.
2. Dos componentes hermanos necesitan el mismo dato. ¿Dónde lo pones?
   R: En el ancestro común más cercano, que lo pasa por props a ambos; si uno debe cambiarlo, el padre también le pasa la función que lo actualiza.
3. Tienes `items` en el estado. ¿Deberías tener también `itemCount` en otro `useState`?
   R: No. Es estado derivado: se calcula como `items.length` en cada render. Duplicarlo arriesga que ambos se desincronicen.

## Explícalo con tus palabras

Explica qué pasa entre que tecleas una letra en el input del meme y la ves aparecer sobre la imagen.
