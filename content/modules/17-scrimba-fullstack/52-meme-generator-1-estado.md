---
title: React — eventos y estado con useState (Meme Generator)
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Build a meme generator (primer tercio)
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — El estado: la memoria de un componente | https://es.react.dev/learn/state-a-components-memory
---

## Objetivo

Entender el estado en React: por qué una variable normal no actualiza la vista y cómo `useState` dispara un nuevo render.

## Qué hacer

1. (≈ 85 min) **Build a meme generator**, primer tercio: manejadores de eventos (`onClick`), `useState`, actualizar el estado con el valor anterior (callback) y estado con arrays y objetos.
2. (≈ 35 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Eventos en React**: `onClick={handleClick}` recibe la función, no su llamada (`onClick={handleClick()}` la ejecuta en cada render).
- **`useState`**: `const [count, setCount] = useState(0)`; llamar al setter programa un nuevo render con el nuevo valor.
- **Por qué no una variable normal**: cambiarla no avisa a React; además se reinicia en cada render.
- **Actualizar desde el valor anterior**: `setCount(prev => prev + 1)`; seguro aunque haya varias actualizaciones seguidas.
- **Inmutabilidad**: con arrays y objetos crea uno nuevo (`[...prev, item]`, `{ ...prev, top: "hola" }`); React compara referencias para saber si algo cambió.

## Preguntas de repaso

1. ¿Por qué `count = count + 1` con una variable normal no actualiza la pantalla?
   R: Porque React no se entera del cambio y no vuelve a renderizar; además la variable se vuelve a crear con su valor inicial en el siguiente render. El estado de `useState` persiste entre renders y su setter avisa a React.
2. ¿Cuándo debes usar la forma `setX(prev => ...)`?
   R: Cuando el nuevo valor depende del anterior, porque el estado que ves en la función puede estar desactualizado si se encolan varias actualizaciones; el callback siempre recibe el valor más reciente.
3. ¿Por qué `meme.topText = "hola"; setMeme(meme)` no funciona bien?
   R: Porque mutas el mismo objeto y le pasas a React la misma referencia; React compara con `Object.is`, ve que no cambió y puede no re-renderizar. Hay que crear un objeto nuevo: `setMeme(prev => ({ ...prev, topText: "hola" }))`.

## Explícalo con tus palabras

Explica qué pasa, render a render, cuando haces clic en un botón que llama a `setCount(prev => prev + 1)`.
