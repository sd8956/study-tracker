---
title: Databases — SQL vs NoSQL y consultas SQL
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 11 Databases — Intro to Databases; Writing SQL Queries
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; SQLite — SELECT | https://www.sqlite.org/lang_select.html
---

## Objetivo

Repasar el modelo relacional y escribir consultas SQL para leer, filtrar, ordenar, paginar y agregar datos, ahora desde una app JavaScript.

## Qué hacer

1. (≈ 90 min) **Módulo 11 Databases → Intro to Databases** (incluye *SQL vs NoSQL*) y **Writing SQL Queries** completas. Ya hiciste SQL en DataCamp (SQL Server Developer): si un tema lo dominas, ve a 1,5x y dedica el tiempo a los retos.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman. Conecta con el módulo 04 (DDIA, modelos de datos).

## Conceptos clave

- **Relacional (SQL)**: tablas con esquema fijo y relaciones por claves; transacciones ACID. Ideal cuando los datos están muy relacionados.
- **NoSQL**: documentos, clave-valor, grafos o columnas; esquema flexible y escalado horizontal más simple, a cambio de joins y garantías más débiles.
- **`SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ... OFFSET`**: el esqueleto de casi toda lectura.
- **Agregación**: `COUNT`, `SUM`, `AVG` con `GROUP BY`; `HAVING` filtra grupos después de agrupar.
- **`LIKE` y `IN`**: búsqueda por patrón (`'%react%'`) y por lista de valores.
- **Orden lógico**: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`.

## Preguntas de repaso

1. ¿Qué diferencia hay entre `WHERE` y `HAVING`?
   R: `WHERE` filtra filas antes de agrupar; `HAVING` filtra los grupos ya agregados, por eso puede usar `COUNT` o `SUM` en la condición.
2. Escribe la consulta para la segunda página de 10 productos más baratos.
   R: `SELECT * FROM products ORDER BY price ASC LIMIT 10 OFFSET 10;` (la primera página sería `OFFSET 0`).
3. ¿Cuándo elegirías una base de datos documental en lugar de una relacional?
   R: Cuando los datos se leen casi siempre como un documento completo, el esquema cambia mucho o hay poca relación entre entidades. Si necesitas joins frecuentes, integridad referencial y transacciones, la relacional suele ser mejor opción.

## Explícalo con tus palabras

Explica en qué orden "piensa" la base de datos una consulta con `WHERE`, `GROUP BY`, `HAVING` y `ORDER BY`.
