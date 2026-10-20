---
title: Evaluación de aplicaciones con LangSmith
kind: course
hours: 2
sources: DataCamp — LLM Application Evaluation with LangSmith, curso completo
links: LLM Application Evaluation with LangSmith (DataCamp) | https://www.datacamp.com/courses/llm-application-evaluation-with-langsmith
---

## Objetivo

Diseñar un sistema de evaluación que mida exactitud, costo y latencia; implementarlo en LangSmith con datasets, evaluadores y experimentos; y evaluar conversaciones por turno y completas.

## Qué hacer

1. Abre *LLM Application Evaluation with LangSmith* en DataCamp (ver enlaces de la sesión) y completa el curso completo: «Evaluation Fundamentals», «Evaluation Implementation», «Conversation Evaluation» y los capítulos que siguen (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Criterios de éxito**: definir antes de construir qué significa «suficientemente bueno» (exactitud, costo, latencia).
- **Dataset de evaluación**: entradas con salidas o criterios esperados, representativas del uso real.
- **Evaluadores algorítmicos**: comparaciones exactas, regex, similitud: baratos y deterministas.
- **LLM-as-judge**: un modelo califica cualidades subjetivas (utilidad, tono) con una rúbrica.
- **Experimento**: ejecutar una versión de la app contra el dataset y registrar métricas para comparar versiones.
- **Evaluación de conversaciones**: a nivel de turno y de conversación completa: coherencia, completitud de la tarea, eficiencia.

## Preguntas de repaso

1. ¿Cuándo usas un evaluador algorítmico y cuándo LLM-as-judge?
   R: Algorítmico cuando hay una respuesta verificable (una etiqueta, un número, un formato); LLM-as-judge para cualidades subjetivas (utilidad, tono, fidelidad al contexto) donde no hay una única respuesta correcta.
2. ¿Qué riesgos tiene LLM-as-judge y cómo los mitigas?
   R: Sesgos (prefiere respuestas largas o de su mismo modelo) e inconsistencia. Se mitigan con rúbricas concretas, escalas pequeñas, ejemplos calibrados y comparando una muestra con calificaciones humanas.
3. ¿Por qué definir los criterios de éxito antes de construir?
   R: Para saber cuándo una versión está lista para producción y para comparar cambios con datos en lugar de impresiones.
4. ¿Qué mide la evaluación a nivel de conversación que no mide la de turno?
   R: Si la tarea del usuario se completó, si el bot fue coherente a lo largo de toda la conversación y cuántos turnos necesitó (eficiencia).

## Explícalo con tus palabras

Explica cómo evaluarías el tutor de esta app: qué dataset, qué evaluadores y qué umbral para considerarlo listo.
