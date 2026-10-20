---
title: Control de flujo, bucles y el ecosistema de Python
kind: course
hours: 2
sources: DataCamp — Introduction to Python for Developers, cap. 3; Intermediate Python for Developers, cap. 1
links: Introduction to Python for Developers (DataCamp) | https://www.datacamp.com/courses/introduction-to-python-for-developers ; Intermediate Python for Developers (DataCamp) | https://www.datacamp.com/courses/intermediate-python-for-developers
---

## Objetivo

Escribir condicionales y bucles `for`/`while` en Python, y entender qué son los módulos, los paquetes y cómo se instalan con pip.

## Qué hacer

1. Abre *Introduction to Python for Developers* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Control flow and loops» de *Introduction to Python for Developers* y luego el capítulo 1 «The Python Ecosystem» de *Intermediate Python for Developers* (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **if / elif / else**: ramas condicionales; los bloques se definen por indentación, no por llaves.
- **Operadores de comparación y lógicos**: `==`, `!=`, `<`, `in`, y `and`, `or`, `not` en palabras.
- **for**: recorre cualquier iterable (list, str, dict, range); con `dict.items()` obtienes clave y valor a la vez.
- **while**: repite mientras la condición sea verdadera; necesita algo que la vuelva falsa o un `break`.
- **Built-in functions**: funciones disponibles sin importar nada: `len`, `sum`, `max`, `sorted`, `round`, `print`.
- **Módulo y paquete**: un módulo es un archivo `.py`; un paquete agrupa módulos. Se importan con `import x` o `from x import y`.
- **pip**: el instalador de paquetes de PyPI: `python -m pip install requests`.

## Preguntas de repaso

1. ¿Cómo recorres un dict `precios` imprimiendo cada producto y su precio?
   R: `for producto, precio in precios.items(): print(producto, precio)`.
2. ¿Cuándo usarías `while` en lugar de `for`?
   R: Cuando no sabes de antemano cuántas iteraciones habrá y depende de una condición (por ejemplo, repetir hasta que el usuario escriba `salir` o hasta que un saldo llegue a cero). `for` es para recorrer una colección o un rango conocido.
3. ¿Qué diferencia hay entre `import math` y `from math import sqrt`?
   R: Con `import math` usas el nombre calificado `math.sqrt(9)`; con `from math import sqrt` traes solo `sqrt` al espacio de nombres actual y lo usas directo. La primera forma evita choques de nombres.
4. ¿Qué es PyPI y cómo instalas un paquete de ahí?
   R: PyPI (Python Package Index) es el repositorio público de paquetes de Python. Se instalan con `pip install nombre`, idealmente dentro de un entorno virtual.

## Explícalo con tus palabras

Explica por qué en Python la indentación no es estilo sino sintaxis, con un ejemplo de un `if` dentro de un `for` donde un espacio de menos cambia el resultado.
