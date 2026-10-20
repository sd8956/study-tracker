---
title: App móvil — datos en tiempo real y PWA
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Build a Mobile App (segunda mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Web app manifest | https://developer.mozilla.org/es/docs/Web/Manifest
---

## Objetivo

Terminar la app de lista de compras: leer datos en tiempo real, borrar elementos y convertirla en una app instalable en el móvil.

## Qué hacer

1. (≈ 75 min) **Build a Mobile App**, segunda mitad: `onValue` para escuchar cambios, `Object.entries`/`Object.values` para convertir el snapshot en array, comprobar si el snapshot existe, borrar con `remove`, crear elementos con `document.createElement` y el manifest para "convertir la web en app móvil".
2. (≈ 15 min) Opcional: mira el enunciado de **Solo Project (PRO) - We are the Champions** y anótalo como práctica extra.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Suscripción en tiempo real**: `onValue(ref, callback)` ejecuta el callback cada vez que cambian los datos, en todos los dispositivos conectados.
- **De objeto a array**: Firebase devuelve un objeto `{ id: valor }`; `Object.entries(obj)` da pares `[id, valor]` para recorrerlos y conservar el id para borrar.
- **`createElement` vs `innerHTML`**: crear nodos permite añadir listeners a cada elemento y evita interpretar HTML del usuario.
- **PWA básica**: un `manifest.webmanifest` con nombre, íconos y `display: standalone` permite "añadir a pantalla de inicio".
- **Caso vacío**: cuando no hay datos, `snapshot.exists()` es falso; muestra un mensaje en vez de fallar.

## Preguntas de repaso

1. ¿Por qué se usa `Object.entries` sobre el valor del snapshot?
   R: Porque Firebase guarda los elementos como un objeto con ids como claves. `Object.entries` lo convierte en un array de pares `[id, valor]` que se puede recorrer y del que se obtiene el id necesario para borrar.
2. ¿Qué ventaja tiene `document.createElement` frente a construir el HTML como string en este caso?
   R: Te da una referencia al nodo para añadirle un `addEventListener` (por ejemplo, borrar al hacer doble clic) y usa `textContent`, que no interpreta el texto del usuario como HTML.
3. ¿Qué hace falta como mínimo para que una web se pueda "instalar" como app en el móvil?
   R: Un web app manifest enlazado con nombre, íconos y modo de visualización (`standalone`), servido por HTTPS. Para funcionar sin red también hace falta un service worker.

## Explícalo con tus palabras

Explica cómo dos móviles ven el mismo cambio en la lista casi al instante.
