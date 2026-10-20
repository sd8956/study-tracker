---
title: Solo project Unit Converter y app móvil con Firebase
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Solo Project - Unit converter; Build a Mobile App (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Firebase Realtime Database | https://firebase.google.com/docs/database ; MDN — Módulos JavaScript | https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Modules
---

## Objetivo

Practicar solo con el conversor de unidades y empezar una app que guarda datos en una base de datos en la nube.

## Qué hacer

1. (≈ 45 min) **Solo Project - Unit converter**: un número de entrada convertido a metros/pies, litros/galones y kilos/libras. Funciones puras para cada conversión; redondea a 3 decimales.
2. (≈ 45 min) **Build a Mobile App**, primera mitad: importar módulos con `import`, conectar Firebase Realtime Database y guardar datos con `push`.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Funciones puras**: dado el mismo input devuelven el mismo output y no tocan nada externo; `metersToFeet(m)` es fácil de probar.
- **Redondeo**: `toFixed(3)` devuelve un string; `Math.round(x * 1000) / 1000` devuelve un número.
- **Módulos ES**: `import { x } from "..."` y `<script type="module">` dividen el código en archivos con dependencias explícitas.
- **Base de datos en la nube**: Firebase Realtime Database guarda un árbol JSON accesible desde el navegador; `ref` apunta a una ruta y `push` añade un elemento con id único.
- **Config pública vs secretos**: la configuración de Firebase en el cliente no es secreta; la seguridad la dan las reglas de la base de datos.

## Preguntas de repaso

1. ¿Por qué conviene que `litersToGallons(l)` sea una función pura?
   R: Porque su resultado depende solo del argumento: se prueba con un simple `expect(litersToGallons(1)).toBe(...)`, se reutiliza y no sorprende con efectos secundarios.
2. ¿Qué hace `<script type="module">` diferente de un script normal?
   R: Habilita `import`/`export`, tiene su propio ámbito (no crea variables globales), se ejecuta en modo estricto y se difiere como si llevara `defer`.
3. Si la configuración de Firebase está visible en el código del navegador, ¿qué protege tus datos?
   R: Las reglas de seguridad de la base de datos en el servidor de Firebase, que deciden quién puede leer y escribir cada ruta. La config solo identifica el proyecto.

## Explícalo con tus palabras

Explica qué es un módulo de JavaScript y por qué dividir el código en archivos ayuda a mantenerlo.
