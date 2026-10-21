---
title: Resumir datos, NULL y CASE
kind: course
hours: 2
sources: DataCamp — Intermediate SQL Server, cap. 1
links: Intermediate SQL Server (DataCamp) | https://www.datacamp.com/courses/intermediate-sql-server
---

## Objetivo

Explorar un dataset con agregaciones, tratar valores faltantes con `ISNULL`/`COALESCE` y clasificar filas en categorías con `CASE`.

## Qué hacer

1. Abre *Intermediate SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Summarizing Data» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Exploración inicial**: contar filas, `MIN`/`MAX`/`AVG` y valores distintos para conocer un dataset.
- **ISNULL(col, valor)**: reemplaza `NULL` por un valor (T-SQL, dos argumentos).
- **COALESCE(a, b, c)**: devuelve el primer argumento no nulo; es estándar y acepta varios.
- **CASE WHEN**: expresión condicional para crear categorías o bins: `CASE WHEN x < 10 THEN 'bajo' ELSE 'alto' END`.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `ISNULL` y `COALESCE`?
   R: `ISNULL` es de T-SQL y recibe exactamente dos argumentos; `COALESCE` es estándar SQL, recibe varios y devuelve el primero no nulo.
2. Escribe un `CASE` que clasifique `temperature` en 'frío' (< 15), 'templado' (15–25) y 'calor' (> 25).
   R: `CASE WHEN temperature < 15 THEN 'frío' WHEN temperature <= 25 THEN 'templado' ELSE 'calor' END`
3. ¿Por qué conviene revisar cuántos `NULL` tiene una columna antes de calcular un promedio?
   R: Porque `AVG` ignora los `NULL`: si muchos faltan, el promedio representa solo una parte de los datos y puede engañarte.

## Explícalo con tus palabras

Explica cómo harías un «histograma en SQL» con `CASE` y `GROUP BY`.
