---
title: Funciones matemáticas y de fecha
kind: course
hours: 2
sources: DataCamp — Intermediate SQL Server, cap. 2
links: Intermediate SQL Server (DataCamp) | https://www.datacamp.com/courses/intermediate-sql-server
---

## Objetivo

Redondear y truncar números, usar `ABS`, `SQUARE`, `SQRT`, contar registros y hacer cálculos básicos con fechas.

## Qué hacer

1. Abre *Intermediate SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Math Functions» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **ROUND(x, n)**: redondea a n decimales; `ROUND(x, n, 1)` trunca en lugar de redondear.
- **ABS, SQUARE, SQRT, POWER**: valor absoluto, cuadrado, raíz cuadrada y potencia.
- **COUNT(DISTINCT col)**: cuenta valores distintos.
- **DATEPART / DATEADD / DATEDIFF**: extrae una parte de una fecha, suma intervalos y calcula diferencias.

## Preguntas de repaso

1. ¿Qué devuelven `ROUND(12.567, 1)` y `ROUND(12.567, 1, 1)`?
   R: `12.600` y `12.500`: el primero redondea y el segundo trunca.
2. ¿Cómo calculas cuántos días pasaron entre `order_date` y `ship_date`?
   R: `DATEDIFF(day, order_date, ship_date)`.
3. ¿Cómo obtienes la fecha de dentro de 30 días a partir de hoy?
   R: `DATEADD(day, 30, GETDATE())`.

## Explícalo con tus palabras

Explica la diferencia entre redondear y truncar con un ejemplo de facturación donde cada una da un total distinto.
