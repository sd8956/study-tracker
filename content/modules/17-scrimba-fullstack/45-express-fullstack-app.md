---
title: Express.js — app fullstack con registro, bcrypt y sesiones
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 12 Express.js — Build a Fullstack Express App
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; OWASP — Password Storage Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html ; express-session | https://expressjs.com/en/resources/middleware/session.html
---

## Objetivo

Construir una app con Express y base de datos que registra usuarios, guarda contraseñas de forma segura e identifica al usuario con sesiones.

## Qué hacer

1. (≈ 95 min) **Build a Fullstack Express App** completa: servir el frontend, conectar la base de datos, *The /register Route*, *Aside: Hash & bcrypt* y *Hash the password*, login, *Add express-session* y rutas protegidas. Usa 1,25x en las explicaciones.
2. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Nunca guardes contraseñas en claro**: guarda un hash lento con sal (bcrypt, scrypt o Argon2); al hacer login comparas con `bcrypt.compare`.
- **Sal**: valor aleatorio por usuario que hace que dos contraseñas iguales tengan hashes distintos y frustra las tablas precalculadas.
- **Sesión**: tras el login el servidor guarda `req.session.userId` y envía una cookie con el id de sesión; en cada petición identifica al usuario por esa cookie.
- **Cookies seguras**: `httpOnly` (JavaScript no la lee), `secure` (solo HTTPS) y `sameSite` (mitiga CSRF).
- **Middleware de autenticación**: `requireAuth` responde 401 si no hay sesión; se pone delante de las rutas protegidas.
- **Mensajes de error genéricos**: "email o contraseña incorrectos" sin decir cuál falló.

## Preguntas de repaso

1. ¿Por qué se usa bcrypt y no SHA-256 para guardar contraseñas?
   R: Porque SHA-256 es muy rápido, lo que permite probar miles de millones de contraseñas por segundo si roban la base de datos. bcrypt es deliberadamente lento (factor de coste configurable) e incluye sal, lo que hace inviable la fuerza bruta masiva.
2. ¿Qué hace la opción `httpOnly` en la cookie de sesión?
   R: Impide que el JavaScript de la página lea la cookie, de modo que un ataque XSS no puede robar el id de sesión.
3. ¿Por qué el login debe responder igual cuando el email no existe y cuando la contraseña es incorrecta?
   R: Para no revelar qué emails están registrados (enumeración de usuarios), lo que facilitaría ataques dirigidos.

## Explícalo con tus palabras

Explica qué viaja por la red y qué se guarda en el servidor desde que te registras hasta que entras a una página protegida.
