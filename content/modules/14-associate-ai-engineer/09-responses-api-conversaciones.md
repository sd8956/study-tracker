---
title: Responses API — prompts, razonamiento y conversaciones
kind: course
hours: 2
sources: DataCamp — Working with the OpenAI Responses API, cap. 1
links: Working with the OpenAI Responses API (DataCamp) | https://www.datacamp.com/courses/working-with-the-openai-responses-api
---

## Objetivo

Enviar prompts con la Responses API, aplicar las pautas para modelos de razonamiento y construir conversaciones de varios turnos.

## Qué hacer

1. Abre *Working with the OpenAI Responses API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Getting Started with the Responses API» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Compara con Chat Completions: escribe en tu libreta en qué se diferencian las dos APIs en forma de la petición, respuesta y manejo del historial (10 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Responses API**: API más nueva de OpenAI: `client.responses.create(model=..., input=...)`; el texto está en `response.output_text`.
- **instructions**: parámetro equivalente al system message.
- **Modelos de razonamiento**: piensan antes de responder; se les dan objetivos claros en lugar de pedirles «piensa paso a paso», y se controla el esfuerzo de razonamiento.
- **Conversaciones de varios turnos**: reenviando la lista de mensajes o encadenando con `previous_response_id`.
- **Compatibilidad**: muchos proveedores compatibles con OpenAI solo implementan Chat Completions.

## Preguntas de repaso

1. ¿Cómo encadenas turnos en la Responses API sin reenviar todo el historial?
   R: Pasando `previous_response_id` con el id de la respuesta anterior; el servidor recupera el contexto.
2. ¿Por qué no conviene pedirle «piensa paso a paso» a un modelo de razonamiento?
   R: Porque ya razona internamente; es mejor darle el objetivo, el contexto y las restricciones claras y dejar que decida cómo razonar.
3. ¿Qué harías si tu proveedor no soporta la Responses API?
   R: Usar Chat Completions, que la mayoría de proveedores compatibles sí implementa, manejando el historial tú mismo y usando function calling para herramientas.

## Explícalo con tus palabras

Explica las diferencias entre Chat Completions y Responses API a alguien que solo conoce la primera.
