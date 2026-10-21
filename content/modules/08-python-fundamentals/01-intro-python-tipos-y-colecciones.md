---
title: Introducción a Python y estructuras de datos
kind: course
hours: 2
sources: DataCamp — Introduction to Python for Developers, caps. 1–2
links: Introduction to Python for Developers (DataCamp) | https://www.datacamp.com/courses/introduction-to-python-for-developers
---

## Objetivo

Ejecutar código Python, usar variables y tipos básicos, y elegir entre list, dict, set y tuple según lo que necesitas guardar.

## Qué hacer

1. Abre *Introduction to Python for Developers* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Introduction to Python» y el capítulo 2 «Working with Data Types» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Tipado dinámico**: las variables no declaran tipo; el tipo lo tiene el valor y se puede consultar con `type()`.
- **str, int, float, bool**: los tipos escalares básicos; las operaciones entre ellos no se convierten solas (`'3' + 4` lanza `TypeError`).
- **list**: secuencia ordenada y mutable, con índices desde 0 y slicing `[inicio:fin]` donde `fin` no se incluye.
- **dict**: pares clave-valor con búsqueda rápida por clave; las claves deben ser inmutables (hashable).
- **set**: colección sin orden ni duplicados; ideal para pertenencia (`in`) y operaciones de conjuntos.
- **tuple**: secuencia ordenada e inmutable; sirve para registros fijos y como clave de dict.

## Preguntas de repaso

1. ¿Qué diferencia práctica hay entre una list y una tuple, y cuándo usarías cada una?
   R: La list es mutable (puedes agregar, quitar o cambiar elementos) y la tuple es inmutable. Usas list para colecciones que cambian (por ejemplo, tareas pendientes) y tuple para registros fijos (por ejemplo, coordenadas `(lat, lon)`) o cuando necesitas usarla como clave de un dict.
2. ¿Qué devuelve `nums[1:3]` si `nums = [10, 20, 30, 40]`?
   R: `[20, 30]`: el slicing incluye el índice inicial (1) y excluye el final (3).
3. Tienes una lista de correos con repetidos y quieres saber cuántos únicos hay. ¿Qué estructura usas y cómo?
   R: Un set, porque elimina duplicados: `len(set(correos))`.
4. ¿Cómo lees un valor de un dict sin que falle si la clave no existe?
   R: Con `d.get(clave)` (devuelve `None`) o `d.get(clave, valor_por_defecto)`. `d[clave]` lanza `KeyError` si la clave no existe.

## Explícalo con tus palabras

Explica a alguien que solo sabe TypeScript cómo se mapean `Array`, `Object`/`Map`, `Set` y una tupla de TS a las estructuras de Python, y en qué se diferencian.
