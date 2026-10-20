---
title: Evaluación — Python for Software Engineering
kind: evaluation
hours: 3
sources: Python for Software Engineering (DataCamp), todo el track
links: Python for Software Engineering (DataCamp) | https://app.datacamp.com/learn/skill-tracks/python-for-software-engineering
---

## Objetivo

Evaluación integradora del track completo, incluidos los cursos que completaste en módulos anteriores. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. ¿Qué imprime este código? `def f(xs): xs = xs + [1]` seguido de `a = []; f(a); print(a)`.
   R: `[]`. `xs + [1]` crea una lista nueva y la asigna a la variable local `xs`; la lista original no se modifica. Con `xs.append(1)` sí cambiaría.
2. Escribe un decorator `reintentar(veces)` que reintente la función si lanza una excepción y relance la última.
   R: Fábrica con el número de intentos; el último error se relanza:
   ```python
   import functools

   def reintentar(veces):
       def decorator(func):
           @functools.wraps(func)
           def wrapper(*args, **kwargs):
               for intento in range(veces):
                   try:
                       return func(*args, **kwargs)
                   except Exception:
                       if intento == veces - 1:
                           raise
           return wrapper
       return decorator
   ```
3. ¿Qué hace `functools.wraps` y por qué importa en pruebas y depuración?
   R: Copia `__name__`, `__doc__`, `__module__` y `__wrapped__` de la función original al wrapper; sin él, los mensajes de error, `help()` y los reportes de pruebas muestran `wrapper` en lugar del nombre real.
4. Escribe un context manager de clase (con `__enter__` y `__exit__`) que cambie el directorio de trabajo y lo restaure.
   R: `__exit__` se ejecuta siempre, también si hubo excepción:
   ```python
   import os

   class EnDirectorio:
       def __init__(self, ruta):
           self.ruta = ruta

       def __enter__(self):
           self.anterior = os.getcwd()
           os.chdir(self.ruta)

       def __exit__(self, exc_type, exc, tb):
           os.chdir(self.anterior)
           return False
   ```
5. ¿Qué diferencia hay entre `@classmethod` y `@staticmethod`?
   R: El classmethod recibe la clase (`cls`) y sirve para constructores alternativos que funcionan en subclases; el staticmethod no recibe ni instancia ni clase: es una función agrupada en la clase por organización.
6. ¿Qué es una interfaz formal en Python y cómo la defines?
   R: Un contrato explícito de métodos. Se define con una ABC (`class Repo(ABC)` con `@abstractmethod`) que impide instanciar implementaciones incompletas, o con `typing.Protocol` para tipado estructural verificado por `mypy`.
7. ¿Cuál es la complejidad de buscar en un dict y en una list, y por qué?
   R: Dict: O(1) promedio, porque calcula el hash de la clave y va directo a su posición. List: O(n), porque compara elemento por elemento.
8. ¿Por qué el vectorizado de pandas gana a `apply` con `axis=1`?
   R: Porque `apply` llama a una función de Python por cada fila, con el costo del intérprete en cada llamada; la operación vectorizada se ejecuta en C sobre arrays completos.
9. Escribe una prueba de pytest parametrizada para `es_par(n)` con tres casos.
   R: `parametrize` ejecuta la misma prueba con cada tupla:
   ```python
   import pytest

   @pytest.mark.parametrize("n, esperado", [(2, True), (3, False), (0, True)])
   def test_es_par(n, esperado):
       assert es_par(n) == esperado
   ```
10. ¿Qué beneficio concreto da tener pruebas antes de refactorizar?
   R: Permiten cambiar la estructura del código con la seguridad de que el comportamiento observable no cambió: si una prueba falla, el refactor introdujo una regresión y lo sabes de inmediato.

## Explícalo con tus palabras

Explica en dos minutos qué diferencia a un script que funciona de software mantenible, usando ejemplos de tu refactor de `studylog`.
