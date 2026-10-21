---
title: Fechas, formatos y tablas calendario
kind: course
hours: 2
sources: DataCamp — Time Series Analysis in SQL Server, cap. 1
links: Time Series Analysis in SQL Server (DataCamp) | https://www.datacamp.com/courses/time-series-analysis-in-sql-server
---

## Objetivo

Construir fechas a partir de partes, formatearlas para reportes y usar una tabla calendario para simplificar análisis por periodo.

## Qué hacer

1. Abre *Time Series Analysis in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Working with Dates and Times» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **DATEFROMPARTS**: `DATEFROMPARTS(2026, 10, 20)` crea una fecha a partir de año, mes y día.
- **DATENAME vs DATEPART**: `DATENAME(month, d)` devuelve texto ('October'); `DATEPART` devuelve un número.
- **FORMAT y CONVERT con estilo**: formatean fechas para mostrar; `FORMAT` es flexible pero más lento.
- **Tabla calendario**: una fila por día con columnas precalculadas (año fiscal, semana, feriado) que se une a los hechos.

## Preguntas de repaso

1. ¿Qué ventaja tiene una tabla calendario frente a calcular `DATEPART` en cada consulta?
   R: Los atributos (trimestre fiscal, feriados, día hábil) se calculan una sola vez, las reglas de negocio quedan en un solo lugar y puedes encontrar días sin datos uniéndote desde el calendario con `LEFT JOIN`.
2. ¿Cómo construyes el primer día del mes de una fecha `@d`?
   R: `DATEFROMPARTS(YEAR(@d), MONTH(@d), 1)`.
3. ¿Por qué conviene evitar `FORMAT` en consultas sobre millones de filas?
   R: Porque es mucho más lento que `CONVERT` con un estilo o que las funciones de partes de fecha; formatea en la capa de presentación cuando puedas.

## Explícalo con tus palabras

Explica qué es una tabla calendario a alguien que hace reportes en Excel y por qué le ahorra trabajo.
