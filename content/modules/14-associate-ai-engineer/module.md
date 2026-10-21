---
title: Ingeniero de IA asociado para desarrolladores (Associate AI Engineer for Developers)
phase: datacamp
summary: Vas a construir aplicaciones con LLMs: llamadas a la API, prompt engineering, embeddings, bases vectoriales, RAG, herramientas, LangChain y MCP, con prácticas de ingeniería de software.
---

Séptimo track de DataCamp. No repite cursos de los tracks anteriores. Conecta directamente con el módulo 07 (*AI Engineering*, de Chip Huyen): allí aprendiste el porqué; aquí, las APIs y las herramientas.

**Track:** [Associate AI Engineer for Developers](https://app.datacamp.com/learn/career-tracks/associate-ai-engineer-for-developers) (career track, 29 h listadas).

**Elementos del track (en orden):**

1. *Working with the OpenAI API* (3 h) — sesiones 1–2.
2. *Prompt Engineering with the OpenAI API* (4 h) — sesiones 3–5.
3. Proyecto *Planning a Trip to Paris with the OpenAI API* — sesión 6.
4. *Working with Hugging Face* (2 h) — sesión 7.
5. *LLMOps Concepts* (1 h listada) — sesión 8.
6. *Working with the OpenAI Responses API* (3 h) — sesiones 9–10.
7. *Introduction to Embeddings with the OpenAI API* (3 h) — sesiones 11–12.
8. Proyecto *Topic Analysis of Clothing Reviews with Embeddings* — sesión 13.
9. *Building AI Applications with Pinecone* (3 h) — sesiones 14–15.
10. *Software Engineering Principles in Python* (4 h) — sesiones 16–18.
11. *Developing LLM Applications with LangChain* (3 h) — sesiones 19–20.
12. *Introduction to Model Context Protocol (MCP)* (3 h) — sesiones 21–22.
13. Proyecto propio: app RAG con la API de NaN Builders — sesión 23.
14. Evaluación del track — sesión 24.

**Duplicados omitidos:** ninguno. *Developing LLM Applications with LangChain* se solapa en temas (no en curso) con el track siguiente, *AI Engineering with LangChain*.

**Tu API.** DataCamp te da acceso a OpenAI dentro de sus ejercicios. En tu máquina usas NaN Builders, compatible con la API de OpenAI: base `https://api.nan.builders/v1`, modelo de chat `deepseek-v4-flash` y modelo de embeddings `qwen3-embedding`. La clave va en la variable de entorno `NAN_API_KEY`, nunca en el código ni en git. Si una función específica de OpenAI (por ejemplo, la Responses API o las herramientas alojadas como web search) no está disponible en NaN, haz esa parte solo en DataCamp y en tu máquina usa Chat Completions con function calling.
