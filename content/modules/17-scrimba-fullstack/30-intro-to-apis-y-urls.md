---
title: APIs — clientes, servidores, fetch y JSON
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 8 APIs and Async JavaScript — Intro to APIs; URLs and REST (primera parte)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Uso de Fetch | https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch
---

## Objetivo

Entender qué es una API, cómo pide datos el navegador con `fetch` y cómo se estructura una URL con rutas y parámetros de consulta.

## Qué hacer

1. (≈ 60 min) **Módulo 8 APIs and Async JavaScript → Intro to APIs** completa (incluye *First fetch*, *Dog API Fetch and DOM Practice* y *Fetch idea from Bored API*).
2. (≈ 30 min) **URLs and REST**, primera parte: partes de una URL, path params y query strings.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Conecta con HTTP y APIs del módulo 05 (system design).

## Conceptos clave

- **API**: un contrato para que un programa pida datos o acciones a otro; en la web, un servidor que responde a peticiones HTTP, casi siempre con JSON.
- **Cliente y servidor**: el navegador (cliente) envía una petición; el servidor responde con un código de estado, cabeceras y un cuerpo.
- **`fetch(url)`**: devuelve una promesa de `Response`; `response.json()` devuelve otra promesa con los datos.
- **`.then()`**: encadena lo que hacer cuando la promesa se resuelve.
- **Partes de una URL**: protocolo, dominio, ruta (`/users/42`) y query string (`?page=2&limit=10`).

## Preguntas de repaso

1. ¿Por qué `fetch` necesita dos `.then` para llegar a los datos?
   R: Porque `fetch` resuelve primero con el objeto `Response` cuando llegan las cabeceras; leer y parsear el cuerpo es otra operación asíncrona (`response.json()`) que devuelve su propia promesa.
2. En `https://api.example.com/users/42?fields=name`, ¿qué es path param y qué es query param?
   R: `42` en la ruta es un path param que identifica un recurso concreto. `fields=name` en la query string es un parámetro opcional que filtra o modifica la respuesta.
3. ¿Qué es una API desde el punto de vista de quien la consume?
   R: Un contrato: unas URLs, métodos y formatos de datos documentados con los que pides información o acciones sin conocer cómo está implementado el servidor por dentro.

## Explícalo con tus palabras

Explica el viaje de una petición `fetch` desde tu navegador hasta el servidor y de vuelta, como si fuera una carta con sobre y contenido.
