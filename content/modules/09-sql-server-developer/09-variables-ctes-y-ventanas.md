---
title: Variables, WHILE, CTEs y window functions
kind: course
hours: 2
sources: DataCamp — Intermediate SQL Server, caps. 3–4
links: Intermediate SQL Server (DataCamp) | https://www.datacamp.com/courses/intermediate-sql-server
---

## Objetivo

Escribir lotes con variables y `WHILE`, estructurar consultas con derived tables y CTEs, y usar window functions para totales acumulados y numeración.

## Qué hacer

1. Abre *Intermediate SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Processing Data in SQL Server» y el capítulo 4 «Window Functions» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **WHILE**: repite un bloque mientras la condición se cumpla; en SQL se usa poco porque se prefieren operaciones de conjunto.
- **Derived table**: subconsulta en el `FROM` que actúa como tabla temporal.
- **CTE**: `WITH nombre AS (...) SELECT ...`: una consulta con nombre, más legible que anidar.
- **OVER (PARTITION BY ... ORDER BY ...)**: calcula sobre una ventana de filas sin colapsarlas como `GROUP BY`.
- **ROW_NUMBER, LAG, LEAD, FIRST_VALUE**: numeran filas o leen valores de filas vecinas dentro de la ventana.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `SUM(x) ... GROUP BY cliente` y `SUM(x) OVER (PARTITION BY cliente)`?
   R: `GROUP BY` devuelve una fila por cliente; la window function conserva todas las filas y agrega a cada una el total de su cliente.
2. Escribe un total acumulado de `amount` por cliente en orden de fecha.
   R: `SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`
3. ¿Cómo obtienes el último pedido de cada cliente con `ROW_NUMBER`?
   R: En una CTE numeras con `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn` y luego filtras `WHERE rn = 1`.
4. ¿Por qué una CTE suele ser preferible a una subconsulta anidada?
   R: Porque se lee de arriba abajo, tiene nombre y puedes referenciarla varias veces en la misma consulta.

## Explícalo con tus palabras

Explica una window function a alguien que solo conoce `GROUP BY`, usando la imagen de una ventana que se desliza sobre las filas sin aplastarlas.
