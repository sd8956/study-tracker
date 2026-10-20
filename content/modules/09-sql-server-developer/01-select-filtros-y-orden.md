---
title: SELECT, filtros y orden en T-SQL
kind: course
hours: 2
sources: DataCamp — Introduction to SQL Server, cap. 1
links: Introduction to SQL Server (DataCamp) | https://www.datacamp.com/courses/introduction-to-sql-server
---

## Objetivo

Leer datos de una tabla con `SELECT`, limitar filas con `TOP`, filtrar con `WHERE` y ordenar con `ORDER BY`.

## Qué hacer

1. Abre *Introduction to SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «SELECTion Box» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **SELECT ... FROM**: elige columnas de una tabla; `SELECT *` trae todas, pero en código real nombra las columnas.
- **TOP (n) y TOP (n) PERCENT**: limita el número de filas; es la forma de T-SQL (otros motores usan `LIMIT`).
- **DISTINCT**: elimina filas duplicadas del resultado.
- **AS**: da un alias a una columna o tabla.
- **WHERE**: filtra filas con comparaciones, `BETWEEN`, `IN`, `LIKE` y `IS NULL`.
- **ORDER BY**: ordena por una o más columnas, `ASC` por defecto o `DESC`.

## Preguntas de repaso

1. ¿Cómo obtienes las 5 canciones más largas de una tabla `songs` con columna `duration`?
   R: `SELECT TOP (5) title, duration FROM songs ORDER BY duration DESC;`
2. ¿Por qué `WHERE region = NULL` no devuelve filas y cómo se escribe bien?
   R: Porque `NULL` significa «desconocido» y cualquier comparación con `=` da desconocido, no verdadero. Se escribe `WHERE region IS NULL`.
3. ¿Qué diferencia hay entre `BETWEEN 10 AND 20` y `> 10 AND < 20`?
   R: `BETWEEN` es inclusivo: incluye 10 y 20. La segunda forma los excluye.
4. ¿Qué filas devuelve `WHERE name LIKE 'A%'`?
   R: Las filas cuyo `name` empieza con A: `%` representa cualquier secuencia de caracteres (incluso vacía).

## Explícalo con tus palabras

Explica a alguien que nunca vio SQL qué hace cada cláusula de `SELECT TOP (3) a, b FROM t WHERE c > 0 ORDER BY a DESC`.
