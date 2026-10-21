---
title: Proyecto — Interstellar Delivery con datetime
kind: project
hours: 3
sources: DataCamp — proyecto Interstellar Delivery: Mastering Datetime in Python
links: Interstellar Delivery — Mastering Datetime in Python (proyecto DataCamp) | https://www.datacamp.com/projects/2196 ; Documentación de datetime | https://docs.python.org/3/library/datetime.html
---

## Objetivo

Completar el proyecto de DataCamp (funciones reutilizables para formatear timestamps, estimar llegadas y calcular aterrizajes) y extenderlo con zonas horarias y pruebas.

## Qué hacer

1. Haz el proyecto en DataCamp (~60 min).
2. Pasa tus funciones a `entregas.py` y agrega type hints a cada una (15 min).
3. Extensión 1: haz que todas las funciones acepten y devuelvan datetimes aware; rechaza datetimes naive con `ValueError` (30 min).
4. Extensión 2: una función `mensaje_cliente(llegada_utc, zona)` que muestre la hora de llegada en la zona del cliente con `zoneinfo` (por ejemplo `America/Bogota` y `Europe/Madrid`) (25 min).
5. Escribe pruebas con `assert` para un cruce de medianoche, un cruce de cambio de horario de verano en Europa y un datetime naive rechazado (30 min).
6. Criterio de terminado: las pruebas pasan y puedes explicar por qué la duración calculada en UTC es correcta en el cambio de horario.

## Explícalo con tus palabras

Explica por qué tus funciones rechazan datetimes naive y qué bug evita esa decisión.
