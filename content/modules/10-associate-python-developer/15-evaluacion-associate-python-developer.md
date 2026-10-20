---
title: Evaluación — Associate Python Developer
kind: evaluation
hours: 3
sources: Associate Python Developer (DataCamp), elementos nuevos del track
links: Associate Python Developer (DataCamp) | https://app.datacamp.com/learn/career-tracks/associate-python-developer
---

## Objetivo

Comprobar que dominas fechas, context managers, decorators, regex, OOP y la terminal. Hazla como un examen: 3 horas, sin DataCamp, sin notas y sin buscar en internet. Primero responde todas las preguntas por escrito (o en un archivo `.py`/`.sql` cuando pidan código) durante unas 2 horas. Luego usa el tutor de la app para calificar cada respuesta contra la respuesta modelo, y dedica la última hora a repasar en DataCamp los capítulos donde fallaste.

## Preguntas de evaluación

1. ¿Qué devuelve `datetime(2026, 3, 1) - datetime(2026, 2, 1)` y cómo obtienes los días?
   R: Un `timedelta` de 28 días; los obtienes con `.days` → `28`.
2. Explica naive vs aware y cómo conviertes un datetime aware de UTC a la hora de Bogotá.
   R: Naive no tiene zona horaria; aware sí (`tzinfo`). Con `from zoneinfo import ZoneInfo`, `dt_utc.astimezone(ZoneInfo('America/Bogota'))` convierte el mismo instante a la hora local.
3. Escribe un decorator `contar_llamadas` que guarde en `wrapper.llamadas` cuántas veces se llamó la función.
   R: Un wrapper que incrementa un atributo propio antes de delegar:
   ```python
   import functools

   def contar_llamadas(func):
       @functools.wraps(func)
       def wrapper(*args, **kwargs):
           wrapper.llamadas += 1
           return func(*args, **kwargs)
       wrapper.llamadas = 0
       return wrapper
   ```
4. ¿Qué garantiza un context manager que no garantiza abrir y cerrar a mano un archivo?
   R: Que la limpieza (cerrar el archivo) se ejecuta siempre, incluso si el bloque lanza una excepción, porque `__exit__` (o el `finally` tras el `yield`) se ejecuta al salir del `with` por cualquier camino.
5. Escribe una regex con grupos con nombre que extraiga año, mes y día de '2026-10-20'.
   R: `re.match(r'(?P<anio>\d{4})-(?P<mes>\d{2})-(?P<dia>\d{2})', texto)` y luego `m.group('anio')`, etc.
6. ¿Qué imprime `re.findall(r'a.*?b', 'aXb aYYb')`?
   R: `['aXb', 'aYYb']`: el cuantificador lazy cierra la coincidencia en la primera `b` posible.
7. Diseña una clase `Tarea` con título y estado, un método `completar()` y un `__repr__` útil.
   R: Atributos en `__init__`, un método que cambia estado y un `__repr__` reproducible:
   ```python
   class Tarea:
       def __init__(self, titulo, hecha=False):
           self.titulo = titulo
           self.hecha = hecha

       def completar(self):
           self.hecha = True

       def __repr__(self):
           return f"Tarea({self.titulo!r}, hecha={self.hecha})"
   ```
8. ¿Qué hace `super().__init__(nombre)` dentro del `__init__` de una subclase?
   R: Llama al constructor de la clase padre para que inicialice su parte del estado; luego la subclase agrega sus propios atributos.
9. Escribe un comando de shell que cuente cuántas líneas de todos los `.log` del directorio contienen 'ERROR'.
   R: `cat *.log | grep -c ERROR` (o `grep -h ERROR *.log | wc -l`).
10. ¿Qué diferencia hay entre `>` y `>>` en la shell?
   R: `>` crea o sobrescribe el archivo con la salida; `>>` agrega la salida al final sin borrar lo que había.

## Explícalo con tus palabras

Explica en dos minutos cómo combinarías regex, datetime y una clase para procesar un archivo de logs.
