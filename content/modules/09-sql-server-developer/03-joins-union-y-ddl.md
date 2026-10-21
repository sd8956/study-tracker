---
title: JOINs, UNION y modificar datos
kind: course
hours: 2
sources: DataCamp — Introduction to SQL Server, caps. 3–4
links: Introduction to SQL Server (DataCamp) | https://www.datacamp.com/courses/introduction-to-sql-server
---

## Objetivo

Combinar tablas con `INNER`/`LEFT`/`RIGHT JOIN` y `UNION`, y crear tablas, insertar, actualizar y borrar datos de forma segura.

## Qué hacer

1. Abre *Introduction to SQL Server* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Joining tables» y el capítulo 4 «You've got the power» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **INNER JOIN**: solo las filas con coincidencia en ambas tablas.
- **LEFT JOIN**: todas las filas de la tabla izquierda; las columnas de la derecha quedan `NULL` si no hay coincidencia.
- **UNION vs UNION ALL**: `UNION` elimina duplicados (más costoso); `UNION ALL` conserva todo.
- **CREATE TABLE**: define columnas y tipos (`INT`, `VARCHAR(n)`, `DATE`, `DECIMAL(p,s)`).
- **INSERT / UPDATE / DELETE**: agregan, modifican y eliminan filas; `UPDATE` y `DELETE` sin `WHERE` afectan toda la tabla.
- **Variables**: `DECLARE @x INT; SET @x = 5;` guardan valores para reutilizar en el lote.

## Preguntas de repaso

1. ¿Cómo listas todos los artistas, incluidos los que no tienen álbumes?
   R: `SELECT ar.name, al.title FROM artist ar LEFT JOIN album al ON al.artist_id = ar.artist_id;` Los artistas sin álbum aparecen con `title` en `NULL`.
2. ¿Cuándo usarías `UNION ALL` en lugar de `UNION`?
   R: Cuando sabes que no hay duplicados o quieres conservarlos: `UNION ALL` es más rápido porque no tiene que ordenar ni comparar para eliminarlos.
3. ¿Qué práctica evita borrar una tabla entera por accidente con `DELETE`?
   R: Escribir primero un `SELECT` con el mismo `WHERE` para ver qué filas se afectarán, y luego cambiarlo a `DELETE`. Mejor aún, hacerlo dentro de una transacción para poder hacer `ROLLBACK`.
4. ¿Para qué sirve `DECLARE @inicio DATE = '2026-01-01'` en un script?
   R: Define una variable reutilizable; si cambias la fecha en un solo lugar, todas las consultas del lote que la usan se actualizan.

## Explícalo con tus palabras

Dibuja con dos círculos (diagrama de Venn) INNER, LEFT y RIGHT JOIN y explica qué filas quedan con `NULL` en cada caso.
