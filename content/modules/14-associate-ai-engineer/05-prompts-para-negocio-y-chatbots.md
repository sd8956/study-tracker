---
title: Prompts para aplicaciones de negocio y chatbots
kind: course
hours: 2
sources: DataCamp — Prompt Engineering with the OpenAI API, caps. 3–4
links: Prompt Engineering with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/prompt-engineering-with-the-openai-api
---

## Objetivo

Aplicar prompts a resumen, expansión, transformación, clasificación y generación de código, y diseñar system prompts, role-playing y contexto para chatbots.

## Qué hacer

1. Abre *Prompt Engineering with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Prompt Engineering for Business Applications» y el capítulo 4 «Prompt Engineering for Chatbot Development» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Reproduce en tu máquina un ejercicio del capítulo con el SDK `openai` apuntando a NaN Builders: `OpenAI(base_url="https://api.nan.builders/v1", api_key=os.environ["NAN_API_KEY"])` y modelo `deepseek-v4-flash` (15 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Resumen y expansión**: controlar longitud, foco y audiencia del resultado.
- **Transformación**: traducir, cambiar tono o formato (por ejemplo, de texto a JSON).
- **Clasificación y análisis de sentimiento**: con categorías explícitas y respuesta restringida.
- **Generación y explicación de código**: pedir el lenguaje, la versión, las restricciones y las pruebas.
- **System prompt de chatbot**: rol, comportamiento, límites y formato.
- **Contexto**: darle al chatbot información del dominio (políticas, catálogo) dentro del prompt.

## Preguntas de repaso

1. ¿Cómo restringes un clasificador para que responda solo con una de tres etiquetas?
   R: Enumerando las etiquetas exactas, pidiendo «responde solo con una de estas palabras» y, en el código, validando la respuesta y reintentando o marcando como desconocida si no coincide.
2. ¿Qué incluirías en el system prompt de un chatbot de soporte de una tienda?
   R: Rol (asistente de soporte de la tienda X), tono, información de contexto (políticas de devolución, horarios), límites (no inventar precios; si no sabe, derivar a un humano) y formato de respuesta.
3. ¿Qué riesgo tiene pedirle al modelo código sin revisarlo?
   R: Puede ser incorrecto, inseguro o usar APIs inexistentes; hay que revisarlo, probarlo y no ejecutarlo a ciegas.

## Explícalo con tus palabras

Explica cómo convertirías un chatbot genérico en uno especializado solo con el system prompt y contexto.
