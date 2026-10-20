---
title: Portfolio y sitio de coworking — layout con flexbox
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 5 Essential CSS — Build a Portfolio; Build a Coworking Space Site (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; CSS-Tricks — A Complete Guide to Flexbox | https://css-tricks.com/snippets/css/a-guide-to-flexbox/
---

## Objetivo

Construir un portfolio y empezar el sitio de coworking aplicando flexbox avanzado, imágenes y secciones repetibles.

## Qué hacer

1. (≈ 65 min) **Build a Portfolio** completa.
2. (≈ 30 min) **Build a Coworking Space Site**, primera mitad (hasta la sección hero y la estructura principal).
3. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`flex-wrap`**: deja que los hijos pasen a otra línea cuando no caben; base de layouts que se adaptan sin media queries.
- **`flex: 1` y `gap`**: `flex: 1` reparte el espacio sobrante; `gap` separa hijos sin márgenes que luego hay que anular.
- **Imágenes que no se deforman**: `object-fit: cover` recorta la imagen para llenar la caja manteniendo proporción.
- **Overlay**: un `background` con `linear-gradient` semitransparente sobre una imagen mejora el contraste del texto.
- **Componentes CSS reutilizables**: una clase `.btn` y modificadores (`.btn--primary`) evitan duplicar estilos.

## Preguntas de repaso

1. ¿Qué ventaja tiene `gap` frente a poner `margin` a cada hijo de un contenedor flex?
   R: `gap` solo añade espacio entre los hijos, no en los bordes, así que no hay que anular el margen del primero o el último, y funciona igual cuando los hijos saltan de línea.
2. ¿Qué hace `object-fit: cover` en una imagen con ancho y alto fijos?
   R: Escala la imagen para cubrir toda la caja manteniendo su proporción y recorta lo que sobra, en lugar de deformarla.
3. ¿Para qué sirve superponer un gradiente oscuro sobre una imagen de fondo con texto?
   R: Para aumentar el contraste entre el texto y la imagen, de modo que el texto sea legible sin importar qué zona de la foto tenga detrás (accesibilidad).

## Explícalo con tus palabras

Explica cómo flexbox con `flex-wrap` y `gap` hace que tres tarjetas pasen de una fila a una columna cuando la pantalla se estrecha.
