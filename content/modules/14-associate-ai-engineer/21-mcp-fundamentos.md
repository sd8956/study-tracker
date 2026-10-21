---
title: MCP — piezas básicas, herramientas y cliente-servidor
kind: course
hours: 2
sources: DataCamp — Introduction to Model Context Protocol (MCP), cap. 1
links: Introduction to Model Context Protocol (MCP) (DataCamp) | https://www.datacamp.com/courses/introduction-to-model-context-protocol-mcp
---

## Objetivo

Entender qué problema resuelve Model Context Protocol, su arquitectura host-cliente-servidor y cómo definir tus propias herramientas y conectar un cliente a un servidor.

## Qué hacer

1. Abre *Introduction to Model Context Protocol (MCP)* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «The Building Blocks of MCP» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **MCP**: protocolo abierto que estandariza cómo las aplicaciones de IA se conectan a herramientas y datos externos.
- **Host, cliente y servidor**: el host es la app de IA; el cliente mantiene la conexión; el servidor expone capacidades.
- **Tools**: funciones que el modelo puede invocar (con efectos).
- **Transportes**: stdio para servidores locales y HTTP para remotos.
- **FastMCP**: API del SDK de Python para declarar herramientas con decorators: `@mcp.tool()`.

## Preguntas de repaso

1. ¿Qué problema resuelve MCP?
   R: Evita escribir una integración distinta por cada combinación de aplicación de IA y herramienta: con un protocolo común, un servidor MCP funciona con cualquier host compatible.
2. ¿Cuál es la diferencia entre host, cliente y servidor en MCP?
   R: El host es la aplicación de IA (un IDE, un chat); dentro de él, un cliente por servidor mantiene la conexión; el servidor expone herramientas, recursos y prompts.
3. ¿Cómo declaras una herramienta con el SDK de Python?
   R: Creando `mcp = FastMCP('nombre')` y decorando una función con `@mcp.tool()`; su docstring y sus type hints definen la descripción y el esquema de argumentos.

## Explícalo con tus palabras

Explica MCP con la analogía de un puerto USB-C para aplicaciones de IA.
