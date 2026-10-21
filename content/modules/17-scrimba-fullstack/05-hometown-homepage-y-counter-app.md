---
title: Solo project Hometown Homepage y primeros pasos con JavaScript
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 2 HTML and CSS Fundamentals — Solo Project: Hometown Homepage | Módulo 3 JavaScript Fundamentals — Build a Counter App (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Primeros pasos con JavaScript | https://developer.mozilla.org/es/docs/Learn/JavaScript/First_steps
---

## Objetivo

Cerrar HTML y CSS con tu primer solo project y empezar JavaScript: variables, funciones y cómo reaccionar a un clic.

## Qué hacer

1. (≈ 45 min) **Solo Project: Hometown Homepage** (módulo 2): una página de tu ciudad con encabezado, tres secciones y pie. Sin mirar los proyectos anteriores; publícala en Netlify.
2. (≈ 45 min) **Módulo 3 JavaScript Fundamentals → Build a Counter App**, primera mitad: `<script>`, variables, `let`, números, funciones y `onclick`.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **JavaScript en el navegador**: el script se carga con `<script src="index.js">`, normalmente al final del `<body>` (o con `defer`) para que el HTML ya exista.
- **Variables**: `let` para valores que cambian y `const` para los que no se reasignan. Evita `var`.
- **Funciones**: agrupan pasos con un nombre; se declaran una vez y se llaman cuantas veces quieras.
- **Eventos**: `onclick` conecta un clic con una función. Más adelante usarás `addEventListener`, que es más flexible.
- **Depurar con `console.log`**: imprimir valores es la forma más rápida de ver qué hace tu código.

## Preguntas de repaso

1. ¿Por qué se suele cargar el script al final del `<body>`?
   R: Porque el navegador ejecuta el script al encontrarlo. Si está antes del HTML, el código intenta usar elementos que todavía no existen. Al final (o con `defer`) el DOM ya está construido.
2. ¿Cuándo usas `let` y cuándo `const`?
   R: `const` cuando la variable no se va a reasignar (la opción por defecto) y `let` cuando sí, como un contador que se incrementa.
3. ¿Qué ventaja tiene meter pasos en una función en lugar de repetirlos?
   R: Le pones un nombre a la intención, la reutilizas desde varios lugares y si hay que cambiar algo lo cambias en un solo sitio (DRY, módulo 02).

## Explícalo con tus palabras

Explica qué ocurre, paso a paso, desde que haces clic en el botón "increment" hasta que ves el número cambiar en consola.
