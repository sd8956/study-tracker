---
title: Chrome Extension — inputs, eventos y render de listas
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Build a Chrome Extension (primera mitad)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — addEventListener | https://developer.mozilla.org/es/docs/Web/API/EventTarget/addEventListener
---

## Objetivo

Construir la primera mitad del "leads tracker": leer inputs, escuchar eventos y pintar una lista de forma eficiente.

## Qué hacer

1. (≈ 90 min) **Build a Chrome Extension**, primera mitad: `const`, `addEventListener`, leer `input.value`, arrays de leads, renderizar con un bucle, `innerHTML` y template strings.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`addEventListener("click", fn)`**: registra un manejador sin mezclar JavaScript en el HTML y permite varios manejadores por evento.
- **`input.value`**: lo que escribió el usuario; después de guardarlo, limpia el input con `input.value = ""`.
- **Render en lote**: construye todo el HTML en un string y asígnalo a `innerHTML` una sola vez; tocar el DOM dentro de cada vuelta del bucle es más lento.
- **Template strings**: `` `<li><a href="${url}">${url}</a></li>` `` permiten HTML multilínea con valores interpolados.
- **Una función `render(leads)`**: recibe los datos y pinta; la reutilizas cada vez que cambia el estado.

## Preguntas de repaso

1. ¿Por qué es mejor construir un string y asignar `innerHTML` una vez que hacerlo en cada vuelta del bucle?
   R: Porque cada modificación del DOM puede provocar recálculo de estilos y repintado. Una sola asignación hace un único cambio, que es más rápido.
2. ¿Qué ventaja tiene `addEventListener` sobre el atributo `onclick` en el HTML?
   R: Mantiene el JavaScript fuera del HTML, permite registrar varios manejadores para el mismo evento y quitarlos con `removeEventListener`.
3. ¿Por qué tener una función `render(leads)` que recibe el array en lugar de usar una variable global dentro?
   R: Porque la función queda reutilizable con cualquier lista y su resultado depende solo de lo que recibe; es más fácil de probar y de entender.

## Explícalo con tus palabras

Explica el ciclo "el usuario escribe → guardo en el array → render" de la extensión.
