---
title: Proyecto — herramienta de línea de comandos con pruebas
kind: project
hours: 3
sources: Proyecto propio sobre Python Programmer
links: argparse (documentación) | https://docs.python.org/3/library/argparse.html ; pytest (documentación) | https://docs.pytest.org/en/stable/
---

## Objetivo

Construir y empaquetar una CLI real, `studylog`, que registre y consulte tus sesiones de estudio en un archivo JSON, con pruebas, Git y buenas prácticas de los cursos del track.

## Estudio

### Comandos

```
studylog add --tema "regex" --minutos 90 [--fecha 2026-10-20]
studylog list [--desde 2026-10-01] [--tema regex]
studylog stats            # horas totales, por tema y racha actual de días
studylog export --csv salida.csv
```

### Requisitos técnicos

- Paquete con `pyproject.toml` y un entry point `studylog`.
- OOP: una dataclass `Sesion` y una clase `Repositorio` (interfaz con `ABC`) con una implementación `RepositorioJson`; así podrías agregar `RepositorioSqlite` sin tocar la CLI.
- Fechas con `datetime`; validación de `--fecha` con mensaje claro.
- El archivo JSON vive en una ruta configurable por la variable de entorno `STUDYLOG_PATH`.
- Pruebas con pytest: unitarias para `stats` (incluida la racha), y de integración que ejecutan la CLI sobre `tmp_path`.

## Qué hacer

1. Crea el repo, la estructura del paquete y la ABC `Repositorio` (25 min).
2. Implementa `add` y `list` con `argparse` y `RepositorioJson` (40 min).
3. Implementa `stats` como funciones puras y pruébalas primero (escribe la prueba de la racha antes del código) (40 min).
4. Implementa `export` y las validaciones de errores (fecha inválida, minutos negativos) con códigos de salida distintos de 0 (25 min).
5. Escribe pruebas de integración con `tmp_path` y `monkeypatch.setenv('STUDYLOG_PATH', ...)` (30 min).
6. Mide con `timeit` `stats` sobre 50.000 sesiones sintéticas y optimiza si tarda más de un segundo (10 min).
7. Criterio de terminado: `pip install -e .` deja disponible `studylog`, `pytest` pasa, `flake8` no reporta errores y el repo tiene commits pequeños con mensajes claros (10 min).

## Explícalo con tus palabras

Explica por qué definiste `Repositorio` como una ABC y qué te permite cambiar mañana sin tocar la CLI ni las pruebas de `stats`.
