---
title: Chrome Extension — localStorage, JSON y la API de pestañas
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Build a Chrome Extension (segunda mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — localStorage | https://developer.mozilla.org/es/docs/Web/API/Window/localStorage ; Chrome Extensions — manifest | https://developer.chrome.com/docs/extensions/reference/manifest
---

## Objetivo

Persistir datos en el navegador, entender JSON y convertir la app en una extensión real de Chrome que guarda la pestaña actual.

## Qué hacer

1. (≈ 90 min) **Build a Chrome Extension**, segunda mitad: `localStorage`, `JSON.stringify`/`JSON.parse`, valores truthy y falsy, botón de borrar (doble clic), `manifest.json`, `chrome.tabs` para guardar la URL de la pestaña y carga de la extensión en Chrome.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`localStorage`**: almacén clave-valor del navegador que sobrevive al cerrar la pestaña; solo guarda strings y es por origen.
- **JSON**: formato de texto para datos. `JSON.stringify(array)` para guardar y `JSON.parse(texto)` para recuperar.
- **Truthy y falsy**: `false`, `0`, `""`, `null`, `undefined` y `NaN` son falsy; todo lo demás es truthy. Permite `if (leadsFromStorage) {...}`.
- **Parámetros de función**: `render(leads)` recibe los datos en lugar de leer una variable global.
- **`manifest.json`**: describe la extensión (nombre, versión, popup, permisos). Pedir solo los permisos necesarios es una práctica de seguridad.

## Preguntas de repaso

1. ¿Por qué hay que usar `JSON.stringify` antes de guardar un array en `localStorage`?
   R: Porque `localStorage` solo guarda strings. Si guardas el array directamente se convierte con `toString` y pierdes la estructura; con JSON lo recuperas intacto usando `JSON.parse`.
2. ¿Qué devuelve `localStorage.getItem("leads")` si nunca guardaste nada, y cómo lo manejas?
   R: Devuelve `null`, que es falsy. Por eso se hace `const saved = JSON.parse(localStorage.getItem("leads"))` y luego `if (saved) { leads = saved; render(leads) }`.
3. ¿Por qué una extensión debería pedir los mínimos permisos posibles?
   R: Por el principio de mínimo privilegio: si la extensión tiene un fallo o se compromete, el daño queda limitado a lo que puede hacer. Además los usuarios desconfían de permisos excesivos.

## Explícalo con tus palabras

Explica qué ocurre con los leads cuando cierras y vuelves a abrir la extensión, nombrando cada función que interviene.
