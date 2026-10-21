---
title: REST — métodos HTTP, cabeceras y cuerpos
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 8 APIs and Async JavaScript — URLs and REST (resto, incluido URL Parameters - JSON Placeholder API)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Métodos de petición HTTP | https://developer.mozilla.org/es/docs/Web/HTTP/Methods ; JSONPlaceholder | https://jsonplaceholder.typicode.com
---

## Objetivo

Consumir una API REST completa: leer con GET, crear con POST enviando JSON, y entender cabeceras, códigos de estado y convenciones REST.

## Qué hacer

1. (≈ 75 min) **URLs and REST**, resto de la sección: métodos HTTP, `POST` con `fetch` (method, headers, body), `Content-Type: application/json`, REST y JSON Placeholder.
2. (≈ 15 min) Opcional: anota el enunciado de **Solo Project - Color Scheme Generator** como práctica extra con la Color API.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Métodos**: `GET` lee, `POST` crea, `PUT`/`PATCH` actualizan (todo o en parte), `DELETE` borra.
- **REST**: los recursos son sustantivos en la URL (`/posts`, `/posts/1`) y la acción la da el método, no la ruta (`/getPosts` no es REST).
- **Petición POST con fetch**: `fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })`.
- **Códigos de estado**: 2xx éxito (200, 201 creado), 4xx error del cliente (400, 401, 404), 5xx error del servidor.
- **Idempotencia**: repetir un GET, PUT o DELETE deja el mismo resultado; repetir un POST crea duplicados.

## Preguntas de repaso

1. ¿Por qué hay que poner `Content-Type: application/json` al enviar un body con `JSON.stringify`?
   R: Para decirle al servidor en qué formato viene el cuerpo; sin esa cabecera puede no parsearlo como JSON y recibir un string o nada.
2. ¿Qué es más RESTful: `POST /createUser` o `POST /users`? ¿Por qué?
   R: `POST /users`. En REST la URL nombra el recurso (la colección de usuarios) y el método HTTP expresa la acción; poner el verbo en la ruta duplica lo que ya dice el método.
3. ¿Qué diferencia hay entre un 401 y un 404?
   R: 401 significa que hace falta autenticarse (o la credencial no es válida). 404 significa que el recurso pedido no existe en esa URL.
4. ¿Por qué POST no es idempotente y PUT sí?
   R: Cada POST crea un recurso nuevo, así que repetirlo crea duplicados. PUT reemplaza el recurso en una URL concreta con el mismo contenido; repetirlo deja el mismo estado final.

## Explícalo con tus palabras

Explica REST a alguien usando una biblioteca: los recursos son libros y estanterías y los métodos son lo que haces con ellos.
