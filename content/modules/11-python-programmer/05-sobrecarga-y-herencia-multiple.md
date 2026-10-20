---
title: Sobrecarga de operadores y herencia múltiple
kind: course
hours: 2
sources: DataCamp — Intermediate Object-Oriented Programming in Python, cap. 1
links: Intermediate Object-Oriented Programming in Python (DataCamp) | https://www.datacamp.com/courses/intermediate-object-oriented-programming-in-python
---

## Objetivo

Sobrecargar operadores con métodos especiales y entender herencia múltiple y multinivel con el MRO.

## Qué hacer

1. Abre *Intermediate Object-Oriented Programming in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Overloading and Multiple Inheritance» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Métodos especiales (dunder)**: `__add__`, `__eq__`, `__lt__`, `__len__` definen cómo responde tu clase a `+`, `==`, `<`, `len()`.
- **Sobrecarga de operadores**: hacer que `v1 + v2` funcione para tu clase `Vector`.
- **Herencia multinivel**: `C(B)` y `B(A)`: C hereda de A a través de B.
- **Herencia múltiple**: `class C(A, B):` hereda de varias clases a la vez.
- **MRO**: Method Resolution Order: orden en que Python busca un método; se ve con `C.__mro__` o `C.mro()`.
- **super() cooperativo**: en herencia múltiple, `super()` llama a la siguiente clase del MRO, no necesariamente a la padre directa.

## Preguntas de repaso

1. ¿Qué método implementas para que `a + b` funcione con objetos de tu clase?
   R: `__add__(self, other)`, que devuelve un nuevo objeto con el resultado.
2. ¿Qué es el MRO y cómo lo consultas?
   R: Es el orden en que Python busca atributos y métodos en la jerarquía de clases. Se consulta con `Clase.__mro__` o `Clase.mro()`.
3. ¿Qué devuelve `__add__` si no sabe sumar con el tipo de `other` y por qué?
   R: `NotImplemented`, para que Python intente la operación reflejada (`other.__radd__`) o lance `TypeError` si nadie sabe sumar.

## Explícalo con tus palabras

Explica el MRO con la clásica herencia en diamante (A arriba, B y C en medio, D abajo).
