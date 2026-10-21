---
title: Capstone del módulo de APIs
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 8 APIs and Async JavaScript — Capstone Project
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Uso de Fetch | https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Using_Fetch
---

## Objetivo

Combinar varias APIs públicas en un proyecto guiado con `async`/`await`, manejo de errores y datos que se actualizan solos.

## Qué hacer

1. (≈ 95 min) **Capstone Project** completo del módulo 8. Usa 1,25x en las explicaciones y haz cada reto antes de ver la solución.
2. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Varias fuentes de datos**: cada API tiene su URL, su forma de respuesta y sus límites; encapsula cada una en su función (`getWeather`, `getImage`).
- **Valores de respaldo**: si una API falla, muestra un valor por defecto en lugar de romper toda la página.
- **APIs del navegador**: `navigator.geolocation` y `setInterval` (por ejemplo, para un reloj) también son asíncronas o periódicas.
- **Claves de API**: nunca pongas una clave secreta en código del navegador; cualquiera la ve. Para eso se usa un servidor intermedio (lo harás con Node).

## Preguntas de repaso

1. ¿Por qué conviene una función distinta por cada API externa?
   R: Aísla los detalles (URL, formato, errores) de cada servicio; si cambia una API solo tocas su función y el resto del código trabaja con datos ya limpios. Es una frontera, como viste en el módulo 02.
2. ¿Qué haces si la API de imágenes falla pero la del clima funciona?
   R: Capturar el error solo en esa parte y usar una imagen por defecto, para que el resto del dashboard siga funcionando (degradación elegante).
3. ¿Por qué no deberías poner una API key de pago en el JavaScript del navegador?
   R: Porque cualquiera puede verla con las herramientas de desarrollo y usarla a tu costa. La clave debe vivir en un servidor que hace la petición en tu nombre.

## Explícalo con tus palabras

Explica la arquitectura del capstone: qué APIs usa, qué pasa si una falla y cómo se actualiza la información.
