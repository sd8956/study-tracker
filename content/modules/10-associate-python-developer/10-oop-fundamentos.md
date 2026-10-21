---
title: Fundamentos de programación orientada a objetos
kind: course
hours: 2
sources: DataCamp — Introduction to Object-Oriented Programming in Python, cap. 1
links: Introduction to Object-Oriented Programming in Python (DataCamp) | https://www.datacamp.com/courses/introduction-to-object-oriented-programming-in-python
---

## Objetivo

Entender en qué se diferencia la programación orientada a objetos de la procedural y crear clases con atributos, métodos y constructor.

## Qué hacer

1. Abre *Introduction to Object-Oriented Programming in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «OOP Fundamentals» (~70 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Escribe en tu máquina una clase `Temporizador` con constructor, dos atributos y dos métodos, sin mirar el curso (15 min).
4. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
5. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Clase y objeto**: la clase es el molde; cada objeto (instancia) tiene su propio estado.
- **Atributos y métodos**: datos y comportamiento del objeto; `dir(obj)` los lista.
- **self**: referencia a la instancia actual; es el primer parámetro de los métodos de instancia.
- **__init__**: constructor que inicializa los atributos al crear el objeto.
- **Encapsulamiento**: agrupar datos y las funciones que los modifican en una sola unidad.

## Preguntas de repaso

1. ¿Qué es `self` y por qué es el primer parámetro de los métodos?
   R: Es la instancia sobre la que se llama el método. Python lo pasa automáticamente: `cuenta.depositar(10)` equivale a `Cuenta.depositar(cuenta, 10)`.
2. ¿Por qué conviene definir todos los atributos en `__init__`?
   R: Para que todo objeto recién creado tenga un estado completo y válido, y para que quien lea la clase vea en un solo lugar qué datos maneja.
3. ¿Qué ventaja tiene una clase `CuentaBancaria` sobre un dict con funciones sueltas?
   R: Agrupa el estado (saldo) con las operaciones que lo cambian (depositar, retirar) y permite proteger reglas como «no retirar más del saldo» en un solo lugar.

## Explícalo con tus palabras

Explica la diferencia entre una clase y un objeto usando un molde de galletas y las galletas.
