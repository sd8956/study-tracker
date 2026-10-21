---
title: Convertir strings y otros valores a fechas
kind: course
hours: 2
sources: DataCamp — Time Series Analysis in SQL Server, cap. 2
links: Time Series Analysis in SQL Server (DataCamp) | https://www.datacamp.com/courses/time-series-analysis-in-sql-server
---

## Objetivo

Convertir texto a fechas de forma segura con `CAST`, `CONVERT`, `PARSE` y las variantes `TRY_`, y entender el efecto del idioma y el formato de fecha.

## Qué hacer

1. Abre *Time Series Analysis in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Converting to Dates and Times» (~75 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **CAST / CONVERT**: convierten tipos; `CONVERT` acepta un código de estilo para el formato de fecha.
- **PARSE**: interpreta texto usando una cultura (`USING 'es-CO'`); es flexible pero lento.
- **TRY_CAST / TRY_CONVERT / TRY_PARSE**: devuelven `NULL` en lugar de error si la conversión falla.
- **SET DATEFORMAT / SET LANGUAGE**: cambian cómo se interpretan cadenas ambiguas como '03/04/2026'.
- **ISO 8601**: el formato 'AAAA-MM-DD' (o 'AAAAMMDD') se interpreta igual en cualquier configuración.

## Preguntas de repaso

1. ¿Por qué '03/04/2026' es peligroso y cómo lo evitas?
   R: Porque puede ser 3 de abril o 4 de marzo según `DATEFORMAT`/idioma. Se evita usando formato ISO 8601 ('2026-04-03') o `CONVERT` con un estilo explícito.
2. ¿Cuándo usarías `TRY_CONVERT` en lugar de `CONVERT`?
   R: Al cargar datos sucios: `TRY_CONVERT` devuelve `NULL` en los valores inválidos y así puedes encontrarlos con `WHERE TRY_CONVERT(date, col) IS NULL` en lugar de que la consulta entera falle.
3. ¿Qué función elegirías para millones de filas, `PARSE` o `CONVERT`? ¿Por qué?
   R: `CONVERT`, porque `PARSE` depende del CLR de .NET y es mucho más lento.

## Explícalo con tus palabras

Explica por qué las fechas en texto son una fuente clásica de bugs y qué tres reglas sigues para cargarlas sin errores.
