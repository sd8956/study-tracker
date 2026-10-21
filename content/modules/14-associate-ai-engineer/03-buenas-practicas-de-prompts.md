---
title: Buenas prácticas de prompt engineering
kind: course
hours: 2
sources: DataCamp — Prompt Engineering with the OpenAI API, cap. 1
links: Prompt Engineering with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/prompt-engineering-with-the-openai-api
---

## Objetivo

Escribir prompts claros con delimitadores, salidas estructuradas y prompts condicionales.

## Qué hacer

1. Abre *Prompt Engineering with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to Prompt Engineering Best Practices» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Instrucciones claras y específicas**: decir qué, para quién, con qué longitud y en qué formato.
- **Delimitadores**: triple comilla, triple backtick o etiquetas para separar instrucciones de datos.
- **Salida estructurada**: pedir tabla, lista o JSON con claves definidas para poder procesarla.
- **Prompts condicionales**: instrucciones del tipo «si el texto está en inglés, tradúcelo; si no, responde 'no aplica'».
- **Prompt injection básica**: los datos del usuario pueden contener instrucciones; los delimitadores ayudan a separarlas.

## Preguntas de repaso

1. ¿Para qué sirven los delimitadores en un prompt?
   R: Para separar claramente las instrucciones del texto a procesar; así el modelo no confunde datos con órdenes y reduces el riesgo de que el texto del usuario cambie la tarea.
2. Reescribe un prompt vago: «Resume este texto».
   R: «Resume el texto delimitado por ``` en 3 viñetas de máximo 15 palabras cada una, para un gerente sin conocimientos técnicos. Responde solo con las viñetas.» y luego el texto entre delimitadores.
3. ¿Por qué pedir JSON con claves explícitas ayuda en una aplicación?
   R: Porque el código puede parsear la respuesta de forma fiable y validar que tiene los campos esperados en lugar de interpretar texto libre.

## Explícalo con tus palabras

Explica las cuatro partes de un buen prompt (rol, tarea, contexto, formato) con un ejemplo de tu trabajo.
