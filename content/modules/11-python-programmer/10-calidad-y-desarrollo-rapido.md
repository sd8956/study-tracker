---
title: Calidad del paquete y desarrollo rápido
kind: course
hours: 2
sources: DataCamp — Developing Python Packages, caps. 3–4
links: Developing Python Packages (DataCamp) | https://www.datacamp.com/courses/developing-python-packages
---

## Objetivo

Probar el paquete con pytest, verificar varias versiones de Python con tox, revisar estilo con flake8, y acelerar con cookiecutter y Makefiles.

## Qué hacer

1. Abre *Developing Python Packages* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Increasing Your Package Quality» y el capítulo 4 «Rapid Package Development» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **pytest**: framework de pruebas; los tests van en `tests/` y las funciones empiezan por `test_`.
- **tox**: crea entornos con varias versiones de Python y ejecuta las pruebas en cada uno.
- **flake8 y PEP 8**: linter que señala problemas de estilo; `# noqa` silencia una línea concreta.
- **cookiecutter**: genera la estructura completa de un paquete desde una plantilla.
- **Makefile**: atajos como `make test`, `make dist` para tareas repetitivas.
- **CHANGELOG, CONTRIBUTING, badges**: archivos que ayudan a usuarios y colaboradores.
- **Versionado semántico**: MAYOR.MENOR.PARCHE: cambios incompatibles, nuevas funciones compatibles, correcciones.

## Preguntas de repaso

1. ¿Qué problema resuelve tox?
   R: Verificar que el paquete funciona en varias versiones de Python (y con distintas dependencias) sin crear esos entornos a mano.
2. Si corriges un bug sin cambiar la API, ¿qué parte de la versión 1.4.2 cambias?
   R: El parche: pasa a 1.4.3.
3. ¿Qué ventaja tiene empezar un paquete con cookiecutter?
   R: Obtienes de una vez una estructura estándar (setup, tests, licencia, README, configuración de herramientas) sin errores de copia y pega.

## Explícalo con tus palabras

Explica qué significa que un paquete sea «de calidad profesional» enumerando las herramientas del capítulo y qué riesgo cubre cada una.
