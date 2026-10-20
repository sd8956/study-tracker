---
title: Node.js — tu primera API sin frameworks
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 10 Node.js — Build a Node API
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Node.js — módulo http | https://nodejs.org/api/http.html
---

## Objetivo

Crear un servidor HTTP con el módulo `http` de Node que sirve JSON, con rutas, parámetros de consulta y de ruta, y códigos de estado correctos.

## Qué hacer

1. (≈ 90 min) **Módulo 10 Node.js** desde *Welcome to Node* hasta terminar **Build a Node API**: variables globales de Node, *The HTTP module*, `package.json`, *Nodemon*, *Serve stringified JSON*, filtrar con query params y path params. Reproduce el servidor también en tu máquina.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Node.js**: el motor V8 fuera del navegador, con APIs para red, archivos y procesos en lugar del DOM.
- **`http.createServer((req, res) => {...})`**: cada petición llega con `req.method` y `req.url`; respondes con `res.statusCode`, `res.setHeader` y `res.end(body)`.
- **Servir JSON**: `res.setHeader("Content-Type", "application/json")` y `res.end(JSON.stringify(data))`.
- **Enrutar a mano**: comparas método y URL; parseas la query con `new URL(req.url, base).searchParams`, donde `base` es el origen de tu servidor.
- **`package.json` y scripts**: describe el proyecto, sus dependencias y comandos (`npm run dev` con nodemon para reiniciar al guardar).
- **Variables globales de Node**: `process`, `__dirname` (en CommonJS) o `import.meta` (en ES modules); no existen `window` ni `document`.

## Preguntas de repaso

1. ¿Qué tienes en Node que no tienes en el navegador, y al revés?
   R: Node tiene acceso al sistema de archivos, a la red como servidor, a procesos y variables de entorno; no tiene DOM, `window` ni `document`. El navegador tiene DOM y APIs web, pero no puede abrir puertos ni leer archivos del disco libremente.
2. ¿Qué código de estado devuelves si piden `/api/users/999` y no existe, y si piden una ruta que no conoces?
   R: 404 en ambos casos, con un cuerpo JSON que explique el error (por ejemplo, `{ "error": "User not found" }`). Si la ruta existe pero el método no está permitido, sería 405.
3. ¿Para qué sirve nodemon?
   R: Vigila los archivos del proyecto y reinicia el servidor automáticamente al guardar cambios, para no tener que pararlo y arrancarlo a mano durante el desarrollo.

## Explícalo con tus palabras

Explica qué ocurre dentro del servidor desde que llega `GET /api/books?author=ana` hasta que el navegador recibe el JSON.
