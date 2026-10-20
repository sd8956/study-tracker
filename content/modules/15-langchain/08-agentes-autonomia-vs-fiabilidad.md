---
title: Agentes — autonomía frente a fiabilidad
kind: course
hours: 2
sources: DataCamp — Agentic Systems with LangGraph, Autonomous Agents y Agency vs Reliability
links: Agentic Systems with LangGraph (DataCamp) | https://www.datacamp.com/courses/agentic-systems-with-langgraph
---

## Objetivo

Entender qué define a un agente de IA, sus componentes y patrones, en qué se diferencia de un chatbot, y por qué los agentes ReAct puros fallan en tareas complejas (el equilibrio entre autonomía y fiabilidad).

## Qué hacer

1. Abre *Agentic Systems with LangGraph* en DataCamp (ver enlaces de la sesión) y completa las lecciones «Autonomous Agents» y «Agency vs Reliability» (la primera parte del curso) (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Agente**: sistema donde el LLM decide los pasos: elige herramientas, observa resultados y continúa hasta cumplir un objetivo.
- **Componentes**: modelo, herramientas, memoria o estado, y un bucle de control.
- **ReAct**: razonar → actuar (herramienta) → observar → repetir.
- **Autonomía vs fiabilidad**: más libertad al modelo = más casos resueltos de forma creativa, pero más errores impredecibles, más costo y más difícil de probar.
- **Grafo de LangGraph**: nodos (pasos), aristas (transiciones) y un estado compartido que fluye por el grafo.

## Preguntas de repaso

1. ¿En qué se diferencia un agente de un chatbot?
   R: El chatbot responde un turno a la vez con un flujo fijo; el agente persigue un objetivo decidiendo por sí mismo qué herramientas usar y en qué orden, en un bucle de varios pasos.
2. ¿Por qué un agente ReAct puro falla en tareas largas?
   R: Porque los errores se acumulan en cada paso, puede entrar en bucles o perder el objetivo, y su comportamiento es difícil de predecir y probar.
3. ¿Qué aporta modelar un agente como un grafo explícito?
   R: Hace visibles y controlables los pasos y las transiciones: puedes fijar partes del flujo, poner límites de iteraciones, puntos de aprobación humana y probar cada nodo.

## Explícalo con tus palabras

Explica el dilema autonomía-fiabilidad con el ejemplo de un empleado nuevo: cuánta libertad le das el primer día y por qué.
