---
title: Node.js — app fullstack, archivos estáticos, POST y eventos
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 10 Node.js — Build a Fullstack Node App
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Node.js — Events | https://nodejs.org/api/events.html ; MDN — Server-sent events | https://developer.mozilla.org/es/docs/Web/API/Server-sent_events
---

## Objetivo

Servir el frontend y la API desde el mismo servidor Node, recibir datos por POST, persistirlos y notificar cambios en tiempo real con eventos.

## Qué hacer

1. (≈ 90 min) **Build a Fullstack Node App** completa: *Serve index.html*, *Serve the Frontend Files* (tipos MIME), leer el cuerpo de un POST, guardar en un archivo con `fs`, *Add an Event Emitter* y *Server-Sent Events Challenge*.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Archivos estáticos**: leer el archivo con `fs` y responder con el `Content-Type` correcto según la extensión (`text/html`, `text/css`, `application/javascript`).
- **Path traversal**: al construir rutas a partir de la URL, usa `path.join` y comprueba que el resultado sigue dentro de la carpeta pública.
- **Leer el body**: el cuerpo llega por partes (stream); se juntan los chunks y al terminar se hace `JSON.parse`.
- **`fs/promises`**: lectura y escritura asíncronas para no bloquear el event loop.
- **EventEmitter**: `emitter.on("evento", fn)` y `emitter.emit("evento", datos)` desacoplan quien produce un hecho de quien reacciona.
- **Server-Sent Events**: una conexión HTTP que queda abierta y por la que el servidor envía mensajes al cliente (`text/event-stream`).

## Preguntas de repaso

1. ¿Por qué hay que juntar los chunks antes de hacer `JSON.parse` del cuerpo de un POST?
   R: Porque el cuerpo llega como un stream en varios fragmentos; parsear un fragmento suelto daría JSON incompleto. Se concatenan en el evento `data` y se parsea en `end`.
2. ¿Qué riesgo hay si construyes la ruta del archivo con `"public" + req.url` sin validar?
   R: Path traversal: una URL como `/../.env` podría leer archivos fuera de la carpeta pública. Hay que normalizar la ruta y comprobar que queda dentro del directorio permitido.
3. ¿Qué diferencia hay entre Server-Sent Events y hacer polling cada pocos segundos?
   R: Con SSE el servidor envía el mensaje en cuanto ocurre por una única conexión abierta; con polling el cliente pregunta repetidamente, con más peticiones y más latencia. SSE es unidireccional (servidor a cliente); para bidireccional se usa WebSocket.

## Explícalo con tus palabras

Explica cómo un EventEmitter permite que guardar un dato y avisar a los clientes conectados sean dos piezas independientes.
