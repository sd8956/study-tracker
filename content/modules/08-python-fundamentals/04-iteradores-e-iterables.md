---
title: Iteradores e iterables
kind: course
hours: 2
sources: DataCamp — Python Toolbox, cap. 1
links: Python Toolbox (DataCamp) | https://www.datacamp.com/courses/python-toolbox
---

## Objetivo

Distinguir iterable de iterador, usar `iter()`/`next()`, `enumerate()`, `zip()` y procesar archivos grandes por chunks.

## Qué hacer

1. Abre *Python Toolbox* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Using iterators in PythonLand» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Iterable**: objeto que puede producir un iterador con `iter()`: list, str, dict, archivo, range.
- **Iterador**: objeto con estado que entrega el siguiente valor con `next()` y lanza `StopIteration` al agotarse.
- **enumerate()**: produce pares `(índice, valor)`; evita llevar un contador a mano.
- **zip()**: combina varios iterables elemento a elemento en tuples; se detiene en el más corto.
- **Desempaquetado con ***: `print(*it)` consume el iterador completo; después ya está vacío.
- **Lectura por chunks**: `pd.read_csv(..., chunksize=n)` devuelve un iterador de DataFrames para no cargar todo en memoria.

## Preguntas de repaso

1. ¿Qué diferencia hay entre un iterable y un iterador?
   R: Un iterable (como una list) puede recorrerse muchas veces porque cada `for` le pide un iterador nuevo con `iter()`. Un iterador tiene estado: entrega valores con `next()` y, una vez agotado, no vuelve a empezar.
2. ¿Qué imprime `list(zip(['a', 'b', 'c'], [1, 2]))`?
   R: `[('a', 1), ('b', 2)]`: `zip` se detiene en el iterable más corto.
3. ¿Por qué procesar un CSV de 10 GB por chunks en lugar de leerlo entero?
   R: Porque no cabe en memoria. Leyendo por chunks solo tienes en memoria un trozo a la vez y vas acumulando el resultado (por ejemplo, un conteo) chunk por chunk.
4. Si haces `it = iter([1, 2])`, luego `list(it)` dos veces, ¿qué obtienes cada vez?
   R: Primero `[1, 2]` y después `[]`, porque el iterador ya se agotó en la primera llamada.

## Explícalo con tus palabras

Explica el protocolo de iteración (`iter`, `next`, `StopIteration`) como si fuera un dispensador de turnos en un banco.
