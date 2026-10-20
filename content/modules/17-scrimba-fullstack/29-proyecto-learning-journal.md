---
title: Proyecto — Learning Journal responsivo
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 7 Responsive Design — Solo Project: Learning Journal
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; web.dev — Learn Responsive Design | https://web.dev/learn/design
---

## Objetivo

Construir solo un blog multipágina ("learning journal") totalmente responsivo con grid, flexbox, imágenes fluidas y una navegación que funcione en móvil.

## Qué hacer

1. (≈ 15 min) Lee el enunciado y el diseño de **Solo Project: Learning Journal**. Identifica componentes repetidos (tarjeta de post, cabecera, pie).
2. (≈ 2 h 15 min) Construye al menos dos páginas: la portada con el post destacado y un grid de posts, y la página de un post.
   - Mobile first; un breakpoint para tablet y otro para escritorio.
   - El grid de posts usa `auto-fit` + `minmax`.
   - Variables CSS para colores y tipografía.
   - Botón "ver más" que muestra más posts con JavaScript.
   - Criterio de terminado: se ve bien de 320 px a 1440 px, sin scroll horizontal, contraste suficiente, navegación usable con teclado y todas las imágenes con `alt`.
3. (≈ 30 min) Contenido real: escribe dos entradas sobre lo que aprendiste en este path. Publica en Netlify, sube a GitHub y añade el enlace a tu portafolio.

## Conceptos clave

- **Componentes en CSS**: una clase `.post-card` reutilizada en la portada y en "posts recientes".
- **Escala tipográfica fluida**: `clamp()` en los títulos para que crezcan con la pantalla.

## Explícalo con tus palabras

Explica qué decisiones de layout tomaste para cada tamaño de pantalla y por qué.
