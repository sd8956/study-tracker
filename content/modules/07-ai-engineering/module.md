---
title: Ingeniería de IA
phase: books
summary: Vas a poder diseñar, evaluar y mejorar aplicaciones sobre foundation models (prompts, RAG, agentes) con criterio de ingeniero, no de demo.
---

Este módulo convierte el libro *AI Engineering* de Chip Huyen en 19 sesiones de estudio. No necesitas leer el libro: cada sesión explica los conceptos con palabras propias, ejemplos en TypeScript, preguntas de repaso con respuesta modelo, un ejercicio y una consigna Feynman.

**Cómo está organizado**

1. **Fundamentos (sesiones 1–3):** qué es la ingeniería de IA, cómo se entrena un foundation model, post-training y sampling (por qué el modelo es probabilístico y alucina).
2. **Evaluación (sesiones 4–7):** el corazón del módulo. Métricas de modelado de lenguaje, evaluación exacta, similitud y embeddings, AI as a judge, evaluación comparativa, criterios, selección de modelos y diseño de un pipeline de evaluación.
3. **Prompt engineering (sesiones 8–10):** buenas prácticas, un proyecto donde construyes un harness de evaluación (exact match + AI as a judge con rúbrica) y prompt engineering defensivo (prompt injection, jailbreaks).
4. **RAG y agentes (sesiones 11–14):** retrieval (BM25, embeddings, híbrido), optimización (chunking, reranking, reescritura de queries), un proyecto de RAG mínimo sobre archivos markdown con citas y evaluación, y agentes con herramientas, planning y memoria.
5. **Adaptación y producción (sesiones 15–18):** finetuning (cuándo sí y cuándo no, LoRA, cuantización), dataset engineering, optimización de inferencia y arquitectura de una aplicación de IA con feedback de usuarios.
6. **Evaluación final (sesión 19).**

**Herramientas para los proyectos.** Usas una API compatible con OpenAI. Con NaN Builders: base `https://api.nan.builders/v1`, modelo de chat `deepseek-v4-flash`, modelo de embeddings `qwen3-embedding`. La clave va siempre en una variable de entorno (`NAN_API_KEY`), nunca en el código.

**Cómo se conecta.** Más adelante en la ruta están los tracks de DataCamp *Associate AI Engineer for Developers* y *AI Engineering with LangChain*. Aquí evitamos APIs de frameworks a propósito: si entiendes el mecanismo con `fetch` y unas pocas funciones, cualquier framework se vuelve una capa de comodidad y no una caja negra.
