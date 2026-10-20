---
title: Proyecto — Quizzical, app de preguntas en React
kind: project
hours: 3
sources: Scrimba Fullstack Developer Path — Módulo 14 React.js Fundamentals — Solo Project (PRO) - Quizzical
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; Open Trivia DB | https://opentdb.com/api_config.php
---

## Objetivo

Construir solo una app de trivia en React que consume una API, maneja estado complejo, deriva la puntuación y permite jugar de nuevo: tu primera app React pequeña de principio a fin.

## Qué hacer

1. (≈ 15 min) Lee el enunciado y el diseño de **Quizzical** (si la sección PRO no está disponible, usa este mismo enunciado). Dibuja el árbol de componentes y decide dónde vive cada estado.
2. (≈ 2 h 15 min) Construye con Vite:
   - Pantalla de inicio y pantalla de quiz.
   - Pide 5 preguntas a Open Trivia DB con `useEffect`, decodifica las entidades HTML y mezcla las respuestas **una sola vez** al recibirlas (no en cada render).
   - Cada pregunta permite elegir una respuesta; "Check answers" marca correctas e incorrectas y muestra "Acertaste 3/5"; "Play again" pide preguntas nuevas.
   - Estados de carga y error; la puntuación es estado derivado.
   - Extra: elegir categoría y dificultad con un formulario.
   - Criterio de terminado: sin warnings de `key` en consola, ningún estado duplicado, funciona con teclado y está publicado.
3. (≈ 30 min) Escribe el README con el árbol de componentes y sube a GitHub.

## Conceptos clave

- **Mezclar fuera del render**: si mezclas las respuestas en el render, cambian de orden en cada clic; mézclalas al recibir los datos y guárdalas así en el estado.
- **Forma del estado**: un array de preguntas con `{ id, question, answers, correct, selected }` hace que el render y la corrección sean simples.

## Preguntas de repaso

1. ¿Por qué las respuestas no deben mezclarse dentro del cuerpo del componente?
   R: Porque el cuerpo se ejecuta en cada render; cada vez que eliges una respuesta el estado cambia, el componente se vuelve a renderizar y las opciones cambiarían de posición. Se mezclan una vez al recibir los datos y se guardan en el estado.
2. ¿Dónde vive el estado de la respuesta seleccionada de cada pregunta y por qué?
   R: En el componente que tiene la lista de preguntas (el padre), dentro de cada objeto de pregunta, porque la corrección y la puntuación necesitan ver todas las selecciones a la vez.
3. ¿Cómo calculas la puntuación sin un `useState` adicional?
   R: Derivándola: `questions.filter(q => q.selected === q.correct).length`, calculada durante el render.

## Explícalo con tus palabras

Explica tu árbol de componentes y el flujo de datos desde la API hasta la puntuación final.
