---
title: Claves primarias, surrogate keys y claves foráneas
kind: course
hours: 2
sources: DataCamp — Introduction to Relational Databases in SQL, caps. 3–4
links: Introduction to Relational Databases in SQL (DataCamp) | https://www.datacamp.com/courses/introduction-to-relational-databases-in-sql
---

## Objetivo

Identificar superkeys y candidate keys, elegir una primary key (natural o surrogate) y relacionar tablas con foreign keys y su comportamiento `ON DELETE`.

## Qué hacer

1. Abre *Introduction to Relational Databases in SQL* en DataCamp (ver enlaces de la sesión) y completa el capítulo 3 «Uniquely identify records with key constraints» y el capítulo 4 «Glue together tables with foreign keys» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Superkey / candidate key**: conjunto de columnas que identifica cada fila; la candidate key es una superkey mínima.
- **Primary key**: la candidate key elegida; única y no nula.
- **Surrogate key**: identificador artificial (`IDENTITY`/serial) sin significado de negocio.
- **Foreign key**: columna que referencia la primary key de otra tabla y garantiza que la relación exista (integridad referencial).
- **ON DELETE**: qué pasa al borrar el padre: `NO ACTION` (rechaza), `CASCADE` (borra hijos), `SET NULL`, `SET DEFAULT`.
- **Relación N:M**: se modela con una tabla intermedia que tiene dos foreign keys.

## Preguntas de repaso

1. ¿Cuándo prefieres una surrogate key a una natural key como el correo?
   R: Cuando la natural key puede cambiar (correo, nombre) o es larga/compuesta. La surrogate es estable, corta y no tiene significado de negocio, así que las foreign keys no se rompen si el dato real cambia.
2. ¿Cómo modelas que un profesor puede pertenecer a varias organizaciones y una organización tiene varios profesores?
   R: Con una tabla intermedia `affiliations(professor_id, organization_id, rol)` con una foreign key a cada tabla, y su primary key compuesta por ambas columnas.
3. ¿Qué hace `ON DELETE CASCADE` y cuál es su riesgo?
   R: Al borrar la fila padre, borra automáticamente las filas hijas que la referencian. El riesgo es borrar en cadena mucho más de lo que esperabas con un solo `DELETE`.
4. ¿Qué error obtienes al insertar un hijo con una foreign key que no existe en la tabla padre?
   R: Un error de violación de foreign key (integridad referencial): la base rechaza el `INSERT`.

## Explícalo con tus palabras

Explica qué es la integridad referencial con el ejemplo de pedidos y clientes, y qué pasaría sin foreign keys.
