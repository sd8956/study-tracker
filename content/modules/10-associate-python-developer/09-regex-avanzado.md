---
title: Regex avanzado — grupos, backreferences y lookarounds
kind: course
hours: 2
sources: DataCamp — Regular Expressions in Python, cap. 4
links: Regular Expressions in Python (DataCamp) | https://www.datacamp.com/courses/regular-expressions-in-python
---

## Objetivo

Capturar partes de una coincidencia con grupos, usar alternancia, grupos sin captura y con nombre, backreferences y lookahead/lookbehind.

## Qué hacer

1. Abre *Regular Expressions in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 4 «Advanced Regular Expression Concepts» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Grupo de captura**: `(\d{4})-(\d{2})` captura año y mes; `findall` devuelve tuples de grupos.
- **Alternancia**: `(gato|perro)` coincide con una u otra opción.
- **Grupo sin captura**: `(?:...)` agrupa sin capturar.
- **Grupo con nombre**: `(?P<anio>\d{4})`; se lee con `m.group('anio')`.
- **Backreference**: `\1` o `(?P=nombre)` repiten lo que capturó un grupo; detectan palabras repetidas.
- **Lookahead / lookbehind**: `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)` comprueban contexto sin consumirlo.

## Preguntas de repaso

1. ¿Qué devuelve `re.findall(r'(\w+)@(\w+)\.com', 'ana@mail.com luis@web.com')`?
   R: `[('ana', 'mail'), ('luis', 'web')]`: una tuple por coincidencia con los grupos capturados.
2. Escribe una regex que detecte una palabra repetida seguida, como 'el el'.
   R: `r'\b(\w+)\s+\1\b'`: el grupo captura la palabra y `\1` exige que se repita.
3. ¿Para qué sirve un lookahead negativo? Da un ejemplo.
   R: Para exigir que algo NO venga después sin consumirlo. Ejemplo: `r'\d+(?!%)'` encuentra números que no van seguidos de `%` (en la práctica conviene anclar con `\b` para no cortar números).
4. ¿Qué ventaja tiene un grupo con nombre?
   R: El código que lee la coincidencia es más claro (`m.group('anio')` en lugar de `m.group(1)`) y no se rompe si agregas otro grupo antes.

## Explícalo con tus palabras

Explica cómo validarías y extraerías fecha, usuario y mensaje de una línea de log con grupos con nombre.
