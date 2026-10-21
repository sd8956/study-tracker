---
title: Funciones de texto y de números
kind: course
hours: 2
sources: DataCamp — Functions for Manipulating Data in SQL Server, caps. 3–4
links: Functions for Manipulating Data in SQL Server (DataCamp) | https://www.datacamp.com/courses/functions-for-manipulating-data-in-sql-server
---

## Objetivo

Buscar, extraer, reemplazar, concatenar y dividir texto; y usar funciones numéricas, de agregación y analíticas (`LAG`, `LEAD`, `FIRST_VALUE`).

## Qué hacer

1. Abre *Functions for Manipulating Data in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Working With Strings» y el capítulo 4 «Recognizing Numeric Data Properties» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **CHARINDEX / PATINDEX**: posición de un texto o de un patrón con comodines.
- **SUBSTRING, LEFT, RIGHT, REPLACE**: extraen o reemplazan partes de un string.
- **CONCAT / CONCAT_WS**: concatenan tratando `NULL` como vacío; `CONCAT_WS` usa separador.
- **STRING_AGG**: concatena valores de varias filas en un string (agregación).
- **STRING_SPLIT**: divide un string en filas según un separador.
- **Funciones analíticas**: `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE` acceden a filas vecinas dentro de una ventana.
- **ABS, SIGN, CEILING, FLOOR, ROUND, POWER**: funciones matemáticas básicas.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `'a' + NULL` y `CONCAT('a', NULL)`?
   R: `'a' + NULL` da `NULL`; `CONCAT('a', NULL)` da `'a'` porque trata `NULL` como cadena vacía.
2. ¿Cómo obtienes en una sola fila los nombres de todos los empleados de un departamento separados por coma?
   R: `SELECT dept, STRING_AGG(name, ', ') FROM employees GROUP BY dept;`
3. ¿Cómo calculas la diferencia de ventas respecto al mes anterior?
   R: `ventas - LAG(ventas) OVER (ORDER BY mes)`.
4. ¿Qué devuelven `CEILING(2.1)` y `FLOOR(-2.1)`?
   R: `3` y `-3`: `CEILING` sube al entero siguiente y `FLOOR` baja al anterior (en negativos, hacia más negativo).

## Explícalo con tus palabras

Explica `STRING_AGG` y `STRING_SPLIT` como operaciones inversas, con un ejemplo de etiquetas de un artículo.
