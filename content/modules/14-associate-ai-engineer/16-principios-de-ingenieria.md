---
title: Ingeniería de software y ciencia de datos
kind: course
hours: 2
sources: DataCamp — Software Engineering Principles in Python, cap. 1
links: Software Engineering Principles in Python (DataCamp) | https://www.datacamp.com/courses/software-engineering-principles-in-python
---

## Objetivo

Entender por qué los principios de ingeniería de software (modularidad, documentación, pruebas, control de versiones) aceleran y hacen fiable el trabajo con datos, y aplicar PEP 8.

## Qué hacer

1. Abre *Software Engineering Principles in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Software Engineering & Data Science» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Modularidad**: dividir el código en funciones, clases y módulos reutilizables.
- **Documentación**: comentarios y docstrings que explican el porqué y el uso.
- **Pruebas automáticas**: detectan regresiones al cambiar el código.
- **Paquetes y pip**: reutilizar código de otros con dependencias declaradas.
- **PEP 8**: guía de estilo de Python; `pycodestyle` o `flake8` la verifican.

## Preguntas de repaso

1. ¿Qué beneficio concreto da la modularidad en un proyecto de datos?
   R: Puedes probar y reutilizar cada pieza (cargar, limpiar, modelar) por separado y cambiar una sin romper las demás.
2. ¿Qué herramienta verifica PEP 8 y qué tipo de problemas reporta?
   R: `pycodestyle` (o `flake8`): longitud de línea, espacios, indentación, nombres e imports mal ubicados.
3. ¿Por qué el código de un notebook suele ser difícil de mantener?
   R: Porque el estado depende del orden de ejecución de las celdas, mezcla exploración con lógica, rara vez tiene pruebas y es difícil de versionar y reutilizar.

## Explícalo con tus palabras

Explica a un científico de datos por qué debería escribir funciones y pruebas aunque «solo sea un análisis».
