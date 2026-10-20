---
title: Solo project — Password Generator
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 3 JavaScript Fundamentals — Solo Project - Password Generator
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; MDN — Clipboard.writeText | https://developer.mozilla.org/es/docs/Web/API/Clipboard/writeText
---

## Objetivo

Consolidar arrays, bucles, aleatoriedad y DOM construyendo solo un generador de contraseñas.

## Qué hacer

1. (≈ 80 min) En Scrimba abre **Solo Project - Password Generator**. Construye: un botón que genera dos contraseñas aleatorias de 15 caracteres a partir de un array de caracteres y las muestra en la página. No mires soluciones.
2. (≈ 10 min) Extra si te sobra tiempo: longitud configurable con un `<input type="number">` y botón para copiar al portapapeles.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Sube el proyecto a GitHub.

## Conceptos clave

- **Elegir un elemento al azar**: `chars[Math.floor(Math.random() * chars.length)]`.
- **Construir un string en un bucle**: empiezas con `""` y concatenas un carácter por vuelta.
- **Funciones pequeñas**: `getRandomChar()` y `generatePassword(length)` se leen mejor y se prueban aparte (módulo 02, funciones).
- **Aleatoriedad criptográfica**: `Math.random()` no es segura para contraseñas reales; para eso existe `crypto.getRandomValues()`.

## Preguntas de repaso

1. ¿Cómo eliges un carácter aleatorio de un array `chars`?
   R: Con un índice aleatorio entre 0 y `chars.length - 1`: `chars[Math.floor(Math.random() * chars.length)]`.
2. ¿Por qué `Math.random()` no es adecuado para generar contraseñas de verdad?
   R: Porque es un generador pseudoaleatorio no criptográfico: su salida puede ser predecible. Para secretos se usa `crypto.getRandomValues()`, que usa una fuente segura del sistema.
3. ¿Qué ganas separando `generatePassword(length)` de la función que pinta en el DOM?
   R: La lógica queda pura y reutilizable (la puedes probar sin página) y la parte de la vista solo se encarga de mostrar. Es separar lógica de presentación.

## Explícalo con tus palabras

Explica cómo funciona tu generador y qué cambiarías para que fuera seguro de verdad.
