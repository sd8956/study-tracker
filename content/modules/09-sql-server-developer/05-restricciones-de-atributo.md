---
title: Consistencia con restricciones de atributo
kind: course
hours: 2
sources: DataCamp — Introduction to Relational Databases in SQL, cap. 2
links: Introduction to Relational Databases in SQL (DataCamp) | https://www.datacamp.com/courses/introduction-to-relational-databases-in-sql
---

## Objetivo

Elegir tipos de datos, convertirlos con `CAST`, y exigir `NOT NULL` y `UNIQUE` para que la base rechace datos inválidos.

## Qué hacer

1. Abre *Introduction to Relational Databases in SQL* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Enforce data consistency with attribute constraints» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Tipo de dato como restricción**: un `INTEGER` no acepta texto: el tipo ya valida.
- **CAST**: convierte un valor a otro tipo en una consulta: `CAST(x AS INTEGER)`.
- **ALTER COLUMN ... TYPE**: cambia el tipo de una columna existente; puede requerir convertir los datos.
- **NOT NULL**: la columna siempre debe tener valor.
- **UNIQUE**: no puede haber dos filas con el mismo valor en esa columna (o combinación).

## Preguntas de repaso

1. ¿Qué ventaja tiene validar con restricciones en la base en lugar de solo en la aplicación?
   R: Que la regla se cumple para todos los clientes de la base (varias apps, scripts, cargas manuales). La aplicación puede tener bugs o puede saltarse; la base es la última línea de defensa.
2. ¿Qué pasa si agregas `NOT NULL` a una columna que ya tiene `NULL`?
   R: La operación falla. Primero debes rellenar o limpiar esos valores y después agregar la restricción.
3. ¿Cuál es la diferencia entre `UNIQUE` y una clave primaria?
   R: Ambas impiden duplicados, pero la clave primaria además implica `NOT NULL` y solo hay una por tabla; puede haber varias restricciones `UNIQUE`.

## Explícalo con tus palabras

Explica por qué el tipo de dato de una columna es la primera restricción de integridad, con un ejemplo de fechas guardadas como texto.
