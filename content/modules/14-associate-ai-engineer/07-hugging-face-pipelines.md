---
title: Hugging Face — modelos, datasets y pipelines
kind: course
hours: 2
sources: DataCamp — Working with Hugging Face, caps. 1–2
links: Working with Hugging Face (DataCamp) | https://www.datacamp.com/courses/working-with-hugging-face
---

## Objetivo

Explorar el Hub de Hugging Face, cargar modelos y datasets, y construir pipelines de clasificación de texto, resumen y extracción de información de documentos.

## Qué hacer

1. Abre *Working with Hugging Face* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Getting Started with Hugging Face» y el capítulo 2 «Building Pipelines with Hugging Face» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Hugging Face Hub**: repositorio de modelos, datasets y Spaces con model cards que documentan uso y limitaciones.
- **pipeline()**: `pipeline('text-classification', model=...)` empaqueta tokenizador, modelo y post-procesamiento.
- **Tokenizer**: convierte texto en IDs de tokens que el modelo entiende.
- **datasets**: `load_dataset()` descarga y procesa datasets de forma eficiente (Apache Arrow).
- **Tareas**: clasificación, zero-shot classification, resumen, question answering sobre documentos.
- **Modelos abiertos vs API**: corren en tu máquina (privacidad, sin costo por token) pero necesitan recursos.

## Preguntas de repaso

1. ¿Qué hace la función `pipeline` de transformers?
   R: Combina el tokenizador, el modelo y el post-procesamiento de una tarea en una sola llamada: le pasas texto y recibes el resultado listo (etiqueta, resumen, respuesta).
2. ¿Qué información buscas en una model card antes de usar un modelo?
   R: La tarea para la que se entrenó, idiomas, datos de entrenamiento, métricas, limitaciones y sesgos conocidos, y la licencia.
3. ¿Cuándo preferirías un modelo abierto de Hugging Face a una API de LLM?
   R: Cuando los datos no pueden salir de tu infraestructura, cuando el volumen hace caro pagar por token o cuando una tarea acotada (clasificación) se resuelve bien con un modelo pequeño y rápido.

## Explícalo con tus palabras

Explica qué es un tokenizador y por qué cada modelo necesita el suyo.
