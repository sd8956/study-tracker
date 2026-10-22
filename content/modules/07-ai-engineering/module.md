---
title: Ingeniería de IA
phase: books
summary: Vas a poder diseñar, evaluar y mejorar aplicaciones sobre foundation models (prompts, RAG, adaptación y producción) con criterio de ingeniero, no de demo.
---

Este módulo convierte el libro *AI Engineering* de Chip Huyen en 15 sesiones de estudio. No necesitas leer el libro: cada sesión explica los conceptos con palabras propias, ejemplos en TypeScript, preguntas de repaso con respuesta modelo, un ejercicio y una consigna Feynman.

**Cómo está organizado**

1. **Fundamentos (sesiones 1–3):** qué es la ingeniería de IA, cómo se entrena un foundation model, post-training y sampling (por qué el modelo es probabilístico y alucina).
2. **Evaluación (sesiones 4–7):** el corazón del módulo. Métricas de modelado de lenguaje, evaluación exacta, similitud y embeddings, AI as a judge, evaluación comparativa, criterios, selección de modelos y diseño de un pipeline de evaluación.
3. **Proyecto y prompting (sesiones 9–10):** un proyecto donde construyes un harness de evaluación (exact match + AI as a judge con rúbrica), y una sesión con la base del prompt engineering y su lado defensivo (prompt injection, jailbreaks, extracción de información).
4. **RAG conceptual (sesión 11):** por qué RAG, retrieval por términos y por embeddings, búsqueda híbrida, chunking, reranking y cómo evaluar y diagnosticar un RAG.
5. **Adaptación y producción (sesiones 15–18):** finetuning (cuándo sí y cuándo no, LoRA, cuantización), dataset engineering, optimización de inferencia y arquitectura de una aplicación de IA con feedback de usuarios.
6. **Evaluación final (sesión 19).**

**Herramientas para los proyectos.** Usas una API compatible con OpenAI. Con NaN Builders: base `https://api.nan.builders/v1`, modelo de chat `deepseek-v4-flash`, modelo de embeddings `qwen3-embedding`. La clave va siempre en una variable de entorno (`NAN_API_KEY`), nunca en el código.

**Cómo se conecta.** Justo después de este módulo vienen los tracks de DataCamp *Associate AI Engineer for Developers* (módulo 14) y *AI Engineering with LangChain* (módulo 15). Por eso aquí no se repite lo que allí se practica: el prompting guiado está en el módulo 14 (sesiones 01–05); la implementación de RAG (embeddings, bases vectoriales y una app RAG completa), en los módulos 14 y 15; y los agentes (herramientas, workflows agénticos y memoria), en el módulo 15. Este módulo te da el criterio para evaluarlos y diagnosticarlos. Aquí evitamos APIs de frameworks a propósito: si entiendes el mecanismo con `fetch` y unas pocas funciones, cualquier framework se vuelve una capa de comodidad y no una caja negra.
