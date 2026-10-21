---
title: Buenas prácticas de funciones y decorators avanzados
kind: course
hours: 2
sources: DataCamp — Writing Functions in Python, caps. 1 y 4
links: Writing Functions in Python (DataCamp) | https://www.datacamp.com/courses/writing-functions-in-python
---

## Objetivo

Escribir funciones con docstrings, una sola responsabilidad y argumentos seguros, y escribir decorators que conservan metadatos y aceptan argumentos.

## Qué hacer

1. Abre *Writing Functions in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Best Practices» y el capítulo 4 «More on Decorators» (los capítulos 2 y 3 ya los hiciste en el módulo 10) (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Docstring**: describe qué hace la función, sus argumentos, lo que devuelve y lo que lanza; se lee con `help()` o `f.__doc__`.
- **DRY y Do One Thing**: no repetir código y que cada función haga una sola cosa: más fácil de probar y reutilizar.
- **Paso de argumentos**: Python pasa referencias: una función puede mutar un objeto mutable recibido (list, dict) pero no uno inmutable.
- **Default mutable**: usar `None` como valor por defecto y crear el objeto dentro.
- **functools.wraps**: copia nombre, docstring y firma de la función original al wrapper.
- **Decorator con argumentos**: una fábrica: función que recibe los argumentos y devuelve el decorator (tres niveles de funciones).
- **Usos reales**: medir tiempo, memoizar, reintentar, validar tipos, registrar llamadas, timeouts.

## Preguntas de repaso

1. ¿Qué problema aparece si un decorator no usa `functools.wraps`?
   R: La función decorada pierde su nombre, docstring y firma: `f.__name__` devuelve `'wrapper'`, `help(f)` muestra la documentación equivocada y las herramientas de depuración y pruebas se confunden.
2. Escribe un decorator `repetir(n)` que ejecute la función n veces.
   R: Tres niveles: la fábrica recibe `n`, el decorator recibe la función y el wrapper la ejecuta:
   ```python
   import functools

   def repetir(n):
       def decorator(func):
           @functools.wraps(func)
           def wrapper(*args, **kwargs):
               for _ in range(n):
                   resultado = func(*args, **kwargs)
               return resultado
           return wrapper
       return decorator
   ```
3. ¿Por qué una función que recibe una lista y le hace `append` cambia la lista de quien la llamó?
   R: Porque Python pasa la referencia al mismo objeto; `append` lo muta en el lugar. Si no quieres ese efecto, trabaja sobre una copia (`list(xs)`).
4. ¿Qué señales indican que una función debería dividirse?
   R: Que su nombre necesite «y», que tenga varios niveles de abstracción mezclados (leer archivo, calcular e imprimir), que sea difícil de probar o que tenga muchos parámetros.

## Explícalo con tus palabras

Explica por qué un decorator con argumentos necesita tres funciones anidadas, como si fueran tres cajas una dentro de otra.
