---
title: Del código suelto a un paquete local
kind: course
hours: 2
sources: DataCamp — Developing Python Packages, cap. 1
links: Developing Python Packages (DataCamp) | https://www.datacamp.com/courses/developing-python-packages
---

## Objetivo

Convertir scripts en un paquete con estructura de directorios, `__init__.py`, módulos y subpaquetes, y escribir documentación con docstrings.

## Qué hacer

1. Abre *Developing Python Packages* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «From Loose Code to Local Package» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Script, módulo, paquete**: un script se ejecuta; un módulo se importa; un paquete es un directorio de módulos.
- **__init__.py**: marca un directorio como paquete y define qué se expone al importar.
- **Imports absolutos y relativos**: `from mipaquete.utils import f` vs `from .utils import f`.
- **Docstrings**: documentan módulos, clases y funciones; estilos comunes: Google, NumPy, reStructuredText.
- **pyment / herramientas**: generan esqueletos de docstrings.

## Preguntas de repaso

1. ¿Qué diferencia hay entre un módulo y un paquete?
   R: Un módulo es un archivo `.py`; un paquete es un directorio que agrupa módulos (y subpaquetes) y se importa como una unidad.
2. ¿Para qué sirve importar funciones dentro de `__init__.py`?
   R: Para que el usuario pueda escribir `from mipaquete import f` en lugar de conocer la estructura interna `mipaquete.sub.modulo.f`.
3. ¿Cuándo usarías un import relativo?
   R: Dentro de un paquete, para importar módulos hermanos sin depender del nombre del paquete raíz.

## Explícalo con tus palabras

Explica a alguien que tiene diez scripts sueltos por qué le conviene convertirlos en un paquete.
