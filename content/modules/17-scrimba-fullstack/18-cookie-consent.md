---
title: Essential JavaScript — Cookie Consent, formularios y temporizadores
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 6 Essential JavaScript — Build a Cookie Consent
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — FormData | https://developer.mozilla.org/es/docs/Web/API/FormData
---

## Objetivo

Manejar formularios con JavaScript (submit, `preventDefault`, `FormData`), temporizadores y cambios de clases para construir un modal de cookies.

## Qué hacer

1. (≈ 90 min) **Módulo 6 Essential JavaScript → Build a Cookie Consent** completa. Usa 1,25x en las explicaciones.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **`setTimeout(fn, ms)`**: ejecuta una función una vez tras un retraso; devuelve un id para cancelarla con `clearTimeout`.
- **Evento `submit`**: se escucha en el `<form>`, no en el botón. `event.preventDefault()` evita que el navegador recargue la página.
- **`FormData`**: `new FormData(form)` lee todos los campos por su atributo `name`; `formData.get("fullName")`.
- **`classList`**: `add`, `remove` y `toggle` cambian clases; mejor que tocar `style` desde JavaScript.
- **`disabled`**: deshabilitar un botón mientras algo se procesa evita dobles envíos.
- **Patrones oscuros**: un botón de "rechazar" que huye es un ejemplo de dark pattern; conócelo para no hacerlo.

## Preguntas de repaso

1. ¿Por qué se escucha `submit` en el formulario y no `click` en el botón?
   R: Porque el formulario también se envía con Enter y por otros medios; `submit` captura todos los casos y además dispara la validación nativa de HTML (`required`).
2. ¿Qué hace `event.preventDefault()` en un submit?
   R: Cancela el comportamiento por defecto del navegador, que es enviar el formulario y recargar o navegar, para que JavaScript maneje los datos.
3. ¿Qué necesita un campo para aparecer en `new FormData(form)`?
   R: Un atributo `name`; `FormData` usa ese nombre como clave. Los campos sin `name` o deshabilitados no se incluyen.

## Explícalo con tus palabras

Explica qué pasa desde que el usuario pulsa "Aceptar" hasta que el modal desaparece, nombrando eventos y temporizadores.
