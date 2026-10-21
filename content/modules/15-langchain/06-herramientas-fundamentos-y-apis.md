---
title: Uso de herramientas — fundamentos y herramientas de API
kind: course
hours: 2
sources: DataCamp — LLM Tool Use with LangChain, Tool Fundamentals y API Tools
links: LLM Tool Use with LangChain (DataCamp) | https://www.datacamp.com/courses/llm-tool-use-with-langchain
---

## Objetivo

Entender por qué los LLMs necesitan herramientas, crear herramientas personalizadas a partir de funciones de Python, hacer llamadas simples, paralelas y en serie, y envolver APIs REST con manejo de errores.

## Qué hacer

1. Abre *LLM Tool Use with LangChain* en DataCamp (ver enlaces de la sesión) y completa las lecciones «Tool Fundamentals» y «API Tools» (la primera mitad del curso) (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. En tu máquina, crea con `@tool` una herramienta que consulte una API pública sin clave (por ejemplo el clima de Open-Meteo) y conéctala a `deepseek-v4-flash` con `bind_tools` (20 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Por qué herramientas**: el modelo no tiene datos actuales, no calcula de forma fiable y no puede actuar; las herramientas le dan esas capacidades.
- **@tool**: convierte una función con docstring y type hints en una herramienta con esquema.
- **bind_tools**: le dice al modelo qué herramientas puede pedir.
- **Llamadas paralelas y en serie**: varias herramientas independientes a la vez, o una que depende del resultado de otra.
- **REST**: recursos identificados por URL y métodos HTTP: GET leer, POST crear, PUT/PATCH actualizar, DELETE borrar.
- **Wrapper de API**: valida argumentos, maneja códigos de estado y timeouts, y devuelve al modelo un resultado o un error legible.

## Preguntas de repaso

1. ¿Por qué importan el docstring y los type hints de una función decorada con `@tool`?
   R: Porque se convierten en la descripción y el esquema de argumentos que ve el modelo; con ellos decide cuándo usar la herramienta y cómo llenar los argumentos.
2. ¿Qué diferencia hay entre llamadas paralelas y en serie?
   R: En paralelo el modelo pide varias herramientas independientes en el mismo turno (clima de dos ciudades); en serie necesita el resultado de una para llamar la siguiente (buscar el id de un usuario y luego sus pedidos).
3. ¿Qué debe devolver un wrapper de API al modelo cuando la API falla?
   R: Un mensaje de error claro y breve (por ejemplo «la ciudad no existe» o «el servicio no respondió, intenta más tarde») en lugar de lanzar una excepción sin capturar; así el modelo puede corregir o informar al usuario.

## Explícalo con tus palabras

Explica por qué un LLM con herramientas sigue sin «saber» el clima, sino que sabe a quién preguntarlo.
