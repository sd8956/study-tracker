---
title: MCP — recursos, prompts y servidores en producción
kind: course
hours: 2
sources: DataCamp — Introduction to Model Context Protocol (MCP), caps. 2–3
links: Introduction to Model Context Protocol (MCP) (DataCamp) | https://www.datacamp.com/courses/introduction-to-model-context-protocol-mcp
---

## Objetivo

Agregar resources y prompts a un servidor MCP, conectar un LLM al servidor para que llame herramientas y lea contexto, y preparar servidores para producción con bases de datos, APIs y servidores de terceros seguros.

## Qué hacer

1. Abre *Introduction to Model Context Protocol (MCP)* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «MCP-Enabled LLM Applications» y el capítulo 3 «Preparing MCP Servers for Production» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. En tu máquina, escribe un servidor MCP con una herramienta `sesiones_de_hoy()` que lea un JSON local y conéctalo a un cliente o a un host compatible (por ejemplo Claude Code o el MCP Inspector) (20 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Resources**: datos de solo lectura que el servidor expone (archivos, registros) identificados por URI.
- **Prompts**: plantillas de instrucciones que el servidor ofrece al host.
- **Bucle LLM + MCP**: el cliente lista herramientas, se las pasa al modelo, ejecuta las que pide y devuelve resultados.
- **Producción**: validación de entradas, manejo de errores, timeouts, logs, límites de acceso y secretos fuera del código.
- **Servidores de terceros**: revisar su origen, permisos y qué datos ven antes de conectarlos.

## Preguntas de repaso

1. ¿Qué diferencia hay entre una tool y un resource en MCP?
   R: La tool es una acción que el modelo invoca y puede tener efectos; el resource es contexto de solo lectura que la aplicación puede leer e incluir.
2. Menciona tres riesgos de conectar un servidor MCP de terceros.
   R: Que exfiltre datos que le pasas, que ejecute acciones con más permisos de los necesarios, y que sus respuestas contengan prompt injection que manipule al modelo.
3. ¿Qué harías para que una herramienta MCP que consulta una base de datos sea segura en producción?
   R: Usar credenciales de solo lectura con mínimo privilegio, consultas parametrizadas (nunca SQL armado con texto del modelo), validar argumentos, limitar filas y tiempo, y registrar cada llamada.

## Explícalo con tus palabras

Explica cómo el modelo llega a ejecutar una herramienta de un servidor MCP, paso a paso, desde que el usuario hace la pregunta.
