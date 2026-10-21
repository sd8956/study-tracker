---
title: Conversaciones y chatbots con la API
kind: course
hours: 2
sources: DataCamp — Working with the OpenAI API, cap. 3
links: Working with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/working-with-the-openai-api
---

## Objetivo

Construir un chatbot con roles `system`, `user` y `assistant`, ejemplos en el historial y memoria de la conversación.

## Qué hacer

1. Abre *Working with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Building Conversations with the OpenAI API» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Escribe en tu máquina un chatbot de terminal con NaN Builders que mantenga el historial y que limite el historial a los últimos 10 mensajes más el system message (25 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Roles**: `system` define comportamiento y reglas; `user` es la persona; `assistant` son las respuestas del modelo.
- **Historial**: la API no tiene memoria: tú reenvías los mensajes anteriores en cada petición.
- **Ejemplos en el historial**: pares user/assistant de ejemplo enseñan el estilo de respuesta.
- **Ventana de contexto**: el historial crece; hay que recortarlo o resumirlo para no exceder el límite ni disparar el costo.
- **Guardarraíles en el system message**: limitar temas y formato de respuesta.

## Preguntas de repaso

1. ¿Por qué el modelo «recuerda» lo que dijiste antes en un chatbot?
   R: Porque el código reenvía todo el historial de mensajes en cada petición; el modelo no guarda estado entre llamadas.
2. ¿Qué pondrías en el system message de un tutor de matemáticas para niños?
   R: El rol (tutor paciente para niños de 10 años), reglas (explicar paso a paso, no dar la respuesta final sin que el niño lo intente, lenguaje simple) y límites (si preguntan otra cosa, redirigir con amabilidad a matemáticas).
3. ¿Qué problema aparece si el historial crece sin límite y cómo lo manejas?
   R: Aumenta el costo y la latencia, y en algún momento excede la ventana de contexto. Se maneja recortando a los últimos N mensajes, resumiendo los antiguos o guardando solo la información relevante.

## Explícalo con tus palabras

Explica por qué un LLM es «sin estado» y cómo un chatbot simula la memoria.
