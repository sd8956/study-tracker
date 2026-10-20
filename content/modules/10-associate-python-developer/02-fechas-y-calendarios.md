---
title: Fechas y calendarios con datetime
kind: course
hours: 2
sources: DataCamp — Working with Dates and Times in Python, cap. 1
links: Working with Dates and Times in Python (DataCamp) | https://www.datacamp.com/courses/working-with-dates-and-times-in-python
---

## Objetivo

Crear y comparar objetos `date`, hacer aritmética con `timedelta` y formatear fechas en ISO 8601 y con `strftime`.

## Qué hacer

1. Abre *Working with Dates and Times in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Dates and Calendars» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **date**: `date(2026, 10, 20)`: año, mes, día; atributos `.year`, `.month`, `.day` y `.weekday()` (lunes = 0).
- **timedelta**: diferencia entre fechas; restar dos `date` devuelve un `timedelta` con `.days`.
- **isoformat()**: convierte a 'AAAA-MM-DD'; ordenar strings ISO equivale a ordenar fechas.
- **strftime**: formatea con códigos: `%Y`, `%m`, `%d`, `%B` (nombre del mes), `%j` (día del año).

## Preguntas de repaso

1. ¿Cómo calculas cuántos días faltan para el 31 de diciembre de 2026 desde hoy?
   R: `(date(2026, 12, 31) - date.today()).days`.
2. ¿Por qué el formato ISO 8601 es útil para guardar fechas como texto?
   R: Porque no es ambiguo y porque el orden alfabético de los strings coincide con el orden cronológico.
3. ¿Qué imprime `date(2026, 10, 20).strftime('%d/%m/%Y')`?
   R: `'20/10/2026'`.

## Explícalo con tus palabras

Explica la diferencia entre un `date` y un `timedelta` con el ejemplo de un vuelo: la fecha de salida y la duración del viaje.
