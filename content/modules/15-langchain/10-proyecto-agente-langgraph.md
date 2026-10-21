---
title: Proyecto — agente de estudio con LangGraph y NaN Builders
kind: project
hours: 3
sources: Proyecto propio sobre AI Engineering with LangChain
links: Documentación de LangGraph | https://langchain-ai.github.io/langgraph/ ; Documentación de LangChain | https://python.langchain.com/docs/introduction/
---

## Objetivo

Construir con LangGraph un asistente de estudio que combine routing, RAG sobre tus notas y herramientas, con un límite de pasos, evaluación y pruebas, usando `deepseek-v4-flash` y `qwen3-embedding` de NaN Builders.

## Estudio

### Grafo

```
START → clasificar ─┬─► rag_notas ──────────┐
                    ├─► herramientas ───────┤──► revisar ──(ok)──► END
                    └─► respuesta_directa ──┘        │
                                                     └─(falla, intentos < 2)─► regenerar ─► revisar
```

- **clasificar**: salida estructurada (Pydantic) con la ruta: `notas`, `herramientas` o `directa`.
- **rag_notas**: reutiliza tu índice del proyecto del módulo 14 (o crea uno con LangChain y Chroma) y responde con citas.
- **herramientas**: `horas_estudiadas(desde, hasta)` y `proxima_sesion()` leyendo un JSON local (o el archivo de `studylog`); `calcular(expr)` con un evaluador seguro (nunca `eval` directo).
- **revisar**: LLM-as-judge con rúbrica corta (¿responde la pregunta?, ¿cita fuentes si usó notas?); como máximo dos regeneraciones.

El estado tipado (`TypedDict`) guarda la pregunta, la ruta, el contexto, la respuesta, los intentos y las citas.

## Qué hacer

1. Define el estado, los nodos vacíos y las aristas; dibuja el grafo con la utilidad de visualización de LangGraph (25 min).
2. Implementa `clasificar` con salida estructurada y pruébalo con 6 preguntas (25 min).
3. Implementa `rag_notas` y `herramientas` (con `bind_tools` y un nodo de ejecución de herramientas) (50 min).
4. Implementa `revisar` y el bucle de regeneración con límite de intentos (25 min).
5. Arma un dataset de 12 preguntas (4 por ruta) y mide: ruta correcta, tasa de aprobación del juez y latencia media (30 min).
6. Escribe pruebas de la lógica del grafo con un modelo falso (respuestas fijas) para comprobar el routing y el límite de intentos sin red (15 min).
7. Criterio de terminado: las 12 preguntas se ejecutan de punta a punta, las métricas quedan en `README.md` y ninguna ejecución supera el límite de pasos (10 min).

## Explícalo con tus palabras

Explica por qué este asistente es un workflow con un poco de autonomía y no un agente ReAct libre, y qué ganas con esa decisión.
