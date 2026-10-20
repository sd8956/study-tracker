---
title: Filtrado eficiente y eliminación de duplicados
kind: course
hours: 2
sources: DataCamp — Improving Query Performance in SQL Server, cap. 2
links: Improving Query Performance in SQL Server (DataCamp) | https://www.datacamp.com/courses/improving-query-performance-in-sql-server
---

## Objetivo

Filtrar con `WHERE` y `HAVING` siguiendo buenas prácticas y entender el costo de `DISTINCT` y `UNION`.

## Qué hacer

1. Abre *Improving Query Performance in SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 2 «Filtering and Data Interrogation» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Sargable**: un predicado que permite usar índices; aplicar funciones a la columna (`YEAR(fecha) = 2026`) lo rompe.
- **WHERE antes que HAVING**: filtra filas antes de agrupar siempre que la condición no dependa de una agregación.
- **DISTINCT y UNION**: ordenan o hashean para eliminar duplicados; tienen costo.
- **UNION ALL**: evita ese costo cuando no hay duplicados que eliminar.

## Preguntas de repaso

1. Reescribe `WHERE YEAR(order_date) = 2026` para que sea sargable.
   R: `WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'`.
2. ¿Por qué filtrar en `HAVING` algo que podría ir en `WHERE` es ineficiente?
   R: Porque obliga a agrupar todas las filas y recién después descartar grupos; en `WHERE` se descartan antes y se agrupan menos datos.
3. ¿Cuándo un `DISTINCT` es una señal de problema en una consulta?
   R: Cuando se agrega para «arreglar» duplicados causados por un join mal planteado: oculta el error y cuesta rendimiento.

## Explícalo con tus palabras

Explica qué significa que un filtro sea sargable con la analogía de buscar un apellido en una guía telefónica ordenada.
