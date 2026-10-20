---
title: Expresiones regulares para pattern matching
kind: course
hours: 2
sources: DataCamp — Regular Expressions in Python, cap. 3
links: Regular Expressions in Python (DataCamp) | https://www.datacamp.com/courses/regular-expressions-in-python
---

## Objetivo

Escribir expresiones regulares con metacaracteres, cuantificadores y conjuntos, y usar `re.findall`, `re.search`, `re.match`, `re.split` y `re.sub`.

## Qué hacer

1. Abre *Regular Expressions in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Regular Expressions for Pattern Matching» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Raw strings**: `r'\d+'` evita que Python interprete las barras invertidas.
- **Metacaracteres**: `\d` dígito, `\w` carácter de palabra, `\s` espacio, `.` cualquier carácter.
- **Cuantificadores**: `*` 0 o más, `+` 1 o más, `?` 0 o 1, `{n,m}` entre n y m.
- **Greedy vs lazy**: por defecto los cuantificadores toman lo máximo; con `?` (`.*?`) toman lo mínimo.
- **Conjuntos y anclas**: `[a-z]`, `[^0-9]` (negación), `^` inicio y `$` fin.
- **search vs match**: `match` solo prueba al inicio del string; `search` busca en cualquier posición.

## Preguntas de repaso

1. ¿Qué devuelve `re.findall(r'\d+', 'tengo 3 gatos y 12 peces')`?
   R: `['3', '12']`.
2. ¿Qué diferencia hay entre `<.*>` y `<.*?>` aplicados a `'<a><b>'`?
   R: `<.*>` es greedy y captura `'<a><b>'` completo; `<.*?>` es lazy y captura `'<a>'` y luego `'<b>'` por separado.
3. ¿Cuándo usar `re.search` en lugar de `re.match`?
   R: Cuando el patrón puede estar en cualquier parte del texto; `re.match` solo encuentra coincidencias al inicio.
4. Escribe una regex que encuentre hashtags en un tweet.
   R: `re.findall(r'#\w+', tweet)`.

## Explícalo con tus palabras

Explica greedy vs lazy con la imagen de alguien que agarra todas las galletas del frasco frente a quien toma solo una.
