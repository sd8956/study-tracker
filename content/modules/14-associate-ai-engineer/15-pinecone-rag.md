---
title: Pinecone — rendimiento, namespaces y RAG
kind: course
hours: 2
sources: DataCamp — Building AI Applications with Pinecone, cap. 3
links: Building AI Applications with Pinecone (DataCamp) | https://www.datacamp.com/courses/building-ai-applications-with-pinecone
---

## Objetivo

Mejorar el rendimiento del índice, usar namespaces para multitenancy y construir búsqueda semántica y un sistema de preguntas y respuestas con retrieval-augmented generation.

## Qué hacer

1. Abre *Building AI Applications with Pinecone* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Performance Tuning and AI Applications» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Namespaces**: particiones lógicas dentro de un índice; aíslan los datos de cada cliente y reducen costo de consulta.
- **Batching y paralelismo**: upserts en lotes y peticiones concurrentes para acelerar la carga.
- **RAG**: recuperar los fragmentos relevantes y pasarlos al LLM como contexto para responder.
- **Chunking**: dividir documentos en fragmentos con algo de solapamiento antes de embeber.
- **Citas**: incluir en la respuesta el id o título de la fuente de cada fragmento.

## Preguntas de repaso

1. ¿Para qué usarías namespaces en una app con muchos clientes?
   R: Para que cada cliente consulte solo sus vectores (aislamiento de datos) y las búsquedas sean más rápidas al recorrer un subconjunto.
2. Describe el flujo de un sistema RAG de preguntas y respuestas.
   R: Embeber la pregunta, consultar el índice por los k fragmentos más cercanos, armar un prompt con esos fragmentos como contexto e instrucciones de responder solo con ellos y citar, y enviar al LLM.
3. ¿Por qué conviene que los chunks se solapen un poco?
   R: Para no cortar una idea justo en el límite entre fragmentos; el solapamiento conserva contexto en los bordes.

## Explícalo con tus palabras

Explica RAG como un examen a libro abierto: qué es el libro, quién busca la página y quién redacta la respuesta.
