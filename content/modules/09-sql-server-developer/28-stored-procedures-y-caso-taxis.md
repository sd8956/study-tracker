---
title: Stored procedures y caso práctico NYC Taxi
kind: course
hours: 2
sources: DataCamp — Writing Functions and Stored Procedures in SQL Server, caps. 3–4
links: Writing Functions and Stored Procedures in SQL Server (DataCamp) | https://www.datacamp.com/courses/writing-functions-and-stored-procedures-in-sql-server
---

## Objetivo

Crear stored procedures con parámetros de salida, valores de retorno y manejo de errores, y aplicarlos en un caso de análisis con datos de taxis de Nueva York.

## Qué hacer

1. Abre *Writing Functions and Stored Procedures in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Stored Procedures» y el capítulo 4 «NYC Taxi Ride Case Study» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **CREATE OR ALTER PROCEDURE**: define un procedimiento con parámetros de entrada y salida (`OUTPUT`).
- **RETURN**: devuelve un entero de estado (0 = éxito por convención).
- **SET NOCOUNT ON**: evita mensajes de «filas afectadas», reduce tráfico.
- **Procedimiento vs función**: el procedimiento puede modificar datos, manejar transacciones y devolver varios resultados; la función se usa dentro de consultas.
- **Patrón CRUD**: un procedimiento por operación (crear, leer, actualizar, borrar) con validaciones.

## Preguntas de repaso

1. ¿Cuándo escribes un stored procedure en lugar de una función?
   R: Cuando necesitas modificar datos, controlar transacciones, manejar errores con `TRY...CATCH` o encapsular un proceso de varios pasos. La función es para cálculos reutilizables dentro de un `SELECT`.
2. ¿Cómo obtienes un valor de un parámetro `OUTPUT`?
   R: Declarando una variable y pasándola con `OUTPUT`: `DECLARE @total INT; EXEC dbo.ContarViajes @dia = '2026-01-01', @total = @total OUTPUT; SELECT @total;`
3. Menciona dos beneficios de seguridad de los stored procedures.
   R: Puedes dar permiso `EXECUTE` sobre el procedimiento sin dar acceso directo a las tablas, y los parámetros evitan la inyección SQL frente a concatenar texto.

## Explícalo con tus palabras

Explica a un desarrollador de aplicaciones por qué podría querer un stored procedure en lugar de mandar el SQL desde su código, y cuál es el costo.
