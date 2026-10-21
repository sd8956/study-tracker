---
title: Media queries en la práctica — página de producto
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 7 Responsive Design — Responsive Layouts (resto); Build a Product Page
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Media queries | https://developer.mozilla.org/es/docs/Web/CSS/CSS_media_queries/Using_media_queries
---

## Objetivo

Terminar los fundamentos de layout responsivo y aplicarlos en una página de producto con puntos de quiebre para tablet y escritorio.

## Qué hacer

1. (≈ 30 min) Termina **Responsive Layouts**.
2. (≈ 65 min) **Build a Product Page** completa (incluye la vista tablet con media queries).
3. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Breakpoints por contenido**: añade una media query cuando el diseño "se rompe", no por modelos de dispositivos.
- **Imágenes responsivas**: `max-width: 100%; height: auto` para que nunca desborden; `srcset` y `<picture>` para servir tamaños distintos.
- **Reordenar con flexbox**: `flex-direction` y `order` cambian la disposición entre móvil y escritorio sin tocar el HTML (cuidado: el orden visual no cambia el orden de lectura del lector de pantalla).
- **Áreas táctiles**: botones de al menos 44×44 px en móvil.

## Preguntas de repaso

1. ¿Por qué se recomienda elegir breakpoints según el contenido y no según dispositivos concretos?
   R: Porque hay miles de tamaños de pantalla y cambian cada año. Si pones el breakpoint donde tu diseño deja de verse bien, funciona para cualquier dispositivo presente o futuro.
2. ¿Qué hace `img { max-width: 100%; height: auto; }`?
   R: Impide que la imagen sea más ancha que su contenedor y mantiene su proporción al reducirse.
3. ¿Qué riesgo de accesibilidad tiene cambiar el orden con `order` en flexbox?
   R: El orden visual cambia pero el orden en el DOM no; quien navega con teclado o lector de pantalla recorre el orden del HTML, que puede no tener sentido con lo que ve.

## Explícalo con tus palabras

Explica cómo se transforma la página de producto al pasar de móvil a tablet, regla por regla.
