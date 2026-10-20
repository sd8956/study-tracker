---
title: Series de tiempo con window functions
kind: course
hours: 2
sources: DataCamp — Time Series Analysis in SQL Server, cap. 4
links: Time Series Analysis in SQL Server (DataCamp) | https://www.datacamp.com/courses/time-series-analysis-in-sql-server
---

## Objetivo

Calcular totales acumulados, medias móviles, intervalos entre eventos y el máximo de solapamiento con window functions.

## Qué hacer

1. Abre *Time Series Analysis in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 4 «Answering Time Series Questions with Window Functions» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Running total**: `SUM(x) OVER (ORDER BY fecha ROWS UNBOUNDED PRECEDING)`.
- **Media móvil**: `AVG(x) OVER (ORDER BY fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` para 7 periodos.
- **LAG / LEAD**: leen el valor anterior o siguiente; sirven para calcular intervalos entre eventos.
- **ROWS vs RANGE**: `ROWS` cuenta filas físicas; `RANGE` agrupa filas con el mismo valor de orden.
- **Máximo solapamiento**: convertir inicios en +1 y fines en -1, ordenar y acumular: el máximo del acumulado es el pico de concurrencia.

## Preguntas de repaso

1. Escribe una media móvil de 7 días de `ventas` ordenada por `fecha`.
   R: `AVG(ventas) OVER (ORDER BY fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`.
2. ¿Cómo calculas los minutos entre una visita y la anterior del mismo cliente?
   R: `DATEDIFF(minute, LAG(visit_time) OVER (PARTITION BY customer_id ORDER BY visit_time), visit_time)`.
3. Explica la técnica para hallar el máximo de sesiones simultáneas.
   R: Se crea una fila por evento: +1 en cada inicio y -1 en cada fin. Se ordena por tiempo y se calcula un running total del +1/-1; el máximo de ese acumulado es el número máximo de sesiones abiertas a la vez.

## Explícalo con tus palabras

Explica por qué una media móvil «suaviza» una serie y qué pasa si la ventana es muy grande o muy pequeña.
