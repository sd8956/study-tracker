---
title: Ganar eficiencia — collections, sets y bucles
kind: course
hours: 2
sources: DataCamp — Writing Efficient Python Code, cap. 3
links: Writing Efficient Python Code (DataCamp) | https://www.datacamp.com/courses/writing-efficient-python-code
---

## Objetivo

Usar `collections`, `itertools` y operaciones de sets para reemplazar bucles, y escribir bucles más eficientes cuando no se pueden evitar.

## Qué hacer

1. Abre *Writing Efficient Python Code* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Gaining efficiencies» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Toma una función tuya con dos bucles anidados (o la del proyecto del módulo 08) y reescríbela con sets o built-ins; mide antes y después con `timeit` (15 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Counter y itertools.combinations**: cuentan y generan combinaciones sin bucles manuales.
- **Sets para comparar**: `a & b`, `a - b` y `x in set` son mucho más rápidos que comparar listas con bucles anidados.
- **Eliminar bucles**: comprehensions, `map` y operaciones vectorizadas reemplazan bucles explícitos.
- **Sacar trabajo del bucle**: cálculos que no cambian entre iteraciones se hacen una sola vez antes del bucle.
- **Conversión una vez**: convertir tipos (por ejemplo a array) fuera del bucle, no en cada iteración.

## Preguntas de repaso

1. ¿Cómo encuentras los elementos comunes de dos listas grandes de forma eficiente?
   R: `set(a) & set(b)`: la intersección de sets es O(n) en lugar del O(n·m) de comparar con bucles anidados.
2. ¿Qué mejora tiene sacar `total = sum(pesos)` fuera de un bucle que calcula porcentajes?
   R: Evita recalcular la suma en cada iteración: pasa de O(n²) a O(n).
3. ¿Qué genera `itertools.combinations(['a', 'b', 'c'], 2)`?
   R: Las parejas sin orden ni repetición: `('a','b')`, `('a','c')`, `('b','c')`.

## Explícalo con tus palabras

Explica por qué `x in lista` y `x in conjunto` tienen costos tan distintos.
