---
title: Escribir un paquete de Python
kind: course
hours: 2
sources: DataCamp — Software Engineering Principles in Python, cap. 2
links: Software Engineering Principles in Python (DataCamp) | https://www.datacamp.com/courses/software-engineering-principles-in-python
---

## Objetivo

Construir un paquete mínimo instalable, agregar funcionalidad, hacerlo portable y declarar dependencias con `requirements.txt` y `setup.py`.

## Qué hacer

1. Abre *Software Engineering Principles in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Writing a Python Module» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Paquete mínimo**: un directorio con `__init__.py`.
- **Nombres de paquetes**: minúsculas, cortos, preferiblemente sin guiones bajos (PEP 8).
- **requirements.txt**: dependencias para reproducir el entorno; `pip install -r requirements.txt`.
- **setup.py / pyproject.toml**: hace el paquete instalable con pip y declara `install_requires`.
- **Portabilidad**: el paquete no depende de rutas ni configuraciones de tu máquina.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `requirements.txt` e `install_requires`?
   R: `requirements.txt` fija el entorno de desarrollo o despliegue (a menudo versiones exactas); `install_requires` declara lo mínimo que el paquete necesita para funcionar, con rangos compatibles.
2. ¿Qué hace que un paquete no sea portable?
   R: Rutas absolutas de tu máquina, dependencias no declaradas, configuración o claves embebidas en el código, o suponer un sistema operativo concreto.
3. ¿Cómo expones una función del paquete para importarla directamente desde su raíz?
   R: Importándola en el `__init__.py` del paquete: `from .utils import contar_palabras`.

## Explícalo con tus palabras

Explica qué necesita mínimamente un directorio para convertirse en un paquete instalable que otra persona pueda usar.
