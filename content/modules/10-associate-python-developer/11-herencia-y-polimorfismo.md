---
title: Herencia, polimorfismo e integración con Python
kind: course
hours: 2
sources: DataCamp — Introduction to Object-Oriented Programming in Python, caps. 2–3
links: Introduction to Object-Oriented Programming in Python (DataCamp) | https://www.datacamp.com/courses/introduction-to-object-oriented-programming-in-python
---

## Objetivo

Usar atributos de clase, class methods, herencia y polimorfismo, implementar `__eq__`, `__str__` y `__repr__`, y crear excepciones propias.

## Qué hacer

1. Abre *Introduction to Object-Oriented Programming in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Inheritance and Polymorphism» y el capítulo 3 «Integrating with Standard Python» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Atributo de clase**: compartido por todas las instancias; se define en el cuerpo de la clase.
- **@classmethod**: recibe la clase (`cls`); se usa para constructores alternativos como `desde_texto()`.
- **Herencia**: `class Hija(Padre):` reutiliza y extiende; `super().__init__()` llama al constructor padre.
- **Polimorfismo**: objetos de clases distintas responden al mismo método, y el código que los usa no necesita saber cuál es.
- **__eq__**: define cuándo dos objetos son iguales con `==`.
- **__str__ vs __repr__**: `__str__` para el usuario final; `__repr__` para el desarrollador, idealmente reproducible.
- **Excepciones propias**: `class SaldoInsuficiente(Exception): pass` permite capturar errores específicos de tu dominio.

## Preguntas de repaso

1. ¿Qué diferencia hay entre un atributo de instancia y uno de clase?
   R: El de instancia pertenece a cada objeto (`self.saldo`); el de clase se comparte entre todas las instancias (`Cuenta.TASA = 0.02`). Si una instancia asigna el mismo nombre, crea un atributo propio que oculta el de clase.
2. ¿Para qué sirve un `@classmethod` como `Empleado.desde_csv(linea)`?
   R: Es un constructor alternativo: crea instancias a partir de otro formato de datos y, al recibir `cls`, también funciona en subclases.
3. ¿Qué devuelve `==` entre dos objetos de una clase sin `__eq__`?
   R: Compara identidad: solo es `True` si son el mismo objeto, aunque tengan los mismos atributos.
4. ¿Por qué crear `class SaldoInsuficiente(ValueError)` en lugar de lanzar `ValueError` directamente?
   R: Porque quien llama puede capturar ese error en particular sin atrapar otros `ValueError`, y el nombre documenta qué falló. Al heredar de `ValueError` sigue siendo capturable por código genérico.

## Explícalo con tus palabras

Explica polimorfismo con el ejemplo de un método `area()` en `Circulo` y `Rectangulo`, y por qué el código que suma áreas no necesita `if`.
