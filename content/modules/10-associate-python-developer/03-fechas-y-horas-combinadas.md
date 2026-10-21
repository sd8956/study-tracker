---
title: Fechas y horas combinadas — parsing y duraciones
kind: course
hours: 2
sources: DataCamp — Working with Dates and Times in Python, cap. 2
links: Working with Dates and Times in Python (DataCamp) | https://www.datacamp.com/courses/working-with-dates-and-times-in-python
---

## Objetivo

Crear objetos `datetime`, convertir texto con `strptime`, trabajar con timestamps Unix y calcular duraciones.

## Qué hacer

1. Abre *Working with Dates and Times in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Combining Dates and Times» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **datetime**: fecha y hora juntas; `.replace()` cambia campos individuales.
- **strptime**: convierte texto a `datetime` con un formato: `datetime.strptime('2026-10-20 08:30', '%Y-%m-%d %H:%M')`.
- **strftime vs strptime**: *f* de format (objeto → texto), *p* de parse (texto → objeto).
- **Timestamp Unix**: segundos desde 1970-01-01 UTC; `datetime.fromtimestamp(ts)`.
- **total_seconds()**: convierte un `timedelta` a segundos para promediar duraciones.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `strftime` y `strptime`?
   R: `strftime` convierte un `datetime` en texto con un formato; `strptime` hace lo contrario: lee un texto con un formato dado y devuelve un `datetime`.
2. Tienes inicio y fin de un viaje en bici. ¿Cómo obtienes la duración en minutos?
   R: `(fin - inicio).total_seconds() / 60`.
3. ¿Qué pasa si el formato de `strptime` no coincide exactamente con el texto?
   R: Lanza `ValueError`; el formato debe coincidir carácter por carácter, incluidos separadores.

## Explícalo con tus palabras

Explica qué es un timestamp Unix y por qué los sistemas lo usan para intercambiar tiempos.
