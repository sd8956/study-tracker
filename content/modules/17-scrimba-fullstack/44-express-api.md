---
title: Express.js — API con rutas, routers y middleware
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 12 Express.js — Welcome to Express; Build an Express API
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Express — Routing | https://expressjs.com/es/guide/routing.html ; Express — Middleware | https://expressjs.com/es/guide/using-middleware.html
---

## Objetivo

Reescribir una API con Express y entender su pieza central: la cadena de middleware.

## Qué hacer

1. (≈ 90 min) **Módulo 12 Express.js**: *Welcome to Express* y **Build an Express API** completa (`app.get`, `req.params`, `req.query`, `res.json`, códigos de estado, `express.Router()` y *Separating concerns with Router*, *Your own middleware*, `express.json()` y `express.static()`).
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Compara con el servidor `http` puro de la sesión 40: ¿qué te ahorra Express?

## Conceptos clave

- **Rutas**: `app.get("/api/books/:id", handler)`; `req.params.id`, `req.query` y `req.body` (con `express.json()`).
- **Respuestas**: `res.status(201).json(obj)`; `res.json` pone el `Content-Type` y serializa.
- **Middleware**: funciones `(req, res, next)` que se ejecutan en orden; pueden modificar `req`, responder o pasar con `next()`.
- **Router**: `express.Router()` agrupa rutas de un recurso en su propio archivo (`routes/books.js`) y se monta con `app.use("/api/books", router)`.
- **Middleware de errores**: firma de 4 parámetros `(err, req, res, next)`; centraliza las respuestas de error.
- **Separación por capas**: rutas (HTTP) → controladores → servicios/datos; la misma idea de fronteras que viste en Clean/Hexagonal Architecture (módulos 02 y 03).

## Preguntas de repaso

1. ¿Qué pasa si un middleware no llama a `next()` ni envía respuesta?
   R: La petición queda colgada: ningún otro middleware ni ruta se ejecuta y el cliente espera hasta agotar el tiempo.
2. ¿Por qué importa el orden en que registras los middlewares?
   R: Porque Express los ejecuta en el orden de registro. Por ejemplo, `express.json()` debe ir antes de las rutas que leen `req.body`, y el middleware de errores al final.
3. ¿Qué ventaja tiene separar las rutas de cada recurso en un `Router`?
   R: Cada archivo tiene una responsabilidad, el `app` principal queda pequeño, las rutas se montan bajo un prefijo y se pueden probar o reutilizar por separado.

## Explícalo con tus palabras

Explica la cadena de middleware de Express con la analogía de una línea de control en un aeropuerto.
