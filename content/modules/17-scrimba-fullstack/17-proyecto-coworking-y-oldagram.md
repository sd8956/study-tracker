---
title: Proyecto — cierre del coworking y solo project Oldagram
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 5 Essential CSS — Build a Coworking Space Site (segunda mitad); Solo Project - Oldagram (clon de Instagram)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Accesibilidad en HTML | https://developer.mozilla.org/es/docs/Learn/Accessibility/HTML
---

## Objetivo

Terminar el sitio de coworking y construir solo un clon sencillo de Instagram (Oldagram) que combine todo lo de HTML, CSS y JavaScript visto hasta ahora.

## Qué hacer

1. (≈ 40 min) Termina **Build a Coworking Space Site** (segunda mitad).
2. (≈ 2 h) **Solo Project - Oldagram**: a partir del diseño y los datos que da Scrimba (un array de posts con nombre, avatar, imagen, likes y comentario):
   - Maqueta el feed con HTML semántico y CSS (sin frameworks).
   - Genera los posts con JavaScript recorriendo el array (no los escribas a mano en el HTML).
   - Doble clic en la imagen o clic en el corazón suma un like y actualiza el contador.
   - Criterio de terminado: se ve bien a 375 px de ancho, todas las imágenes tienen `alt`, no hay HTML duplicado y el proyecto está en GitHub y publicado en Netlify.
3. (≈ 20 min) Escribe en el README qué decisiones tomaste y qué harías distinto.

## Conceptos clave

- **Datos → vista**: el HTML de cada post sale de una función `postHtml(post)`; añadir un post es añadir un objeto al array.
- **Estado en memoria**: los likes viven en el array; al hacer clic actualizas el dato y vuelves a pintar.

## Preguntas de repaso

1. ¿Por qué generar los posts desde un array en lugar de escribirlos en el HTML?
   R: Porque separa datos de presentación: evitas duplicar marcado, añadir o cambiar posts no toca el HTML y más adelante los datos pueden venir de una API sin cambiar la vista.
2. ¿Cómo sabes a qué post pertenece un clic en el corazón?
   R: Guardando un identificador en el elemento, por ejemplo `data-index` o `data-id`, y leyéndolo en el manejador con `event.target.dataset`.
3. ¿Qué revisas antes de dar por terminado un layout?
   R: Que funcione en móvil y escritorio, que las imágenes tengan `alt`, que el contraste sea suficiente, que se pueda usar con teclado y que no haya código repetido.

## Explícalo con tus palabras

Explica cómo fluye un "like" desde el clic hasta el número actualizado en pantalla.
