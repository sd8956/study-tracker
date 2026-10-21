---
title: Manipular fechas y horas
kind: course
hours: 2
sources: DataCamp — Functions for Manipulating Data in SQL Server, cap. 2
links: Functions for Manipulating Data in SQL Server (DataCamp) | https://www.datacamp.com/courses/functions-for-manipulating-data-in-sql-server
---

## Objetivo

Obtener la fecha actual con distintas precisiones, extraer partes, construir fechas y validar si un valor es una fecha.

## Qué hacer

1. Abre *Functions for Manipulating Data in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Manipulating time» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **SYSDATETIME vs GETDATE**: `SYSDATETIME` devuelve `datetime2` (más precisión); `GETDATE` devuelve `datetime`.
- **SYSUTCDATETIME**: la hora actual en UTC, la recomendada para guardar timestamps.
- **YEAR, MONTH, DAY, DATENAME, DATEPART**: extraen partes de una fecha.
- **DATEFROMPARTS / DATETIME2FROMPARTS**: construyen fechas desde números.
- **ISDATE**: devuelve 1 si el texto es una fecha válida (con limitaciones; no cubre `datetime2`).
- **EOMONTH**: último día del mes.

## Preguntas de repaso

1. ¿Por qué conviene guardar timestamps en UTC?
   R: Porque no tienen ambigüedad por zonas horarias ni cambios de horario de verano; la conversión a hora local se hace al mostrar.
2. ¿Cómo obtienes el último día del mes actual?
   R: `EOMONTH(GETDATE())`.
3. ¿Qué devuelve `DATENAME(weekday, '2026-10-20')` con idioma inglés?
   R: `'Tuesday'`, el nombre del día como texto.

## Explícalo con tus palabras

Explica cuándo elegirías `datetime2` en lugar de `datetime` y por qué.
