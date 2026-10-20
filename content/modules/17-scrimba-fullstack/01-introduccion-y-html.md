---
title: Introducción a Scrimba y primeros pasos con HTML
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 1 Introduction (Learn the Platform; Your First App) | Módulo 2 HTML and CSS Fundamentals — Intro to HTML
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Estructura de un documento HTML | https://developer.mozilla.org/es/docs/Learn/HTML/Introduction_to_HTML/Document_and_website_structure
---

## Objetivo

Aprender a usar Scrimba (pausar el scrim, editar el código, hacer los retos) y escribir tu primera página en HTML entendiendo para qué sirve cada etiqueta básica.

## Qué hacer

1. (≈ 25 min) En el path, abre el **módulo 1 Introduction** y haz las dos secciones: **Learn the Platform** y **Your First App**. Practica pausar el video y editar el código en el propio scrim.
2. (≈ 50 min) Abre el **módulo 2 HTML and CSS Fundamentals** y haz la sección **Intro to HTML** completa, incluida la lección *A quick intro to Web Standards*. Haz cada reto antes de ver la solución.
3. (≈ 15 min) En tu editor local crea un `index.html` con un título, dos párrafos, una lista, un enlace y una imagen. Ábrelo en el navegador.
4. (≈ 30 min) Recuerdo activo: cierra Scrimba, responde las preguntas de repaso sin mirar y luego compara con la respuesta modelo. Termina con la consigna Feynman.

## Conceptos clave

- **Scrim**: video interactivo de Scrimba; en cualquier momento pausas y el código del instructor pasa a ser tuyo para editar y ejecutar.
- **HTML**: lenguaje de marcado que describe la *estructura* y el *significado* del contenido (títulos, párrafos, listas, enlaces), no su aspecto.
- **Elemento y etiqueta**: un elemento es `<p>texto</p>`: etiqueta de apertura, contenido y etiqueta de cierre. Algunos elementos son vacíos, como `<img>`.
- **Atributos**: información extra dentro de la etiqueta de apertura, por ejemplo `href` en `<a>` o `src` y `alt` en `<img>`.
- **Jerarquía de títulos**: `<h1>` a `<h6>` expresan el esquema del documento; usa un solo `<h1>` y no saltes niveles por estética.
- **Estándares web**: el W3C y el WHATWG definen HTML, CSS y las APIs del navegador para que una página funcione igual en todos los navegadores.

## Preguntas de repaso

1. ¿Qué diferencia hay entre HTML y CSS?
   R: HTML describe la estructura y el significado del contenido (qué es un título, un párrafo, un enlace). CSS describe cómo se ve (colores, tamaños, posición). Separarlos permite cambiar el diseño sin tocar el contenido.
2. ¿Para qué sirve el atributo `alt` de una imagen?
   R: Da un texto alternativo que leen los lectores de pantalla y que se muestra si la imagen no carga. Es clave para la accesibilidad y también ayuda al SEO.
3. ¿Por qué no deberías usar `<h3>` solo porque su tamaño de letra te gusta más que el de `<h2>`?
   R: Porque los títulos expresan la jerarquía del documento, que usan lectores de pantalla y buscadores. El tamaño se cambia con CSS; la etiqueta debe elegirse por significado.
4. ¿Qué es un elemento vacío y qué ejemplo conoces?
   R: Es un elemento que no tiene contenido ni etiqueta de cierre, porque toda su información va en los atributos. Ejemplos: `<img>`, `<br>`, `<input>`.

## Explícalo con tus palabras

Explica a alguien que nunca programó qué hace el navegador cuando abre un archivo HTML y por qué una página bien estructurada es más accesible.
