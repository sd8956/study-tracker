---
title: Databases — crear tablas, joins y SQL injection
kind: course
hours: 2
sources: Scrimba Fullstack Developer Path — Módulo 11 Databases — Creating and Joining Tables
links: Scrimba Fullstack Path | https://scrimba.com/fullstack-path-c0fullstack ; OWASP — SQL Injection | https://owasp.org/www-community/attacks/SQL_Injection ; SQLite — CREATE TABLE | https://www.sqlite.org/lang_createtable.html
---

## Objetivo

Diseñar tablas relacionadas, consultarlas con joins y acceder a la base de datos desde Node sin abrir la puerta a SQL injection.

## Qué hacer

1. (≈ 90 min) **Creating and Joining Tables** completa: *Introducing our SQL project*, `CREATE TABLE`, `INSERT`, claves primarias y foráneas, *INNER JOIN*, *LEFT, RIGHT, FULL JOIN*, `DROP`, script de seed, *sqlite3 Methods Overview* y *A primer on SQL Injections*.
2. (≈ 30 min) Recuerdo activo: preguntas de repaso y consigna Feynman.

## Conceptos clave

- **Clave primaria**: identifica cada fila de forma única (`id INTEGER PRIMARY KEY`).
- **Clave foránea**: una columna que apunta a la clave primaria de otra tabla y mantiene la integridad referencial.
- **`INNER JOIN`**: solo filas con coincidencia en ambas tablas. **`LEFT JOIN`**: todas las filas de la izquierda y `NULL` donde no hay coincidencia. **`FULL JOIN`**: todas las de ambas.
- **Seed**: script que crea tablas y datos de ejemplo para que cualquiera arranque el proyecto igual.
- **Consultas parametrizadas**: `db.get("SELECT * FROM users WHERE email = ?", [email])`; el driver envía los valores aparte del SQL.
- **SQL injection**: concatenar input del usuario en el SQL permite que ese input se ejecute como código.

## Preguntas de repaso

1. ¿Qué devuelve un `LEFT JOIN` de autores con libros para un autor sin libros?
   R: Una fila con los datos del autor y `NULL` en todas las columnas de libros. Con `INNER JOIN` ese autor no aparecería.
2. ¿Por qué `"SELECT * FROM users WHERE name = '" + name + "'"` es peligroso y cómo se corrige?
   R: Porque si `name` vale algo como `' OR '1'='1`, cambia la lógica de la consulta y puede devolver o borrar datos (SQL injection). Se corrige con consultas parametrizadas (`WHERE name = ?` y el valor aparte), nunca concatenando.
3. ¿Para qué sirve declarar una clave foránea si igual puedes guardar el id a mano?
   R: Para que la base de datos garantice la integridad: no te deja insertar un id que no existe ni borrar el padre dejando hijos huérfanos (según la regla `ON DELETE` que definas).

## Explícalo con tus palabras

Explica la diferencia entre `INNER JOIN` y `LEFT JOIN` con dos tablas pequeñas dibujadas a mano.
