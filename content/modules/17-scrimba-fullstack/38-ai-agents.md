---
title: AI Agents — el bucle ReAct y function calling
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 9 AI Engineering — AI Agents
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; OpenAI — Function calling | https://platform.openai.com/docs/guides/function-calling
---

## Objetivo

Construir un agente que decide qué herramienta usar, la ejecuta y sigue razonando hasta responder, primero con el patrón ReAct y luego con function calling.

## Qué hacer

1. (≈ 95 min) **AI Agents** completa: *AI Agent Intro*, el agente **ReAct** (cómo funciona el bucle, parsear la respuesta) y el **OpenAI Functions Agent** (herramientas, lógica del bucle, añadir mensajes, argumentos) y la interfaz del agente. Usa 1,25x en las explicaciones.
2. (≈ 25 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Compara con los agentes de LangChain que hiciste en DataCamp.

## Conceptos clave

- **Agente**: un LLM dentro de un bucle que puede elegir acciones (llamar herramientas) y observar su resultado antes de dar la respuesta final.
- **ReAct**: el modelo alterna *Thought* (razona), *Action* (elige una herramienta y su argumento) y *Observation* (el resultado que le devuelves), hasta emitir *Answer*.
- **Function calling**: declaras herramientas con nombre, descripción y un JSON Schema de parámetros; el modelo responde con una llamada estructurada en lugar de texto que hay que parsear.
- **El bucle lo controla tu código**: ejecutas la función, añades el resultado como mensaje `tool` y vuelves a llamar al modelo; pon un máximo de iteraciones.
- **Seguridad**: valida los argumentos que propone el modelo y no le des herramientas con más poder del necesario.

## Preguntas de repaso

1. ¿Qué ventaja tiene function calling sobre el patrón ReAct basado en texto?
   R: El modelo devuelve la llamada como datos estructurados (nombre y argumentos JSON validables) en lugar de texto libre; no hay que parsear con expresiones regulares y hay menos errores de formato.
2. ¿Por qué un agente necesita un límite máximo de iteraciones?
   R: Porque el modelo puede entrar en un bucle llamando herramientas sin llegar a una respuesta, lo que gasta tokens y dinero; el límite garantiza que termine.
3. ¿Quién ejecuta realmente la herramienta, el modelo o tu código?
   R: Tu código. El modelo solo propone qué función llamar y con qué argumentos; tu aplicación decide si la ejecuta, la ejecuta y le devuelve el resultado.

## Explícalo con tus palabras

Explica el bucle de un agente que responde "¿qué ropa me pongo hoy?" usando una herramienta de ubicación y otra de clima.
