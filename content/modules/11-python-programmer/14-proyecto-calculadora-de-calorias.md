---
title: Proyecto — calculadora de ingesta de calorías
kind: project
hours: 3
sources: DataCamp — proyecto Building a Calorie Intake Calculator
links: Building a Calorie Intake Calculator (proyecto DataCamp) | https://www.datacamp.com/projects/2406
---

## Objetivo

Completar el proyecto de DataCamp (una función que calcula calorías y nutrientes a partir de lo que ingresa el usuario) y convertirlo en un pequeño paquete probado y versionado con Git.

## Qué hacer

1. Haz el proyecto en DataCamp (~30 min).
2. Crea un repo con Git y una estructura de paquete (`src/calorias/`, `tests/`, `pyproject.toml`); haz el primer commit (20 min).
3. Refactoriza la solución con OOP: una clase `Alimento` (dataclass) y una clase `Registro` con métodos para agregar porciones y obtener totales; agrega type hints (40 min).
4. Valida entradas: porciones negativas o alimentos desconocidos lanzan excepciones propias (15 min).
5. Escribe pruebas con pytest para totales, validaciones y un caso límite (registro vacío) (35 min).
6. Mide con `timeit` el cálculo de totales con 100.000 porciones y optimízalo si hace falta (20 min).
7. Criterio de terminado: `pip install -e .` funciona, `pytest` pasa y el historial de Git tiene al menos cuatro commits con mensajes claros (20 min).

## Explícalo con tus palabras

Explica qué cambió al pasar de una función de DataCamp a un paquete con clases, pruebas e historial de Git.
