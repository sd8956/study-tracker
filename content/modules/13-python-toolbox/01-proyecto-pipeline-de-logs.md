---
title: Proyecto — pipeline de análisis de logs con generators, regex y datetime
kind: project
hours: 3
sources: Proyecto propio sobre Python Programming Toolbox
links: Python Programming Toolbox (DataCamp) | https://app.datacamp.com/learn/skill-tracks/python-programming-toolbox ; itertools (documentación) | https://docs.python.org/3/library/itertools.html ; re (documentación) | https://docs.python.org/3/library/re.html
---

## Objetivo

Construir un pipeline perezoso (lazy) que procese un archivo de logs de cualquier tamaño con memoria constante, usando generators, comprehensions, regex con grupos con nombre, datetime con zonas horarias y estructuras de datos de `collections`.

## Estudio

### Entrada

Escribe primero un generador de datos `generar_logs.py` que produzca 2 millones de líneas como estas (con algunas líneas corruptas a propósito):

```
2026-10-20T13:45:02-05:00 INFO  [auth] user=ana ip=10.0.0.4 login ok 120ms
2026-10-20T13:45:03-05:00 ERROR [db]   user=luis ip=10.0.0.9 timeout 3021ms
```

### Pipeline

```
leer_lineas(ruta)            generator: una línea a la vez
  → parsear(lineas)          regex con grupos con nombre → dict; descarta y cuenta las corruptas
  → a_utc(eventos)           convierte el timestamp a datetime aware en UTC
  → filtrar(eventos, ...)    por nivel, módulo o rango de fechas
  → agregaciones             Counter por nivel, defaultdict(list) de latencias por módulo,
                             top 5 IPs con más errores, percentil 95 de latencia por hora
```

Cada etapa es una generator function que recibe un iterable y devuelve otro. Solo las agregaciones finales consumen el flujo.

## Qué hacer

1. Escribe `generar_logs.py` y crea el archivo de prueba (20 min).
2. Escribe la regex con grupos con nombre y pruébala con cinco líneas válidas y tres corruptas (30 min).
3. Implementa las etapas como generators y encadénalas; comprueba con `tracemalloc` que la memoria máxima no crece con el tamaño del archivo (45 min).
4. Implementa las agregaciones con `Counter`, `defaultdict` y comprehensions; ordena el top de IPs con `heapq.nlargest` (35 min).
5. Agrega una opción para procesar en ventanas de una hora con `itertools.groupby` (los logs vienen ordenados por tiempo) (25 min).
6. Escribe pruebas con pytest para la regex, la conversión a UTC (incluye un offset distinto de -05:00) y una agregación (15 min).
7. Criterio de terminado: el pipeline procesa los 2 millones de líneas con memoria máxima por debajo de 50 MB, reporta cuántas líneas corruptas descartó y las pruebas pasan (10 min).

## Conceptos clave

- **Pipeline lazy**: cada etapa produce valores bajo demanda; nada se materializa hasta la agregación final.
- **itertools.groupby**: agrupa elementos consecutivos con la misma clave; requiere datos ordenados por esa clave.
- **heapq.nlargest**: obtiene los k mayores en O(n log k) sin ordenar todo.

## Explícalo con tus palabras

Explica por qué tu pipeline puede procesar un archivo de 20 GB en un portátil y qué etapa rompería esa propiedad si devolviera una lista.
