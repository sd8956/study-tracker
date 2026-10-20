---
title: Clases, herencia y mantenibilidad
kind: course
hours: 2
sources: DataCamp — Software Engineering Principles in Python, caps. 3–4
links: Software Engineering Principles in Python (DataCamp) | https://www.datacamp.com/courses/software-engineering-principles-in-python
---

## Objetivo

Agregar clases al paquete aplicando DRY y herencia, y mantenerlo con buenos nombres, docstrings, refactorización, pruebas con doctest y pytest, y documentación con Sphinx.

## Qué hacer

1. Abre *Software Engineering Principles in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Utilizing Classes» y el capítulo 4 «Maintainability» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Métodos no públicos**: prefijo `_` indica uso interno.
- **DRY con herencia**: una clase padre con lo común y clases hijas que especializan.
- **Nombres legibles**: variables y funciones que dicen qué son y qué hacen.
- **Refactorización**: mejorar la estructura sin cambiar el comportamiento, apoyado en pruebas.
- **doctest**: ejemplos en docstrings que se ejecutan como pruebas.
- **Sphinx**: genera documentación HTML a partir de los docstrings.
- **Herramientas de calidad**: integración continua, linters y cobertura.

## Preguntas de repaso

1. ¿Qué es un doctest y cuándo es útil?
   R: Un ejemplo de uso dentro del docstring (`>>> f(2)` seguido del resultado) que `doctest` ejecuta como prueba. Es útil para mantener la documentación correcta y probar casos simples.
2. ¿Qué indica el prefijo `_` en `_limpiar_texto` y Python lo hace cumplir?
   R: Que el método es de uso interno y no forma parte de la API pública. Python no lo impide; es una convención.
3. ¿Qué condición necesitas antes de refactorizar con confianza?
   R: Pruebas automáticas que cubran el comportamiento actual; así sabes de inmediato si el cambio rompió algo.

## Explícalo con tus palabras

Explica DRY y en qué casos aplicarlo demasiado (abstraer prematuramente) también hace daño.
