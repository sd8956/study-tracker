---
title: Manejo de errores con TRY...CATCH
kind: course
hours: 2
sources: DataCamp — Transactions and Error Handling in SQL Server, cap. 1
links: Transactions and Error Handling in SQL Server (DataCamp) | https://www.datacamp.com/courses/transactions-and-error-handling-in-sql-server
---

## Objetivo

Capturar errores en T-SQL con `TRY...CATCH`, conocer la anatomía de un error y obtener su información con las funciones `ERROR_*`.

## Qué hacer

1. Abre *Transactions and Error Handling in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Starting with error handling» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **BEGIN TRY ... END TRY BEGIN CATCH ... END CATCH**: si una instrucción del bloque TRY falla, el control salta al CATCH.
- **Anatomía de un error**: número, severidad, estado, procedimiento, línea y mensaje.
- **Severidad**: de 11 a 19 son errores capturables por TRY...CATCH; 10 o menos son avisos; 20 o más suelen cerrar la conexión.
- **ERROR_NUMBER, ERROR_MESSAGE, ERROR_LINE...**: solo devuelven valores dentro del bloque CATCH.
- **TRY...CATCH anidado**: un CATCH puede contener otro TRY para manejar errores al registrar el error.

## Preguntas de repaso

1. ¿Qué errores no captura `TRY...CATCH`?
   R: Los de severidad 10 o menos (avisos), los de severidad 20 o más que cierran la conexión, y los errores de compilación o resolución de nombres en el mismo nivel de ejecución.
2. ¿Dónde puedes llamar a `ERROR_MESSAGE()` para obtener información útil?
   R: Dentro del bloque `CATCH`; fuera de él devuelve `NULL`.
3. Escribe un esqueleto que intente un `INSERT` y, si falla, guarde el error en una tabla `error_log`.
   R: `BEGIN TRY INSERT INTO t (...) VALUES (...); END TRY BEGIN CATCH INSERT INTO error_log (num, msg, linea) VALUES (ERROR_NUMBER(), ERROR_MESSAGE(), ERROR_LINE()); END CATCH`

## Explícalo con tus palabras

Compara `TRY...CATCH` de T-SQL con `try/except` de Python: qué es igual y qué cambia.
