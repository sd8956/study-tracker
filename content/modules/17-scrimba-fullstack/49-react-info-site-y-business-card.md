---
title: React — sitio informativo, organización y solo project Business Card
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build a React info site (resto); Solo Project - Business Card
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Vite — Guía | https://vite.dev/guide/
---

## Objetivo

Terminar el primer sitio en React, organizar componentes en archivos, preparar un proyecto local con Vite y construir solo la tarjeta de presentación en React.

## Qué hacer

1. (≈ 55 min) Termina **Build a React info site**: componentes en archivos propios, `import`/`export`, imágenes, estilos y proyecto local con Vite.
2. (≈ 40 min) **Solo Project - Business Card** en React: componentes `Info`, `About`, `Interests` y `Footer`. Sin ver soluciones.
3. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Un componente por archivo**: `Header.jsx` exporta `Header`; facilita encontrar y probar cada pieza.
- **Export por defecto vs con nombre**: `export default Header` se importa con cualquier nombre; `export function Header` obliga al nombre exacto (más fácil de refactorizar y buscar).
- **Vite**: servidor de desarrollo rápido con recarga instantánea y build optimizado para producción; `npm create vite@latest`.
- **Assets**: importar una imagen (`import logo from "./logo.png"`) deja que el bundler gestione su ruta final.
- **Composición**: `App` compone `Header`, `Main` y `Footer`; cada componente no sabe nada de sus hermanos.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `export default` y un export con nombre?
   R: Un módulo tiene un solo export por defecto, que se importa sin llaves y con cualquier nombre. Puede tener muchos exports con nombre, que se importan con llaves y con el nombre exacto, lo que hace el código más fácil de buscar y refactorizar.
2. ¿Qué hace Vite en desarrollo y qué hace al construir para producción?
   R: En desarrollo sirve los módulos directamente al navegador con recarga en caliente casi instantánea. En producción empaqueta, minifica y optimiza el código y los assets en archivos estáticos para desplegar.
3. ¿Por qué importar una imagen en lugar de escribir su ruta como string?
   R: Porque el bundler verifica que existe, le añade un hash al nombre para el cacheo y la copia a la carpeta final; una ruta escrita a mano se puede romper al construir.

## Explícalo con tus palabras

Explica cómo dividiste tu Business Card en componentes y por qué elegiste esos límites.
