---
title: Optimizaciones básicas de pandas
kind: course
hours: 2
sources: DataCamp — Writing Efficient Python Code, cap. 4
links: Writing Efficient Python Code (DataCamp) | https://www.datacamp.com/courses/writing-efficient-python-code
---

## Objetivo

Elegir la forma más eficiente de recorrer o transformar un DataFrame: `iterrows`, `itertuples`, `apply` u operaciones vectorizadas.

## Qué hacer

1. Abre *Writing Efficient Python Code* en DataCamp (ver enlaces de la sesión) y completa el capítulo 4 «Basic pandas optimizations» (los capítulos 1–3 ya los hiciste en el módulo 11) (~60 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Con un DataFrame sintético de 1.000.000 de filas, mide con `%timeit` las cuatro formas de calcular una columna nueva (`iterrows`, `itertuples`, `apply`, vectorizado) y anota los tiempos (25 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **iterrows**: devuelve `(índice, Series)` por fila; es la opción más lenta.
- **itertuples**: devuelve namedtuples; bastante más rápido que `iterrows`.
- **apply**: aplica una función por filas (`axis=1`) o columnas; más cómodo pero sigue llamando a Python por elemento.
- **Vectorización**: operar columnas completas (`df['a'] + df['b']`) o sobre `.values`/`.to_numpy()`; es la opción más rápida.

## Preguntas de repaso

1. Ordena de más lenta a más rápida: `apply`, vectorización con NumPy, `iterrows`, `itertuples`.
   R: `iterrows` → `itertuples` → `apply` → vectorización con NumPy (la diferencia entre la primera y la última puede ser de cientos de veces).
2. ¿Por qué `itertuples` es más rápido que `iterrows`?
   R: Porque `iterrows` crea un objeto Series por cada fila, lo cual es costoso; `itertuples` crea namedtuples ligeras.
3. Reescribe vectorizado: `df['total'] = df.apply(lambda r: r['precio'] * r['cantidad'], axis=1)`.
   R: `df['total'] = df['precio'] * df['cantidad']`.

## Explícalo con tus palabras

Explica por qué operar una columna completa es más rápido que recorrer fila por fila, pensando en quién hace el trabajo: el intérprete de Python o código en C.
