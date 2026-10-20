---
title: React — props y componentes reutilizables (clon de Airbnb)
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build an AirBnb Experiences clone (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Pasar props a un componente | https://es.react.dev/learn/passing-props-to-a-component
---

## Objetivo

Hacer componentes reutilizables con props y entender el flujo de datos de padres a hijos.

## Qué hacer

1. (≈ 80 min) **Build an AirBnb Experiences clone**, primera mitad: props, desestructuración de props, props de distintos tipos y la tarjeta de experiencia reutilizable.
2. (≈ 40 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Props**: los argumentos de un componente; el padre los pasa como atributos (`<Card title="..." price={136} />`) y el hijo los recibe en un objeto.
- **Inmutables para el hijo**: un componente nunca modifica sus props; si algo debe cambiar, es estado (lo verás pronto).
- **Desestructuración**: `function Card({ title, price })` documenta qué props usa.
- **Tipos de valores**: strings con comillas; números, booleanos, objetos y funciones con llaves `{}`.
- **Flujo unidireccional**: los datos bajan del padre a los hijos; los hijos avisan al padre llamando funciones que reciben por props.

## Preguntas de repaso

1. ¿Por qué un componente no debe modificar sus props?
   R: Porque pertenecen al padre; React asume que los datos fluyen en una sola dirección. Modificarlas produce interfaces inconsistentes. Lo que cambia con el tiempo debe vivir en el estado de algún componente.
2. ¿Qué diferencia hay entre `price="136"` y `price={136}`?
   R: El primero pasa el string "136"; el segundo pasa el número 136. Con llaves se evalúa una expresión de JavaScript.
3. ¿Cómo puede un hijo comunicar algo al padre si los datos solo bajan?
   R: El padre le pasa una función por props (por ejemplo, `onSelect`) y el hijo la llama con los datos; el padre decide qué hacer.

## Explícalo con tus palabras

Explica las props usando la analogía de los parámetros de una función.
