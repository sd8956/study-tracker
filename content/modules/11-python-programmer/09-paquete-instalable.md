---
title: Paquete instalable — dependencias, licencias y PyPI
kind: course
hours: 2
sources: DataCamp — Developing Python Packages, cap. 2
links: Developing Python Packages (DataCamp) | https://www.datacamp.com/courses/developing-python-packages
---

## Objetivo

Hacer el paquete instalable con pip, declarar dependencias, escribir README y licencia, y publicarlo en PyPI.

## Qué hacer

1. Abre *Developing Python Packages* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Install Your Package from Anywhere» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **setup.py / pyproject.toml**: metadatos del paquete: nombre, versión, autor, dependencias; `pyproject.toml` es el estándar moderno.
- **pip install -e .**: instalación editable: los cambios del código se reflejan sin reinstalar.
- **install_requires vs requirements.txt**: rangos de dependencias del paquete vs versiones exactas para reproducir un entorno.
- **README y LICENSE**: explican uso y condiciones legales; sin licencia, nadie puede reutilizar legalmente.
- **sdist y wheel**: distribución de código fuente y distribución precompilada.
- **twine y TestPyPI**: suben el paquete; TestPyPI sirve para practicar.

## Preguntas de repaso

1. ¿Qué hace `pip install -e .` y cuándo lo usas?
   R: Instala el paquete en modo editable, enlazando al código fuente; lo usas mientras desarrollas para probar cambios sin reinstalar.
2. ¿Por qué en `install_requires` conviene usar rangos (`requests>=2.28`) y no versiones fijas?
   R: Porque tu paquete convive con otros en el entorno del usuario; versiones fijas provocan conflictos de dependencias. Las versiones exactas van en `requirements.txt` para reproducir un entorno de desarrollo.
3. ¿Qué diferencia hay entre una sdist y una wheel?
   R: La sdist contiene el código fuente y se construye al instalar; la wheel es un paquete ya construido que se instala más rápido.

## Explícalo con tus palabras

Explica el camino completo desde tu carpeta local hasta que otra persona hace `pip install tu-paquete`.
