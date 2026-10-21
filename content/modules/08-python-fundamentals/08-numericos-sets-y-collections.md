---
title: Tipos numéricos, booleans, sets y el módulo collections
kind: course
hours: 2
sources: DataCamp — Data Types in Python, caps. 3–4
links: Data Types in Python (DataCamp) | https://www.datacamp.com/courses/data-types-in-python
---

## Objetivo

Usar correctamente int, float, Decimal y booleans, operar con sets, y elegir entre Counter, defaultdict, namedtuple y dataclass.

## Qué hacer

1. Abre *Data Types in Python* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Numeric Data Types, Booleans, and Sets» y el capítulo 4 «Advanced Data Types» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **float y precisión**: `0.1 + 0.2 != 0.3`; para dinero usa `decimal.Decimal`.
- **Truthiness**: `0`, `''`, `[]`, `{}` y `None` son falsy; casi todo lo demás es truthy.
- **Operaciones de sets**: `a | b` unión, `a & b` intersección, `a - b` diferencia, `a ^ b` diferencia simétrica.
- **Counter**: cuenta elementos de un iterable; `.most_common(n)` devuelve los n más frecuentes.
- **defaultdict**: dict que crea un valor por defecto al acceder a una clave nueva: `defaultdict(list)`.
- **namedtuple**: tuple inmutable con campos con nombre: `Punto = namedtuple('Punto', ['x', 'y'])`.
- **dataclass**: decorador que genera `__init__`, `__repr__` y `__eq__` a partir de anotaciones de tipo; admite valores por defecto y métodos.

## Preguntas de repaso

1. ¿Por qué `0.1 + 0.2 == 0.3` es `False` y cómo lo resuelves para montos de dinero?
   R: Porque los float se guardan en binario y 0.1 no tiene representación exacta. Para dinero usas `Decimal('0.1') + Decimal('0.2')` (creando los Decimal desde strings) o trabajas en centavos con enteros.
2. Dados `ayer = {'ana', 'luis'}` y `hoy = {'luis', 'eva'}`, ¿cómo obtienes quién vino solo hoy?
   R: `hoy - ayer` → `{'eva'}`.
3. ¿Qué devuelve `Counter('banana').most_common(1)`?
   R: `[('a', 3)]`.
4. ¿Cuándo elegirías una dataclass en lugar de una namedtuple?
   R: Cuando necesitas mutabilidad, valores por defecto más flexibles, validación en `__post_init__` o métodos propios. La namedtuple es más ligera e inmutable, buena para registros simples de solo lectura.

## Explícalo con tus palabras

Explica a un compañero cuándo usar dict, defaultdict, Counter, namedtuple o dataclass, con un ejemplo de una sola línea para cada uno.
