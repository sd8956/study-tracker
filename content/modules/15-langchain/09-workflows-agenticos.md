---
title: Workflows agénticos — chaining, routing, paralelización, reflexión
kind: course
hours: 2
sources: DataCamp — Agentic Systems with LangGraph, Agentic Workflows y resto del curso
links: Agentic Systems with LangGraph (DataCamp) | https://www.datacamp.com/courses/agentic-systems-with-langgraph
---

## Objetivo

Diseñar workflows confiables descomponiendo tareas con los patrones de chaining, routing, paralelización, reflexión y delegación de código, e implementarlos con LangGraph.

## Qué hacer

1. Abre *Agentic Systems with LangGraph* en DataCamp (ver enlaces de la sesión) y completa la lección «Agentic Workflows» y el resto del curso (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Dibuja en tu libreta el grafo (nodos y aristas) de un workflow de routing que clasifique la pregunta del usuario y la envíe a uno de tres nodos especializados (10 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Prompt chaining**: pasos secuenciales donde cada uno usa la salida del anterior; fácil de probar.
- **Routing**: un paso clasifica la entrada y la envía al camino especializado.
- **Paralelización**: varias tareas independientes al mismo tiempo y luego se agregan (o varias versiones y se vota).
- **Reflexión**: un paso genera, otro critica y el primero corrige, con un máximo de iteraciones.
- **Delegación de código**: el modelo escribe código que se ejecuta en un entorno controlado para cálculos exactos.
- **Aristas condicionales**: en LangGraph, una función decide el siguiente nodo según el estado.

## Preguntas de repaso

1. ¿Qué patrón usarías para responder preguntas de facturación, técnicas y generales con prompts distintos?
   R: Routing: un nodo clasifica la pregunta y una arista condicional la envía al nodo especializado correspondiente.
2. ¿Por qué el patrón de reflexión necesita un máximo de iteraciones?
   R: Porque el crítico puede no quedar nunca satisfecho; sin límite, el bucle consume tokens y tiempo indefinidamente.
3. ¿Cuándo es mejor un workflow fijo que un agente autónomo?
   R: Cuando los pasos de la tarea se conocen de antemano: el workflow es más predecible, barato y fácil de probar. El agente se reserva para tareas abiertas donde no puedes prever los pasos.

## Explícalo con tus palabras

Explica los cinco patrones de workflow comparándolos con cómo se organiza la cocina de un restaurante.
