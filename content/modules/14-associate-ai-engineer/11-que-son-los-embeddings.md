---
title: Qué son los embeddings y sus aplicaciones
kind: course
hours: 2
sources: DataCamp — Introduction to Embeddings with the OpenAI API, caps. 1–2
links: Introduction to Embeddings with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/introduction-to-embeddings-with-the-openai-api
---

## Objetivo

Crear embeddings con la API, medir la similitud semántica entre textos y usar embeddings para búsqueda semántica, recomendaciones y clasificación.

## Qué hacer

1. Abre *Introduction to Embeddings with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «What are Embeddings?» y el capítulo 2 «Embeddings for AI Applications» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. En tu máquina, obtén con NaN Builders los embeddings (modelo `qwen3-embedding`) de 10 frases y muestra las 3 más parecidas a una consulta usando similitud coseno con NumPy (20 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Embedding**: vector numérico que representa el significado de un texto; textos parecidos quedan cerca.
- **Similitud coseno**: mide el ángulo entre vectores: 1 = misma dirección, 0 = sin relación.
- **Distancia coseno**: 1 − similitud coseno; `scipy.spatial.distance.cosine`.
- **Búsqueda semántica**: embeber la consulta y devolver los documentos más cercanos.
- **Recomendaciones**: recomendar ítems cercanos al promedio de lo que le gustó al usuario.
- **Clasificación zero-shot con embeddings**: asignar la etiqueta cuyo embedding (de su descripción) esté más cerca del texto.

## Preguntas de repaso

1. ¿Por qué la búsqueda por embeddings encuentra «auto» cuando buscas «coche»?
   R: Porque compara significado y no palabras: ambos términos tienen embeddings cercanos aunque no compartan letras.
2. ¿Qué devuelve la similitud coseno entre dos vectores idénticos y entre dos ortogonales?
   R: 1 para idénticos (misma dirección) y 0 para ortogonales.
3. Explica cómo clasificarías reseñas en «positiva» o «negativa» solo con embeddings.
   R: Embebes una descripción de cada etiqueta (o ejemplos), embebes cada reseña y le asignas la etiqueta cuyo embedding esté más cerca según similitud coseno.
4. ¿Por qué no debes mezclar embeddings de modelos distintos en la misma búsqueda?
   R: Porque cada modelo define su propio espacio vectorial (y a menudo su propia dimensión); las distancias entre vectores de modelos distintos no significan nada.

## Explícalo con tus palabras

Explica los embeddings como coordenadas en un mapa de significados.
