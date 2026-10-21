---
title: Proyecto de integración — API REST con Express y SQLite
kind: project
hours: 3
sources: Proyecto propio de integración tras los módulos 10 Node.js, 11 Databases y 12 Express.js del Scrimba Fullstack Developer Path
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Node.js — node:sqlite | https://nodejs.org/api/sqlite.html ; Express — Error handling | https://expressjs.com/en/guide/error-handling.html
---

## Objetivo

Diseñar y construir desde cero una API REST de un tracker de lecturas (libros y notas) con Express, SQLite, validación, autenticación por sesión y manejo de errores coherente.

## Qué hacer

1. (≈ 20 min) **Diseño**: escribe en el README los recursos y endpoints antes de programar:
   - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.
   - `GET/POST /api/books`, `GET/PATCH/DELETE /api/books/:id` (solo los libros del usuario autenticado).
   - `GET/POST /api/books/:id/notes`.
   - Paginación y búsqueda: `GET /api/books?status=reading&q=clean&page=2`.
2. (≈ 2 h) **Implementación** con Express y SQLite (`node:sqlite` o la librería de Scrimba):
   - Esquema con claves foráneas (`users`, `books`, `notes`) y un script de seed.
   - Consultas siempre parametrizadas.
   - Contraseñas con bcrypt y sesión con cookie `httpOnly`.
   - Validación de entrada (campos obligatorios, tipos, `status` dentro de una lista) con respuestas 400 claras.
   - Middleware de errores único que responde `{ error: { code, message } }` y nunca filtra stack traces.
   - Capas: `routes/` (HTTP), `services/` (reglas) y `db/` (SQL).
3. (≈ 30 min) **Prueba manual** con `curl` o un cliente HTTP: un flujo feliz completo y cinco casos de error (sin sesión → 401, libro de otro usuario → 404, body inválido → 400, id inexistente → 404, email repetido → 409). Guarda los comandos en el README.
4. (≈ 10 min) Commit con mensajes convencionales y push. Este proyecto lo reutilizarás como backend más adelante.

## Conceptos clave

- **Autorización por recurso**: no basta con estar autenticado; cada consulta filtra por `user_id` para que nadie lea datos ajenos.
- **404 frente a 403 en recursos ajenos**: responder 404 evita revelar que el recurso existe.
- **Contrato de errores**: todos los errores con la misma forma hacen fácil la vida del frontend.

## Preguntas de repaso

1. ¿Por qué no basta con comprobar que el usuario está autenticado para `GET /api/books/:id`?
   R: Porque un usuario autenticado podría pedir el id de un libro de otra persona (IDOR). Hay que filtrar por el dueño: `WHERE id = ? AND user_id = ?`.
2. ¿Qué código de estado devuelves al registrar un email que ya existe y por qué?
   R: 409 Conflict, porque la petición es válida pero choca con el estado actual del recurso (el email debe ser único).
3. ¿Qué ventaja tiene separar `routes`, `services` y `db`?
   R: Cada capa tiene una razón para cambiar: HTTP, reglas de negocio o almacenamiento. Las reglas se pueden probar sin servidor y cambiar de base de datos solo toca la capa `db` (arquitectura hexagonal, módulo 03).

## Explícalo con tus palabras

Explica tu API a un desarrollador frontend que la va a consumir: recursos, autenticación, errores y paginación.
