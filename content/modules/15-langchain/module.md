---
title: Ingeniería de IA con LangChain (AI Engineering with LangChain)
phase: datacamp
summary: Vas a construir, evaluar y llevar a producción aplicaciones con LangChain y LangGraph: chatbots con memoria, prompts gestionados, RAG estructurado y semántico, herramientas y agentes.
---

Octavo track de DataCamp. Profundiza lo que viste en *Developing LLM Applications with LangChain* (módulo 14) con un enfoque de producción: evaluación con LangSmith, gestión de prompts, RAG, uso de herramientas y agentes con LangGraph.

**Track:** [AI Engineering with LangChain](https://app.datacamp.com/learn/skill-tracks/ai-engineering-with-langchain) (skill track, 21 h listadas; 15 h de cursos).

**Cursos (en el orden del track):**

1. *LLM Application Fundamentals with LangChain* (3 h) — sesiones 1–2.
2. *LLM Application Evaluation with LangSmith* (2 h) — sesión 3.
3. *Prompt Engineering with LangChain* (2 h) — sesión 4.
4. *Retrieval-Augmented Generation with LangChain* (2 h) — sesión 5.
5. *LLM Tool Use with LangChain* (3 h) — sesiones 6–7.
6. *Agentic Systems with LangGraph* (3 h) — sesiones 8–9.
7. Proyecto propio: agente con LangGraph y NaN Builders — sesión 10.
8. Evaluación del track — sesión 11.

**Duplicados omitidos:** ninguno (son cursos distintos de los del módulo 14, aunque los temas se solapan).

**Nota sobre los cursos.** Varios cursos de este track son recientes y su página pública solo describe las primeras lecciones. Las sesiones nombran esas lecciones y, para el resto, te piden completar el curso en el orden en que DataCamp lo muestra. Si al abrirlo ves capítulos nuevos, apunta sus títulos y ajusta las preguntas de repaso con lo que aprendiste.

**Tu API.** En tu máquina, `ChatOpenAI(base_url="https://api.nan.builders/v1", model="deepseek-v4-flash", api_key=os.environ["NAN_API_KEY"])` y `OpenAIEmbeddings(base_url="https://api.nan.builders/v1", model="qwen3-embedding", api_key=os.environ["NAN_API_KEY"], check_embedding_ctx_length=False)`. El último parámetro evita que LangChain tokenice con el tokenizador de OpenAI, que no corresponde a modelos de otros proveedores.
