---
title: Evaluación parcial — consultas T-SQL (cursos 1–5)
kind: evaluation
hours: 3
sources: SQL Server Developer (DataCamp), cursos 1–5
links: SQL Server Developer (DataCamp) | https://app.datacamp.com/learn/career-tracks/sql-server-developer
---

## Objetivo

Comprobar que dominas consultas, modelado básico, fechas, funciones y window functions antes de pasar a diseño de bases de datos. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste. Si tienes tu SQL Server en Docker, puedes ejecutar tus respuestas de código después de escribirlas, nunca antes.

## Preguntas de evaluación

1. Ordena las cláusulas según su orden lógico de evaluación: `SELECT`, `FROM`, `ORDER BY`, `WHERE`, `HAVING`, `GROUP BY`.
   R: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY`. Por eso un alias del `SELECT` se puede usar en `ORDER BY` pero no en `WHERE`.
2. Escribe una consulta que muestre los clientes que no han hecho ningún pedido (`customers`, `orders.customer_id`).
   R: `SELECT c.* FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.customer_id IS NULL;` (también vale `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)`).
3. ¿Qué es una candidate key y en qué se diferencia de una primary key?
   R: Una candidate key es un conjunto mínimo de columnas que identifica de forma única cada fila. Puede haber varias; la primary key es la que eliges entre ellas como identificador principal (única y no nula).
4. ¿Qué hace `ON DELETE SET NULL` en una foreign key?
   R: Al borrar la fila padre, las filas hijas no se borran: su columna de foreign key se pone en `NULL`. Requiere que esa columna admita `NULL`.
5. Escribe una consulta que devuelva, por cada cliente, su pedido más caro (con `ROW_NUMBER`).
   R: Numera por cliente ordenando por monto y quédate con el primero:
   ```sql
   WITH r AS (
     SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rn
     FROM orders
   )
   SELECT * FROM r WHERE rn = 1;
   ```
6. ¿Por qué conviene escribir fechas literales como '2026-10-20' y no como '10/20/2026'?
   R: El formato ISO 'AAAA-MM-DD' se interpreta igual sin importar el idioma o `DATEFORMAT` de la sesión; '10/20/2026' depende de la configuración y puede fallar o interpretarse al revés.
7. ¿Qué devuelve `TRY_CONVERT(int, 'abc')` y para qué sirve?
   R: `NULL`. Sirve para convertir datos sucios sin que la consulta falle y para encontrar los valores inválidos con `WHERE TRY_CONVERT(int, col) IS NULL AND col IS NOT NULL`.
8. Escribe un total acumulado de ventas diarias ordenado por fecha.
   R: `SELECT fecha, ventas, SUM(ventas) OVER (ORDER BY fecha ROWS UNBOUNDED PRECEDING) AS acumulado FROM ventas_diarias;`
9. ¿Qué diferencia hay entre `ROLLUP(a, b)` y `GROUPING SETS ((a, b), (a), ())`?
   R: Ninguna en el resultado: `ROLLUP(a, b)` es una forma abreviada de esos tres grupos. `GROUPING SETS` permite elegir combinaciones que `ROLLUP` no produce.
10. ¿Por qué una conversión implícita sobre una columna indexada puede empeorar el rendimiento?
   R: Porque el motor aplica la conversión a cada valor de la columna y ya no puede buscar directamente en el índice (seek); termina recorriendo el índice o la tabla completa (scan).
