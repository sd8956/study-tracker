---
title: Evaluación — Python Programmer
kind: evaluation
hours: 3
sources: Python Programmer (DataCamp), todo el track
links: Python Programmer (DataCamp) | https://app.datacamp.com/learn/career-tracks/python-programmer
---

## Objetivo

Comprobar que dominas eficiencia, Git, OOP intermedia, empaquetado, scraping, estructuras de datos y pruebas. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. Tienes dos listas de 100.000 correos y quieres los que están en ambas. Escribe la solución eficiente y su complejidad.
   R: `comunes = set(a) & set(b)`. Construir los sets es O(n + m) y la intersección O(min(n, m)) en promedio, frente a O(n·m) con bucles anidados.
2. ¿Qué diferencia hay entre `git merge` con fast-forward y con commit de merge?
   R: Fast-forward ocurre cuando la rama destino no avanzó: Git solo mueve el puntero y el historial queda lineal. Si ambas ramas avanzaron, Git crea un commit de merge con dos padres.
3. Implementa `__eq__` y `__hash__` en una clase `Punto(x, y)` para poder usarla en un set.
   R: Ambos métodos usan los mismos atributos:
   ```python
   class Punto:
       def __init__(self, x, y):
           self.x, self.y = x, y

       def __eq__(self, other):
           if not isinstance(other, Punto):
               return NotImplemented
           return (self.x, self.y) == (other.x, other.y)

       def __hash__(self):
           return hash((self.x, self.y))
   ```
4. ¿Qué pasa al instanciar una clase que hereda de una ABC sin implementar sus métodos abstractos?
   R: Python lanza `TypeError` al crear la instancia indicando los métodos abstractos que faltan.
5. ¿Qué contiene `pyproject.toml` y qué hace `pip install -e .`?
   R: Los metadatos del paquete (nombre, versión, dependencias, entry points y configuración de build). `pip install -e .` instala el paquete en modo editable, enlazado al código fuente.
6. Escribe un CSS locator y un XPath equivalentes para el texto de los `span` con clase `precio` dentro de `div.producto`.
   R: CSS: `div.producto span.precio::text`. XPath: `//div[contains(@class, "producto")]//span[contains(@class, "precio")]/text()`.
7. Escribe la búsqueda binaria iterativa en Python.
   R: Dos índices que se acercan hasta encontrar el objetivo o cruzarse:
   ```python
   def busqueda_binaria(xs, objetivo):
       lo, hi = 0, len(xs) - 1
       while lo <= hi:
           mid = (lo + hi) // 2
           if xs[mid] == objetivo:
               return mid
           if xs[mid] < objetivo:
               lo = mid + 1
           else:
               hi = mid - 1
       return -1
   ```
8. Compara merge sort y quicksort en complejidad, memoria y estabilidad.
   R: Merge sort: O(n log n) siempre, memoria extra O(n), estable. Quicksort: O(n log n) promedio y O(n²) en el peor caso, en el lugar (O(log n) de pila), normalmente no estable.
9. Escribe una fixture de pytest con teardown y explica cuándo se ejecuta cada parte.
   R: El código antes del `yield` corre antes de la prueba; el de después, al terminarla aunque falle:
   ```python
   @pytest.fixture
   def conexion():
       c = abrir_conexion()
       yield c
       c.close()
   ```
10. ¿Qué diferencia hay entre una prueba unitaria y una de integración? Da un ejemplo de cada una para `studylog`.
   R: La unitaria prueba una pieza aislada: que `racha_actual()` devuelva 3 con una lista de sesiones en memoria. La de integración prueba piezas juntas: ejecutar `studylog add` y luego `studylog list` sobre un archivo real en `tmp_path` y comprobar la salida.

## Explícalo con tus palabras

Explica en dos minutos cómo llevarías un script suelto a una herramienta profesional: Git, paquete, OOP, pruebas y medición de rendimiento.
