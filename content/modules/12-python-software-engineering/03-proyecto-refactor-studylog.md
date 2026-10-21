---
title: Proyecto — refactorizar studylog con prácticas de ingeniería de software
kind: project
hours: 3
sources: Proyecto propio sobre Python for Software Engineering
links: PEP 8 | https://peps.python.org/pep-0008/ ; mypy | https://mypy.readthedocs.io/en/stable/
---

## Objetivo

Aplicar todo el track (buenas prácticas de funciones, decorators, context managers, OOP, type hints, pruebas y eficiencia) para refactorizar la CLI `studylog` del módulo 11 sin cambiar su comportamiento.

## Qué hacer

1. Corre las pruebas existentes y confirma que pasan: son tu red de seguridad. Si falta cobertura en algún comando, agrega pruebas antes de tocar el código (30 min).
2. Revisa cada función: docstring estilo Google, una sola responsabilidad, sin defaults mutables. Divide las que hagan más de una cosa (35 min).
3. Agrega type hints completos y ejecuta `mypy --strict` sobre el paquete hasta dejarlo sin errores (35 min).
4. Escribe un decorator `@medir` con `functools.wraps` que, con la variable de entorno `STUDYLOG_DEBUG=1`, imprima en `stderr` el tiempo de cada comando (20 min).
5. Convierte la apertura del archivo JSON en un context manager que escriba de forma atómica (escribe a un temporal y renombra con `os.replace`) (25 min).
6. Agrega un comando `studylog report --csv` que use pandas vectorizado para horas por semana y tema; mide la diferencia frente a un bucle (25 min).
7. Criterio de terminado: todas las pruebas anteriores siguen pasando sin modificarlas, `mypy --strict` y `flake8` pasan, y el decorator y el context manager tienen sus propias pruebas (10 min).

## Explícalo con tus palabras

Explica por qué escribiste o revisaste las pruebas antes de refactorizar y qué habría pasado si no.
