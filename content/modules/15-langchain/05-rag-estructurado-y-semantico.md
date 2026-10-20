---
title: RAG estructurado (text-to-SQL) y semántico
kind: course
hours: 2
sources: DataCamp — Retrieval-Augmented Generation with LangChain, curso completo
links: Retrieval-Augmented Generation with LangChain (DataCamp) | https://www.datacamp.com/courses/retrieval-augmented-generation-with-langchain
---

## Objetivo

Construir RAG estructurado que convierte preguntas en SQL seguro, lo ejecuta y resume el resultado, y RAG semántico sobre documentos con chunking, embeddings, búsqueda en tiempo real y generación de respuestas.

## Qué hacer

1. Abre *Retrieval-Augmented Generation with LangChain* en DataCamp (ver enlaces de la sesión) y completa el curso completo: «Structured Retrieval», «Semantic Retrieval» y los capítulos que siguen (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Conecta mentalmente con el módulo 09: escribe en tu libreta tres reglas de seguridad que aplicarías a un SQL generado por el modelo antes de ejecutarlo contra tu base `StudyTracker` (5 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **RAG estructurado**: pregunta en lenguaje natural → SQL generado → validación de seguridad → ejecución → resumen con LLM.
- **Validación de SQL**: solo `SELECT`, lista blanca de tablas, límite de filas, usuario de base de datos de solo lectura.
- **RAG semántico**: chunks de documentos → embeddings → vector store → recuperar los relevantes → generar.
- **Chunking**: tamaño y solapamiento; dividir por estructura (encabezados) mejora la coherencia.
- **Generación fundamentada**: responder solo con el contexto recuperado y citar las fuentes.

## Preguntas de repaso

1. ¿Qué controles pondrías antes de ejecutar SQL generado por un LLM?
   R: Conexión con un usuario de solo lectura y mínimos permisos, aceptar solo una sentencia `SELECT`, lista blanca de tablas y columnas, un `TOP`/`LIMIT` y un timeout, y registrar cada consulta.
2. ¿Cuándo usarías RAG estructurado y cuándo semántico?
   R: Estructurado cuando la respuesta está en datos tabulares y requiere filtros o agregaciones exactas (ventas por mes); semántico cuando está en texto no estructurado (manuales, notas).
3. ¿Por qué pedir al modelo que cite la fuente de cada afirmación?
   R: Porque permite verificar la respuesta, detecta cuando el modelo inventa (no hay fuente) y genera confianza en el usuario.

## Explícalo con tus palabras

Explica las dos formas de RAG del curso con el ejemplo de preguntar a tu app de estudio «¿cuántas horas estudié en octubre?» y «¿qué es un bounded context?».
