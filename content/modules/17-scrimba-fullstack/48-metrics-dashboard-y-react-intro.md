---
title: Refactor de un dashboard y primeros pasos con React
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 13 User Interface Design — Refactor a Metrics Dashboard | Módulo 14 React.js Fundamentals — Build a React info site (primera parte)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Tu primer componente | https://es.react.dev/learn/your-first-component
---

## Objetivo

Cerrar UI Design aplicándolo a un dashboard real y empezar React: por qué existe, JSX y componentes.

## Qué hacer

1. (≈ 40 min) **Refactor a Metrics Dashboard** completa (módulo 13).
2. (≈ 50 min) **Módulo 14 React.js Fundamentals → Build a React info site**, primera parte: por qué React, `createRoot`, JSX y primeros componentes. Ya viste React en el libro de Gentleman (módulo 02): fíjate en lo que te resulta nuevo.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Refactor visual**: mejorar jerarquía, espaciado y contraste sin cambiar la funcionalidad, igual que un refactor de código.
- **Declarativo vs imperativo**: con el DOM dices *cómo* cambiar cada nodo; con React describes *qué* debe verse para un estado y React calcula los cambios.
- **Componentes**: funciones que devuelven JSX; se nombran en PascalCase y se componen como piezas.
- **JSX**: sintaxis parecida a HTML que se compila a llamadas de JavaScript; usa `className`, un único elemento raíz (o un Fragment `<>...</>`) y `{}` para expresiones.
- **`createRoot(el).render(<App />)`**: monta el árbol de React dentro de un elemento del HTML.

## Preguntas de repaso

1. ¿Qué significa que React es declarativo?
   R: Que describes cómo debe verse la interfaz para un estado dado y React se encarga de actualizar el DOM para que coincida, en lugar de escribir tú cada paso de modificación del DOM.
2. ¿Por qué en JSX se escribe `className` y no `class`?
   R: Porque JSX se convierte en JavaScript y `class` es una palabra reservada del lenguaje; `className` es el nombre de la propiedad del DOM correspondiente.
3. ¿Por qué un componente debe devolver un único elemento raíz y cómo lo resuelves sin añadir un `div`?
   R: Porque una función solo puede devolver un valor, y el JSX se convierte en una única llamada. Para agrupar sin añadir nodos al DOM usas un Fragment `<>...</>`.

## Explícalo con tus palabras

Explica la diferencia entre actualizar un contador con `getElementById` y con React, como si se lo contaras a quien solo conoce JavaScript puro.
