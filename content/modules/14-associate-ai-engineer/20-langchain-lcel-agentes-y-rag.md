---
title: LangChain — LCEL, agentes y RAG
kind: course
hours: 2
sources: DataCamp — Developing LLM Applications with LangChain, caps. 2–3
links: Developing LLM Applications with LangChain (DataCamp) | https://www.datacamp.com/courses/developing-llm-applications-with-langchain
---

## Objetivo

Construir chains con LCEL y chains secuenciales, entender los agentes que deciden qué acción tomar, y armar un flujo RAG completo: cargar, dividir, embeber, guardar y recuperar.

## Qué hacer

1. Abre *Developing LLM Applications with LangChain* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Chains and Agents» y el capítulo 3 «Retrieval Augmented Generation (RAG)» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **LCEL**: LangChain Expression Language: `prompt | model | parser` compone pasos con el operador `|`.
- **Chains secuenciales**: la salida de una chain alimenta la siguiente.
- **Agente**: el LLM decide qué herramienta usar y en qué orden (patrón ReAct: razonar, actuar, observar).
- **Document loaders**: cargan PDF, HTML, CSV, etc. como objetos `Document`.
- **Text splitters**: dividen documentos en chunks con tamaño y solapamiento (por ejemplo `RecursiveCharacterTextSplitter`).
- **Vector store y retriever**: guardan embeddings y devuelven los chunks relevantes para una consulta.

## Preguntas de repaso

1. ¿Qué hace `prompt | model | StrOutputParser()`?
   R: Crea una chain: el prompt se formatea con las variables de entrada, se envía al modelo y la respuesta se convierte en un string.
2. ¿En qué se diferencia una chain de un agente?
   R: La chain sigue pasos fijos definidos por ti; el agente deja que el LLM decida en cada paso qué herramienta usar o si ya puede responder.
3. ¿Qué pasos tiene un pipeline RAG en LangChain?
   R: Cargar documentos (loader), dividirlos (splitter), calcular embeddings y guardarlos (vector store), recuperar los chunks relevantes (retriever) y pasarlos a un prompt que el modelo responde.
4. ¿Qué pasa si los chunks son demasiado grandes o demasiado pequeños?
   R: Muy grandes: traen texto irrelevante, gastan contexto y diluyen la respuesta. Muy pequeños: pierden contexto y la idea queda partida entre fragmentos.

## Explícalo con tus palabras

Explica LCEL a alguien que conoce los pipes de la shell.
