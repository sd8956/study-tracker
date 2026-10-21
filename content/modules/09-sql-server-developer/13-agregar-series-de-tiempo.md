---
title: Agregar series de tiempo y ROLLUP/CUBE
kind: course
hours: 2
sources: DataCamp — Time Series Analysis in SQL Server, cap. 3
links: Time Series Analysis in SQL Server (DataCamp) | https://www.datacamp.com/courses/time-series-analysis-in-sql-server
---

## Objetivo

Agregar datos por periodos, hacer downsampling y upsampling, y obtener subtotales con `ROLLUP`, `CUBE` y `GROUPING SETS`.

## Qué hacer

1. Abre *Time Series Analysis in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Aggregating Time Series Data» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Downsampling**: pasar a una granularidad más gruesa (de minutos a días) agrupando por la fecha truncada.
- **Upsampling**: pasar a una granularidad más fina; requiere un calendario para generar los periodos vacíos.
- **Agregados estadísticos**: `STDEV`, `VAR` y la mediana con `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) OVER ()`.
- **ROLLUP**: agrega subtotales jerárquicos (año → mes → total).
- **CUBE**: agrega subtotales de todas las combinaciones de columnas.
- **GROUPING SETS**: eliges exactamente qué combinaciones de agrupación quieres.

## Preguntas de repaso

1. ¿Cómo agregas eventos con timestamp a nivel de día?
   R: Agrupando por la fecha truncada: `GROUP BY CAST(event_time AS date)` y aplicando las agregaciones que necesites.
2. ¿Qué diferencia hay entre `ROLLUP(year, month)` y `CUBE(year, month)`?
   R: `ROLLUP` produce (year, month), (year) y el total; `CUBE` añade además (month) solo, es decir, todas las combinaciones.
3. ¿Por qué el upsampling necesita una tabla calendario?
   R: Porque los periodos sin eventos no existen en los datos; hay que generarlos desde un calendario con `LEFT JOIN` para que aparezcan con cero o `NULL`.

## Explícalo con tus palabras

Explica downsampling y upsampling con el ejemplo de las lecturas de un sensor cada minuto.
