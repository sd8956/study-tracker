---
title: Pinecone — índices y manipulación de vectores
kind: course
hours: 2
sources: DataCamp — Building AI Applications with Pinecone, caps. 1–2
links: Building AI Applications with Pinecone (DataCamp) | https://www.datacamp.com/courses/building-ai-applications-with-pinecone
---

## Objetivo

Entender cómo funciona Pinecone (índices, pods, serverless), crear índices eligiendo dimensión y métrica, e insertar, consultar, filtrar, actualizar y borrar vectores desde Python.

## Qué hacer

1. Abre *Building AI Applications with Pinecone* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to Pinecone» y el capítulo 2 «Pinecone Vector Manipulation in Python» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Índice**: estructura que guarda vectores de una dimensión fija con una métrica de distancia (cosine, euclidean, dotproduct).
- **Pods vs serverless**: capacidad reservada frente a pago por uso.
- **upsert**: inserta o actualiza vectores con id, valores y metadatos; se hace por lotes.
- **query**: devuelve los top_k vecinos más cercanos, opcionalmente con metadatos y filtros.
- **fetch, update, delete**: leer por id, modificar valores o metadatos, y borrar.
- **Dimensión**: debe coincidir con la del modelo de embeddings.

## Preguntas de repaso

1. ¿Qué pasa si creas un índice de dimensión 1536 y le insertas vectores de 1024?
   R: Pinecone rechaza el upsert porque la dimensión no coincide; la dimensión del índice debe ser la del modelo de embeddings.
2. ¿Por qué se hace upsert por lotes?
   R: Para reducir el número de peticiones de red y respetar los límites de tamaño por petición; es mucho más rápido que insertar uno a uno.
3. ¿Cómo restringes una búsqueda a los documentos de un año concreto?
   R: Con un filtro de metadatos en la consulta, por ejemplo `filter={'anio': {'$eq': 2026}}`.

## Explícalo con tus palabras

Explica cómo elegirías la métrica de distancia de un índice y por qué depende del modelo de embeddings.
