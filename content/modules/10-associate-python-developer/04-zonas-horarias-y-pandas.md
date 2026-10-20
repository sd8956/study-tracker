---
title: Zonas horarias, horario de verano y fechas en pandas
kind: course
hours: 2
sources: DataCamp — Working with Dates and Times in Python, caps. 3–4
links: Working with Dates and Times in Python (DataCamp) | https://www.datacamp.com/courses/working-with-dates-and-times-in-python
---

## Objetivo

Trabajar con datetimes aware, convertir entre zonas horarias, manejar cambios de horario de verano y analizar fechas en pandas.

## Qué hacer

1. Abre *Working with Dates and Times in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Time Zones and Daylight Saving» y el capítulo 4 «Easy and Powerful: Dates and Times in Pandas» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Naive vs aware**: un datetime naive no tiene zona horaria; uno aware tiene `tzinfo` y se puede comparar entre zonas.
- **UTC y offsets**: `timezone.utc` y `timezone(timedelta(hours=-5))` para offsets fijos.
- **dateutil.tz / zoneinfo**: zonas con nombre (`America/Bogota`) que conocen las reglas de horario de verano; desde Python 3.9 existe `zoneinfo` en la biblioteca estándar.
- **astimezone**: convierte un datetime aware a otra zona sin cambiar el instante.
- **Horario de verano**: hay horas que no existen (primavera) y horas que se repiten (otoño); `fold` e `tz.enfold` desambiguan.
- **pandas**: `parse_dates=`, `pd.to_datetime`, accessor `.dt`, `resample` y `tz_localize`/`tz_convert`.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `replace(tzinfo=...)` y `astimezone(...)`?
   R: `replace` solo etiqueta el mismo reloj con otra zona (cambia el instante real); `astimezone` convierte el instante a la hora equivalente en la otra zona (el instante no cambia).
2. ¿Por qué conviene guardar todos los timestamps en UTC?
   R: Porque UTC no tiene horario de verano ni ambigüedades: puedes ordenar y restar sin errores, y conviertes a hora local solo al mostrar.
3. En pandas, ¿cómo obtienes la duración media de los viajes por día de la semana?
   R: Calculas `df['dur'] = df['end'] - df['start']`, luego `df.groupby(df['start'].dt.day_name())['dur'].mean()`.
4. ¿Qué problema aparece al restar dos datetimes locales que cruzan un cambio de horario de verano?
   R: La resta de horas locales da una duración incorrecta (una hora de más o de menos). Hay que usar datetimes aware o convertir a UTC antes de restar.

## Explícalo con tus palabras

Explica a un compañero por qué un viaje que empezó a las 1:50 y terminó a las 1:10 del mismo día no es un error de los datos.
