---
title: Variables y manipulación de fechas para EDA
kind: course
hours: 2
sources: DataCamp — Writing Functions and Stored Procedures in SQL Server, cap. 1
links: Writing Functions and Stored Procedures in SQL Server (DataCamp) | https://www.datacamp.com/courses/writing-functions-and-stored-procedures-in-sql-server
---

## Objetivo

Explorar datos temporales y guardar valores en variables escalares y de tabla, usando `DATEDIFF`, `DATEPART` y `DATEADD`.

## Qué hacer

1. Abre *Writing Functions and Stored Procedures in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Temporal EDA, Variables & Date Manipulation» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Variable escalar**: `DECLARE @x INT = 1;` guarda un único valor.
- **Variable de tabla**: `DECLARE @t TABLE (id INT, nombre VARCHAR(50));` guarda un conjunto de filas en el lote.
- **DATEADD + DATEDIFF para truncar**: `DATEADD(day, DATEDIFF(day, 0, d), 0)` trunca una fecha a medianoche.
- **EDA temporal**: contar eventos por día de la semana u hora para detectar patrones.

## Preguntas de repaso

1. ¿Cuándo usarías una variable de tabla en lugar de una tabla temporal `#t`?
   R: Para conjuntos pequeños dentro de un solo lote o procedimiento. Las tablas temporales admiten índices y estadísticas, por eso rinden mejor con muchos datos.
2. ¿Cómo cuentas viajes por día de la semana en una tabla `trips(pickup)`?
   R: `SELECT DATENAME(weekday, pickup) AS dia, COUNT(*) FROM trips GROUP BY DATENAME(weekday, pickup);`
3. ¿Qué hace `DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)`?
   R: Devuelve el primer día del mes actual: cuenta los meses desde la fecha 0 y los suma de nuevo a esa fecha base.

## Explícalo con tus palabras

Explica el truco de `DATEADD`/`DATEDIFF` para truncar fechas como si contaras escalones desde el piso cero.
