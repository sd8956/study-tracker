---
title: Fixtures de pytest
kind: course
hours: 2
sources: DataCamp — Introduction to Testing in Python, cap. 2
links: Introduction to Testing in Python (DataCamp) | https://www.datacamp.com/courses/introduction-to-testing-in-python
---

## Objetivo

Reutilizar la preparación de pruebas con `@pytest.fixture`, encadenar fixtures y limpiar recursos con teardown.

## Qué hacer

1. Abre *Introduction to Testing in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Pytest Fixtures» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Fixture**: función decorada con `@pytest.fixture` que prepara datos o recursos; las pruebas la reciben como parámetro.
- **Encadenar fixtures**: una fixture puede recibir otras fixtures.
- **Teardown con yield**: lo que va después del `yield` en la fixture se ejecuta al terminar la prueba.
- **autouse**: `@pytest.fixture(autouse=True)` se aplica a todas las pruebas sin pedirla.
- **Scope**: `function` (por defecto), `module`, `session`: cada cuánto se recrea.
- **tmp_path**: fixture incluida que da un directorio temporal único por prueba.

## Preguntas de repaso

1. Escribe una fixture que cree un archivo temporal con datos y lo borre al final.
   R: Lo anterior al `yield` prepara y lo posterior limpia:
   ```python
   import pytest

   @pytest.fixture
   def archivo(tmp_path):
       ruta = tmp_path / "datos.csv"
       ruta.write_text("a,b\n1,2\n")
       yield ruta
       ruta.unlink(missing_ok=True)
   ```
2. ¿Qué ventaja tienen las fixtures frente a copiar el setup en cada prueba?
   R: El setup vive en un solo lugar, las pruebas quedan cortas y enfocadas, y el teardown se garantiza aunque la prueba falle.
3. ¿Cuándo usarías `scope='session'`?
   R: Para recursos caros de crear y seguros de compartir entre pruebas, como una conexión a una base de datos de pruebas de solo lectura.

## Explícalo con tus palabras

Explica fixture y teardown con la preparación y limpieza de una cocina antes y después de cada receta.
