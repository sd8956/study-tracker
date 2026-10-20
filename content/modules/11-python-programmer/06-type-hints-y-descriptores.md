---
title: Type hints, acceso a atributos, descriptores e iteradores propios
kind: course
hours: 2
sources: DataCamp — Intermediate Object-Oriented Programming in Python, cap. 2
links: Intermediate Object-Oriented Programming in Python (DataCamp) | https://www.datacamp.com/courses/intermediate-object-oriented-programming-in-python
---

## Objetivo

Anotar tipos, controlar el acceso a atributos con métodos especiales y `@property`, escribir descriptores y hacer tus clases iterables.

## Qué hacer

1. Abre *Intermediate Object-Oriented Programming in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Custom Class Features and Type Hints» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Type hints**: `def f(x: int) -> str:` documentan tipos; Python no los aplica, pero `mypy` y los editores los verifican.
- **@property**: expone un método como atributo y permite validar en el setter.
- **__getattr__, __setattr__, __delattr__**: interceptan lectura (cuando el atributo no existe), asignación y borrado.
- **Descriptor**: objeto con `__get__`/`__set__` que controla un atributo de clase; `property` es un descriptor.
- **Iterador propio**: implementar `__iter__` (devuelve el iterador) y `__next__` (lanza `StopIteration` al final).

## Preguntas de repaso

1. ¿Python lanza error si pasas un `str` a `def f(x: int)`?
   R: No. Los type hints no se verifican en ejecución; los detecta un verificador estático como `mypy` o el editor.
2. Escribe una propiedad `edad` que rechace valores negativos.
   R: Un getter con `@property` y un setter que valida:
   ```python
   class Persona:
       @property
       def edad(self):
           return self._edad

       @edad.setter
       def edad(self, valor):
           if valor < 0:
               raise ValueError("edad negativa")
           self._edad = valor
   ```
3. ¿Qué métodos necesita una clase para usarse en un `for`?
   R: `__iter__`, que devuelve un iterador; el iterador implementa `__next__` y lanza `StopIteration` cuando no hay más elementos. Lo más simple es que `__iter__` sea una generator function con `yield`.

## Explícalo con tus palabras

Explica qué gana una clase al usar `@property` en lugar de métodos `get_edad()`/`set_edad()`.
