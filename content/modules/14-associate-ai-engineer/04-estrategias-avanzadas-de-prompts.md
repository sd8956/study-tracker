---
title: Estrategias avanzadas de prompt engineering
kind: course
hours: 2
sources: DataCamp — Prompt Engineering with the OpenAI API, cap. 2
links: Prompt Engineering with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/prompt-engineering-with-the-openai-api
---

## Objetivo

Usar few-shot, prompts de varios pasos, chain-of-thought, self-consistency y refinamiento iterativo de prompts.

## Qué hacer

1. Abre *Prompt Engineering with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Advanced Prompt Engineering Strategies» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Few-shot**: ejemplos de entrada/salida que fijan formato y criterio.
- **Multi-step prompts**: descomponer la tarea en pasos explícitos dentro del prompt.
- **Chain-of-thought**: pedir razonamiento paso a paso antes de la respuesta final; mejora problemas de lógica y aritmética.
- **Self-consistency**: generar varias respuestas razonadas y elegir la mayoritaria.
- **Refinamiento iterativo**: probar, analizar fallos y ajustar el prompt, como cualquier código.

## Preguntas de repaso

1. ¿Cuándo ayuda chain-of-thought y qué costo tiene?
   R: Ayuda en problemas de varios pasos (lógica, aritmética, planificación) porque el modelo razona antes de concluir. Cuesta más tokens y latencia, y el razonamiento expuesto puede no ser fiel a cómo llegó a la respuesta.
2. Explica self-consistency.
   R: Se pide la misma respuesta razonada varias veces (con temperatura mayor que cero) y se elige la respuesta final más frecuente; reduce errores aleatorios del razonamiento.
3. ¿Cómo refinarías un prompt que a veces devuelve un formato incorrecto?
   R: Juntar ejemplos de fallos, hacer explícito el formato (incluso con un ejemplo), añadir una regla del tipo «responde solo con JSON», y volver a probar con el mismo conjunto de casos para comparar.

## Explícalo con tus palabras

Explica chain-of-thought como si le pidieras a un estudiante que muestre su procedimiento en un examen.
