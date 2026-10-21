---
title: Publicar la tarjeta y maquetar un layout espacial
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 2 HTML and CSS Fundamentals — Build a Business Card (segunda mitad, incluida Deploying with GitHub and Netlify); Build a Space Exploration Layout
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Netlify Docs | https://docs.netlify.com ; MDN — Flexbox | https://developer.mozilla.org/es/docs/Learn/CSS/CSS_layout/Flexbox
---

## Objetivo

Terminar y publicar en internet tu tarjeta de presentación, y construir un layout de varias secciones usando flexbox y elementos semánticos.

## Qué hacer

1. (≈ 40 min) **Build a Business Card**, segunda mitad, incluida la lección **Deploying with GitHub and Netlify**. Publica tu tarjeta y guarda la URL.
2. (≈ 50 min) **Build a Space Exploration Layout** completa.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Despliegue estático**: un sitio de HTML, CSS y JS no necesita servidor propio; servicios como Netlify o GitHub Pages sirven los archivos desde un CDN.
- **Flujo Git → hosting**: subes el código a GitHub y Netlify vuelve a publicar en cada push; es tu primer contacto con el despliegue continuo que viste en el módulo 02.
- **Flexbox**: `display: flex` en un contenedor coloca a sus hijos en una fila (o columna). `justify-content` alinea en el eje principal y `align-items` en el eje cruzado.
- **Elementos semánticos**: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` dicen qué es cada bloque; un `<div>` no dice nada.
- **Imágenes de fondo**: `background-image`, `background-size: cover` y `background-position` permiten secciones visuales sin meter la imagen en el HTML.

## Preguntas de repaso

1. ¿Por qué un sitio de solo HTML y CSS se puede publicar gratis en Netlify sin un servidor propio?
   R: Porque son archivos estáticos: no hay código que ejecutar en el servidor. Netlify los guarda y los entrega desde su CDN tal cual; el navegador hace todo el trabajo.
2. ¿Qué hacen `justify-content` y `align-items` en un contenedor flex en fila?
   R: `justify-content` distribuye los hijos en el eje principal (horizontal en una fila) y `align-items` los alinea en el eje cruzado (vertical en una fila).
3. ¿Qué ganas usando `<nav>` y `<main>` en lugar de `<div>`?
   R: Significado: los lectores de pantalla pueden saltar directamente a la navegación o al contenido principal, los buscadores entienden la página y el código se lee mejor.

## Explícalo con tus palabras

Explica el camino completo desde que haces `git push` hasta que alguien abre tu tarjeta en su móvil.
