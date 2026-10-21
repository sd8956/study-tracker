---
title: User defined functions
kind: course
hours: 2
sources: DataCamp — Writing Functions and Stored Procedures in SQL Server, cap. 2
links: Writing Functions and Stored Procedures in SQL Server (DataCamp) | https://www.datacamp.com/courses/writing-functions-and-stored-procedures-in-sql-server
---

## Objetivo

Crear, modificar y ejecutar funciones escalares, inline table-valued y multi-statement table-valued, sabiendo cuál conviene en cada caso.

## Qué hacer

1. Abre *Writing Functions and Stored Procedures in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «User Defined Functions» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Scalar function**: devuelve un valor; usada fila por fila puede ser lenta.
- **Inline TVF**: devuelve el resultado de un solo `SELECT`; el optimizador la expande como una vista con parámetros.
- **Multi-statement TVF**: llena una variable de tabla con varias instrucciones; el optimizador estima mal sus filas.
- **CREATE OR ALTER FUNCTION**: crea o reemplaza la función.
- **SCHEMABINDING**: impide cambiar las tablas que la función usa y ayuda al optimizador.
- **Determinismo**: una función determinista siempre devuelve lo mismo con las mismas entradas.

## Preguntas de repaso

1. ¿Por qué suele preferirse una inline TVF a una multi-statement TVF?
   R: Porque el optimizador la integra en el plan de la consulta y estima bien las filas; la multi-statement es una caja negra con estimaciones pobres y suele rendir peor.
2. Escribe una función escalar que devuelva el total de un pedido dado su id.
   R: `CREATE OR ALTER FUNCTION dbo.TotalPedido (@id INT) RETURNS DECIMAL(10,2) AS BEGIN RETURN (SELECT SUM(qty * price) FROM order_lines WHERE order_id = @id); END;`
3. ¿Puede una función modificar datos con `INSERT` o `UPDATE` sobre tablas?
   R: No. Las funciones definidas por el usuario no pueden modificar el estado de la base (salvo variables de tabla locales); para eso están los stored procedures.

## Explícalo con tus palabras

Explica las tres clases de UDF con una analogía de cocina (una salsa, una receta de un paso, una receta de varios pasos).
