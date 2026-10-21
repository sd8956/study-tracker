---
title: Proyecto — tuning de StudyTracker con un millón de filas
kind: project
hours: 3
sources: Proyecto propio sobre Improving Query Performance in SQL Server
links: Planes de ejecución (Microsoft Learn) | https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans ; Referencia de T-SQL (Microsoft Learn) | https://learn.microsoft.com/en-us/sql/t-sql/language-reference
---

## Objetivo

Medir y mejorar el rendimiento de consultas reales sobre tu base `StudyTracker` cargada con un volumen grande de datos sintéticos.

## Qué hacer

1. Genera datos sintéticos: 1.000.000 de repasos y 200.000 filas de progreso para varios usuarios ficticios (agrega una columna `usuario_id` si no la tienes). Usa un CTE recursivo o `GENERATE_SERIES` (SQL Server 2022) en lugar de un `WHILE` fila por fila (40 min).
2. Elige cinco consultas: tarjetas vencidas de un usuario, horas por semana, racha de días, repasos fallidos por módulo y la vista de progreso. Mide cada una con `SET STATISTICS IO, TIME ON` y guarda el plan de ejecución real (40 min).
3. Para cada consulta, identifica el operador más caro y propone un cambio: índice nonclustered con `INCLUDE`, reescritura sargable, `EXISTS` en lugar de `IN`, o eliminar un `DISTINCT` innecesario (50 min).
4. Aplica los cambios uno por uno y vuelve a medir. Registra en `tuning.md` una tabla con: consulta, lecturas lógicas antes/después, tiempo antes/después y el cambio aplicado (30 min).
5. Mide el costo de tus índices en escritura: inserta 50.000 repasos con y sin los índices nuevos y compara tiempos (10 min).
6. Criterio de terminado: `tuning.md` muestra al menos tres consultas con una reducción clara de lecturas lógicas y explica el costo en escrituras de los índices creados.

## Explícalo con tus palabras

Explica por qué mides lecturas lógicas y no solo el tiempo, y por qué el primer tiempo de ejecución puede engañarte (caché fría).
