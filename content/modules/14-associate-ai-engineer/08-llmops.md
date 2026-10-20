---
title: LLMOps — ciclo de vida de una aplicación con LLMs
kind: course
hours: 2
sources: DataCamp — LLMOps Concepts, caps. 1–3
links: LLMOps Concepts (DataCamp) | https://www.datacamp.com/courses/llmops-concepts
---

## Objetivo

Entender el ciclo de vida de una aplicación con LLMs: ideación (datos y elección de modelo), desarrollo (prompts, cadenas, agentes, RAG vs fine-tuning, pruebas) y operación (despliegue, CI/CD, escalado, monitoreo, costos, gobernanza y seguridad).

## Qué hacer

1. Abre *LLMOps Concepts* en DataCamp (ver enlaces de la sesión) y completa los tres capítulos: «Introduction to LLMOps & Ideation Phase», «Development Phase» y «Operational Phase» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **LLMOps**: prácticas para llevar aplicaciones con LLMs a producción y mantenerlas: como MLOps pero centradas en prompts, contexto y modelos de terceros.
- **Modelo abierto vs propietario**: control, costo y privacidad frente a calidad y facilidad de uso.
- **RAG vs fine-tuning**: RAG agrega conocimiento actualizable en el prompt; fine-tuning cambia comportamiento o estilo del modelo.
- **Pruebas de LLMs**: conjuntos de evaluación, métricas y LLM-as-judge antes de desplegar.
- **Monitoreo**: latencia, costo por petición, tasa de errores, drift de las entradas y calidad de las respuestas.
- **Gobernanza y seguridad**: privacidad de datos, prompt injection, control de accesos y auditoría.

## Preguntas de repaso

1. ¿Cuándo elegirías RAG y cuándo fine-tuning?
   R: RAG cuando el problema es de conocimiento (documentos que cambian, respuestas con fuentes); fine-tuning cuando necesitas un formato, estilo o comportamiento consistente que el prompting no logra, o reducir el tamaño del prompt.
2. Menciona cuatro métricas que monitorearías en producción.
   R: Latencia (p50/p95), costo por petición (tokens), tasa de errores o de respuestas inválidas y una métrica de calidad (feedback del usuario o evaluación automática por muestreo).
3. ¿Por qué una aplicación con LLM necesita un conjunto de evaluación antes de cambiar el prompt o el modelo?
   R: Porque los cambios afectan muchas respuestas de forma impredecible; el conjunto de evaluación permite comparar versiones con los mismos casos y detectar regresiones antes de desplegar.

## Explícalo con tus palabras

Explica el ciclo de vida de una app con LLM usando como ejemplo el tutor de esta misma app de estudio.
