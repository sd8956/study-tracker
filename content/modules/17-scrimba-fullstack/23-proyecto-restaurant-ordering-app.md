---
title: Proyecto — Restaurant Ordering App
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Solo Project - Restaurant Ordering app
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Array.prototype.reduce | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
---

## Objetivo

Construir solo una app de pedidos de restaurante con menú, carrito, total y pago simulado, aplicando delegación de eventos, data attributes, formularios y estado en memoria.

## Qué hacer

1. (≈ 15 min) Lee el enunciado y el diseño de **Solo Project - Restaurant Ordering app** en Scrimba. Escribe en un papel las piezas: datos del menú, estado del pedido, funciones de render y eventos.
2. (≈ 2 h) Construye la app:
   - El menú se genera desde un array de platos importado de un módulo `data.js`.
   - "Añadir" suma el plato al pedido; "quitar" lo elimina. Un único listener en `document`.
   - El resumen muestra cada línea y el total calculado con `reduce`.
   - "Completar pedido" abre un modal con un formulario de pago (`required`, `submit`, `preventDefault`) y al pagar muestra "Gracias, {nombre}".
3. (≈ 30 min) Revisa: sin HTML duplicado, funciones pequeñas con nombres claros, el total no se guarda aparte (se calcula a partir del pedido). Publica en Netlify y sube a GitHub con README.
4. (≈ 15 min) Extra si sobra tiempo: descuento al pedir combo (comida + bebida) o valoración con estrellas.

## Conceptos clave

- **Estado derivado**: el total se calcula del pedido, no se guarda en otra variable que pueda desincronizarse.
- **`reduce`**: `order.reduce((sum, item) => sum + item.price, 0)` convierte un array en un único valor.

## Preguntas de repaso

1. ¿Por qué no guardas el total en una variable que vas actualizando al añadir y quitar platos?
   R: Porque sería estado duplicado: si olvidas actualizarlo en algún camino, queda inconsistente. Calcularlo desde el pedido garantiza que siempre es correcto.
2. ¿Qué valor inicial pasas a `reduce` para sumar precios y por qué?
   R: `0`. Sin valor inicial, `reduce` usa el primer elemento (un objeto, no un número) como acumulador y con un array vacío lanza un error.
3. ¿Cómo distingues en un único listener si el clic fue en "añadir" o en "quitar"?
   R: Con data attributes distintos (`data-add`, `data-remove`) y comprobando cuál existe en `event.target.dataset`.

## Explícalo con tus palabras

Explica la arquitectura de tu app (datos, estado, render, eventos) como si la presentaras en una revisión de código.
