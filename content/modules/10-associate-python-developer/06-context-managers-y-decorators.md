---
title: Context managers y decorators
kind: course
hours: 2
sources: DataCamp — Writing Functions in Python, caps. 2–3
links: Writing Functions in Python (DataCamp) | https://www.datacamp.com/courses/writing-functions-in-python
---

## Objetivo

Usar y escribir context managers con `contextlib`, y entender funciones como objetos, scope, closures y decorators.

## Qué hacer

1. Abre *Writing Functions in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Context Managers» y el capítulo 3 «Decorators» (el track solo incluye estos dos capítulos) (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Context manager**: objeto que prepara y limpia un recurso alrededor de un bloque `with` (abrir y cerrar un archivo o una conexión).
- **@contextlib.contextmanager**: convierte una generator function en context manager: lo anterior al `yield` es el setup y lo posterior el teardown.
- **try/finally en el context manager**: garantiza la limpieza aunque el bloque `with` lance una excepción.
- **Funciones como objetos**: se pueden asignar, pasar como argumento y devolver desde otra función.
- **Scope LEGB**: Local, Enclosing, Global, Built-in; `nonlocal` y `global` permiten reasignar fuera del scope local.
- **Closure**: función interna que recuerda variables del scope que la creó (`__closure__`).
- **Decorator**: función que recibe una función y devuelve otra que la envuelve; `@deco` es azúcar para `f = deco(f)`.

## Preguntas de repaso

1. Escribe un context manager con `contextlib` que mida y muestre cuánto tardó un bloque.
   R: Lo anterior al `yield` es el setup y el `finally` garantiza el teardown:
   ```python
   import time
   from contextlib import contextmanager

   @contextmanager
   def cronometro():
       inicio = time.perf_counter()
       try:
           yield
       finally:
           print(f"{time.perf_counter() - inicio:.3f}s")
   ```
2. ¿Qué es una closure y por qué los decorators dependen de ellas?
   R: Una closure es una función interna que conserva acceso a variables del scope donde se creó, incluso después de que la función externa terminó. El decorator devuelve un `wrapper` que es una closure: recuerda la función original para llamarla.
3. ¿Qué equivale a escribir `@registrar` encima de `def saludar(): ...`?
   R: A `saludar = registrar(saludar)`.
4. ¿Por qué el `yield` de un context manager debe ir dentro de `try/finally`?
   R: Porque si el bloque `with` lanza una excepción, sin `finally` el código de limpieza no se ejecuta y el recurso (archivo, conexión) queda abierto.

## Explícalo con tus palabras

Explica un decorator como un envoltorio de regalo: qué es el regalo, qué agrega el envoltorio y por qué quien lo recibe sigue usándolo igual.
