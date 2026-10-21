---
title: Legibilidad y orden de procesamiento de una consulta
kind: course
hours: 2
sources: DataCamp — Improving Query Performance in SQL Server, cap. 1
links: Improving Query Performance in SQL Server (DataCamp) | https://www.datacamp.com/courses/improving-query-performance-in-sql-server
---

## Objetivo

Escribir SQL legible con formato, comentarios y alias, y entender el orden lógico en que el motor procesa una consulta.

## Qué hacer

1. Abre *Improving Query Performance in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction, Review and The Order of Things» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Formato consistente**: palabras clave en mayúsculas, una cláusula por línea e indentación.
- **Alias**: nombres cortos y claros para tablas y columnas calculadas.
- **Comentarios**: `--` para una línea y `/* */` para bloques; explican el porqué, no el qué.
- **Orden lógico**: FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → TOP.

## Preguntas de repaso

1. ¿Por qué no puedes usar en `WHERE` un alias definido en el `SELECT`?
   R: Porque `WHERE` se evalúa antes que `SELECT`, así que el alias todavía no existe. Sí puedes usarlo en `ORDER BY`, que se evalúa después.
2. ¿Qué deben explicar los comentarios en una consulta compleja?
   R: La intención y las reglas de negocio (por qué se filtra así, qué supuesto hay), no repetir lo que el código ya dice.
3. ¿En qué orden se aplican `TOP` y `ORDER BY`?
   R: Primero se ordena y luego `TOP` toma las primeras n filas del resultado ordenado.

## Explícalo con tus palabras

Explica el orden lógico de una consulta como una cadena de montaje que va reduciendo y transformando filas.
