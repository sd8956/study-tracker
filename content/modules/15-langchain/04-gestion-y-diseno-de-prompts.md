---
title: Gestión y diseño sistemático de prompts
kind: course
hours: 2
sources: DataCamp — Prompt Engineering with LangChain, curso completo
links: Prompt Engineering with LangChain (DataCamp) | https://www.datacamp.com/courses/prompt-engineering-with-langchain
---

## Objetivo

Organizar los prompts para que sean legibles y mantenibles (estructura en Markdown, archivos separados) y diseñarlos con una plantilla reutilizable: propósito, rol, especificaciones de entrada y salida, instrucciones y ejemplos.

## Qué hacer

1. Abre *Prompt Engineering with LangChain* en DataCamp (ver enlaces de la sesión) y completa el curso completo: «Prompt Management», «Application Prompting» y los capítulos que siguen (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Prompts como código**: en archivos separados, versionados en git y revisados como cualquier cambio.
- **Estructura en Markdown**: secciones con encabezados (Rol, Tarea, Entrada, Salida, Ejemplos) facilitan leer y editar.
- **Plantilla de prompt**: propósito, rol, especificación de entrada, especificación de salida, instrucciones claras y ejemplos.
- **Optimización sistemática**: cambiar una cosa a la vez y medir con el dataset de evaluación.

## Preguntas de repaso

1. ¿Qué ventajas tiene guardar los prompts en archivos separados del código?
   R: Se leen y editan con facilidad, se versionan y revisan en git, se pueden probar por separado y los puede ajustar alguien que no toca el código.
2. Enumera las partes de una plantilla de prompt bien diseñada.
   R: Propósito, rol, especificación de la entrada, especificación de la salida (formato), instrucciones claras y ejemplos.
3. ¿Cómo sabes si un cambio en un prompt lo mejoró?
   R: Ejecutándolo contra el mismo dataset de evaluación antes y después y comparando las métricas, no probando a mano con uno o dos casos.

## Explícalo con tus palabras

Explica por qué los prompts deberían tratarse como código de producción.
