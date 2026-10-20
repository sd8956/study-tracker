---
title: Manipulación y formato de strings
kind: course
hours: 2
sources: DataCamp — Regular Expressions in Python, caps. 1–2
links: Regular Expressions in Python (DataCamp) | https://www.datacamp.com/courses/regular-expressions-in-python
---

## Objetivo

Cortar, unir, limpiar y reemplazar texto, y elegir entre `str.format`, f-strings y `Template` para formatear.

## Qué hacer

1. Abre *Regular Expressions in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Basic Concepts of String Manipulation» y el capítulo 2 «Formatting Strings» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Slicing de strings**: `s[::-1]` invierte; los strings son inmutables.
- **split / join / strip**: dividir por separador, unir una lista y quitar espacios o caracteres de los extremos.
- **find / index / count / replace**: buscar posiciones (find devuelve -1, index lanza error), contar y reemplazar.
- **str.format**: formato posicional con `{}` y especificadores (`{:.2f}`, `{:>10}`).
- **f-strings**: `f'{nombre!r} tiene {edad + 1} años'`: expresiones dentro del literal.
- **string.Template**: sustitución con `$variable`, más segura con plantillas que vienen del usuario.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `s.find('x')` y `s.index('x')` cuando 'x' no está?
   R: `find` devuelve `-1`; `index` lanza `ValueError`.
2. Formatea el número `3.14159` con dos decimales y alineado a la derecha en 8 caracteres usando un f-string.
   R: `f'{3.14159:>8.2f}'` → `'    3.14'`.
3. ¿Por qué usarías `Template` en lugar de un f-string o `format` con texto que escribe el usuario?
   R: Porque `format` y los f-strings pueden acceder a atributos de los objetos pasados (`{obj.__class__}`) y exponer datos internos; `Template` solo sustituye nombres simples con `$`.

## Explícalo con tus palabras

Explica las tres formas de formatear strings en Python y cuál usarías por defecto en código nuevo y por qué.
