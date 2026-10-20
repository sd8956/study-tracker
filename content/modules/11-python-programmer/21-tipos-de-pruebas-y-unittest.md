---
title: Tipos de pruebas y unittest
kind: course
hours: 2
sources: DataCamp — Introduction to Testing in Python, caps. 3–4
links: Introduction to Testing in Python (DataCamp) | https://www.datacamp.com/courses/introduction-to-testing-in-python
---

## Objetivo

Distinguir pruebas unitarias, de feature, de integración y de rendimiento, y escribir pruebas con `unittest`, sus aserciones y sus fixtures.

## Qué hacer

1. Abre *Introduction to Testing in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Basic Testing Types» y el capítulo 4 «Writing tests with unittest» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Unit test**: prueba una unidad (función o clase) aislada.
- **Feature test**: prueba un comportamiento completo desde el punto de vista del usuario.
- **Integration test**: prueba que varias piezas funcionan juntas (código + base de datos).
- **Performance test**: mide tiempo o recursos; con pytest se usa `pytest-benchmark`.
- **unittest.TestCase**: clase con métodos `test_*` y aserciones como `assertEqual`, `assertIn`, `assertRaises`.
- **setUp / tearDown**: fixtures de unittest que se ejecutan antes y después de cada prueba.

## Preguntas de repaso

1. ¿Qué diferencia hay entre una prueba unitaria y una de integración?
   R: La unitaria prueba una pieza aislada, rápida y sin dependencias externas; la de integración prueba la colaboración entre piezas reales (por ejemplo tu función y una base de datos) y detecta errores en las conexiones.
2. ¿Cómo escribes en unittest que `f(2)` debe devolver 4?
   R: Dentro de una clase que hereda de `unittest.TestCase`: `self.assertEqual(f(2), 4)`.
3. ¿Por qué conviene tener más pruebas unitarias que de integración?
   R: Porque son rápidas, estables y señalan exactamente qué falló; las de integración son más lentas y frágiles, así que se reservan para las conexiones críticas (pirámide de pruebas).

## Explícalo con tus palabras

Explica la pirámide de pruebas con el ejemplo de construir un auto: probar piezas, sistemas y el auto completo.
