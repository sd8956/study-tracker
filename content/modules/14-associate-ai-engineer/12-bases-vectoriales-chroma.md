---
title: Bases de datos vectoriales con Chroma
kind: course
hours: 2
sources: DataCamp — Introduction to Embeddings with the OpenAI API, cap. 3
links: Introduction to Embeddings with the OpenAI API (DataCamp) | https://www.datacamp.com/courses/introduction-to-embeddings-with-the-openai-api
---

## Objetivo

Entender por qué los sistemas en producción usan bases vectoriales, y crear, poblar y consultar colecciones en Chroma con metadatos.

## Qué hacer

1. Abre *Introduction to Embeddings with the OpenAI API* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Vector Databases» (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. En tu máquina, crea una colección de Chroma persistente con 20 párrafos de tus notas del módulo 07, consúltala con un filtro de metadatos y anota los resultados (25 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Base vectorial**: almacena embeddings e índices para búsqueda aproximada de vecinos cercanos (ANN) a gran escala.
- **Colección**: conjunto de documentos con id, texto, embedding y metadatos.
- **Función de embedding**: Chroma puede calcular embeddings al insertar si le das la función.
- **query**: devuelve los n resultados más cercanos con sus distancias.
- **Filtros de metadatos**: `where={'categoria': 'x'}` restringe la búsqueda.
- **Persistencia**: `PersistentClient(path=...)` guarda la colección en disco.

## Preguntas de repaso

1. ¿Por qué no basta con calcular la similitud coseno contra todos los vectores en una lista?
   R: Porque con millones de vectores esa búsqueda exacta O(n) es lenta; las bases vectoriales usan índices de vecinos aproximados que responden en milisegundos con una pérdida mínima de precisión.
2. ¿Para qué sirven los metadatos en una colección?
   R: Para filtrar resultados (por fecha, autor, categoría, usuario) y para mostrar información de la fuente junto al texto recuperado.
3. ¿Qué pasa si insertas documentos con un modelo de embeddings y consultas con otro?
   R: Los resultados son basura (o falla por dimensión distinta), porque la consulta y los documentos viven en espacios vectoriales diferentes.

## Explícalo con tus palabras

Explica qué agrega una base vectorial frente a guardar embeddings en un archivo y recorrerlos.
