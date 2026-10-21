---
title: Agregaciones, texto y GROUP BY
kind: course
hours: 2
sources: DataCamp — Introduction to SQL Server, cap. 2
links: Introduction to SQL Server (DataCamp) | https://www.datacamp.com/courses/introduction-to-sql-server
---

## Objetivo

Resumir datos con funciones de agregación, manipular texto y agrupar con `GROUP BY` y `HAVING`.

## Qué hacer

1. Abre *Introduction to SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Groups, strings, and counting things» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Funciones de agregación**: `SUM`, `COUNT`, `MIN`, `MAX`, `AVG` reducen muchas filas a un valor.
- **COUNT(*) vs COUNT(col)**: `COUNT(*)` cuenta filas; `COUNT(col)` ignora los `NULL` de esa columna.
- **Funciones de texto**: `LEN`, `LEFT`, `RIGHT`, `CHARINDEX`, `SUBSTRING`, `REPLACE`.
- **GROUP BY**: agrupa filas por una o más columnas para agregar por grupo.
- **HAVING**: filtra grupos después de agregar; `WHERE` filtra filas antes de agrupar.

## Preguntas de repaso

1. ¿Cuál es la diferencia entre `WHERE` y `HAVING`?
   R: `WHERE` filtra filas individuales antes de agrupar y no puede usar agregaciones; `HAVING` filtra los grupos ya formados y sí puede usar `SUM`, `COUNT`, etc.
2. Escribe una consulta que muestre los países con más de 10 clientes en `customers(country)`.
   R: `SELECT country, COUNT(*) AS total FROM customers GROUP BY country HAVING COUNT(*) > 10;`
3. ¿Qué devuelve `CHARINDEX('@', 'ana@mail.com')`?
   R: `4`: la posición (base 1) de la primera arroba. Si no la encuentra, devuelve 0.
4. ¿Por qué `COUNT(email)` puede ser menor que `COUNT(*)`?
   R: Porque `COUNT(email)` no cuenta las filas en que `email` es `NULL`.

## Explícalo con tus palabras

Explica el orden lógico «FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY» con un ejemplo de ventas por tienda.
