---
title: Herramientas gestionadas, servidores MCP y cuándo usar cada una
kind: course
hours: 2
sources: DataCamp — LLM Tool Use with LangChain, Managed Tools y resto del curso
links: LLM Tool Use with LangChain (DataCamp) | https://www.datacamp.com/courses/llm-tool-use-with-langchain
---

## Objetivo

Usar herramientas alojadas por el proveedor (como web search), conectar servidores MCP (por ejemplo Slack o GitHub) y decidir entre herramientas gestionadas y personalizadas.

## Qué hacer

1. Abre *LLM Tool Use with LangChain* en DataCamp (ver enlaces de la sesión) y completa la lección «Managed Tools» y el resto del curso (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Herramientas gestionadas**: las ejecuta el proveedor del modelo (web search, ejecución de código); no escribes su implementación.
- **Servidores MCP en LangChain**: adaptadores que convierten las herramientas de un servidor MCP en herramientas de LangChain.
- **Gestionadas vs personalizadas**: rapidez e infraestructura resuelta frente a control, privacidad y portabilidad entre proveedores.
- **Mínimo privilegio**: dar al agente solo las herramientas y permisos que su tarea necesita.

## Preguntas de repaso

1. ¿Cuándo preferirías una herramienta personalizada a una gestionada?
   R: Cuando necesitas acceder a datos o sistemas propios, controlar exactamente qué se ejecuta y qué datos salen, o no depender de un proveedor concreto.
2. ¿Qué riesgo de seguridad tiene conectar un servidor MCP de GitHub con permisos de escritura a un agente?
   R: Que el agente, por error o por prompt injection en un issue o README, haga cambios no deseados (cerrar issues, hacer push). Se mitiga con permisos mínimos, confirmación humana para acciones destructivas y registro de llamadas.
3. ¿Qué gana tu aplicación al consumir herramientas vía MCP en lugar de integrarlas una a una?
   R: Reutiliza servidores existentes con un protocolo estándar y puede cambiar de host o de modelo sin reescribir las integraciones.

## Explícalo con tus palabras

Explica el principio de mínimo privilegio aplicado a las herramientas de un agente con un ejemplo de tu vida.
