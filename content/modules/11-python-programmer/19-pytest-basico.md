---
title: Crear pruebas con pytest
kind: course
hours: 2
sources: DataCamp — Introduction to Testing in Python, cap. 1
links: Introduction to Testing in Python (DataCamp) | https://www.datacamp.com/courses/introduction-to-testing-in-python
---

## Objetivo

Escribir y ejecutar pruebas con pytest, usar su CLI y marcar pruebas para saltarlas o esperar que fallen.

## Qué hacer

1. Abre *Introduction to Testing in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Creating Tests with pytest» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Prueba con assert**: una función `test_algo()` que usa `assert`; pytest muestra el detalle de la diferencia.
- **Descubrimiento**: pytest encuentra archivos `test_*.py` y funciones `test_*`.
- **CLI**: `pytest -k nombre` filtra, `-x` para al primer fallo, `-v` detalla.
- **pytest.raises**: verifica que se lanza una excepción: `with pytest.raises(ValueError):`.
- **Marcadores**: `@pytest.mark.skip`, `skipif(condición)` y `xfail` para fallos esperados.

## Preguntas de repaso

1. ¿Cómo pruebas que `dividir(1, 0)` lanza `ZeroDivisionError`?
   R: `with pytest.raises(ZeroDivisionError): dividir(1, 0)`.
2. ¿Para qué sirve `@pytest.mark.xfail`?
   R: Para marcar una prueba que se espera que falle (un bug conocido o algo no implementado) sin romper la suite; si empieza a pasar, pytest lo reporta.
3. ¿Cómo ejecutas solo las pruebas cuyo nombre contiene 'fecha'?
   R: `pytest -k fecha`.

## Explícalo con tus palabras

Explica por qué una prueba automática vale más que probar a mano en el REPL cada vez que cambias el código.
