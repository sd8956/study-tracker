---
title: Launching Your Career — retos de entrevista de React y frontend
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 19 Launching Your Career — JavaScript Interview Challenges (resto); React Interview Challenges; Frontend Interview Challenges
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; React — Pensar en React | https://es.react.dev/learn/thinking-in-react
---

## Objetivo

Practicar los tipos de retos de entrevista de React y frontend (construir un componente con estado, arreglar un bug, maquetar algo accesible) y cerrar el módulo de carrera.

## Qué hacer

1. (≈ 30 min) Termina 2–3 retos más de **JavaScript Interview Challenges**.
2. (≈ 60 min) **React Interview Challenges** y **Frontend Interview Challenges** completas. Con cada reto: lee el enunciado, di en voz alta tu plan, impleméntalo con un cronómetro y solo después mira la solución.
3. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **"Pensar en React"**: dividir la interfaz en componentes, construir una versión estática, identificar el estado mínimo, decidir dónde vive y añadir el flujo inverso (eventos).
- **Preguntas teóricas típicas**: virtual DOM y reconciliación, `key`, `useEffect` y dependencias, controlados vs no controlados, Context vs props, memoización.
- **Retos de frontend**: maquetar con semántica y accesibilidad, depurar CSS, manipular el DOM sin framework, consumir una API con estados de carga y error.
- **Bajo presión**: primero que funcione, luego limpiar; comunica los atajos que tomas ("aquí añadiría tests y manejo de errores").

## Preguntas de repaso

1. ¿Cuáles son los pasos de "Pensar en React" para construir una interfaz?
   R: Dividir la interfaz en una jerarquía de componentes, construir una versión estática con props, identificar la representación mínima del estado, decidir qué componente es dueño de cada estado y añadir el flujo inverso de datos con manejadores de eventos.
2. En una entrevista te piden un buscador que filtra una lista mientras escribes. ¿Qué estado mínimo necesitas?
   R: Solo el texto de búsqueda (y la lista original, si no viene por props). La lista filtrada es estado derivado: se calcula en el render a partir de la lista y del texto.
3. ¿Qué harías si te quedas bloqueado en un reto en vivo?
   R: Decirlo, volver a los requisitos y a un ejemplo concreto, simplificar el problema (resolver un caso más pequeño), escribir pseudocódigo y pedir una pista concreta si hace falta; el silencio prolongado es lo que peor funciona.

## Explícalo con tus palabras

Explica "Pensar en React" aplicándolo a una app de lista de tareas con filtro.
