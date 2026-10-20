---
title: Funciones propias, lambdas y manejo de errores
kind: course
hours: 2
sources: DataCamp — Intermediate Python for Developers, caps. 2–3
links: Intermediate Python for Developers (DataCamp) | https://www.datacamp.com/courses/intermediate-python-for-developers
---

## Objetivo

Definir funciones con argumentos por defecto, `*args` y `**kwargs`, escribir lambdas y proteger el código con `try`/`except` y `raise`.

## Qué hacer

1. Abre *Intermediate Python for Developers* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Working with functions» y el capítulo 3 «Lambda functions and error-handling» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **def y return**: una función sin `return` explícito devuelve `None`.
- **Argumentos por defecto**: `def f(x, sep=','):`; nunca uses un objeto mutable (`[]`, `{}`) como valor por defecto.
- ***args y **kwargs**: recogen argumentos posicionales extra en una tuple y argumentos con nombre extra en un dict.
- **Docstring**: texto entre triple comillas al inicio de la función; lo muestra `help()`.
- **lambda**: función anónima de una sola expresión: `lambda x: x * 2`; útil con `map`, `filter` y `sorted(key=...)`.
- **try / except**: captura excepciones concretas (`except ValueError:`) para reaccionar sin que el programa se caiga.
- **raise**: lanza una excepción a propósito cuando el input no es válido: `raise ValueError('mensaje')`.

## Preguntas de repaso

1. ¿Qué recibe la función en `def f(*args, **kwargs)` si llamas `f(1, 2, modo='x')`?
   R: `args = (1, 2)` (una tuple) y `kwargs = {'modo': 'x'}` (un dict).
2. ¿Por qué es un error `def agregar(item, lista=[]):`?
   R: Porque el valor por defecto se evalúa una sola vez, al definir la función: todas las llamadas comparten la misma lista y se acumulan elementos entre llamadas. Se usa `lista=None` y dentro `if lista is None: lista = []`.
3. Escribe cómo ordenar `personas` (lista de dicts con clave `edad`) de mayor a menor edad.
   R: `sorted(personas, key=lambda p: p['edad'], reverse=True)`.
4. ¿Cuándo conviene capturar una excepción y cuándo lanzarla con `raise`?
   R: Lanzas (`raise`) cuando tu función detecta un input inválido y no puede continuar; así el error llega a quien la llamó con un mensaje claro. Capturas (`except`) donde puedes hacer algo útil: reintentar, usar un valor por defecto o mostrar un mensaje al usuario. Captura excepciones concretas, nunca un `except:` vacío.

## Explícalo con tus palabras

Explica con un ejemplo de división de una cuenta entre amigos cuándo tu función debe lanzar un `ValueError` y dónde lo capturarías.
