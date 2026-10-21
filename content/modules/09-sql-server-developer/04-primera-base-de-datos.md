---
title: Tu primera base de datos relacional
kind: course
hours: 2
sources: DataCamp — Introduction to Relational Databases in SQL, cap. 1
links: Introduction to Relational Databases in SQL (DataCamp) | https://www.datacamp.com/courses/introduction-to-relational-databases-in-sql
---

## Objetivo

Crear tablas desde una tabla plana, migrar datos con `INSERT INTO ... SELECT DISTINCT` y consultar los metadatos con `information_schema`.

## Qué hacer

1. Abre *Introduction to Relational Databases in SQL* en DataCamp (ver enlaces de la sesión) y completa el capítulo 1 «Your first database» (~90 min). Haz todos los ejercicios; si uno te bloquea más de 10 minutos, pide la pista, entiende por qué funciona y sigue.
2. Al cerrar cada capítulo, anota en tu libreta tres ideas clave y una duda (máx. 5 min).
3. Cierra DataCamp y tus notas. Responde por escrito las preguntas de repaso sin mirar nada (~15 min); después compara con las respuestas modelo y marca las que fallaste para repasarlas.
4. Haz la consigna de «Explícalo con tus palabras» en voz alta o por escrito (~5–10 min).

## Conceptos clave

- **Modelo relacional**: las entidades se separan en tablas relacionadas para evitar redundancia.
- **information_schema**: vistas estándar con metadatos: `information_schema.tables` y `.columns`.
- **INSERT INTO ... SELECT**: copia datos de una consulta a otra tabla; con `DISTINCT` crea tablas de entidades.
- **ALTER TABLE**: agrega, renombra o elimina columnas de una tabla existente.

## Preguntas de repaso

1. ¿Por qué separar una tabla plana `universidad_profesor` en tablas `universities` y `professors`?
   R: Porque en la tabla plana los datos de cada universidad se repiten en cada profesor: ocupan más espacio y, al actualizar uno, puedes dejar otros inconsistentes. Separadas, cada dato vive en un solo lugar.
2. ¿Cómo llenas una tabla `universities` con las universidades distintas de `university_professors`?
   R: `INSERT INTO universities (name, city) SELECT DISTINCT university, university_city FROM university_professors;`
3. ¿Cómo ves todas las columnas de la tabla `professors` sin abrir su definición?
   R: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'professors';`

## Explícalo con tus palabras

Explica con un ejemplo de tu vida (canciones y artistas, por ejemplo) por qué una tabla plana genera anomalías al actualizar.
