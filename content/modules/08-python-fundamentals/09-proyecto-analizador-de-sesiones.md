---
title: Proyecto — analizador de sesiones de estudio en Python puro
kind: project
hours: 3
sources: Proyecto propio sobre Python Programming Fundamentals
links: Documentación de collections | https://docs.python.org/3/library/collections.html ; Documentación de dataclasses | https://docs.python.org/3/library/dataclasses.html
---

## Objetivo

Construir un script de línea de comandos que lea un CSV de sesiones de estudio y produzca un reporte, usando solo la biblioteca estándar y todo lo visto en el track: colecciones, funciones, errores, generators y comprehensions.

## Estudio

### Datos de entrada

Crea a mano (o con un pequeño script) un archivo `sesiones.csv` con al menos 40 filas:

```
fecha,modulo,tema,minutos,completada
2026-10-20,08-python-fundamentals,iteradores,95,si
2026-10-21,08-python-fundamentals,generators,80,no
```

### Requisitos

- Una `@dataclass` `Sesion` con tipos (`fecha: date`, `minutos: int`, `completada: bool`).
- Un generator `leer_sesiones(ruta)` que lea el archivo línea a línea con `csv.DictReader` y entregue objetos `Sesion`. Si una fila es inválida (minutos no numéricos, fecha mal formada), la salta e informa el número de línea por `stderr`, sin detener el programa.
- Un reporte con: total de horas, horas por módulo (`defaultdict(int)`), los 3 temas más estudiados (`Counter.most_common`), porcentaje de sesiones completadas, y los días de la semana sin estudio (operaciones de sets).
- Argumentos de línea de comandos con `sys.argv` o `argparse`: la ruta del CSV y un filtro opcional `--modulo`.

## Qué hacer

1. Lee los requisitos y dibuja en papel el flujo: archivo → generator → filtros → agregaciones → impresión (10 min).
2. Genera `sesiones.csv` con datos variados, incluidas 3 filas inválidas a propósito (15 min).
3. Implementa `Sesion` y `leer_sesiones` y pruébalos en el REPL (40 min).
4. Implementa cada agregación como una función pura que recibe un iterable de `Sesion` y devuelve datos (no imprime) (50 min).
5. Implementa la CLI y la impresión del reporte; prueba con y sin `--modulo` (30 min).
6. Escribe 5 `assert` en un archivo `checks.py` que verifiquen las agregaciones con una lista pequeña hecha a mano (20 min).
7. Criterio de terminado: `python reporte.py sesiones.csv` imprime el reporte completo, las filas inválidas se reportan sin detener el programa y `python checks.py` termina sin errores. Haz commit en un repo propio de prácticas (15 min).

## Explícalo con tus palabras

Explica por qué `leer_sesiones` es un generator y qué pasaría con un CSV de 5 GB si fuera una función que devuelve una lista.
